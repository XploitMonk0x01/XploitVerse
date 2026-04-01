import Lab from '../models/Lab.js'
import LabSession, { LAB_STATUS } from '../models/LabSession.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'
import * as dockerService from '../services/docker.service.js'

// ── Helpers ───────────────────────────────────────────────────────────

const generateFakeIP = () => `10.0.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`

// ── Lab Listing ───────────────────────────────────────────────────────

export const getAllLabs = asyncHandler(async (req, res) => {
  const { category, difficulty, search, page = 1, limit = 10 } = req.query
  const query = { isActive: true, isPublished: true }

  if (category) query.category = category
  if (difficulty) query.difficulty = difficulty
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [labs, total] = await Promise.all([
    Lab.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Lab.countDocuments(query),
  ])

  res.status(200).json({
    success: true,
    data: { labs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } },
  })
})

export const getLabById = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.params.id)
  if (!lab) throw new ApiError('Lab not found', 404)
  res.status(200).json({ success: true, data: { lab } })
})

// ── Start Lab ─────────────────────────────────────────────────────────

/**
 * POST /api/labs/start
 * Creates a lab session and immediately starts a Docker container (if available).
 * Falls back to simulation mode when Docker is unavailable.
 */
export const startLab = asyncHandler(async (req, res) => {
  const { labId } = req.body
  if (!labId) throw new ApiError('Lab ID is required', 400)

  const lab = await Lab.findById(labId)
  if (!lab) throw new ApiError('Lab not found', 404)
  if (!lab.isActive || !lab.isPublished) throw new ApiError('This lab is not currently available', 400)

  // Prevent concurrent sessions
  const existing = await LabSession.findOne({
    user: req.user._id,
    status: { $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING] },
  })
  if (existing) throw new ApiError('You already have an active lab session. Please stop it first.', 400)

  // Determine the docker image: lab.dockerImage or a smart default from title
  const image = lab.dockerImage || deriveImage(lab.title)

  // Create session in INITIALIZING state
  const session = await LabSession.create({
    user: req.user._id,
    labType: lab.category.toLowerCase().replace(/ /g, '_'),
    labName: lab.title,
    description: lab.description,
    difficulty: lab.difficulty.toLowerCase(),
    status: LAB_STATUS.INITIALIZING,
    metadata: { labId: lab._id, category: lab.category, dockerImage: image },
  })

  // --- Async provisioning (don't block HTTP response) ---
  provisionContainer(session, image).catch((err) =>
    console.error(`Provisioning failed for session ${session._id}:`, err.message),
  )

  res.status(202).json({
    success: true,
    message: dockerService.isDockerAvailable()
      ? 'Spinning up your container...'
      : 'Starting simulated lab environment...',
    data: { session: { id: session._id, status: session.status, labName: session.labName } },
  })
})

/**
 * Provision runs asynchronously after the HTTP 202 response.
 * Starts real Docker container if available, otherwise fakes it.
 */
const provisionContainer = async (session, image) => {
  try {
    let containerId = null

    if (dockerService.isDockerAvailable()) {
      containerId = await dockerService.startContainer(session._id.toString(), image)
      console.log(`🐳 Container started: ${containerId?.slice(0, 12)} for session ${session._id}`)
    }

    const fakeIP = generateFakeIP()

    session.status = LAB_STATUS.RUNNING
    session.startTime = new Date()
    session.publicIp = fakeIP
    session.privateIp = `172.16.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`
    session.awsInstanceId = containerId || `sim-${Math.random().toString(36).slice(2, 10)}`
    session.autoTerminateAt = new Date(Date.now() + session.maxDuration * 60 * 1000)

    // Stash containerId for socket handler
    session.metadata = {
      ...session.metadata,
      containerId,
      dockerMode: !!containerId,
    }
    session.markModified('metadata')

    await session.save()
    await session.logActivity('lab_started', { containerId, image, dockerMode: !!containerId })
  } catch (err) {
    session.status = LAB_STATUS.ERROR
    session.errorMessage = err.message
    await session.save()
    throw err
  }
}

// ── Check / Complete Provisioning ─────────────────────────────────────

