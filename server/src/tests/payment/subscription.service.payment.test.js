import crypto from 'crypto'
import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals'

const mockOrdersCreate = jest.fn()
const mockPaymentsFetch = jest.fn()
const mockSubscriptionFindOne = jest.fn()
const mockSubscriptionCreate = jest.fn()
const mockSubscriptionUpdateMany = jest.fn()
const mockUserFindByIdAndUpdate = jest.fn()
const mockUserFindById = jest.fn()
const mockRedisDel = jest.fn()

jest.unstable_mockModule('../../config/razorpay.js', () => ({
  default: {
    orders: {
      create: mockOrdersCreate,
    },
    payments: {
      fetch: mockPaymentsFetch,
    },
  },
}))

jest.unstable_mockModule('../../config/index.js', () => ({
  default: {
    razorpay: {
      keyId: 'rzp_test_key',
      keySecret: 'test_secret_1234567890',
      webhookSecret: 'test_webhook_secret_1234567890',
    },
  },
}))

jest.unstable_mockModule('../../models/Subscription.js', () => ({
  PLANS: {
    FREE: 'FREE',
    PRO: 'PRO',
    PREMIUM: 'PREMIUM',
  },
  PLAN_PRICES: {
    FREE: 0,
    PRO: 49900,
    PREMIUM: 99900,
  },
  PLAN_DURATION_DAYS: 30,
  default: {
    findOne: mockSubscriptionFindOne,
    create: mockSubscriptionCreate,
    updateMany: mockSubscriptionUpdateMany,
  },
}))

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
    findById: mockUserFindById,
  },
}))

jest.unstable_mockModule('../../config/redis.js', () => ({
  getRedis: () => ({
    del: mockRedisDel,
  }),
}))

let verifySubscriptionPayment

describe('subscription.service payment', () => {
  beforeAll(async () => {
    ;({ verifySubscriptionPayment } =
      await import('../../services/subscription.service.js'))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('rejects payment verification when signature is invalid', async () => {
    await expect(
      verifySubscriptionPayment({
        userId: 'user-1',
        razorpay_order_id: 'order_1234567890',
        razorpay_payment_id: 'pay_1234567890',
        razorpay_signature: 'invalid_signature',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment verification failed. Invalid signature.',
    })

    expect(mockPaymentsFetch).not.toHaveBeenCalled()
    expect(mockSubscriptionFindOne).not.toHaveBeenCalled()
  })

  it('activates subscription on valid captured payment', async () => {
    const orderId = 'order_abcdef123456'
    const paymentId = 'pay_abcdef123456'
    const payload = `${orderId}|${paymentId}`
    const signature = crypto
      .createHmac('sha256', 'test_secret_1234567890')
      .update(payload)
      .digest('hex')

    mockPaymentsFetch.mockResolvedValue({
      order_id: orderId,
      status: 'captured',
    })

    const subscriptionDoc = {
      userId: {
        toString: () => 'user-1',
      },
      plan: 'PRO',
      amount: 49900,
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
    }

    const selectSubscriptionMock = jest.fn().mockResolvedValue(subscriptionDoc)
    mockSubscriptionFindOne.mockReturnValue({
      select: selectSubscriptionMock,
    })

    const result = await verifySubscriptionPayment({
      userId: 'user-1',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    })

    expect(result.message).toContain('PRO plan activated successfully')
    expect(subscriptionDoc.save).toHaveBeenCalled()
    expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
      subscriptionDoc.userId,
      {
        plan: 'PRO',
        $inc: { totalSpent: 499 },
      },
    )
    expect(mockRedisDel).toHaveBeenCalledWith('user:user-1')
  })

  it('rejects payment verification when fetched payment order does not match', async () => {
    const orderId = 'order_primary_123'
    const paymentId = 'pay_primary_123'
    const signature = crypto
      .createHmac('sha256', 'test_secret_1234567890')
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    mockPaymentsFetch.mockResolvedValue({
      order_id: 'order_other_999',
      status: 'captured',
    })

    await expect(
      verifySubscriptionPayment({
        userId: 'user-1',
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment order mismatch.',
    })

    expect(mockSubscriptionFindOne).not.toHaveBeenCalled()
  })

  it('rejects payment verification when payment is not captured', async () => {
    const orderId = 'order_capture_check_123'
    const paymentId = 'pay_capture_check_123'
    const signature = crypto
      .createHmac('sha256', 'test_secret_1234567890')
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    mockPaymentsFetch.mockResolvedValue({
      order_id: orderId,
      status: 'authorized',
    })

    await expect(
      verifySubscriptionPayment({
        userId: 'user-1',
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    ).rejects.toMatchObject({
      statusCode: 402,
      message: 'Payment is not captured yet.',
    })

    expect(mockSubscriptionFindOne).not.toHaveBeenCalled()
  })

  it('returns already-active response when pending order was processed earlier', async () => {
    const orderId = 'order_idempotent_123'
    const paymentId = 'pay_idempotent_123'
    const signature = crypto
      .createHmac('sha256', 'test_secret_1234567890')
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    mockPaymentsFetch.mockResolvedValue({
      order_id: orderId,
      status: 'captured',
    })

    mockSubscriptionFindOne
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue(null),
      })
      .mockResolvedValueOnce({
        plan: 'PRO',
        activatedAt: new Date('2026-04-01T00:00:00.000Z'),
        validUntil: new Date('2026-05-01T00:00:00.000Z'),
      })

    const result = await verifySubscriptionPayment({
      userId: 'user-1',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    })

    expect(result).toMatchObject({
      message: 'PRO plan already active.',
      data: {
        plan: 'PRO',
      },
    })
  })
})
