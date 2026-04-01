import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import subscriptionService from '../services/subscription.js'
import { useAuth } from '../context/AuthContext'

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

const loadScript = () =>
    new Promise((resolve) => {
        if (document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`)) {
            return resolve(true)
        }
        const script = document.createElement('script')
        script.src = RAZORPAY_SCRIPT
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })

/**
 * useRazorpay — hook that opens the Razorpay checkout modal.
 *
 * Usage:
 *   const { openCheckout, loading } = useRazorpay({ onSuccess, onError })
 *   openCheckout('PRO')
 */
const useRazorpay = ({ onSuccess, onError } = {}) => {
    const [loading, setLoading] = useState(false)
    const { refreshUser } = useAuth()

    const openCheckout = useCallback(async (plan) => {
        setLoading(true)
        try {
            // 1. Load Razorpay script
            const scriptLoaded = await loadScript()
            if (!scriptLoaded) {
                throw new Error('Failed to load payment gateway. Check your internet connection.')
            }

            // 2. Create order on our server
            const orderData = await subscriptionService.createOrder(plan)

            // 3. Open Razorpay modal
            const options = {
                key: orderData.data.keyId,
                amount: orderData.data.amount,
                currency: orderData.data.currency,
                name: 'XploitVerse',
                description: `${orderData.data.plan} Plan — 30 Days`,
                image: '/favicon.svg',
                order_id: orderData.data.orderId,
                prefill: {
                    name: orderData.data.user.name,
                    email: orderData.data.user.email,
                },
                theme: { color: '#00ff88' },
                modal: {
                    ondismiss: () => {
                        setLoading(false)
                        toast('Payment cancelled.', { icon: '❌' })
                    },
                },
                handler: async (response) => {
                    try {
                        // 4. Verify payment signature on our server
                        const verified = await subscriptionService.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        })
                        toast.success(verified.message || 'Payment successful!')
                        await refreshUser()  // update Navbar plan instantly
                        onSuccess?.(verified.data)
                    } catch (err) {
                        const msg = err.response?.data?.message || 'Payment verification failed.'
                        toast.error(msg)
                        onError?.(err)
                    } finally {
                        setLoading(false)
                    }
                },
            }

            const rzp = new window.Razorpay(options)
            rzp.on('payment.failed', (response) => {
                setLoading(false)
                toast.error(`Payment failed: ${response.error.description}`)
                onError?.(response.error)
            })
            rzp.open()
        } catch (err) {
            setLoading(false)
            const msg = err.response?.data?.message || err.message || 'Something went wrong.'
            toast.error(msg)
            onError?.(err)
        }
    }, [onSuccess, onError])

    return { openCheckout, loading }
}

export default useRazorpay
