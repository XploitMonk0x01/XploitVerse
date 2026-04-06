import crypto from 'crypto'
import razorpay from '../config/razorpay.js'
import config from '../config/index.js'
import Subscription, {
  PLANS,
  PLAN_PRICES,
  PLAN_DURATION_DAYS,
} from '../models/Subscription.js'
import User from '../models/User.js'
import { ApiError } from '../middleware/error.middleware.js'
import { getRedis } from '../config/redis.js'

const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const bustUserCache = async (userId) => {
  const redis = getRedis()
  if (redis) {
    await redis.del(`user:${userId}`)
  }
}

const verifyRazorpaySignature = (payload, signature, secret) => {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return expected === signature
}

const activateSubscription = async ({ subscription, paymentId, signature }) => {
  const now = new Date()
  const validUntil = addDays(now, PLAN_DURATION_DAYS)

  subscription.status = 'active'
  subscription.razorpayPaymentId = paymentId
  subscription.razorpaySignature = signature
  subscription.activatedAt = now
  subscription.validUntil = validUntil
  await subscription.save()

  await User.findByIdAndUpdate(subscription.userId, {
    plan: subscription.plan,
    $inc: { totalSpent: (subscription.amount || 0) / 100 },
  })

  await bustUserCache(subscription.userId.toString())
}

export const createOrderForUser = async ({ user, plan }) => {
  if (!plan || !PLAN_PRICES[plan]) {
    throw new ApiError('Invalid plan. Choose PRO or PREMIUM.', 400)
  }

  if (plan === PLANS.FREE) {
    throw new ApiError('Cannot purchase the Free plan.', 400)
  }

  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new ApiError('Payment gateway not configured.', 503)
  }

  const existing = await Subscription.findOne({
    userId: user._id,
    plan,
    status: 'active',
    validUntil: { $gt: new Date() },
  })

  if (existing) {
    throw new ApiError(
      `You already have an active ${plan} subscription valid until ${existing.validUntil.toDateString()}.`,
      409,
    )
  }

  const amount = PLAN_PRICES[plan]
  const receipt = `xv_${plan.toLowerCase()}_${user._id.toString().slice(-6)}_${Date.now()}`

  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt,
    notes: {
      userId: user._id.toString(),
      plan,
      username: user.username,
    },
  })

  await Subscription.create({
    userId: user._id,
    plan,
    status: 'pending',
    razorpayOrderId: order.id,
    amount,
    currency: 'INR',
  })

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config.razorpay.keyId,
    plan,
    user: {
      name: user.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user.username,
      email: user.email,
    },
  }
}

export const verifySubscriptionPayment = async ({
  userId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError('Missing payment verification fields.', 400)
  }

  if (!config.razorpay.keySecret) {
    throw new ApiError('Payment verification is not configured on server.', 503)
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`
  if (
    !verifyRazorpaySignature(
      body,
      razorpay_signature,
      config.razorpay.keySecret,
    )
  ) {
    throw new ApiError('Payment verification failed. Invalid signature.', 400)
  }

  const payment = await razorpay.payments.fetch(razorpay_payment_id)
  if (payment.order_id !== razorpay_order_id) {
    throw new ApiError('Payment order mismatch.', 400)
  }

  if (payment.status !== 'captured') {
    throw new ApiError('Payment is not captured yet.', 402)
  }

  const subscription = await Subscription.findOne({
    razorpayOrderId: razorpay_order_id,
    userId,
    status: 'pending',
  }).select('+razorpayPaymentId +razorpaySignature')

  if (!subscription) {
    const alreadyProcessed = await Subscription.findOne({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'active',
    })

    if (alreadyProcessed) {
      return {
        message: `${alreadyProcessed.plan} plan already active.`,
        data: {
          plan: alreadyProcessed.plan,
          activatedAt: alreadyProcessed.activatedAt,
          validUntil: alreadyProcessed.validUntil,
        },
      }
    }

    throw new ApiError(
      'Subscription order not found or already processed.',
      404,
    )
  }

  await activateSubscription({
    subscription,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  })

  return {
    message: `${subscription.plan} plan activated successfully!`,
    data: {
      plan: subscription.plan,
      activatedAt: subscription.activatedAt,
      validUntil: subscription.validUntil,
    },
  }
}

export const processWebhook = async ({ signature, rawBody, event }) => {
  if (!signature || !config.razorpay.webhookSecret) {
    throw new ApiError('Webhook signature or secret missing.', 400)
  }

  if (!rawBody) {
    throw new ApiError(
      'Webhook raw payload unavailable for signature verification.',
      400,
    )
  }

  if (
    !verifyRazorpaySignature(rawBody, signature, config.razorpay.webhookSecret)
  ) {
    throw new ApiError('Invalid webhook signature.', 400)
  }

  if (event?.event !== 'payment.captured') {
    return { message: 'Webhook acknowledged.' }
  }

  const paymentEntity = event?.payload?.payment?.entity
  const orderId = paymentEntity?.order_id
  const paymentId = paymentEntity?.id

  if (!orderId || !paymentId) {
    throw new ApiError('Invalid webhook payload.', 400)
  }

  const subscription = await Subscription.findOne({
    razorpayOrderId: orderId,
    status: 'pending',
  }).select('+razorpayPaymentId +razorpaySignature')

  if (!subscription) {
    return { message: 'Webhook already processed.' }
  }

  await activateSubscription({
    subscription,
    paymentId,
    signature,
  })

  return { message: 'Webhook processed.' }
}

export const getUserSubscriptionSummary = async (userId) => {
  await Subscription.updateMany(
    { userId, status: 'active', validUntil: { $lt: new Date() } },
    { $set: { status: 'expired' } },
  )

  const stillActive = await Subscription.findOne({
    userId,
    status: 'active',
    validUntil: { $gt: new Date() },
  })

  if (!stillActive) {
    const user = await User.findById(userId)
    if (user && user.plan !== PLANS.FREE) {
      await User.findByIdAndUpdate(userId, { plan: PLANS.FREE })
      await bustUserCache(userId.toString())
    }
  }

  const subscription = await Subscription.findOne({
    userId,
    status: 'active',
    validUntil: { $gt: new Date() },
  }).sort({ validUntil: -1 })

  const user = await User.findById(userId)

  return {
    plan: subscription?.plan || PLANS.FREE,
    status: subscription ? 'active' : 'none',
    validUntil: subscription?.validUntil || null,
    activatedAt: subscription?.activatedAt || null,
    totalSpent: user?.totalSpent || 0,
  }
}

export const cancelUserSubscription = async (userId) => {
  const subscription = await Subscription.findOne({
    userId,
    status: 'active',
  })

  if (!subscription) {
    throw new ApiError('No active subscription to cancel.', 404)
  }

  subscription.status = 'cancelled'
  await subscription.save()

  await User.findByIdAndUpdate(userId, { plan: PLANS.FREE })
  await bustUserCache(userId.toString())

  return { plan: PLANS.FREE }
}

export default {
  createOrderForUser,
  verifySubscriptionPayment,
  processWebhook,
  getUserSubscriptionSummary,
  cancelUserSubscription,
}
