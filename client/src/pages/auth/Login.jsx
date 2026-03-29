import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
    max-width: 400px;
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
  
  .checkbox-row {
    display: flex;
    align-items: center;
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
  
  .auth-forgot {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-muted);
    text-transform: uppercase;
    text-decoration: none;
    transition: color var(--ease-out);
  }
  
  .auth-forgot:hover { 
    color: var(--color-ink); 
    text-decoration: underline;
    text-decoration-style: dashed;
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

const Login = () => {
  const savedEmail = localStorage.getItem('rememberedEmail') || '';
  const wasRemembered = Boolean(savedEmail);

  const [formData, setFormData] = useState({
    email: savedEmail,
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(wasRemembered);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

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

  const handleSubmit = async (e) => {
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

      if (result.requiresEmailVerification) {
        navigate('/verify-email-otp', {
          replace: true,
          state: { from: { pathname: from }, email: formData.email },
        });
        return;
      }

      navigate(from, { replace: true });
    } else {
      setErrors((prev) => ({ ...prev, form: result.error }));
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Authenticate</h1>
            <p className="auth-subtitle">{'>'} Identify yourself to access systems</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {errors.form && (
              <div className="form-error-banner">
                {errors.form}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Identity (Email)"
                type="email"
                name="email"
                placeholder="you@domain.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />

              <Input
                label="Passkey (Password)"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>CACHE_SESSION</span>
              </label>

              <Link to="/forgot-password" className="auth-forgot">
                RECOVER_ACCESS?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              INITIATE CONNECT
            </Button>
          </form>

          <div className="auth-footer">
            REQUIRE CLEARANCE?{' '}
            <Link to="/register" className="auth-link">
              REQUEST_ACCESS
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
