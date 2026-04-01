import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useRazorpay from '../hooks/useRazorpay'
import { Check, Zap, Crown, Shield } from 'lucide-react'

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    priceLabel: '₹0',
    period: 'forever',
    icon: Shield,
    color: '#6b7280',
    description: 'Get started with the basics',
    features: [
      '3 labs per day',
      'Basic rooms only',
      'Community leaderboard',
      'Course browsing',
      'Flag submission',
    ],
    disabled: ['Custom VMs', 'AI Mentor', 'Priority queue', 'All premium rooms'],
    cta: 'Current Plan',
    isFree: true,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 49900,
    priceLabel: '₹499',
    period: '/month',
    icon: Zap,
    color: '#00ff88',
    description: 'Unlimited access to all labs',
    features: [
      'Unlimited labs per day',
      'All rooms including premium',
      'Priority queue',
      'Real-time leaderboard',
      'Course catalog access',
      'Flag submission + hints',
    ],
    disabled: ['Custom VMs', 'AI Mentor'],
    cta: 'Get Pro',
    popular: true,
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 99900,
    priceLabel: '₹999',
    period: '/month',
    icon: Crown,
    color: '#f59e0b',
    description: 'The full XploitVerse experience',
    features: [
      'Everything in Pro',
      'Custom VM labs',
      'AI Mentor (context-aware hints)',
      'Private lab environments',
      'Early access to new rooms',
      'Priority support',
    ],
    disabled: [],
    cta: 'Get Premium',
  },
]

const styles = `
  .pricing-root {
    min-height: 100vh;
    background: var(--color-paper);
    padding: var(--space-12) var(--space-4);
  }
  .pricing-header {
    text-align: center;
    margin-bottom: var(--space-12);
  }
  .pricing-badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-accent);
    border: 1px solid var(--color-accent);
    padding: 0.25rem 0.75rem;
    margin-bottom: var(--space-4);
  }
  .pricing-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--color-ink);
    line-height: 1.1;
    margin-bottom: var(--space-4);
  }
  .pricing-subtitle {
    font-size: var(--text-lg);
    color: var(--color-muted);
    max-width: 540px;
    margin: 0 auto;
  }
  .pricing-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-6);
    max-width: 1100px;
    margin: 0 auto;
  }
  @media (min-width: 768px) {
    .pricing-grid { grid-template-columns: repeat(3, 1fr); }
  }
  .pricing-card {
    position: relative;
    background: var(--color-surface);
    border: 1.5px solid var(--color-border);
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    transition: border-color 0.2s, transform 0.2s;
  }
  .pricing-card:hover {
    border-color: var(--color-muted);
    transform: translateY(-2px);
  }
  .pricing-card.popular {
    border-color: var(--color-accent);
  }
  .popular-badge {
    position: absolute;
    top: -1px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-accent);
    color: var(--color-paper);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 4px 16px;
  }
  .plan-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid;
    border-radius: 0;
  }
  .plan-name {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-ink);
  }
  .plan-desc {
    font-size: var(--text-sm);
    color: var(--color-muted);
    margin-top: 4px;
  }
  .plan-price {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
  }
  .plan-price-amount {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-ink);
  }
  .plan-price-period {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-muted);
  }
  .plan-features {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    flex: 1;
  }
  .plan-feature {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-ink);
  }
  .plan-feature.disabled {
    color: var(--color-muted);
    text-decoration: line-through;
  }
  .feature-check { color: var(--color-accent); flex-shrink: 0; }
  .feature-x { color: var(--color-muted); flex-shrink: 0; }
  .plan-cta {
    width: 100%;
    padding: 0.85rem var(--space-4);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1.5px solid;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }
  .plan-cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .plan-cta.primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-paper);
  }
  .plan-cta.primary:hover:not(:disabled) {
    background: transparent;
    color: var(--color-accent);
  }
  .plan-cta.secondary {
    background: transparent;
    border-color: var(--color-border);
    color: var(--color-muted);
  }
  .plan-cta.current {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-muted);
    cursor: default;
  }
  .pricing-note {
    text-align: center;
    margin-top: var(--space-8);
    font-size: var(--text-sm);
    color: var(--color-muted);
    font-family: var(--font-mono);
  }
  .test-cards {
    max-width: 600px;
    margin: var(--space-12) auto 0;
    border: 1px dashed var(--color-border);
    padding: var(--space-6);
    background: var(--color-surface);
  }
  .test-cards-title {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-4);
  }
  .test-card-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }
  .test-card-item {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--color-muted);
    line-height: 2;
  }
  .test-card-val { color: var(--color-ink); }
`

