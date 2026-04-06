import express from "express";
import {
  createLabSession,
  getLabSessions,
  getLabSessionById,
  getActiveSession,
  updateSessionStatus,
  terminateSession,
  extendSession,
  getSessionStats,
  updateSessionNotes,
} from "../controllers/labSession.controller.js";
import {
  verifyToken,
  isAdmin,
  isInstructor,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/lab-sessions/stats
 * @desc    Get lab session statistics
 * @access  Private/Admin/Instructor
 */
router.get("/stats", isInstructor, getSessionStats);

/**
 * @route   GET /api/lab-sessions/active
 * @desc    Get current user's active session
 * @access  Private
 */
router.get("/active", getActiveSession);

/**
 * @route   POST /api/lab-sessions
 * @desc    Create new lab session
 * @access  Private
 */
router.post("/", createLabSession);

/**
 * @route   GET /api/lab-sessions
 * @desc    Get all lab sessions (filtered by role)
 * @access  Private
 */
router.get("/", getLabSessions);

/**
 * @route   GET /api/lab-sessions/:id
 * @desc    Get lab session by ID
 * @access  Private
 */
router.get("/:id", getLabSessionById);

/**
 * @route   PATCH /api/lab-sessions/:id/status
 * @desc    Update lab session status
 * @access  Private/Admin/Instructor
 */
router.patch("/:id/status", isInstructor, updateSessionStatus);

/**
 * @route   POST /api/lab-sessions/:id/terminate
 * @desc    Terminate lab session
 * @access  Private
 */
router.post("/:id/terminate", terminateSession);

/**
 * @route   POST /api/lab-sessions/:id/extend
 * @desc    Extend running lab session by +1h (PRO/PREMIUM only)
 * @access  Private
 */
router.post('/:id/extend', extendSession)

/**
 * @route   PATCH /api/lab-sessions/:id/notes
 * @desc    Update session notes
 * @access  Private
 */
router.patch("/:id/notes", updateSessionNotes);

export default router;