export const checkSessionStatus = asyncHandler(async (req, res) => {
  const session = await LabSession.findById(req.params.sessionId)
  if (!session) throw new ApiError('Session not found', 404)
  if (session.user.toString() !== req.user._id.toString()) throw new ApiError('Unauthorized', 403)
  res.status(200).json({ success: true, data: { session } })
})

// Keep backward-compat route — now a no-op since provisioning is async
export const completeProvisioning = asyncHandler(async (req, res) => {
  const session = await LabSession.findById(req.params.sessionId)
  if (!session) throw new ApiError('Session not found', 404)
  if (session.user.toString() !== req.user._id.toString()) throw new ApiError('Unauthorized', 403)
  res.status(200).json({ success: true, data: { session } })
})

// ── Stop Lab ──────────────────────────────────────────────────────────

export const stopLab = asyncHandler(async (req, res) => {
  const { sessionId } = req.body
  if (!sessionId) throw new ApiError('Session ID is required', 400)

  const session = await LabSession.findById(sessionId)
  if (!session) throw new ApiError('Session not found', 404)
  if (session.user.toString() !== req.user._id.toString()) throw new ApiError('Unauthorized', 403)

  if (!['pending', 'initializing', 'running'].includes(session.status)) {
    throw new ApiError(`Cannot stop session with status: ${session.status}`, 400)
  }

  // Stop real container if one was started
  if (session.metadata?.dockerMode) {
    await dockerService.stopContainer(session._id.toString())
  }

  session.status = LAB_STATUS.STOPPED
  session.endTime = new Date()

  if (session.startTime) {
    const minutes = Math.ceil((session.endTime - session.startTime) / 60000)
    session.totalBillableMinutes = minutes
    session.finalCost = parseFloat(((minutes / 60) * session.hourlyRate).toFixed(2))
  }

  await session.save()
  await session.logActivity('lab_stopped', { duration: session.totalBillableMinutes, cost: session.finalCost })

  res.status(200).json({
    success: true,
    message: 'Lab session stopped',
    data: {
      session: {
        id: session._id,
        status: session.status,
        labName: session.labName,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.durationFormatted,
        totalMinutes: session.totalBillableMinutes,
        cost: session.finalCost,
      },
    },
  })
})

// ── Active session & history ──────────────────────────────────────────

export const getActiveSession = asyncHandler(async (req, res) => {
  const session = await LabSession.findOne({
    user: req.user._id,
    status: { $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING] },
  })
  res.status(200).json({ success: true, data: { session } })
})

export const getSessionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [sessions, total] = await Promise.all([
    LabSession.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    LabSession.countDocuments({ user: req.user._id }),
  ])
  res.status(200).json({
    success: true,
    data: { sessions, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } },
  })
})

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Derive a local Docker image name from the lab title when lab.dockerImage isn't set.
 * Maps known lab title keywords → local images built from challenges/ .
 */
const IMAGE_MAP = {
  'sql injection': 'xploitverse/sqli-lab',
  sqli: 'xploitverse/sqli-lab',
  'sql': 'xploitverse/sqli-lab',
  'web basic': 'xploitverse/web-basic',
  'linux basics': 'xploitverse/linux-basics',
  'privilege escalation': 'xploitverse/privesc-linux',
  privesc: 'xploitverse/privesc-linux',
  'reverse shell': 'xploitverse/reverse-shell',
  'boot2root': 'xploitverse/boot2root',
  'network recon': 'xploitverse/network-recon',
  'owasp': 'xploitverse/owasp-juice',
  'crypto': 'xploitverse/crypto-basics',
  'recon': 'xploitverse/recon-basic',
}

const deriveImage = (title = '') => {
  const lower = title.toLowerCase()
  for (const [keyword, image] of Object.entries(IMAGE_MAP)) {
    if (lower.includes(keyword)) return image + ':latest'
  }
  return 'ubuntu:22.04'  // generic fallback
}

export default {
  getAllLabs,
  getLabById,
  startLab,
  stopLab,
  checkSessionStatus,
  completeProvisioning,
  getActiveSession,
  getSessionHistory,
}
