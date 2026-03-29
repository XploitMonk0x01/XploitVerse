import express from 'express'
import {
  getAllLabs,
  getLabById,
  startLab,
  stopLab,
  checkSessionStatus,
  completeProvisioning,
  getActiveSession,
  getSessionHistory,
} from '../controllers/lab.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

/**
 * @route   GET /api/labs
 * @desc    Get all available labs
 * @access  Public
 */
router.get('/', getAllLabs)

/**
 * @route   GET /api/labs/:id
 * @desc    Get single lab by ID
 * @access  Public
 */
router.get('/:id', getLabById)

// Protected lab session operations
router.use(verifyToken)

/**
 * @route   GET /api/labs/active-session
 * @desc    Get user's current active session
 * @access  Private
 */
router.get('/active-session', getActiveSession)

/**
 * @route   GET /api/labs/history
 * @desc    Get user's session history
 * @access  Private
 */
router.get('/history', getSessionHistory)

/**
 * @route   POST /api/labs/start
 * @desc    Start a new lab session
 * @access  Private
 */
router.post('/start', startLab)

/**
 * @route   POST /api/labs/stop
 * @desc    Stop an active lab session
 * @access  Private
 */
router.post('/stop', stopLab)

/**
 * @route   GET /api/labs/session/:sessionId/status
 * @desc    Check session status
 * @access  Private
 */
router.get('/session/:sessionId/status', checkSessionStatus)

/**
 * @route   POST /api/labs/session/:sessionId/provision
 * @desc    Complete provisioning (with simulated delay)
 * @access  Private
 */
router.post('/session/:sessionId/provision', completeProvisioning)

export default router
