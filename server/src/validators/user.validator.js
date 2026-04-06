import { body, param } from 'express-validator'
import { USER_ROLES } from '../models/User.js'

/**
 * Validation rules for user management operations
 */

export const userIdParamValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid User ID format'),
]

export const updateRoleValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid User ID format'),

  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(Object.values(USER_ROLES))
    .withMessage(
      `Role must be one of: ${Object.values(USER_ROLES).join(', ')}`,
    ),
]

export default { userIdParamValidation, updateRoleValidation }
