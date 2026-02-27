import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import { Mail, Lock, Terminal, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    // Check for saved email from "Remember Me"
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

    // Get redirect path from state or default to dashboard
    const from = location.state?.from?.pathname || '/dashboard';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
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
            // Handle Remember Me - save or remove email from localStorage
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            toast.success('Welcome back!');
            navigate(from, { replace: true });
        } else {
            toast.error(result.error);
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

                    <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
                    <p className="text-gray-400 mb-8">
                        Sign in to continue your training journey
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                            icon={Mail}
                        />

                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            error={errors.password}
                            icon={Lock}
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-green-500 focus:ring-green-500 cursor-pointer"
                                />
                                <span className="ml-2 text-sm text-gray-400">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="text-sm text-green-400 hover:text-green-300">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Sign In
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-gray-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-green-400 hover:text-green-300 font-medium">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Panel - Decoration */}
            <div className="hidden lg:flex flex-1 bg-gray-900 border-l border-gray-800 items-center justify-center p-12">
                <div className="max-w-lg text-center">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse-slow">
                        <Terminal className="w-16 h-16 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Practice. Learn. Secure.
                    </h2>
                    <p className="text-gray-400">
                        Access real AWS environments for hands-on cybersecurity training.
                        Your isolated lab is just a login away.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
