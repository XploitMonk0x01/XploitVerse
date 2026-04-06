import crypto from 'crypto'
import config from '../config/index.js'
import User from '../models/User.js'
import { ApiError } from '../middleware/error.middleware.js'
import { createTokenResponse } from '../utils/jwt.utils.js'
import emailService from './email.service.js'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('auth-service')

const OTP_TTL_MINUTES = 10
const OTP_RESEND_COOLDOWN_SECONDS = 60
const OTP_MAX_ATTEMPTS = 5

const generateSixDigitOtp = () => `${crypto.randomInt(100000, 1000000)}`

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex')

const getUserWithEmailOtpFields = async (userId) => {
  return User.findById(userId).select(
    '+emailVerificationOtpHash +emailVerificationOtpExpires +emailVerificationOtpAttempts +emailVerificationOtpLastSentAt',
  )
}

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
      log.error(
        { err: error.message, email: user.email },
        'Failed to send verification OTP email',
      )
    }
  }

  return {
    sent,
    expiresAt,
    otp: config.nodeEnv === 'development' ? otp : undefined,
  }
}

export const registerUser = async ({
  username,
  email,
  password,
  firstName,
  lastName,
  role,
}) => {
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  })

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username'
    throw new ApiError(`User with this ${field} already exists`, 400)
  }

  const user = await User.create({
    username,
    email,
    password,
    firstName,
    lastName,
    role: config.nodeEnv === 'development' ? role : undefined,
  })

  const auth = createTokenResponse(user)
  const otpMeta = await issueEmailOtpForUser(user, { force: true })

  return {
    user,
    auth,
    emailVerification: {
      required: !user.isEmailVerified,
      otpSent: otpMeta.sent,
      expiresAt: otpMeta.expiresAt,
      otp: otpMeta.otp,
    },
  }
}

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password')

  if (!user) {
    throw new ApiError('Invalid email or password', 401)
  }

  if (!user.isActive) {
    throw new ApiError(
      'Your account has been deactivated. Please contact support.',
      401,
    )
  }

  const isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw new ApiError('Invalid email or password', 401)
  }

  user.lastLogin = new Date()
  await user.save({ validateBeforeSave: false })

  return {
    user,
    auth: createTokenResponse(user),
  }
}

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).populate('activeSessions')

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  return user
}

export const updateUserPassword = async ({
  userId,
  currentPassword,
  newPassword,
}) => {
  const user = await User.findById(userId).select('+password')

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  const isPasswordValid = await user.comparePassword(currentPassword)
  if (!isPasswordValid) {
    throw new ApiError('Current password is incorrect', 400)
  }

  user.password = newPassword
  await user.save()

  return createTokenResponse(user)
}

export const refreshUserToken = (user) => createTokenResponse(user)

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email })
  if (!user) {
    return null
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
      log.error(
        { err: error.message, email: user.email },
        'Failed to send reset email',
      )
    }
  }

  return {
    resetToken: plainToken,
    resetURL,
    expiresAt,
    isDevelopment: config.nodeEnv === 'development',
  }
}

export const resetPasswordWithToken = async ({
  token,
  password,
  confirmPassword,
}) => {
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

  return createTokenResponse(user)
}

export const sendUserEmailOtp = async (userId) => {
  const user = await getUserWithEmailOtpFields(userId)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (user.isEmailVerified) {
    return {
      alreadyVerified: true,
      isEmailVerified: true,
    }
  }

  const otpMeta = await issueEmailOtpForUser(user)

  return {
    alreadyVerified: false,
    isEmailVerified: false,
    otpSent: otpMeta.sent,
    expiresAt: otpMeta.expiresAt,
    otp: otpMeta.otp,
  }
}

export const verifyUserEmailOtp = async ({ userId, otp }) => {
  const user = await getUserWithEmailOtpFields(userId)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (user.isEmailVerified) {
    return {
      alreadyVerified: true,
      isEmailVerified: true,
    }
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

  return {
    alreadyVerified: false,
    isEmailVerified: true,
  }
}

export const resendUserEmailOtp = async (userId) => sendUserEmailOtp(userId)

export default {
  registerUser,
  loginUser,
  getCurrentUser,
  updateUserPassword,
  refreshUserToken,
  requestPasswordReset,
  resetPasswordWithToken,
  sendUserEmailOtp,
  verifyUserEmailOtp,
  resendUserEmailOtp,
}
