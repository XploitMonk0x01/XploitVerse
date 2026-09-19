import type { FormEvent } from 'react';
import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import {
  SpotlightCard,
  BorderBeam,
  TacticalBadge,
  FadeIn,
  ScalePress,
} from '../../components/ui/motion';
import { UserPlus, AlertTriangle } from 'lucide-react';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agree?: string;
  form?: string;
}

interface TouchedFields {
  username?: boolean;
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
  agree?: boolean;
}

export function Register() {
  const [form, setForm] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k: keyof FormData, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));
  const touch = (k: keyof TouchedFields) => setTouched((p) => ({ ...p, [k]: true }));

  const validate = useCallback(() => {
    const e: FormErrors = {};
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format';

    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Min. 8 chars required';

    if (!form.confirmPassword) e.confirmPassword = 'Confirmation required';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Password mismatch';

    if (!form.agree) e.agree = 'User agreement required';
    return e;
  }, [form]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setTouched({ username: true, email: true, password: true, confirmPassword: true, agree: true });

    if (Object.keys(errs).length) return;
    setLoading(true);

    const result = await register({
      username: form.username,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ form: result.error });
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
      <FadeIn className="w-full max-w-lg my-8">
        <SpotlightCard
          spotlightColor="rgba(0, 230, 153, 0.15)"
          className="bg-surface border border-border p-6 sm:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.2)] relative overflow-hidden"
        >
          <BorderBeam size={200} duration={14} colorFrom="#00E699" colorTo="#00F0FF" />
          <span className="absolute top-1 left-1 text-[8px] text-border pointer-events-none">+</span>
          <span className="absolute top-1 right-1 text-[8px] text-border pointer-events-none">+</span>
          <span className="absolute bottom-1 left-1 text-[8px] text-border pointer-events-none">+</span>
          <span className="absolute bottom-1 right-1 text-[8px] text-border pointer-events-none">+</span>

          {/* System Badge */}
          <div className="flex items-center justify-between border-b border-dashed border-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-accent tracking-widest uppercase">
                [ REGISTER // PROVISIONING ]
              </span>
            </div>
            <TacticalBadge variant="info" size="sm">
              CLEARANCE_LVL_1
            </TacticalBadge>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-display font-black text-ink uppercase tracking-wider mb-1">
              REGISTER
            </h1>
            <p className="text-xs text-muted font-mono tracking-wide">
              {'>'} Provision credentials to access challenge infrastructure
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
                label="Username"
                type="text"
                name="username"
                placeholder="e.g. cyberwarrior"
                value={form.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('username', e.target.value)}
                onBlur={() => touch('username')}
                error={touched.username && errors.username ? errors.username : undefined}
                required
              />

              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="operative@xploitverse.io"
                value={form.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('email', e.target.value)}
                onBlur={() => touch('email')}
                error={touched.email && errors.email ? errors.email : undefined}
                required
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  placeholder="Min. 8 Characters"
                  value={form.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('password', e.target.value)}
                  onBlur={() => touch('password')}
                  error={touched.password && errors.password ? errors.password : undefined}
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('confirmPassword', e.target.value)}
                  onBlur={() => touch('confirmPassword')}
                  error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : undefined}
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-start gap-2.5 cursor-pointer text-muted hover:text-ink select-none text-xs font-mono">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('agree', e.target.checked)}
                  className="accent-accent w-4 h-4 rounded-none cursor-pointer mt-0.5"
                />
                <span className="text-[11px] leading-relaxed">
                  I acknowledge operational rules & ethics agreements. Unauthorized intrusions outside lab parameters are strictly forbidden.
                </span>
              </label>
              {touched.agree && errors.agree && (
                <span className="text-xs text-error font-mono mt-1.5 flex items-center gap-1" role="alert">
                  <AlertTriangle className="w-3 h-3" /> {errors.agree}
                </span>
              )}
            </div>

            <ScalePress scale={0.98}>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
              >
                EXECUTE REGISTRATION
              </Button>
            </ScalePress>
          </form>

          <div className="mt-8 pt-5 border-t border-dashed border-border text-center text-xs text-muted">
            <span>EXISTING CREDENTIALS FOUND? </span>
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
}

export default Register;