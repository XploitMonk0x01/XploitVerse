import User from '../models/User.js'
import { createTokenResponse } from '../utils/jwt.utils.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'
import config from '../config/index.js'
import crypto from 'crypto'
import { emailService } from '../services/index.js'

const OTP_TTL_MINUTES = 10
const OTP_RESEND_COOLDOWN_SECONDS = 60
const OTP_MAX_ATTEMPTS = 5

const generateSixDigitOtp = () => `${crypto.randomInt(100000, 1000000)}`

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex')

const issueEmailOtpForUser = async (user, options = {}) => {
  const { force = false } = options

  const now = new Date()
  if (
    !force &&
    user.emailVerificationOtpLastSentAt &&
    now.getTime() - user.emailVerificationOtpLastSentAt.getTime() <
      OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    const retryAfterSeconds =
      OTP_RESEND_COOLDOWN_SECONDS -
      Math.floor(
        (now.getTime() - user.emailVerificationOtpLastSentAt.getTime()) / 1000,
      )
    throw new ApiError(
      `Please wait ${retryAfterSeconds}s before requesting another OTP.`,
      429,
    )
  }

  const otp = generateSixDigitOtp()
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000)

  user.emailVerificationOtpHash = hashOtp(otp)
  user.emailVerificationOtpExpires = expiresAt
  user.emailVerificationOtpAttempts = 0
  user.emailVerificationOtpLastSentAt = now
  await user.save({ validateBeforeSave: false })

  const userName = user.firstName || user.username || 'there'
  let sent = false

  if (emailService.isConfigured()) {
    try {
      await emailService.sendEmailVerificationOtp(user.email, otp, userName)
      sent = true
    } catch (error) {
      console.error('Failed to send verification OTP email:', error.message)
    }
  }

  return {
    sent,
    expiresAt,
    otp: config.nodeEnv === 'development' ? otp : undefined,
  }
}

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, role } = req.body

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  })

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username'
    throw new ApiError(`User with this ${field} already exists`, 400)
  }

  // Create user (password will be hashed by pre-save middleware)
  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    // Only allow role assignment in development or if ADMIN is creating
    role: config.nodeEnv === 'development' ? role : undefined,
  })

  // Generate token and cookie options
  const { token, cookieOptions } = createTokenResponse(user)

  const otpMeta = await issueEmailOtpForUser(user, { force: true })

  // Set JWT cookie
  res.cookie('jwt', token, cookieOptions)

  // Remove password from output
  user.password = undefined

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
      token,
      emailVerification: {
        required: !user.isEmailVerified,
        otpSent: otpMeta.sent,
        expiresAt: otpMeta.expiresAt,
        otp: otpMeta.otp,
      },
    },
  })
})

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    throw new ApiError('Invalid email or password', 401)
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(
      'Your account has been deactivated. Please contact support.',
      401,
    )
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password)

  if (!isPasswordValid) {
    throw new ApiError('Invalid email or password', 401)
  }

  // Update last login
  user.lastLogin = new Date()
  await user.save({ validateBeforeSave: false })

  // Generate token and cookie options
  const { token, cookieOptions } = createTokenResponse(user)

  // Set JWT cookie
  res.cookie('jwt', token, cookieOptions)

  // Remove password from output
  user.password = undefined

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        lastLogin: user.lastLogin,
      },
      token,
    },
  })
})

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear the JWT cookie
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
  })

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  })
})

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  // User is attached by verifyToken middleware
  const user = await User.findById(req.user._id).populate('activeSessions')

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        totalLabTime: user.totalLabTime,
        totalSpent: user.totalSpent,
        preferences: user.preferences,
        createdAt: user.createdAt,
      },
    },
  })
})

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body

  // Get user with password
  const user = await User.findById(req.user._id).select('+password')

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword)

  if (!isPasswordValid) {
    throw new ApiError('Current password is incorrect', 400)
  }

  // Update password
  user.password = newPassword
  await user.save()

  // Generate new token
  const { token, cookieOptions } = createTokenResponse(user)
  res.cookie('jwt', token, cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    data: { token },
  })
})

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Private
 */
