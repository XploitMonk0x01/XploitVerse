import { body } from 'express-validator'
import { PLANS } from '../models/Subscription.js'

/**
 * Validation rules for subscription operations
 */

const validPaidPlans = [PLANS.PRO, PLANS.PREMIUM]

export const createOrderValidation = [
  body('plan')
    .trim()
    .notEmpty()
    .withMessage('Plan is required')
    .isIn(validPaidPlans)
    .withMessage(`Plan must be one of: ${validPaidPlans.join(', ')}`),
]

export const verifyPaymentValidation = [
  body('razorpay_order_id')
    .trim()
    .notEmpty()
    .withMessage('Razorpay order ID is required')
    .isLength({ min: 10, max: 50 })
    .withMessage('Invalid Razorpay order ID'),

  body('razorpay_payment_id')
    .trim()
    .notEmpty()
    .withMessage('Razorpay payment ID is required')
    .isLength({ min: 10, max: 50 })
    .withMessage('Invalid Razorpay payment ID'),

  body('razorpay_signature')
    .trim()
    .notEmpty()
    .withMessage('Razorpay signature is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid Razorpay signature'),
]

export default { createOrderValidation, verifyPaymentValidation }
