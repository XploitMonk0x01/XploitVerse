import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import {
  SpotlightCard,
  BorderBeam,
  FadeIn,
  ScalePress,
} from '../../components/ui/motion';
import { Shield, AlertTriangle } from 'lucide-react';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

const Login = () => {
  const savedEmail = localStorage.getItem('rememberedEmail') || '';
  const wasRemembered = Boolean(savedEmail);

  const [formData, setFormData] = useState<FormData>({
    email: savedEmail,
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(wasRemembered);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } } | undefined)?.from?.pathname || '/dashboard';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Identifier required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid format';
    }

    if (!formData.password) {
      newErrors.password = 'Passkey required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    const result = await login(formData);

    setIsLoading(false);

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      navigate(from, { replace: true });
    } else {
      setErrors((prev) => ({ ...prev, form: result.error }));
    }
  };

  const handleSubmitVoid = (e: FormEvent) => {
    void handleSubmit(e);
  };

  return (
    <div className="min-h-[100dvh] bg-paper flex items-center justify-center p-4 font-mono relative overflow-hidden">
      {/* Background accent glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 60%, rgba(0,229,255,0.04) 0%, transparent 70%)' }}
      />

      <FadeIn className="w-full max-w-[420px] relative">
        {/* Header above card */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center shadow-accent">
            <Shield className="w-4 h-4 text-paper" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-ink uppercase tracking-tight leading-none">
              Sign In
            </h1>
            <p className="text-[10px] text-muted tracking-widest uppercase mt-0.5">
              Xploitverse Auth Gateway
            </p>
          </div>
        </div>

        <SpotlightCard
          spotlightColor="rgba(0, 229, 255, 0.06)"
          className="bg-surface border border-border p-6 shadow-[6px_6px_0px_#000] relative overflow-hidden"
        >
          <BorderBeam size={160} duration={11} colorFrom="#00E5FF" colorTo="#FF4500" />

          <form className="space-y-5" onSubmit={handleSubmitVoid} noValidate>
            {errors.form && (
              <div className="p-3 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              name="email"
              placeholder="operative@xploitverse.io"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-ink select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-accent w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-bold tracking-wider uppercase">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-muted hover:text-accent font-bold tracking-wider uppercase transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <ScalePress scale={0.99}>
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Sign In
              </Button>
            </ScalePress>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted">
            No account?{' '}
            <Link to="/register" className="text-accent font-bold uppercase tracking-wider hover:underline underline-offset-2 ml-1">
              Register
            </Link>
          </div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
};

export default Login;