export default function Pricing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentPlan = user?.plan || 'FREE'

  const { openCheckout, loading } = useRazorpay({
    onSuccess: (data) => {
      navigate('/payment/success', { state: data })
    },
  })

  return (
    <>
      <style>{styles}</style>
      <div className="pricing-root">
        <div className="pricing-header">
          <span className="pricing-badge">Subscription Plans</span>
          <h1 className="pricing-title">
            Unlock Your<br />Full Potential
          </h1>
          <p className="pricing-subtitle">
            Choose the plan that fits your hacking journey. Upgrade or cancel anytime.
          </p>
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const isCurrent = currentPlan === plan.id
            const isUpgrade = !plan.isFree && !isCurrent

            return (
              <div
                key={plan.id}
                className={`pricing-card${plan.popular ? ' popular' : ''}`}
              >
                {plan.popular && (
                  <div className="popular-badge">Most Popular</div>
                )}

                <div>
                  <div
                    className="plan-icon"
                    style={{ borderColor: plan.color, color: plan.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <p className="plan-name" style={{ marginTop: 'var(--space-3)' }}>
                    {plan.name}
                  </p>
                  <p className="plan-desc">{plan.description}</p>
                </div>

                <div className="plan-price">
                  <span className="plan-price-amount">{plan.priceLabel}</span>
                  <span className="plan-price-period">{plan.period}</span>
                </div>

                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f} className="plan-feature">
                      <Check size={14} className="feature-check" />
                      {f}
                    </li>
                  ))}
                  {plan.disabled.map((f) => (
                    <li key={f} className="plan-feature disabled">
                      <span className="feature-x" style={{ fontSize: '14px', fontWeight: 700 }}>✕</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`plan-cta${isCurrent ? ' current' : plan.popular ? ' primary' : ' secondary'}`}
                  disabled={isCurrent || loading || plan.isFree}
                  onClick={() => isUpgrade && openCheckout(plan.id)}
                >
                  {loading ? 'Processing...' : isCurrent ? '✓ Current Plan' : plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        <p className="pricing-note">
          Secure payments via Razorpay · All prices in INR · Cancel anytime
        </p>

        {/* Test mode helper — shown in dev */}
        {import.meta.env.DEV && (
          <div className="test-cards">
            <p className="test-cards-title">🔧 Test Mode — Razorpay Domestic Test Cards</p>
            <div className="test-card-row">
              <div className="test-card-item">
                ✅ Success (Mastercard)<br />
                <span className="test-card-val">5267 3181 8797 5449</span><br />
                CVV: <span className="test-card-val">123</span> &nbsp;
                Expiry: <span className="test-card-val">12/27</span><br />
                OTP: <span className="test-card-val">1234</span>
              </div>
              <div className="test-card-item">
                ❌ Failure (Mastercard)<br />
                <span className="test-card-val">5104 0155 5555 5558</span><br />
                CVV: <span className="test-card-val">123</span> &nbsp;
                Expiry: <span className="test-card-val">12/27</span><br />
                OTP: <span className="test-card-val">1234</span>
              </div>
              <div className="test-card-item">
                UPI (instant success)<br />
                <span className="test-card-val">success@razorpay</span>
              </div>
            </div>
            <p style={{ marginTop: '12px', fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
              ⚠ International Visa/Mastercard are blocked in Razorpay test mode — use the numbers above.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
