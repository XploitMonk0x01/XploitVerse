import { Link } from 'react-router-dom';
import {
    Shield,
    Cloud,
    DollarSign,
    Zap,
    Terminal,
    Users,
    Lock,
    ArrowRight,
    CheckCircle,
    Server,
    Globe
} from 'lucide-react';
import { Button } from '../components/ui';

const Landing = () => {
    const features = [
        {
            icon: Cloud,
            title: 'Isolated Environments',
            description: 'Each user gets their own EC2 instance. No shared resources, no interference, complete isolation.',
            color: 'text-cyber-blue',
        },
        {
            icon: DollarSign,
            title: 'Pay-as-you-go',
            description: 'Only $0.50/hour. Labs spin up on demand and terminate automatically. ~68% cost reduction.',
            color: 'text-green-400',
        },
        {
            icon: Zap,
            title: 'Instant Deployment',
            description: 'Request a lab and have a fully configured environment ready in under 2 minutes.',
            color: 'text-cyber-orange',
        },
        {
            icon: Shield,
            title: 'Real-World Scenarios',
            description: 'Practice on actual AWS infrastructure with real vulnerabilities, not simulations.',
            color: 'text-cyber-red',
        },
    ];

    const stats = [
        { value: '$0.50', label: 'Per Hour' },
        { value: '68%', label: 'Cost Savings' },
        { value: '<2min', label: 'Spin-up Time' },
        { value: '100%', label: 'Isolated' },
    ];

    const labTypes = [
        { name: 'Web Exploitation', icon: Globe, iconColor: 'text-cyber-blue' },
        { name: 'Network Pentesting', icon: Server, iconColor: 'text-cyber-blue' },
        { name: 'Privilege Escalation', icon: Lock, iconColor: 'text-cyber-orange' },
        { name: 'CTF Challenges', icon: Terminal, iconColor: 'text-green-400' },
    ];

    return (
        <div className="min-h-screen bg-cyber-dark">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-cyber-dark border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                                <Terminal className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-xl font-bold gradient-text">XploitVerse</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <Link
                                to="/login"
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                Login
                            </Link>
                            <Link to="/register">
                                <Button variant="primary" size="md">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full mb-8">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                        <span className="text-green-400 text-sm font-medium">Cybersecurity Training Reimagined</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                        <span className="text-white">The </span>
                        <span className="gradient-text">Cybersecurity</span>
                        <br />
                        <span className="text-white">Metaverse</span>
                    </h1>

                    <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                        Practice on real, isolated AWS environments. Pay only for what you use.
                        Join the future of hands-on cybersecurity training.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <Link to="/register">
                            <Button variant="primary" size="lg" className="w-full sm:w-auto">
                                Start Training Now
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto">
                                View Demo
                            </Button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-gray-500 text-sm">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Why XploitVerse?
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Traditional cybersecurity training is expensive and often uses shared,
                            outdated environments. We're changing that.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="card-cyber p-6"
                            >
                                <div className={`w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-4`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-gray-400 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Lab Types Section */}
            <section className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Available Lab Types
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            From web exploitation to network pentesting, we've got you covered.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {labTypes.map((lab) => (
                            <div
                                key={lab.name}
                                className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-gray-700 transition-colors duration-200"
                            >
                                <div>
                                    <lab.icon className={`w-10 h-10 ${lab.iconColor} mb-4`} />
                                    <h3 className="text-lg font-semibold text-white">{lab.name}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-4 bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            How It Works
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: '01', title: 'Request a Lab', desc: 'Choose your lab type and click launch' },
                            { step: '02', title: 'Practice', desc: 'Your isolated EC2 environment spins up in seconds' },
                            { step: '03', title: 'Auto-Terminate', desc: 'System kills the instance when you\'re done. Pay only for usage.' },
                        ].map((item) => (
                            <div key={item.step} className="text-center">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-green-400 font-bold text-xl">{item.step}</span>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                                <p className="text-gray-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Level Up Your Skills?
                    </h2>
                    <p className="text-gray-400 mb-8">
                        Join XploitVerse today and start practicing on real infrastructure.
                    </p>
                    <Link to="/register">
                        <Button variant="primary" size="lg">
                            Create Free Account
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 border-t border-gray-800">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} XploitVerse. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