export const refreshToken = asyncHandler(async (req, res) => {
  // User is attached by verifyToken middleware
  const { token, cookieOptions } = createTokenResponse(req.user)

  res.cookie('jwt', token, cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { token },
  })
})

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  const genericResponse = {
    success: true,
    message:
      'If an account with that email exists, a password reset link has been sent.',
  }

  const user = await User.findOne({ email })
  if (!user) {
    return res.status(200).json(genericResponse)
  }

  const plainToken = crypto.randomBytes(32).toString('hex')
  const hashedToken = crypto
    .createHash('sha256')
    .update(plainToken)
    .digest('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  user.passwordResetToken = hashedToken
  user.passwordResetExpires = expiresAt
  await user.save({ validateBeforeSave: false })

  const resetURL = `${config.clientUrl}/reset-password/${plainToken}`
  const userName = user.firstName || user.username || 'there'

  if (emailService.isConfigured()) {
    try {
      await emailService.sendPasswordReset(user.email, resetURL, userName)
    } catch (error) {
      // Keep API response generic even if SMTP fails.
      console.error('Failed to send reset email:', error.message)
    }
  }

  if (config.nodeEnv === 'development') {
    return res.status(200).json({
      ...genericResponse,
      data: {
        resetToken: plainToken,
        resetURL,
        expiresAt,
        note: 'This token is only returned in development mode.',
      },
    })
  }

  return res.status(200).json(genericResponse)
})

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params
  const { password, confirmPassword } = req.body

  if (password !== confirmPassword) {
    throw new ApiError('Passwords do not match', 400)
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires')

  if (!user) {
    throw new ApiError('Invalid or expired reset token', 400)
  }

  user.password = password
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  const { token: jwtToken, cookieOptions } = createTokenResponse(user)
  res.cookie('jwt', jwtToken, cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You are now logged in.',
    data: { token: jwtToken },
  })
})

/**
 * @desc    Send verification OTP for logged-in user
 * @route   POST /api/auth/send-email-otp
 * @access  Private
 */
export const sendEmailOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '+emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +emailVerificationOtpLastSentAt',
  )

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified.',
      data: {
        isEmailVerified: true,
      },
    })
  }

  const otpMeta = await issueEmailOtpForUser(user)

  res.status(200).json({
    success: true,
    message: otpMeta.sent
      ? 'Verification OTP sent to your email.'
      : 'Verification OTP generated. Email service is not configured.',
    data: {
      isEmailVerified: false,
      otpSent: otpMeta.sent,
      expiresAt: otpMeta.expiresAt,
      otp: otpMeta.otp,
    },
  })
})

/**
 * @desc    Verify email with OTP
 * @route   POST /api/auth/verify-email-otp
 * @access  Private
 */
export const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body

  const user = await User.findById(req.user._id).select(
    '+emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +emailVerificationOtpLastSentAt',
  )

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified.',
      data: {
        isEmailVerified: true,
      },
    })
  }

  if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpires) {
    throw new ApiError(
      'No active OTP. Please request a new verification OTP.',
      400,
    )
  }

  if (user.emailVerificationOtpExpires <= new Date()) {
    user.emailVerificationOtpHash = undefined
    user.emailVerificationOtpExpires = undefined
    user.emailVerificationOtpAttempts = 0
    await user.save({ validateBeforeSave: false })
    throw new ApiError(
      'OTP expired. Please request a new verification OTP.',
      400,
    )
  }

  if ((user.emailVerificationOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(
      'Too many incorrect OTP attempts. Please request a new verification OTP.',
      429,
    )
  }

  const isCorrect = hashOtp(otp) === user.emailVerificationOtpHash

  if (!isCorrect) {
    user.emailVerificationOtpAttempts =
      (user.emailVerificationOtpAttempts || 0) + 1
    await user.save({ validateBeforeSave: false })

    const attemptsLeft = Math.max(
      0,
      OTP_MAX_ATTEMPTS - user.emailVerificationOtpAttempts,
    )
    throw new ApiError(`Invalid OTP. Attempts left: ${attemptsLeft}`, 400)
  }

  user.isEmailVerified = true
  user.emailVerificationOtpHash = undefined
  user.emailVerificationOtpExpires = undefined
  user.emailVerificationOtpAttempts = 0
  await user.save({ validateBeforeSave: false })

  res.status(200).json({
    success: true,
    message: 'Email verified successfully.',
    data: {
      isEmailVerified: true,
    },
  })
})

/**
 * @desc    Resend verification OTP for logged-in user
 * @route   POST /api/auth/resend-email-otp
 * @access  Private
 */
export const resendEmailOtp = asyncHandler(async (req, res) => {
  return sendEmailOtp(req, res)
})

export default {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
}
