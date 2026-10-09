import { useEffect, useState } from 'react';
import { Check, Sparkles, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  billingService,
  startRazorpaySubscription,
  type BillingPlan,
  type SubscriptionStatus,
} from '../../services/billing';
import { Button, Badge } from '../../components/ui';
import { Reveal } from '../../components/ui/motion/MotionWrappers';

const FREE_FEATURES = [
  'Access to all free ranges',
  '60-minute lab sessions',
  'Community leaderboard',
];

const Pricing = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [configured, setConfigured] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s] = await Promise.all([
          billingService.getPlans(),
          user ? billingService.getStatus().catch(() => null) : Promise.resolve(null),
        ]);
        setPlans(p.plans);
        setConfigured(p.configured);
        if (s) setStatus(s);
      } catch {
        toast.error('Could not load plans.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  const subscribe = async (planKey: string) => {
    if (!user) return;
    setBusyPlan(planKey);
    try {
      const result = await startRazorpaySubscription(planKey, {
        fullName: user.fullName,
        username: user.username,
        email: user.email,
      });
      setStatus(result);
      toast.success('Subscription activated. Welcome aboard!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment could not be completed.');
    } finally {
      setBusyPlan(null);
    }
  };

  const cancel = async () => {
    setBusyPlan('cancel');
    try {
      const result = await billingService.cancel();
      setStatus(result);
      toast('Subscription cancelled.', { icon: 'ℹ️' });
    } catch {
      toast.error('Could not cancel the subscription.');
    } finally {
      setBusyPlan(null);
    }
  };

  const planLabel = status?.plan ?? 'free';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            Membership
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Unlock the full arsenal
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-fg-muted">
            A subscription opens premium attack ranges and longer sessions. Cancel anytime —
            billing is handled securely by Razorpay.
          </p>
        </div>
      </Reveal>

      {status?.active && (
        <div className="mx-auto mt-6 flex max-w-xl items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-success">
            <Check className="h-4 w-4" strokeWidth={2} />
            You are on the <strong className="capitalize">{planLabel}</strong> plan
            {status.currentEnd
              ? ` · renews ${new Date(status.currentEnd * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}`
              : ''}
            .
          </span>
          <button
            onClick={() => void cancel()}
            disabled={busyPlan === 'cancel'}
            className="text-xs font-medium text-fg-muted underline transition-colors hover:text-danger disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}

      {!configured && !loading && (
        <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 px-4 py-2.5 text-xs text-warn">
          <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Payments are not configured on this server yet, so checkout is disabled.
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {/* Free tier */}
          <Reveal>
            <div className="flex h-full flex-col rounded-xl border border-border bg-bg-raised p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Free</h2>
                {planLabel === 'free' && <Badge variant="neutral" size="sm">Current</Badge>}
              </div>
              <div className="mt-4 font-display text-4xl tracking-tight text-fg">₹0</div>
              <p className="text-xs text-fg-subtle">forever</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-fg-muted">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="mt-6 w-full" disabled>
                Included
              </Button>
            </div>
          </Reveal>

          {plans.map((plan, idx) => {
            const isCurrent = planLabel === plan.key && status?.active;
            const highlighted = plan.key === 'pro' || (idx === 0 && plan.key !== 'elite');
            return (
              <Reveal key={plan.key} delay={0.06 * (idx + 1)}>
                <div
                  className={
                    'flex h-full flex-col rounded-xl border p-6 shadow-card ' +
                    (highlighted
                      ? 'border-accent bg-bg-raised ring-1 ring-accent/20'
                      : 'border-border bg-bg-raised')
                  }
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">{plan.name}</h2>
                    {highlighted && <Badge variant="accent" size="sm">Popular</Badge>}
                    {isCurrent && <Badge variant="success" size="sm">Current</Badge>}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl tracking-tight text-fg">
                      ₹{plan.amountRupee.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-fg-subtle">/{plan.period}</span>
                  </div>
                  <p className="text-xs text-fg-subtle">auto-renews monthly · cancel anytime</p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-fg-muted">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={highlighted ? 'primary' : 'secondary'}
                    className="mt-6 w-full"
                    disabled={isCurrent || !configured || busyPlan === plan.key}
                    isLoading={busyPlan === plan.key}
                    onClick={() => void subscribe(plan.key)}
                  >
                    {isCurrent ? 'Active plan' : `Choose ${plan.name}`}
                  </Button>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-fg-subtle">
        Test mode uses Razorpay's sandbox — no real charge is made.
      </p>
    </div>
  );
};

export default Pricing;
