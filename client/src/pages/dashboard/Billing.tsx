import { useEffect, useState } from 'react';
import { Clock, CreditCard, Receipt, ShieldCheck, Timer } from 'lucide-react';
import {
  billingService,
  type PaymentRecord,
  type PricingResponse,
} from '../../services/billing';
import { Badge, Card, EmptyState, ErrorState, PageHeader, SkeletonCard } from '../../components/ui';
import { FadeIn, StaggerContainer } from '../../components/ui/motion';

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
};

const Billing = () => {
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [p, history] = await Promise.allSettled([
          billingService.getPricing(),
          billingService.getPayments(),
        ]);
        if (cancelled) return;
        if (p.status === 'fulfilled') setPricing(p.value);
        else setError('Could not load pricing.');
        if (history.status === 'fulfilled') setPayments(history.value.payments || []);
      } catch {
        if (!cancelled) setError('Could not load billing information.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-content space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const freeMinutes = pricing?.freeMinutes ?? 59;

  return (
    <StaggerContainer className="mx-auto max-w-content space-y-6">
      <FadeIn>
        <PageHeader
          title="Billing"
          subtitle="Pay only for the lab time you use — no subscription."
        />
      </FadeIn>

      {error && (
        <FadeIn>
          <ErrorState error={error} title="Could not load billing" />
        </FadeIn>
      )}

      {/* How it works */}
      <FadeIn>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card padding="lg" className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Timer className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">{freeMinutes} minutes free</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                Every lab opens on a free tier. No card required to start.
              </p>
            </div>
          </Card>

          <Card padding="lg" className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Clock className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">
                ₹{pricing?.hourlyRateRupee?.toFixed(0) ?? '9'}/hour after that
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                Extend a running session in one tap when the timer runs low.
              </p>
            </div>
          </Card>

          <Card padding="lg" className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">Secure checkout</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
                Payments are handled by Razorpay. We never see your card details.
              </p>
            </div>
          </Card>
        </div>
      </FadeIn>

      {/* Extension blocks */}
      {pricing && (
        <FadeIn>
          <Card padding="lg">
            <div className="mb-4 flex items-center gap-2 border-b border-border-subtle pb-4">
              <Clock className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold text-fg">Time extensions</h2>
              <span className="ml-auto text-xs text-fg-subtle">
                Max {formatDuration(pricing.maxSessionMinutes)} per session
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pricing.blocks.map((block) => (
                <div
                  key={block.key}
                  className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-overlay/60 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-fg">{block.name}</p>
                    <p className="text-xs text-fg-subtle">
                      ₹{block.amountRupee.toFixed(0)} · adds {formatDuration(block.minutes)}
                    </p>
                  </div>
                  <Badge variant="accent" size="sm">
                    ₹{block.amountRupee.toFixed(0)}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-fg-subtle">
              Extensions are purchased from inside a running lab workspace and apply to that
              session only.
            </p>
          </Card>
        </FadeIn>
      )}

      {/* Payment history */}
      <FadeIn>
        <Card padding="lg">
          <div className="mb-4 flex items-center gap-2 border-b border-border-subtle pb-4">
            <Receipt className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-fg">Payment history</h2>
          </div>

          {payments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-5 w-5" strokeWidth={1.75} />}
              title="No payments yet"
              description="Lab time extensions you purchase will appear here."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">
                      {formatDuration(p.minutes)} extension · session #{p.sessionId}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {new Date(p.createdAt).toLocaleString()}
                      {p.paymentId ? ` · ${p.paymentId}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-medium text-fg">
                      ₹{(p.amount / 100).toFixed(0)}
                    </span>
                    <Badge variant={p.status === 'paid' ? 'success' : 'muted'} size="sm">
                      {p.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </FadeIn>

      {pricing && !pricing.configured && (
        <FadeIn>
          <p className="text-center text-xs text-warn">
            <CreditCard className="mr-1 inline h-3.5 w-3.5" strokeWidth={1.75} />
            Payments are not configured on this server yet, so checkout is disabled.
          </p>
        </FadeIn>
      )}
    </StaggerContainer>
  );
};

export default Billing;
