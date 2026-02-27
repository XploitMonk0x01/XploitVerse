import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { Mail, Terminal, ArrowLeft, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

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
        <div className="min-h-screen bg-cyber-dark flex">
            {/* Left Panel - Form */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 mb-8">
                        <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                            <Terminal className="w-6 h-6 text-green-400" />
                        </div>
                        <span className="text-2xl font-bold gradient-text">XploitVerse</span>
                    </Link>

                    {!isSubmitted ? (
                        <>
                            <h1 className="text-3xl font-bold text-white mb-2">Forgot password?</h1>
                            <p className="text-gray-400 mb-8">
                                No worries. Enter your email and we'll send you reset instructions.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <Input
                                    label="Email"
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
                                />

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                >
                                    Send Reset Instructions
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Mail className="w-8 h-8 text-green-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Check your email</h1>
                            <p className="text-gray-400 mb-6">
                                We've sent password reset instructions to{' '}
                                <span className="text-green-400 font-medium">{email}</span>
                            </p>
                            <p className="text-gray-500 text-sm mb-8">
                                Didn't receive the email? Check your spam folder or{' '}
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="text-green-400 hover:text-green-300 underline"
                                >
                                    try again
                                </button>
                            </p>
                        </div>
                    )}

                    <Link
                        to="/login"
                        className="mt-8 flex items-center justify-center text-gray-400 hover:text-green-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to login
                    </Link>
                </div>
            </div>

            {/* Right Panel - Decoration */}
            <div className="hidden lg:flex flex-1 bg-gray-900 border-l border-gray-800 items-center justify-center p-12">
                <div className="max-w-lg text-center">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse-slow">
                        <Shield className="w-16 h-16 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Account Recovery
                    </h2>
                    <p className="text-gray-400">
                        We take security seriously. Your password reset link will expire in 10 minutes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
