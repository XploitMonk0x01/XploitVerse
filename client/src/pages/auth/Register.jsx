import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';

const styles = `
  .auth-root {
    min-height: 100vh;
    background: var(--color-paper);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
    background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  
  .auth-card {
    width: 100%;
    max-width: 460px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: var(--space-8);
    position: relative;
    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
  }
  
  .auth-card::before {
    content: '[ SYS_AUTH ]';
    position: absolute;
    top: -12px;
    left: var(--space-6);
    background: var(--color-paper);
    padding: 0 var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--color-muted);
    letter-spacing: 0.1em;
  }
  
  .auth-header {
    margin-bottom: var(--space-8);
    border-bottom: 1px dashed var(--color-border);
    padding-bottom: var(--space-6);
  }
  
  .auth-title {
    font-family: var(--font-display);
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--color-ink);
    margin-bottom: var(--space-2);
    text-transform: uppercase;
  }
  
  .auth-subtitle {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .auth-form { display: flex; flex-direction: column; gap: var(--space-6); }
  
  .signup-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-muted);
    line-height: 1.5;
  }
  
  .checkbox-row input[type=checkbox] {
    appearance: none;
    -webkit-appearance: none;
    width: 16px; 
    height: 16px;
    border: 1px solid var(--color-border);
    background: var(--color-paper);
    cursor: pointer;
    position: relative;
    margin-top: 2px;
  }
  
  .checkbox-row input[type=checkbox]:checked {
    background: var(--color-accent);
    border-color: var(--color-accent);
  }
  
  .checkbox-row input[type=checkbox]:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid var(--color-paper);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  
  .auth-footer {
    text-align: center;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-muted);
    border-top: 1px dashed var(--color-border);
    margin-top: var(--space-8);
    padding-top: var(--space-6);
    text-transform: uppercase;
  }
  
  .auth-link {
    color: var(--color-accent);
    font-weight: 700;
    text-decoration: none;
    transition: all var(--ease-out);
    padding: 0 var(--space-1);
  }
  
  .auth-link:hover { 
    background: var(--color-accent);
    color: var(--color-paper);
  }
  
  .form-error-banner {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-error);
    padding: var(--space-3);
    border: 1px solid var(--color-error);
    background: rgba(255, 42, 42, 0.05);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .form-error-banner::before {
    content: '[!]';
    font-weight: 700;
  }
`;

export function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', agree: false });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const touch = (k) => setTouched(p => ({ ...p, [k]: true }));

  const validate = useCallback(() => {
    const e = {};
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

  const handleSubmit = async (e) => {
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
      confirmPassword: form.confirmPassword
    });

    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrors({ form: result.error });
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Initialize User</h1>
            <p className="auth-subtitle">{'>'} Provisioning access to XPLOITVERSE infrastructure</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {errors.form && (
              <div className="form-error-banner">
                {errors.form}
              </div>
            )}

            <div className="signup-grid">
              <Input
                label="Handle"
                type="text"
                name="username"
                placeholder="e.g. cyberwarrior"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                onBlur={() => touch('username')}
                error={touched.username && errors.username ? errors.username : null}
                required
              />

              <Input
                label="Comms Channel"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onBlur={() => touch('email')}
                error={touched.email && errors.email ? errors.email : null}
                required
              />

              <Input
                label="Access Key"
                type="password"
                name="password"
                placeholder="Min. 8 Characters"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                onBlur={() => touch('password')}
                error={touched.password && errors.password ? errors.password : null}
                required
              />

              <Input
                label="Verify Key"
                type="password"
                name="confirmPassword"
                placeholder="Confirm Access Key"
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                onBlur={() => touch('confirmPassword')}
                error={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : null}
                required
              />
            </div>

            <div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={e => set('agree', e.target.checked)}
                />
                <span>
                  I acknowledge the{' '}
                  <a href="#" className="auth-link">Terms_Of_Service</a>{' '}
                  and{' '}
                  <a href="#" className="auth-link">Privacy_Policy</a>.
                  Unauthorized access is prohibited.
                </span>
              </label>
              {touched.agree && errors.agree && (
                <span className="field-error" style={{ display: 'flex', marginTop: '8px', color: 'var(--color-error)' }} role="alert">
                  {errors.agree}
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
              EXECUTE REGISTRATION
            </Button>
          </form>

          <div className="auth-footer">
            Existing credentials found?{' '}
            <Link to="/login" className="auth-link">
              AUTHENTICATE
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;
