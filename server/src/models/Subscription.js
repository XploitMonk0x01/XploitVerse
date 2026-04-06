import mongoose from 'mongoose'

export const PLANS = {
  FREE: 'FREE',
  PRO: 'PRO',
  PREMIUM: 'PREMIUM',
}

// Amount in paise (INR × 100)
export const PLAN_PRICES = {
  FREE: 0,
  PRO: 49900, // ₹499
  PREMIUM: 99900, // ₹999
}

export const PLAN_DURATION_DAYS = 30

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: Object.values(PLANS),
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'cancelled'],
      default: 'pending',
    },
    // Razorpay identifiers
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
      select: false,
    },
    razorpaySignature: {
      type: String,
      default: null,
      select: false,
    },
    // Billing
    amount: {
      type: Number, // paise
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Validity
    activatedAt: {
      type: Date,
      default: null,
    },
    validUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

subscriptionSchema.index({ userId: 1, status: 1 })

const Subscription = mongoose.model('Subscription', subscriptionSchema)
export default Subscription
