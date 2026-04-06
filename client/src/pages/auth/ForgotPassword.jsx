import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

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

    .auth-form {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
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

    .auth-note {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--color-muted);
        line-height: 1.6;
        text-transform: uppercase;
    }

    .submit-state {
        border: 1px dashed var(--color-border);
        background: var(--color-paper);
        padding: var(--space-6);
    }

    .submit-state-title {
        font-family: var(--font-display);
        font-size: var(--text-2xl);
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: var(--space-3);
        color: var(--color-ink);
    }

    .submit-state-text {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: var(--color-muted);
        text-transform: uppercase;
        line-height: 1.7;
    }

    .email-chip {
        color: var(--color-accent);
        font-weight: 700;
    }
`;

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Email is required');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setIsSubmitted(true);
            toast.success('Reset instructions sent!');

            // In dev mode, log the reset URL for convenience
            if (data.data?.resetURL) {
                console.log('🔑 Reset URL:', data.data.resetURL);
                console.log('🔑 Reset Token:', data.data.resetToken);
            }
        } catch (err) {
            const message = err.response?.data?.message || 'Something went wrong. Please try again.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style>{styles}</style>
            <div className="auth-root">
                <div className="auth-card">
                    {!isSubmitted ? (
                        <>
                            <div className="auth-header">
                                <h1 className="auth-title">Recover Access</h1>
                                <p className="auth-subtitle">{'>'} Enter identity to receive reset link</p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                                <Input
                                    label="Identity (Email)"
                                    type="email"
                                    name="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error) setError('');
                                    }}
                                    error={error}
                                    icon={Mail}
                                    required
                                />

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full"
                                    isLoading={isLoading}
                                >
                                    SEND RESET INSTRUCTIONS
                                </Button>
                            </form>

                            <p className="auth-note" style={{ marginTop: 'var(--space-6)' }}>
                                Reset links expire in 10 minutes for security.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="auth-header">
                                <h1 className="auth-title">Check Inbox</h1>
                                <p className="auth-subtitle">{'>'} Recovery instructions dispatched</p>
                            </div>

                            <div className="submit-state">
                                <h2 className="submit-state-title">Message Sent</h2>
                                <p className="submit-state-text">
                                    Reset instructions were sent to <span className="email-chip">{email}</span>.
                                </p>
                                <p className="submit-state-text" style={{ marginTop: 'var(--space-4)' }}>
                                    Check spam folder if needed.
                                    {' '}
                                    <button
                                        type="button"
                                        onClick={() => setIsSubmitted(false)}
                                        className="auth-link"
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                                    >
                                        TRY AGAIN
                                    </button>
                                </p>
                            </div>
                        </>
                    )}

                    <div className="auth-footer">
                        Back to authentication?{' '}
                        <Link to="/login" className="auth-link">LOGIN</Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;
