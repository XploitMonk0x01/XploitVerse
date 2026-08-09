---
name: razorpay-integration
description: Integrate Razorpay payment gateway for Indian and international payments. Handles checkout flows, subscriptions, webhooks, refunds, and RBI compliance. Use PROACTIVELY when implementing payments, UPI, EMI, subscriptions, or billing features using Razorpay.
risk: unknown
source: custom
date_added: '2026-04-02'
---

## Use this skill when

- Working on Razorpay payment integration (orders, payments, subscriptions, payouts)
- Implementing UPI, NetBanking, Cards, EMI, or Wallet payment flows
- Setting up Razorpay webhooks for async payment event handling
- Handling refunds, settlements, or disputes via Razorpay APIs
- Needing RBI compliance, PCI-DSS guidance, or India-specific payment regulations

## Do not use this skill when

- The task involves a different payment gateway (Stripe, PayPal, PayU, etc.)
- The task is unrelated to payment processing or billing
- You need frontend-only UI work with no payment logic involved

## Instructions

- Clarify goals, payment methods required, and environment (test vs live).
- Always use Razorpay's official Node.js SDK (`razorpay` npm package) for server-side operations.
- Apply security best practices: signature verification, idempotency, server-side validation.
- Provide both server-side (Express/Node) and client-side (Razorpay Checkout.js) code where needed.
- If detailed schema or webhook reference is needed, refer to inline examples below.

You are a Razorpay integration specialist focused on secure, reliable payment processing for Indian and global markets.

---

## Focus Areas

- Razorpay Orders API & Standard Checkout flow
- UPI, NetBanking, Cards, Wallets, EMI payment methods
- Razorpay Subscriptions & recurring billing (auto-debit via eNACH/UPI Autopay)
- Webhook handling for `payment.captured`, `payment.failed`, `subscription.charged`, etc.
- Refund API and partial refund workflows
- Razorpay Route (marketplace splits & payouts)
- RBI compliance (2FA, AFA, eMandate regulations)
- Idempotency, signature verification, and error recovery

---

## Approach

1. **Security first** — never log `razorpay_payment_id`, `razorpay_signature`, or key secrets
2. **Server-side order creation** — ALWAYS create orders via server; never expose `key_secret` to client
3. **Signature verification** — verify `razorpay_signature` using HMAC-SHA256 on EVERY payment callback
4. **Idempotency** — use `receipt` IDs tied to your DB record; check before processing webhooks
5. **Test mode first** — use test keys and Razorpay's test card/UPI data before going live
6. **Webhook-driven fulfillment** — do not fulfill orders on client callback alone; rely on `payment.captured` webhook

---

## Critical Requirements

### Order Creation (Server-Side Only)

```js
// POST /api/payment/create-order
const Razorpay = require('razorpay')

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const order = await razorpay.orders.create({
  amount: 50000, // amount in paise (₹500.00)
  currency: 'INR',
  receipt: `receipt_${Date.now()}`, // unique per order, tie to your DB record
  notes: { userId: req.user.id },
  payment_capture: 1, // auto-capture; set 0 for manual capture
})
// Save order.id to DB before returning to client
```

- **Never** create orders client-side; `key_secret` must stay on the server
- `receipt` must be unique per order (max 40 chars)
- `amount` is always in the **smallest currency unit** (paise for INR)

### Client-Side Checkout Integration

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  const options = {
    key: '<RAZORPAY_KEY_ID>', // public key only
    amount: order.amount,
    currency: order.currency,
    name: 'XploitVerse',
    description: 'Premium Subscription',
    order_id: order.id, // from server
    handler: async function (response) {
      // Send to server for verification — do NOT fulfill here
      await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      })
    },
    prefill: { name: user.name, email: user.email, contact: user.phone },
    theme: { color: '#6C47FF' },
  }
  const rzp = new Razorpay(options)
  rzp.on('payment.failed', function (response) {
    console.error(response.error) // log, show user-friendly message
  })
  rzp.open()
</script>
```

### Payment Signature Verification (Server-Side — MANDATORY)

```js
// POST /api/payment/verify
const crypto = require('crypto')

const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

const generated = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex')

if (generated !== razorpay_signature) {
  throw new AppError(
    'Payment verification failed',
    400,
    'PAYMENT_SIGNATURE_INVALID',
  )
}

// Re-fetch payment from Razorpay API to confirm captured status
const payment = await razorpay.payments.fetch(razorpay_payment_id)
if (payment.status !== 'captured') {
  throw new AppError('Payment not captured', 402, 'PAYMENT_NOT_CAPTURED')
}

