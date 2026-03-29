import { validationResult } from 'express-validator'
import { ApiError } from '../middleware/error.middleware.js'

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

export {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from './auth.validator.js'
