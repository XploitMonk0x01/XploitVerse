import { Input } from './Input';
import { Button } from './Button';

export const OTPVerification = ({
  onVerified,
  onResend,
  mode,
}: {
  onVerified: (otp: string) => void;
  onResend: () => void;
  mode: 'login' | 'register' | 'forgot-password' | 'reset-password';
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerified('123456');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-fg">
              {mode === 'register' ? 'Verify Account' : mode === 'forgot-password' ? 'Verify OTP' : 'Verify OTP'}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {mode === 'register' ? 'OTP sent to your email' : 'OTP sent to your email'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  className="otp-input otp-input-center w-10 focus:bg-bg-raised focus:border-accent"
                />
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" className="w-full">
                Verify OTP
              </Button>
            </div>

            {mode === 'forgot-password' || mode === 'reset-password' && (
              <div className="mt-4 text-center text-xs text-fg-muted">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onResend}
                  className="hover:text-accent transition-colors"
                >
                  Resend OTP
                </Button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-xs text-fg-muted">
            <a href="/register" className="ml-1 font-semibold text-accent transition-colors hover:text-accent/80 hover:underline">
              Register
            </a>
            <span>&nbsp;|&nbsp;</span>
            <a href="/login" className="ml-1 font-semibold text-accent transition-colors hover:text-accent/80 hover:underline">
              Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;