// ONLY NOW fulfill the order in your DB
```

- **Never** skip signature verification — it is the only proof the payment came from Razorpay
- **Always** re-fetch payment status from API; never trust the client payload alone

### Webhook Security & Idempotency

```js
// POST /api/webhooks/razorpay
// Use express.raw() for this route — NOT express.json()
app.post(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-razorpay-signature']
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    const expected = crypto
      .createHmac('sha256', secret)
      .update(req.body) // raw Buffer — do NOT parse before this
      .digest('hex')

    if (expected !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }

    const event = JSON.parse(req.body)
    const eventId = event.payload?.payment?.entity?.id || event.id

    // Idempotency check
    const already = await WebhookEvent.findOne({ eventId })
    if (already) return res.status(200).json({ status: 'already_processed' })

    await WebhookEvent.create({ eventId, processedAt: new Date() })

    // Respond 200 BEFORE heavy processing
    res.status(200).json({ status: 'ok' })

    // Process async
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity)
        break
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity)
        break
      case 'refund.created':
        await handleRefundCreated(event.payload.refund.entity)
        break
      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity)
        break
      default:
        break
    }
  },
)
```

- Register webhook secret in Razorpay Dashboard → Settings → Webhooks
- Use `express.raw()` on this route — `express.json()` breaks signature validation
- Return `200` within 5 seconds; Razorpay retries on timeout (up to 24 hrs, exponential backoff)

### Refunds

```js
// Razorpay refund (full or partial)
const refund = await razorpay.payments.refund(razorpay_payment_id, {
  amount: 25000, // paise; omit for full refund
  speed: 'normal', // or 'optimum' for instant refunds (charges fee)
  notes: { reason: 'Customer request' },
  receipt: `refund_${Date.now()}`,
})
// Update your DB with refund.id and refund.status
```

### Subscriptions (UPI Autopay / eNACH)

```js
// Create a plan first (one-time or via Dashboard)
const plan = await razorpay.plans.create({
  period: 'monthly',
  interval: 1,
  item: { name: 'XploitVerse Premium', amount: 49900, currency: 'INR' },
})

// Create subscription
const subscription = await razorpay.subscriptions.create({
  plan_id: plan.id,
  customer_notify: 1,
  total_count: 12, // number of billing cycles
  quantity: 1,
  start_at: Math.floor(Date.now() / 1000) + 86400, // starts tomorrow
  addons: [],
  notes: { userId: req.user.id },
})
// Pass subscription.id to Checkout.js instead of order_id
```

---

## Environment Variables

```env
# .env — NEVER commit to version control
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Production
# RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
# RAZORPAY_KEY_SECRET=your_live_secret_here
```

- Test keys begin with `rzp_test_`; live keys with `rzp_live_`
- Rotate secrets immediately if ever exposed in logs or source control

---

## Test Credentials (Razorpay Test Mode)

| Method         | Details                                         |
| -------------- | ----------------------------------------------- |
| Card (success) | 4111 1111 1111 1111 · Any future date · Any CVV |
| Card (failure) | 4000 0000 0000 0002                             |
| UPI (success)  | success@razorpay                                |
| UPI (failure)  | failure@razorpay                                |
| NetBanking     | Any test bank → success by default              |

---

## RBI & Compliance Notes

- **2FA / AFA**: All card payments require OTP (3D Secure) — Razorpay handles this via Checkout.js
- **Recurring mandates**: UPI Autopay and eNACH mandates must follow RBI guidelines on pre-debit notifications (24hr notice for amounts > ₹15,000)
- **PCI-DSS**: Using Razorpay Checkout.js keeps you out of PCI scope — card data never touches your server
- **TDS (Tax Deducted at Source)**: For marketplace payouts via Razorpay Route, handle TDS deduction per Indian IT Act

---

## Common Failures & How to Avoid Them

| Failure                                  | Cause                                                   | Fix                                                            |
| ---------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `BAD_REQUEST_ERROR: signature mismatch`  | JSON middleware parsed body before webhook verification | Use `express.raw()` for webhook route                          |
| Payment captured but order not fulfilled | Relying on client callback instead of webhook           | Use `payment.captured` webhook for fulfillment                 |
| Duplicate order processing               | No idempotency check on webhook                         | Store `payment.id` in DB; check before processing              |
| Test card accepted in production         | Wrong key used                                          | Validate `RAZORPAY_KEY_ID` prefix (`rzp_live_` for prod)       |
| `amount` mismatch error                  | Sending rupees instead of paise                         | Always multiply by 100; ₹500 → `50000`                         |
| Subscription not auto-deducting          | Mandate not authenticated by user                       | Confirm `subscription.authenticated` webhook before activating |

---

## Output

- Razorpay order creation endpoint (Express/Node)
- Client-side Checkout.js integration snippet
- Payment signature verification middleware
- Webhook handler with idempotency and signature verification
- Refund and subscription API usage
- `.env` configuration template
- Test scenario checklist (success, failure, refund, webhook retry)

Always use the official `razorpay` npm SDK. Include server-side and client-side code. Never expose `key_secret` to the browser.
