import { asyncHandler } from '../middleware/error.middleware.js'
import config from '../config/index.js'
import authService from '../services/auth.service.js'

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const { user, auth, emailVerification } = await authService.registerUser(
    req.body,
  )

  res.cookie('jwt', auth.token, auth.cookieOptions)

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
      token: auth.token,
      emailVerification,
    },
  })
})

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { user, auth } = await authService.loginUser(req.body)

  res.cookie('jwt', auth.token, auth.cookieOptions)

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
      token: auth.token,
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
  const user = await authService.getCurrentUser(req.user._id)

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
  const auth = await authService.updateUserPassword({
    userId: req.user._id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  })

  res.cookie('jwt', auth.token, auth.cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    data: { token: auth.token },
  })
})

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh-token
 * @access  Private
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const auth = authService.refreshUserToken(req.user)

  res.cookie('jwt', auth.token, auth.cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { token: auth.token },
  })
})

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const genericResponse = {
    success: true,
    message:
      'If an account with that email exists, a password reset link has been sent.',
  }

  const resetMeta = await authService.requestPasswordReset(req.body.email)
  if (!resetMeta) {
    return res.status(200).json(genericResponse)
  }

  if (config.nodeEnv === 'development' && resetMeta.isDevelopment) {
    return res.status(200).json({
      ...genericResponse,
      data: {
        resetToken: resetMeta.resetToken,
        resetURL: resetMeta.resetURL,
        expiresAt: resetMeta.expiresAt,
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
  const auth = await authService.resetPasswordWithToken({
    token: req.params.token,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  })

  res.cookie('jwt', auth.token, auth.cookieOptions)

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You are now logged in.',
    data: { token: auth.token },
  })
})

/**
 * @desc    Send verification OTP for logged-in user
 * @route   POST /api/auth/send-email-otp
 * @access  Private
 */
export const sendEmailOtp = asyncHandler(async (req, res) => {
  const otpMeta = await authService.sendUserEmailOtp(req.user._id)

  if (otpMeta.alreadyVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified.',
      data: {
        isEmailVerified: true,
      },
    })
  }

  res.status(200).json({
    success: true,
    message: otpMeta.otpSent
      ? 'Verification OTP sent to your email.'
      : 'Verification OTP generated. Email service is not configured.',
    data: {
      isEmailVerified: false,
      otpSent: otpMeta.otpSent,
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
  const verification = await authService.verifyUserEmailOtp({
    userId: req.user._id,
    otp: req.body.otp,
  })

  if (verification.alreadyVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified.',
      data: {
        isEmailVerified: true,
      },
    })
  }

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
  const otpMeta = await authService.resendUserEmailOtp(req.user._id)

  if (otpMeta.alreadyVerified) {
    return res.status(200).json({
      success: true,
      message: 'Email is already verified.',
      data: {
        isEmailVerified: true,
      },
    })
  }

  return res.status(200).json({
    success: true,
    message: otpMeta.otpSent
      ? 'Verification OTP sent to your email.'
      : 'Verification OTP generated. Email service is not configured.',
    data: {
      isEmailVerified: false,
      otpSent: otpMeta.otpSent,
      expiresAt: otpMeta.expiresAt,
      otp: otpMeta.otp,
    },
  })
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
