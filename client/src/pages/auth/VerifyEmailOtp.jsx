import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
    max-width: 420px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: var(--space-8);
    position: relative;
    box-shadow: 8px 8px 0px rgba(0, 0, 0, 0.2);
  }

  .auth-card::before {
    content: '[ EMAIL_VERIFY ]';
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
    margin-bottom: var(--space-7);
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
    line-height: 1.6;
  }

  .auth-form { display: flex; flex-direction: column; gap: var(--space-5); }

  .inline-meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-muted);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px dashed var(--color-border);
    padding: var(--space-3);
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

  .form-error-banner::before { content: '[!]'; font-weight: 700; }

  .form-success-banner {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-success, #2aa84a);
    padding: var(--space-3);
    border: 1px solid var(--color-success, #2aa84a);
    background: rgba(42, 168, 74, 0.05);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .form-success-banner::before { content: '[OK]'; font-weight: 700; }

  .actions-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
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
`;

const VerifyEmailOtp = () => {
    const {
        isAuthenticated,
        user,
        verifyEmailOtp,
        resendEmailOtp,
    } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    const fromPath = useMemo(() => {
        return location.state?.from?.pathname || '/dashboard';
    }, [location.state]);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user && user.isEmailVerified) {
        return <Navigate to={fromPath} replace />;
    }

    const onVerify = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!/^\d{6}$/.test(otp.trim())) {
            setError('OTP must be a 6-digit code.');
            return;
        }

        setVerifyLoading(true);
        const result = await verifyEmailOtp(otp.trim());
        setVerifyLoading(false);

        if (!result.success) {
            if (result.status === 429) {
                setSuccess(result.error);
                return;
            }
            setError(result.error);
            return;
        }

        setSuccess('Email verification successful. Redirecting...');
        setTimeout(() => {
            navigate(fromPath, { replace: true });
        }, 700);
    };

    const onResend = async () => {
        setError('');
        setSuccess('');
        setResendLoading(true);
        const result = await resendEmailOtp();
        setResendLoading(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        setSuccess(result.message || 'A new OTP has been sent.');
    };

    return (
        <>
            <style>{styles}</style>
            <div className="auth-root">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1 className="auth-title">Verify Channel</h1>
                        <p className="auth-subtitle">
                            {'>'} Enter the 6-digit OTP sent to your registered email.
                        </p>
                    </div>

                    <form className="auth-form" onSubmit={onVerify} noValidate>
                        {error && <div className="form-error-banner">{error}</div>}
                        {success && <div className="form-success-banner">{success}</div>}

                        <div className="inline-meta">
                            EMAIL: {user?.email || 'UNKNOWN'}
                        </div>

                        <Input
                            label="Verification OTP"
                            type="text"
                            name="otp"
                            placeholder="000000"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                        />

                        <div className="actions-row">
                            <Button
                                type="button"
                                variant="secondary"
                                isLoading={resendLoading}
                                onClick={onResend}
                            >
                                RESEND OTP
                            </Button>

                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={verifyLoading}
                            >
                                VERIFY NOW
                            </Button>
                        </div>
                    </form>

                    <div className="auth-footer">
                        WRONG ACCOUNT?{' '}
                        <Link to="/login" className="auth-link">
                            SWITCH USER
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default VerifyEmailOtp;
