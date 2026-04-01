import crypto from 'crypto'
import razorpay from '../config/razorpay.js'
import config from '../config/index.js'
import Subscription, { PLANS, PLAN_PRICES, PLAN_DURATION_DAYS } from '../models/Subscription.js'
import User from '../models/User.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'
import { getRedis } from '../config/redis.js'

// ── Helpers ───────────────────────────────────────────────────────────

const addDays = (date, days) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
}

// Invalidate user Redis cache after plan change so next request re-fetches
const bustUserCache = async (userId) => {
    const redis = getRedis()
    if (redis) await redis.del(`user:${userId}`)
}

// ── Create Razorpay Order ─────────────────────────────────────────────

/**
 * POST /api/subscriptions/create-order
 * Body: { plan: 'PRO' | 'PREMIUM' }
 * Creates a Razorpay order server-side and returns order details to the frontend.
 */
export const createOrder = asyncHandler(async (req, res) => {
    const { plan } = req.body

    if (!plan || !PLAN_PRICES[plan]) {
        throw new ApiError('Invalid plan. Choose PRO or PREMIUM.', 400)
    }

    if (plan === PLANS.FREE) {
        throw new ApiError('Cannot purchase the Free plan.', 400)
    }

    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
        throw new ApiError('Payment gateway not configured.', 503)
    }

    // Check for already active subscription
    const existing = await Subscription.findOne({
        userId: req.user._id,
        plan,
        status: 'active',
        validUntil: { $gt: new Date() },
    })
    if (existing) {
        throw new ApiError(`You already have an active ${plan} subscription valid until ${existing.validUntil.toDateString()}.`, 409)
    }

    const amount = PLAN_PRICES[plan]
    const receipt = `xv_${plan.toLowerCase()}_${req.user._id.toString().slice(-6)}_${Date.now()}`

    // Create order on Razorpay
    const order = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt,
        notes: {
            userId: req.user._id.toString(),
            plan,
            username: req.user.username,
        },
    })

    // Save pending subscription (we use this for verification later)
    await Subscription.create({
        userId: req.user._id,
        plan,
        status: 'pending',
        razorpayOrderId: order.id,
        amount,
        currency: 'INR',
    })

    res.status(201).json({
        success: true,
        data: {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: config.razorpay.keyId,
            plan,
            user: {
                name: req.user.firstName
                    ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
                    : req.user.username,
                email: req.user.email,
            },
        },
    })
})

// ── Verify Payment ────────────────────────────────────────────────────

/**
 * POST /api/subscriptions/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Verifies the HMAC-SHA256 signature and activates the subscription.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError('Missing payment verification fields.', 400)
    }

    // HMAC-SHA256: order_id + "|" + payment_id signed with key_secret
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(body)
        .digest('hex')

    if (expectedSignature !== razorpay_signature) {
        throw new ApiError('Payment verification failed. Invalid signature.', 400)
    }

    // Find the pending subscription
    const subscription = await Subscription.findOne({
        razorpayOrderId: razorpay_order_id,
        userId: req.user._id,
        status: 'pending',
    }).select('+razorpayPaymentId +razorpaySignature')

    if (!subscription) {
        throw new ApiError('Subscription order not found or already processed.', 404)
    }

    const now = new Date()
    const validUntil = addDays(now, PLAN_DURATION_DAYS)

    // Activate subscription
    subscription.status = 'active'
    subscription.razorpayPaymentId = razorpay_payment_id
    subscription.razorpaySignature = razorpay_signature
    subscription.activatedAt = now
    subscription.validUntil = validUntil
    await subscription.save()

    // Update user's plan field for fast tier checks
    await User.findByIdAndUpdate(req.user._id, { plan: subscription.plan })
    await bustUserCache(req.user._id.toString())

    res.status(200).json({
        success: true,
        message: `${subscription.plan} plan activated successfully!`,
        data: {
            plan: subscription.plan,
            activatedAt: subscription.activatedAt,
            validUntil: subscription.validUntil,
        },
    })
})

// ── Get My Subscription ───────────────────────────────────────────────

/**
 * GET /api/subscriptions/me
 * Returns the current user's active subscription, or FREE defaults.
 */
export const getMySubscription = asyncHandler(async (req, res) => {
    // Expire stale subscriptions on read (lightweight TTL enforcement)
    await Subscription.updateMany(
        { userId: req.user._id, status: 'active', validUntil: { $lt: new Date() } },
        { $set: { status: 'expired' } },
    )
    // Reset plan to FREE if all subs expired
    const stillActive = await Subscription.findOne({
        userId: req.user._id,
        status: 'active',
        validUntil: { $gt: new Date() },
    })
    if (!stillActive) {
        const user = await User.findById(req.user._id)
        if (user && user.plan !== PLANS.FREE) {
            await User.findByIdAndUpdate(req.user._id, { plan: PLANS.FREE })
            await bustUserCache(req.user._id.toString())
        }
    }

    const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: 'active',
        validUntil: { $gt: new Date() },
    }).sort({ validUntil: -1 })

    const user = await User.findById(req.user._id)

    res.status(200).json({
        success: true,
        data: {
            plan: subscription?.plan || PLANS.FREE,
            status: subscription ? 'active' : 'none',
            validUntil: subscription?.validUntil || null,
            activatedAt: subscription?.activatedAt || null,
            totalSpent: user?.totalSpent || 0,
        },
    })
})

// ── Cancel Subscription ───────────────────────────────────────────────

/**
 * DELETE /api/subscriptions/me
 * Cancels the current active subscription (no refund, just soft-cancel).
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({
        userId: req.user._id,
        status: 'active',
    })

    if (!subscription) {
        throw new ApiError('No active subscription to cancel.', 404)
    }

    subscription.status = 'cancelled'
    await subscription.save()

    await User.findByIdAndUpdate(req.user._id, { plan: PLANS.FREE })
    await bustUserCache(req.user._id.toString())

    res.status(200).json({
        success: true,
        message: 'Subscription cancelled. You have been downgraded to the Free plan.',
        data: { plan: PLANS.FREE },
    })
})

export default { createOrder, verifyPayment, getMySubscription, cancelSubscription }
