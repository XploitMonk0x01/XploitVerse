import Lab from '../models/Lab.js'
import LabSession, { LAB_STATUS } from '../models/LabSession.js'
import { ApiError } from '../middleware/error.middleware.js'
import * as dockerService from './docker.service.js'
import autoTerminationService from './autoTermination.service.js'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('lab-service')

const generateFakeIP = () =>
  `10.0.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`

const IMAGE_MAP = {
  'sql injection': 'xploitverse/sqli-lab',
  sqli: 'xploitverse/sqli-lab',
  sql: 'xploitverse/sqli-lab',
  'web basic': 'xploitverse/web-basic',
  'linux basics': 'xploitverse/linux-basics',
  'privilege escalation': 'xploitverse/privesc-linux',
  privesc: 'xploitverse/privesc-linux',
  'reverse shell': 'xploitverse/reverse-shell',
  boot2root: 'xploitverse/boot2root',
  'network recon': 'xploitverse/network-recon',
  owasp: 'xploitverse/owasp-juice',
  crypto: 'xploitverse/crypto-basics',
  recon: 'xploitverse/recon-basic',
}

const deriveImage = (title = '') => {
  const lower = title.toLowerCase()
  for (const [keyword, image] of Object.entries(IMAGE_MAP)) {
    if (lower.includes(keyword)) {
      return `${image}:latest`
    }
  }
  return 'ubuntu:22.04'
}

const assertSessionOwnership = (session, userId) => {
  if (!session) {
    throw new ApiError('Session not found', 404)
  }

  if (session.user.toString() !== userId.toString()) {
    throw new ApiError('Unauthorized', 403)
  }
}

const provisionContainer = async (session, image) => {
  try {
    let containerId = null

    if (dockerService.isDockerAvailable()) {
      containerId = await dockerService.startContainer(
        session._id.toString(),
        image,
      )
      log.info(
        { containerId: containerId?.slice(0, 12), sessionId: session._id },
        'Container started',
      )
    }

    const fakeIP = generateFakeIP()

    session.status = LAB_STATUS.RUNNING
    session.startTime = new Date()
    session.publicIp = fakeIP
    session.privateIp = `172.16.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`
    session.awsInstanceId =
      containerId || `sim-${Math.random().toString(36).slice(2, 10)}`
    session.autoTerminateAt = new Date(Date.now() + 60 * 60 * 1000)

    session.metadata = {
      ...session.metadata,
      containerId,
      dockerMode: Boolean(containerId),
    }
    session.markModified('metadata')

    await session.save()
    await autoTerminationService.registerSession(session)
    await session.logActivity('lab_started', {
      containerId,
      image,
      dockerMode: Boolean(containerId),
    })
  } catch (err) {
    session.status = LAB_STATUS.ERROR
    session.errorMessage = err.message
    await session.save()
    throw err
  }
}

export const listLabs = async ({
  category,
  difficulty,
  search,
  page = 1,
  limit = 10,
}) => {
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

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const skip = (pageNum - 1) * limitNum

  const [labs, total] = await Promise.all([
    Lab.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Lab.countDocuments(query),
  ])

  return {
    labs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  }
}

export const getLabByIdOrThrow = async (labId) => {
  const lab = await Lab.findById(labId)
  if (!lab) {
    throw new ApiError('Lab not found', 404)
  }
  return lab
}

export const startLabSession = async ({ user, labId }) => {
  if (!labId) {
    throw new ApiError('Lab ID is required', 400)
  }

  const lab = await Lab.findById(labId)
  if (!lab) {
    throw new ApiError('Lab not found', 404)
  }

  if (!lab.isActive || !lab.isPublished) {
    throw new ApiError('This lab is not currently available', 400)
  }

  const existing = await LabSession.findOne({
    user: user._id,
    status: {
      $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING],
    },
  })

  if (existing) {
    throw new ApiError(
      'You already have an active lab session. Please stop it first.',
      400,
    )
  }

  const image = lab.dockerImage || deriveImage(lab.title)

  const session = await LabSession.create({
    user: user._id,
    labType: lab.category.toLowerCase().replace(/ /g, '_'),
    labName: lab.title,
    description: lab.description,
    difficulty: lab.difficulty.toLowerCase(),
    status: LAB_STATUS.INITIALIZING,
    metadata: {
      labId: lab._id,
      category: lab.category,
      dockerImage: image,
    },
  })

  provisionContainer(session, image).catch((err) =>
    log.error(
      { sessionId: session._id, err: err.message },
      'Provisioning failed',
    ),
  )

  return {
    message: dockerService.isDockerAvailable()
      ? 'Spinning up your container...'
      : 'Starting simulated lab environment...',
    session: {
      id: session._id,
      status: session.status,
      labName: session.labName,
    },
  }
}

export const getSessionStatusForUser = async ({ userId, sessionId }) => {
  const session = await LabSession.findById(sessionId)
  assertSessionOwnership(session, userId)
  return session
}

export const completeProvisioningForUser = async ({ userId, sessionId }) => {
  const session = await LabSession.findById(sessionId)
  assertSessionOwnership(session, userId)
  return session
}

export const stopLabSessionForUser = async ({ userId, sessionId }) => {
  if (!sessionId) {
    throw new ApiError('Session ID is required', 400)
  }

  const session = await LabSession.findById(sessionId)
  assertSessionOwnership(session, userId)

  if (
    ![LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING].includes(
      session.status,
    )
  ) {
    throw new ApiError(
      `Cannot stop session with status: ${session.status}`,
      400,
    )
  }

  if (session.metadata?.dockerMode) {
    await dockerService.stopContainer(session._id.toString())
  }

  await autoTerminationService.removeSession(session._id.toString())

  session.status = LAB_STATUS.STOPPED
  session.endTime = new Date()

  if (session.startTime) {
    const minutes = Math.ceil((session.endTime - session.startTime) / 60000)
    session.totalBillableMinutes = minutes
    session.finalCost = parseFloat(
      ((minutes / 60) * session.hourlyRate).toFixed(2),
    )
  }

  await session.save()
  await session.logActivity('lab_stopped', {
    duration: session.totalBillableMinutes,
    cost: session.finalCost,
  })

  return {
    id: session._id,
    status: session.status,
    labName: session.labName,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.durationFormatted,
    totalMinutes: session.totalBillableMinutes,
    cost: session.finalCost,
  }
}

export const getActiveSessionForUser = async (userId) => {
  return LabSession.findOne({
    user: userId,
    status: {
      $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING],
    },
  })
}

export const getSessionHistoryForUser = async ({
  userId,
  page = 1,
  limit = 10,
}) => {
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const skip = (pageNum - 1) * limitNum

  const [sessions, total] = await Promise.all([
    LabSession.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    LabSession.countDocuments({ user: userId }),
  ])

  return {
    sessions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  }
}

export default {
  listLabs,
  getLabByIdOrThrow,
  startLabSession,
  getSessionStatusForUser,
  completeProvisioningForUser,
  stopLabSessionForUser,
  getActiveSessionForUser,
  getSessionHistoryForUser,
}
