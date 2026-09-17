import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import {
  SpotlightCard,
  BorderBeam,
  DecryptedText,
  TacticalBadge,
  FadeIn,
  ScalePress,
} from '../../components/ui/motion';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { authService } from '../../services';

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; form?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!formData.password) {
      newErrors.password = 'New access key required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Min. 8 characters required';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation key required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Access key mismatch';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    if (!token) {
      setErrors({ form: 'Invalid or missing recovery token' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword(token, formData.password, formData.confirmPassword);

      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
      }

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Key reset failed. Token may have expired.';
      setErrors({ form: message });
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
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-accent tracking-widest uppercase">
                [ SYS_RESET // CIPHER ]
              </span>
            </div>
            <TacticalBadge variant="neutral" size="sm">
              CIPHER_AUTH
            </TacticalBadge>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-display font-black text-ink uppercase tracking-wider mb-1">
              <DecryptedText text="RESET_ACCESS_KEY" animateOn="view" speed={25} />
            </h1>
            <p className="text-xs text-muted font-mono tracking-wide">
              {'>'} Provision replacement passkey for XPLOITVERSE clearance
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmitVoid} noValidate>
            {errors.form && (
              <div className="p-3 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-error" />
                <span>[!] {errors.form}</span>
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="New Access Key"
                type="password"
                name="password"
                placeholder="Min. 8 Characters"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />

              <Input
                label="Verify Access Key"
                type="password"
                name="confirmPassword"
                placeholder="Confirm Access Key"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />
            </div>

            <ScalePress scale={0.98}>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                EXECUTE KEY RESET
              </Button>
            </ScalePress>
          </form>

          <div className="mt-8 pt-5 border-t border-dashed border-border text-center text-xs text-muted">
            <span>ABORT RECOVERY? </span>
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

export default ResetPassword;