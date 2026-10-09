import { apiClient } from './api';

export interface BillingPlan {
  key: string;
  name: string;
  currency: string;
  amount: number;
  amountRupee: number;
  period: string;
  features: string[];
}

export interface PlansResponse {
  plans: BillingPlan[];
  configured: boolean;
}

export interface SubscriptionStatus {
  plan: string;
  status: string;
  active: boolean;
  subscriptionId?: string;
  currentEnd?: number;
}

interface CheckoutTicket {
  keyId: string;
  subscriptionId: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
}

export const billingService = {
  getPlans: () => apiClient.get<PlansResponse>('/billing/plans'),
  getStatus: () => apiClient.get<SubscriptionStatus>('/billing/status'),
  subscribe: (plan: string) => apiClient.post<CheckoutTicket>('/billing/subscribe', { plan }),
  verify: (payload: Record<string, string>) =>
    apiClient.post<SubscriptionStatus>('/billing/verify', payload),
  cancel: () => apiClient.post<SubscriptionStatus>('/billing/cancel'),
};

/* ── Razorpay Checkout.js integration ── */

interface RazorpayOptions {
  key: string;
  subscription_id?: string;
  name: string;
  description?: string;
  currency?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler?: (resp: Record<string, string>) => void;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let checkoutPromise: Promise<NonNullable<Window['Razorpay']>> | null = null;

function loadCheckout(): Promise<NonNullable<Window['Razorpay']>> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutPromise) return checkoutPromise;

  checkoutPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing ?? document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    const onLoad = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error('Razorpay failed to load'));
    };
    script.addEventListener('load', onLoad);
    script.addEventListener('error', () => reject(new Error('Could not reach Razorpay')));
    if (!existing) document.head.appendChild(script);
  });
  return checkoutPromise;
}

export interface CheckoutUser {
  fullName?: string;
  username?: string;
  email?: string;
}

/**
 * Creates a server-side subscription, opens Razorpay Checkout for the mandate /
 * first payment, verifies the callback signature on the server, and resolves
 * with the confirmed subscription status.
 */
export async function startRazorpaySubscription(
  planKey: string,
  user: CheckoutUser,
): Promise<SubscriptionStatus> {
  const ticket = await billingService.subscribe(planKey);
  const Razorpay = await loadCheckout();

  return new Promise<SubscriptionStatus>((resolve, reject) => {
    const rzp = new Razorpay({
      key: ticket.keyId,
      subscription_id: ticket.subscriptionId,
      name: 'XploitVerse',
      description: `${ticket.plan} subscription`,
      currency: 'INR',
      prefill: {
        name: user.fullName || user.username,
        email: user.email,
      },
      theme: { color: '#4F46E5' },
      modal: {
        ondismiss: () => reject(new Error('Payment was cancelled')),
      },
      handler: (resp) => {
        billingService
          .verify(resp)
          .then(resolve)
          .catch((err) => reject(err instanceof Error ? err : new Error('Verification failed')));
      },
    });

    rzp.on('payment.failed', (resp) =>
      reject(new Error(resp?.error?.description || 'Payment failed')),
    );

    rzp.open();
  });
}
