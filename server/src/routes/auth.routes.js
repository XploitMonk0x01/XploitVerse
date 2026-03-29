import express from 'express'
import {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  validate,
} from '../validators/index.js'

const router = express.Router()

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, validate, register)

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, validate, login)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', verifyToken, logout)

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', verifyToken, getMe)

/**
 * @route   PUT /api/auth/update-password
 * @desc    Update password
 * @access  Private
 */
router.put(
  '/update-password',
  verifyToken,
  changePasswordValidation,
  validate,
  updatePassword,
)

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token', verifyToken, refreshToken)

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  forgotPasswordValidation,
  validate,
  forgotPassword,
)

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with reset token
 * @access  Public
 */
router.post(
  '/reset-password/:token',
  resetPasswordValidation,
  validate,
  resetPassword,
)

export default router
