import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { FadeIn } from '../../components/ui/motion';
import { AlertTriangle, ArrowRight, Shield } from 'lucide-react';
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
      newErrors.password = 'New passkey is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Min. 8 characters required';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation passkey required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const message = err instanceof Error ? err.message : 'Passkey reset failed. Token may have expired.';
      setErrors({ form: message });
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
                Cipher Reset
              </span>
            </span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Reset Passkey</h1>
          <p className="mt-1 text-sm text-fg-muted">Update your security cipher</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm sm:p-7">
          <form className="space-y-4" onSubmit={handleSubmitVoid} noValidate>
            {errors.form && (
              <div
                className="flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger"
                role="alert"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{errors.form}</span>
              </div>
            )}

            <Input
              label="New Passkey"
              type="password"
              name="password"
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            <Input
              label="Confirm New Passkey"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter passkey"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Update Passkey
                <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.75} />
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center text-xs text-fg-muted">
            Remember old credentials?{' '}
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

export default ResetPassword;
