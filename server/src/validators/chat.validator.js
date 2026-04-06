import { body, query } from 'express-validator'

/**
 * Validation rules for chat operations
 */

export const chatValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters'),

  body('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Session ID format'),

  body('labId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Lab ID format'),

  body('conversationHistory')
    .optional()
    .isArray({ max: 50 })
    .withMessage('Conversation history must be an array (max 50 entries)'),
]

export const suggestionsValidation = [
  query('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Session ID format'),

  query('labId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Lab ID format'),
]

export default { chatValidation, suggestionsValidation }
