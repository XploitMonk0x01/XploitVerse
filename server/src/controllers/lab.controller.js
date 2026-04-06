import { asyncHandler } from '../middleware/error.middleware.js'
import labService from '../services/lab.service.js'

// ── Lab Listing ───────────────────────────────────────────────────────

export const getAllLabs = asyncHandler(async (req, res) => {
  const data = await labService.listLabs(req.query)

  res.status(200).json({
    success: true,
    data,
  })
})

export const getLabById = asyncHandler(async (req, res) => {
  const lab = await labService.getLabByIdOrThrow(req.params.id)
  res.status(200).json({ success: true, data: { lab } })
})

// ── Start Lab ─────────────────────────────────────────────────────────

/**
 * POST /api/labs/start
 * Creates a lab session and immediately starts a Docker container (if available).
 * Falls back to simulation mode when Docker is unavailable.
 */
export const startLab = asyncHandler(async (req, res) => {
  const result = await labService.startLabSession({
    user: req.user,
    labId: req.body.labId,
  })

  res.status(202).json({
    success: true,
    message: result.message,
    data: { session: result.session },
  })
})

// ── Check / Complete Provisioning ─────────────────────────────────────

export const checkSessionStatus = asyncHandler(async (req, res) => {
  const session = await labService.getSessionStatusForUser({
    userId: req.user._id,
    sessionId: req.params.sessionId,
  })
  res.status(200).json({ success: true, data: { session } })
})

// Keep backward-compat route — now a no-op since provisioning is async
export const completeProvisioning = asyncHandler(async (req, res) => {
  const session = await labService.completeProvisioningForUser({
    userId: req.user._id,
    sessionId: req.params.sessionId,
  })
  res.status(200).json({ success: true, data: { session } })
})

// ── Stop Lab ──────────────────────────────────────────────────────────

export const stopLab = asyncHandler(async (req, res) => {
  const session = await labService.stopLabSessionForUser({
    userId: req.user._id,
    sessionId: req.body.sessionId,
  })

  res.status(200).json({
    success: true,
    message: 'Lab session stopped',
    data: { session },
  })
})

// ── Active session & history ──────────────────────────────────────────

export const getActiveSession = asyncHandler(async (req, res) => {
  const session = await labService.getActiveSessionForUser(req.user._id)
  res.status(200).json({ success: true, data: { session } })
})

export const getSessionHistory = asyncHandler(async (req, res) => {
  const data = await labService.getSessionHistoryForUser({
    userId: req.user._id,
    page: req.query.page,
    limit: req.query.limit,
  })

  res.status(200).json({
    success: true,
    data,
  })
})

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
