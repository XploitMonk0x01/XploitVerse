import { apiClient } from './api';
import type { SessionBilling } from '../types';

export type { SessionBilling };

/**
 * XploitVerse is pay-as-you-go: every lab session runs on a free tier, then the
 * user buys time extensions with one-time payments. There are no subscriptions.
 */

export interface PricingBlock {
  key: string;
  name: string;
  hours: number;
  minutes: number;
  amount: number; // smallest currency unit (paise)
  amountRupee: number;
}

export interface PricingResponse {
  currency: string;
  freeMinutes: number;
  hourlyRateRupee: number;
  maxSessionMinutes: number;
  warnMinutes: number;
  blocks: PricingBlock[];
  configured: boolean;
}

export interface LabOrderTicket {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  block: string;
  minutes: number;
  sessionId: number;
}

export interface ExtendResult {
  sessionId: number;
  grantedMinutes: number;
  billing: SessionBilling;
}

export interface PaymentRecord {
  id: number;
  sessionId: number;
  block: string;
  minutes: number;
  amount: number;
  currency: string;
  paymentId: string;
  status: string;
  createdAt: string;
}

export const billingService = {
  getPricing: () => apiClient.get<PricingResponse>('/billing/pricing'),
  createLabOrder: (sessionId: number, block: string) =>
    apiClient.post<LabOrderTicket>(`/billing/lab-sessions/${sessionId}/order`, { block }),
  verify: (payload: Record<string, string>) =>
    apiClient.post<ExtendResult>('/billing/verify', payload),
  getPayments: () =>
    apiClient.get<{ payments: PaymentRecord[] }>('/billing/payments'),
};

/* ── Razorpay Checkout.js integration ── */

interface RazorpayOptions {
  key: string;
  order_id?: string;
  name: string;
  description?: string;
  currency?: string;
  amount?: number;
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
 * Buys an extension block for a running lab session. Creates a one-time order on
 * the server, opens Razorpay Checkout, verifies the callback signature on the
 * server, and resolves with the extended session billing state.
 */
export async function startLabExtension(
  sessionId: number,
  block: string,
  user: CheckoutUser,
): Promise<ExtendResult> {
  const ticket = await billingService.createLabOrder(sessionId, block);
  const Razorpay = await loadCheckout();

  return new Promise<ExtendResult>((resolve, reject) => {
    const rzp = new Razorpay({
      key: ticket.keyId,
      order_id: ticket.orderId,
      name: 'XploitVerse',
      description: `Lab time extension · ${block}`,
      currency: ticket.currency,
      amount: ticket.amount,
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
