import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import {
  SpotlightCard,
  BorderBeam,
  DecryptedText,
  TacticalBadge,
  FadeIn,
  ScalePress,
} from '../../components/ui/motion';
import { KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Identity (Email) required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email format');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transmission error. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVoid = (e: FormEvent) => {
    void handleSubmit(e);
  };

  return (
    <div
      className="min-h-screen bg-paper flex items-center justify-center p-4 font-mono relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <FadeIn className="w-full max-w-md">
        <SpotlightCard
          spotlightColor="rgba(0, 230, 153, 0.15)"
          className="bg-surface border border-border p-6 sm:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.2)] relative overflow-hidden"
        >
          <BorderBeam size={180} duration={12} colorFrom="#00E699" colorTo="#00F0FF" />
          <span className="absolute top-1 left-1 text-[8px] text-border pointer-events-none">+</span>
          <span className="absolute top-1 right-1 text-[8px] text-border pointer-events-none">+</span>
          <span className="absolute bottom-1 left-1 text-[8px] text-border pointer-events-none">+</span>
          <span className="absolute bottom-1 right-1 text-[8px] text-border pointer-events-none">+</span>

          {/* System Badge */}
          <div className="flex items-center justify-between border-b border-dashed border-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-accent tracking-widest uppercase">
                [ SYS_RECOVERY // DISPATCH ]
              </span>
            </div>
            <TacticalBadge variant="neutral" size="sm">
              RELAY_01
            </TacticalBadge>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-display font-black text-ink uppercase tracking-wider mb-1">
              <DecryptedText text="RECOVER_ACCESS" animateOn="view" speed={25} />
            </h1>
            <p className="text-xs text-muted font-mono tracking-wide">
              {'>'} Transmit recovery token to registered comms channel
            </p>
          </div>

          {!isSubmitted ? (
            <form className="space-y-5" onSubmit={handleSubmitVoid} noValidate>
              {error && (
                <div className="p-3 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-error" />
                  <span>[!] {error}</span>
                </div>
              )}

              <Input
                label="Registered Identity (Email)"
                type="email"
                name="email"
                placeholder="operative@xploitverse.io"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                error={error}
                required
              />

              <ScalePress scale={0.98}>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isLoading}
                >
                  TRANSMIT RECOVERY LINK
                </Button>
              </ScalePress>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="p-4 bg-accent/10 border border-accent text-xs font-mono space-y-2">
                <div className="flex items-center gap-2 text-accent font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>[+] RECOVERY_DISPATCHED</span>
                </div>
                <div className="text-ink">
                  Instructions transmitted to <span className="text-accent font-bold">{email}</span>.
                </div>
                <div className="text-[11px] text-muted">
                  Check spam filters if unreceived within 60 seconds.
                </div>
              </div>

              <ScalePress scale={0.98}>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                >
                  RE-TRANSMIT REQUEST
                </Button>
              </ScalePress>
            </div>
          )}

          <div className="mt-8 pt-5 border-t border-dashed border-border text-center text-xs text-muted">
            <span>REMEMBER CREDENTIALS? </span>
            <Link
              to="/login"
              className="text-accent font-bold uppercase tracking-wider hover:underline underline-offset-4 decoration-dashed ml-1"
            >
              [ AUTHENTICATE ]
            </Link>
          </div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
};

export default ForgotPassword;