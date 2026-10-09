import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { FadeIn } from '../../components/ui/motion';
import { AlertTriangle, CheckCircle2, ArrowRight, RotateCcw, Shield } from 'lucide-react';
import { authService } from '../../services';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email address is required');
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg-base p-4">
      <FadeIn className="w-full max-w-[420px]">
        {/* Brand header */}
        <div className="mb-6 text-center">
          <Link to="/" className="group mb-4 inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-fg">
              <Shield className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-left">
              <span className="block text-lg font-semibold leading-none tracking-tight text-fg">
                XploitVerse
              </span>
              <span className="mt-1 block text-[11px] font-medium uppercase tracking-widest text-fg-subtle">
                Cipher Recovery
              </span>
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Reset Passkey</h1>
          <p className="mt-1 text-sm text-fg-muted">Transmit a recovery token to your email</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm sm:p-7">
          {!isSubmitted ? (
            <form className="space-y-4" onSubmit={handleSubmitVoid} noValidate>
              {error && (
                <div
                  className="flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Registered Comms Email"
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

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Transmit Recovery Token
                  <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.75} />
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 rounded-md border border-accent/30 bg-accent/10 p-4 text-xs">
                <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-accent">
                  <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>Token Transmitted</span>
                </div>
                <p className="leading-relaxed text-fg">
                  Reset instructions dispatched to <span className="font-semibold text-accent">{email}</span>.
                </p>
                <p className="text-[11px] text-fg-muted">
                  Verify spam filters if unreceived within 60 seconds.
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                Re-send token
              </Button>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-4 text-center text-xs text-fg-muted">
            Remember passkey?{' '}
            <Link
              to="/login"
              className="ml-1 font-semibold text-accent transition-colors hover:text-accent/80 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default ForgotPassword;
