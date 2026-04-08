import express from 'express'
import request from 'supertest'
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'

const mockCreateOrder = jest.fn((req, res) => {
  return res.status(201).json({
    success: true,
    data: {
      plan: req.body.plan,
      orderId: 'order_test_123',
    },
  })
})

const mockVerifyPayment = jest.fn((_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'verified',
  })
})

const mockHandleWebhook = jest.fn((_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Webhook acknowledged.',
  })
})

const mockGetMySubscription = jest.fn((_req, res) => {
  return res.status(200).json({ success: true, data: { plan: 'FREE' } })
})

const mockCancelSubscription = jest.fn((_req, res) => {
  return res.status(200).json({ success: true, data: { plan: 'FREE' } })
})

const mockVerifyToken = jest.fn((req, _res, next) => {
  req.user = { _id: 'user-1', role: 'STUDENT' }
  next()
})

jest.unstable_mockModule(
  '../../controllers/subscription.controller.js',
  () => ({
    createOrder: mockCreateOrder,
    verifyPayment: mockVerifyPayment,
    handleWebhook: mockHandleWebhook,
    getMySubscription: mockGetMySubscription,
    cancelSubscription: mockCancelSubscription,
  }),
)

jest.unstable_mockModule('../../middleware/auth.middleware.js', () => ({
  verifyToken: mockVerifyToken,
}))

describe('subscription.routes integration', () => {
  let app

  beforeAll(async () => {
    const { default: subscriptionRoutes } =
      await import('../../routes/subscription.routes.js')
    app = express()
    app.use(express.json())
    app.use('/api/subscriptions', subscriptionRoutes)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('keeps webhook route public (no verifyToken middleware)', async () => {
    const response = await request(app)
      .post('/api/subscriptions/webhook')
      .send({ event: 'payment.captured' })

    expect(response.status).toBe(200)
    expect(mockHandleWebhook).toHaveBeenCalledTimes(1)
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('rejects create-order when plan is missing', async () => {
    const response = await request(app)
      .post('/api/subscriptions/create-order')
      .send({})

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toBe('Validation failed')
    expect(mockCreateOrder).not.toHaveBeenCalled()
    expect(mockVerifyToken).toHaveBeenCalledTimes(1)
  })

  it('accepts create-order when plan is valid', async () => {
    const response = await request(app)
      .post('/api/subscriptions/create-order')
      .send({ plan: 'PRO' })

    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.plan).toBe('PRO')
    expect(mockCreateOrder).toHaveBeenCalledTimes(1)
  })
})
