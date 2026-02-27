import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { Lock, Terminal, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const { data } = await api.post(`/auth/reset-password/${token}`, {
                password: formData.password,
                confirmPassword: formData.confirmPassword,
            });

            // Save the new JWT token
            if (data.data?.token) {
                localStorage.setItem('token', data.data.token);
            }

            toast.success('Password reset successful!');
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
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

                    <h1 className="text-3xl font-bold text-white mb-2">Set new password</h1>
                    <p className="text-gray-400 mb-8">
                        Your new password must be at least 8 characters long.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="New Password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            error={errors.password}
                            icon={Lock}
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            name="confirmPassword"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            error={errors.confirmPassword}
                            icon={Lock}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Reset Password
                        </Button>
                    </form>

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
                        <ShieldCheck className="w-16 h-16 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Almost there!
                    </h2>
                    <p className="text-gray-400">
                        Choose a strong password to keep your XploitVerse account secure.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
