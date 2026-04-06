import { body } from 'express-validator'

/**
 * Validation rules for flag submission
 */

export const submitFlagValidation = [
  body('taskId')
    .trim()
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid Task ID format'),

  body('flag')
    .trim()
    .notEmpty()
    .withMessage('Flag is required')
    .isLength({ max: 256 })
    .withMessage('Flag cannot exceed 256 characters'),
]

export default { submitFlagValidation }
