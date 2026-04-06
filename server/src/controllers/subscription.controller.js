import { asyncHandler } from '../middleware/error.middleware.js'
import subscriptionService from '../services/subscription.service.js'

// ── Create Razorpay Order ─────────────────────────────────────────────

/**
 * POST /api/subscriptions/create-order
 * Body: { plan: 'PRO' | 'PREMIUM' }
 * Creates a Razorpay order server-side and returns order details to the frontend.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const order = await subscriptionService.createOrderForUser({
    user: req.user,
    plan: req.body.plan,
  })

  res.status(201).json({
    success: true,
    data: order,
  })
})

// ── Verify Payment ────────────────────────────────────────────────────

/**
 * POST /api/subscriptions/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies the HMAC-SHA256 signature and activates the subscription.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const verification = await subscriptionService.verifySubscriptionPayment({
    userId: req.user._id,
    razorpay_order_id: req.body.razorpay_order_id,
    razorpay_payment_id: req.body.razorpay_payment_id,
    razorpay_signature: req.body.razorpay_signature,
  })

  res.status(200).json({
    success: true,
    message: verification.message,
    data: verification.data,
  })
})

/**
 * POST /api/subscriptions/webhook
 * Verifies Razorpay webhook signature and activates pending subscriptions.
 * Expects req.rawBody to be available (configured at app-level json parser verify hook).
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const result = await subscriptionService.processWebhook({
    signature: req.headers['x-razorpay-signature'],
    rawBody: req.rawBody,
    event: req.body,
  })

  res.status(200).json({ success: true, message: result.message })
})

// ── Get My Subscription ───────────────────────────────────────────────

/**
 * GET /api/subscriptions/me
 * Returns the current user's active subscription, or FREE defaults.
 */
export const getMySubscription = asyncHandler(async (req, res) => {
  const summary = await subscriptionService.getUserSubscriptionSummary(
    req.user._id,
  )

  res.status(200).json({
    success: true,
    data: summary,
  })
})

// ── Cancel Subscription ───────────────────────────────────────────────

/**
 * DELETE /api/subscriptions/me
 * Cancels the current active subscription (no refund, just soft-cancel).
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const cancelled = await subscriptionService.cancelUserSubscription(
    req.user._id,
  )

  res.status(200).json({
    success: true,
    message:
      'Subscription cancelled. You have been downgraded to the Free plan.',
    data: cancelled,
  })
})

export default {
  createOrder,
  verifyPayment,
  handleWebhook,
  getMySubscription,
  cancelSubscription,
}
