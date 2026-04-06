import express from 'express'
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getMySubscription,
  cancelSubscription,
} from '../controllers/subscription.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'
import {
  createOrderValidation,
  verifyPaymentValidation,
  validate,
} from '../validators/index.js'

const router = express.Router()

// Webhook endpoint must be public (signature-verified in controller)
router.post('/webhook', handleWebhook)

// All subscription routes require authentication
router.use(verifyToken)

// POST /api/subscriptions/create-order  — create Razorpay order
router.post('/create-order', createOrderValidation, validate, createOrder)

// POST /api/subscriptions/verify  — verify signature & activate plan
router.post('/verify', verifyPaymentValidation, validate, verifyPayment)

// GET /api/subscriptions/me  — get current subscription
router.get('/me', getMySubscription)

// DELETE /api/subscriptions/me  — cancel subscription
router.delete('/me', cancelSubscription)

export default router
