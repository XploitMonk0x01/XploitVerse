import { body, param } from 'express-validator'

/**
 * Validation rules for lab operations
 */

export const startLabValidation = [
  body('labId')
    .trim()
    .notEmpty()
    .withMessage('Lab ID is required')
    .isMongoId()
    .withMessage('Invalid Lab ID format'),
]

export const stopLabValidation = [
  body('sessionId')
    .trim()
    .notEmpty()
    .withMessage('Session ID is required')
    .isMongoId()
    .withMessage('Invalid Session ID format'),
]

export const sessionIdParamValidation = [
  param('sessionId')
    .trim()
    .notEmpty()
    .withMessage('Session ID is required')
    .isMongoId()
    .withMessage('Invalid Session ID format'),
]

export default {
  startLabValidation,
  stopLabValidation,
  sessionIdParamValidation,
}
