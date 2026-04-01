import api from './api.js'

export const subscriptionService = {
    /** Create a Razorpay order for the given plan */
    createOrder: (plan) =>
        api.post('/subscriptions/create-order', { plan }).then((r) => r.data),

    /** Verify payment after Razorpay checkout succeeds */
    verifyPayment: (payload) =>
        api.post('/subscriptions/verify', payload).then((r) => r.data),

    /** Get current user's subscription status */
    getMySubscription: () =>
        api.get('/subscriptions/me').then((r) => r.data),

    /** Cancel active subscription */
    cancelSubscription: () =>
        api.delete('/subscriptions/me').then((r) => r.data),
}

export default subscriptionService
