import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Zap, Crown, Loader2, CalendarDays, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import subscriptionService from '../services/subscription.js'

const PLAN_ICONS = { PRO: Zap, PREMIUM: Crown }

const styles = `
  .success-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-paper);
    padding: var(--space-8) var(--space-4);
    background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .success-card {
    max-width: 560px;
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: var(--space-10);
    position: relative;
    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
  }
  .success-card::before {
    content: '[ BILLING_OK ]';
    position: absolute;
    top: -12px;
    left: var(--space-6);
    background: var(--color-paper);
    padding: 0 var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--color-muted);
    letter-spacing: 0.1em;
  }
  .success-header {
    text-align: center;
    margin-bottom: var(--space-8);
    border-bottom: 1px dashed var(--color-border);
    padding-bottom: var(--space-6);
  }
  .success-icon-wrap {
    width: 78px;
    height: 78px;
    background: rgba(0, 255, 136, 0.08);
    border: 1px solid var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--space-6);
    color: var(--color-accent);
  }
  .success-title {
    font-family: var(--font-display);
    font-size: var(--text-4xl);
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: var(--space-3);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .success-sub {
    font-size: var(--text-sm);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    line-height: 1.6;
  }
  .status-sync {
    margin-top: var(--space-3);
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: uppercase;
    color: var(--color-muted);
  }
  .status-sync.ok { color: var(--color-accent); }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .success-details {
    border: 1px dashed var(--color-border);
    padding: var(--space-5);
    margin-bottom: var(--space-8);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    background: var(--color-paper);
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .detail-label { color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .detail-value { color: var(--color-ink); font-weight: 700; }
  .actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }
  .success-cta,
  .success-secondary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.85rem var(--space-6);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    border: 1px solid var(--color-accent);
    transition: all 0.15s;
    width: 100%;
    justify-content: center;
  }
  .success-cta {
    background: var(--color-accent);
    color: var(--color-paper);
  }
  .success-cta:hover {
    background: transparent;
    color: var(--color-accent);
  }
  .success-secondary {
    background: transparent;
    color: var(--color-accent);
  }
  .success-secondary:hover {
    background: var(--color-accent);
    color: var(--color-paper);
  }
`

export default function PaymentSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { refreshUser, updateUser } = useAuth()
  const stateData = location.state
  const [displayPlan, setDisplayPlan] = useState(stateData?.plan || 'FREE')
  const [displayValidUntil, setDisplayValidUntil] = useState(stateData?.validUntil || null)
  const [syncingStatus, setSyncingStatus] = useState(true)
  const [syncMessage, setSyncMessage] = useState('Synchronizing account status')

  // If no payment data (e.g. direct nav), redirect to pricing
  useEffect(() => {
    if (!stateData) navigate('/pricing', { replace: true })
  }, [stateData, navigate])

  useEffect(() => {
    let cancelled = false

    const syncStatus = async () => {
      if (!stateData) return

      try {
        await refreshUser()
      } catch {
        // keep fallback below
      }

      const attempts = 3
      for (let i = 0; i < attempts; i += 1) {
        try {
          const result = await subscriptionService.getMySubscription()
          const plan = result?.data?.plan || stateData.plan || 'FREE'
          const validUntil = result?.data?.validUntil || stateData.validUntil || null

          if (!cancelled) {
            setDisplayPlan(plan)
            setDisplayValidUntil(validUntil)
            updateUser({ plan })
            if (plan && plan !== 'FREE') {
              setSyncMessage('Account upgraded and ready')
              setSyncingStatus(false)
              return
            }
          }
        } catch {
          // retry briefly
        }

        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 700))
        }
      }

      if (!cancelled) {
        setSyncMessage('Status synced')
        setSyncingStatus(false)
      }
    }

    syncStatus()

    return () => {
      cancelled = true
    }
  }, [stateData, refreshUser, updateUser])

  if (!stateData) return null

  const PlanIcon = PLAN_ICONS[displayPlan] || Zap
  const validDate = useMemo(() => (
    displayValidUntil
      ? new Date(displayValidUntil).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      : '—'
  ), [displayValidUntil])

  return (
    <>
      <style>{styles}</style>
      <div className="success-root">
        <div className="success-card">
          <div className="success-header">
            <div className="success-icon-wrap">
              <CheckCircle2 size={40} />
            </div>

            <h1 className="success-title">Payment Successful</h1>
            <p className="success-sub">
              Subscription activated. Your account privileges are being refreshed.
            </p>

            <div className={`status-sync ${!syncingStatus ? 'ok' : ''}`}>
              {syncingStatus ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
              <span>{syncMessage}</span>
            </div>
          </div>

          <div className="success-details">
            <div className="detail-row">
              <span className="detail-label">Plan</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlanIcon size={14} />
                {displayPlan}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Valid Until</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarDays size={14} />
                {validDate}
              </span>
            </div>
          </div>

          <div className="actions">
            <Link to="/courses" className="success-cta">
              Explore Labs <ArrowRight size={16} />
            </Link>
            <Link to="/pricing" className="success-secondary">
              View Subscription Details
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
