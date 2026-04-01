import { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, ArrowRight, Zap, Crown } from 'lucide-react'

const PLAN_ICONS = { PRO: Zap, PREMIUM: Crown }

const styles = `
  .success-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-paper);
    padding: var(--space-8) var(--space-4);
  }
  .success-card {
    max-width: 480px;
    width: 100%;
    background: var(--color-surface);
    border: 1.5px solid var(--color-accent);
    padding: var(--space-10);
    text-align: center;
  }
  .success-icon-wrap {
    width: 72px;
    height: 72px;
    background: rgba(0, 255, 136, 0.1);
    border: 1.5px solid var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--space-6);
    color: var(--color-accent);
  }
  .success-title {
    font-family: var(--font-display);
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-ink);
    margin-bottom: var(--space-3);
  }
  .success-sub {
    font-size: var(--text-base);
    color: var(--color-muted);
    margin-bottom: var(--space-8);
    line-height: 1.6;
  }
  .success-details {
    border: 1px dashed var(--color-border);
    padding: var(--space-5);
    margin-bottom: var(--space-8);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
  .detail-label { color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .detail-value { color: var(--color-ink); font-weight: 700; }
  .success-cta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.85rem var(--space-6);
    background: var(--color-accent);
    color: var(--color-paper);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    border: 1.5px solid var(--color-accent);
    transition: all 0.15s;
    width: 100%;
    justify-content: center;
  }
  .success-cta:hover {
    background: transparent;
    color: var(--color-accent);
  }
`

export default function PaymentSuccess() {
    const location = useLocation()
    const navigate = useNavigate()
    const data = location.state

    // If no payment data (e.g. direct nav), redirect to pricing
    useEffect(() => {
        if (!data) navigate('/pricing', { replace: true })
    }, [data, navigate])

    if (!data) return null

    const PlanIcon = PLAN_ICONS[data.plan] || Zap
    const validDate = data.validUntil
        ? new Date(data.validUntil).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : '—'

    return (
        <>
            <style>{styles}</style>
            <div className="success-root">
                <div className="success-card">
                    <div className="success-icon-wrap">
                        <CheckCircle size={36} />
                    </div>

                    <h1 className="success-title">Payment Successful!</h1>
                    <p className="success-sub">
                        Your <strong>{data.plan}</strong> plan is now active.
                        Happy hacking! 🎉
                    </p>

                    <div className="success-details">
                        <div className="detail-row">
                            <span className="detail-label">Plan</span>
                            <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <PlanIcon size={14} />
                                {data.plan}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Valid Until</span>
                            <span className="detail-value">{validDate}</span>
                        </div>
                    </div>

                    <Link to="/courses" className="success-cta">
                        Explore Labs <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </>
    )
}
