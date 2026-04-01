import express from 'express'
import {
    createOrder,
    verifyPayment,
    getMySubscription,
    cancelSubscription,
} from '../controllers/subscription.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

// All subscription routes require authentication
router.use(verifyToken)

// POST /api/subscriptions/create-order  — create Razorpay order
router.post('/create-order', createOrder)

// POST /api/subscriptions/verify  — verify signature & activate plan
router.post('/verify', verifyPayment)

// GET /api/subscriptions/me  — get current subscription
router.get('/me', getMySubscription)

// DELETE /api/subscriptions/me  — cancel subscription
router.delete('/me', cancelSubscription)

export default router
