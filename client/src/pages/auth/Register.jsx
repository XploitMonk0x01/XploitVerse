import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import { User, Mail, Lock, Terminal, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            newErrors.password = 'Password must contain uppercase, lowercase, and number';
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

        const result = await register(formData);

        setIsLoading(false);

        if (result.success) {
            // Handle Remember Me - save email for future logins
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', formData.email);
            }
            toast.success('Account created successfully!');
            navigate('/dashboard');
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="min-h-screen bg-cyber-dark flex">
            {/* Left Panel - Decoration */}
            <div className="hidden lg:flex flex-1 bg-gray-900 border-r border-gray-800 items-center justify-center p-12">
                <div className="max-w-lg text-center">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse-slow">
                        <Terminal className="w-14 h-14 text-green-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Join the Metaverse
                    </h2>
                    <p className="text-gray-400 mb-8">
                        Get access to isolated AWS environments for real-world cybersecurity practice.
                    </p>

                    <div className="space-y-4 text-left">
                        {[
                            'Isolated EC2 instances for each session',
                            'Pay only $0.50/hour - no subscriptions',
                            'Auto-terminate saves you money',
                            'Red & Blue team scenarios',
                        ].map((item) => (
                            <div key={item} className="flex items-center text-gray-300">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                </div>
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 mb-8">
                        <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                            <Terminal className="w-6 h-6 text-green-400" />
                        </div>
                        <span className="text-2xl font-bold gradient-text">XploitVerse</span>
                    </Link>

                    <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
                    <p className="text-gray-400 mb-8">
                        Start your cybersecurity journey today
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Username"
                            type="text"
                            name="username"
                            placeholder="cyberwarrior"
                            value={formData.username}
                            onChange={handleChange}
                            error={errors.username}
                            icon={User}
                        />

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

                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="terms"
                                className="w-4 h-4 mt-1 rounded border-gray-700 bg-gray-800 text-green-500 focus:ring-green-500"
                                required
                            />
                            <label htmlFor="terms" className="ml-2 text-sm text-gray-400">
                                I agree to the{' '}
                                <a href="#" className="text-green-400 hover:text-green-300">Terms of Service</a>
                                {' '}and{' '}
                                <a href="#" className="text-green-400 hover:text-green-300">Privacy Policy</a>
                            </label>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-green-500 focus:ring-green-500 cursor-pointer"
                            />
                            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400 cursor-pointer">
                                Remember me on this device
                            </label>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Create Account
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-gray-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-green-400 hover:text-green-300 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
