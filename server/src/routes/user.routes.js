import express from 'express'
import {
  getAllUsers,
  getUserById,
  updateProfile,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  getUserStats,
  getMyProgress,
} from '../controllers/user.controller.js'
import {
  verifyToken,
  isAdmin,
  isInstructor,
} from '../middleware/auth.middleware.js'
import {
  updateProfileValidation,
  userIdParamValidation,
  updateRoleValidation,
  validate,
} from '../validators/index.js'

const router = express.Router()

// All routes require authentication
router.use(verifyToken)

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private/Admin/Instructor
 */
router.get('/stats', isInstructor, getUserStats)

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/profile', updateProfileValidation, validate, updateProfile)

/**
 * @route   GET /api/users/me/progress
 * @desc    Get current user task progress and summary
 * @access  Private
 */
router.get('/me/progress', getMyProgress)

/**
 * @route   GET /api/users
 * @desc    Get all users (with pagination)
 * @access  Private/Admin
 */
router.get('/', isAdmin, getAllUsers)

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get('/:id', isAdmin, userIdParamValidation, validate, getUserById)

/**
 * @route   PUT /api/users/:id/role
 * @desc    Update user role
 * @access  Private/Admin
 */
router.put('/:id/role', isAdmin, updateRoleValidation, validate, updateUserRole)

/**
 * @route   PUT /api/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Private/Admin
 */
router.put('/:id/deactivate', isAdmin, userIdParamValidation, validate, deactivateUser)

/**
 * @route   PUT /api/users/:id/reactivate
 * @desc    Reactivate user
 * @access  Private/Admin
 */
router.put('/:id/reactivate', isAdmin, userIdParamValidation, validate, reactivateUser)

export default router
