import { validationResult } from 'express-validator'

/**
 * Validation result handler middleware
 * Use after validation rules to check for errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }))

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    })
  }

  next()
}

// Auth validators
export {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailOtpValidation,
} from './auth.validator.js'

// Lab validators
export {
  startLabValidation,
  stopLabValidation,
  sessionIdParamValidation,
} from './lab.validator.js'

// Flag validators
export { submitFlagValidation } from './flag.validator.js'

// Subscription validators
export {
  createOrderValidation,
  verifyPaymentValidation,
} from './subscription.validator.js'

// Chat validators
export { chatValidation, suggestionsValidation } from './chat.validator.js'

// User validators
export {
  userIdParamValidation,
  updateRoleValidation,
} from './user.validator.js'

