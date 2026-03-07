import { Link } from 'react-router-dom';
import {
    ShieldAlert,
    Cpu,
    DatabaseZap,
    TerminalSquare,
    ArrowRight,
    Binary,
    Network
} from 'lucide-react';
import { Button } from '../components/ui';

const Landing = () => {
    const features = [
        {
            icon: Cpu,
            title: 'ISOLATED_ENV',
            description: 'Dedicated EC2 instances. Zero resource sharing. Absolute isolation for critical operations.',
            color: 'var(--color-ink)',
        },
        {
            icon: DatabaseZap,
            title: 'ON_DEMAND_INFRA',
            description: 'Metered billing ($0.50/hr). Infrastructure provisions instantly and self-terminates. Cost optimization: 68%.',
            color: 'var(--color-accent)',
        },
        {
            icon: TerminalSquare,
            title: 'RAPID_DEPLOY',
            description: 'Execute build sequence and acquire a fully configured target environment in < 120s.',
            color: 'var(--color-info)',
        },
        {
            icon: ShieldAlert,
            title: 'LIVE_TARGETS',
            description: 'Interact with authentic AWS infrastructure weaponized with verified vulnerability vectors.',
            color: 'var(--color-error)',
        },
    ];

    const stats = [
        { value: '$0.50', label: 'RATE/HR' },
        { value: '68%', label: 'EFFICIENCY' },
        { value: '<120s', label: 'BOOT_SEQ' },
        { value: '100%', label: 'ISOLATION' },
    ];

    const labTypes = [
        { name: 'WEB_EXPLOIT', icon: Network, color: 'var(--color-ink)' },
        { name: 'NET_PENTEST', icon: DatabaseZap, color: 'var(--color-ink)' },
        { name: 'PRIV_ESC', icon: ShieldAlert, color: 'var(--color-accent)' },
        { name: 'CTF_SIM', icon: Binary, color: 'var(--color-ink)' },
    ];

    return (
        <div className="min-h-screen bg-paper" style={{ backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
            {/* Top Bar - stark industrial */}
            <nav className="fixed top-0 w-full z-50 bg-paper border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-ink border border-border flex items-center justify-center">
                                <TerminalSquare className="w-5 h-5 text-paper" />
                            </div>
                            <span className="text-xl font-display font-bold text-ink uppercase tracking-wider">XploitVerse</span>
                        </Link>
                        <div className="flex items-center space-x-6 font-mono text-sm uppercase font-bold tracking-widest">
                            <Link
                                to="/login"
                                className="text-muted hover:text-ink transition-colors pb-1 border-b-2 border-transparent hover:border-ink"
                            >
                                Authenticate
                            </Link>
                            <Link to="/register">
                                <Button variant="primary" size="sm">
                                    Init_Sequence
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-4 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-left">
                            <div className="inline-flex flex-col gap-2 mb-8 border-l-4 border-accent pl-4">
                                <span className="text-accent font-mono text-xs uppercase tracking-[0.2em] animate-pulse">
                                    [LIVE] STATUS: OPERATIONAL
                                </span>
                                <span className="text-muted font-mono text-xs uppercase tracking-wider">
                                    TARGET: CYBERSECURITY INFRASTRUCTURE
                                </span>
                            </div>

                            <h1 className="text-6xl md:text-8xl font-display font-extrabold mb-8 leading-[0.9] text-ink uppercase tracking-tight">
                                Hack<br />
                                The<br />
                                <span className="text-paper bg-ink px-4 py-2 mt-4 inline-block transform -skew-x-6">Cloud</span>
                            </h1>

                            <p className="text-lg text-muted max-w-lg mb-12 font-mono leading-relaxed border-t border-dashed border-border pt-6">
                                {'> '} Access authentic, isolated AWS environments.<br />
                                {'> '} Neutralize artificial simulations.<br />
                                {'> '} Pay strictly for operational compute cycles.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 mb-16">
                                <Link to="/register" className="w-full sm:w-auto">
                                    <Button variant="primary" size="lg" className="w-full">
                                        DEPLOY_TARGET
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </Link>
                                <Link to="/login" className="w-full sm:w-auto">
                                    <Button variant="secondary" size="lg" className="w-full">
                                        READ_DOCS
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Visual Structural Element replacing generic hero image */}
                        <div className="hidden lg:block relative h-[600px] border border-border bg-surface p-8 shadow-[16px_16px_0px_rgba(0,0,0,0.1)]">
                            <div className="absolute top-0 left-0 w-full h-8 bg-border flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-error" />
                                <div className="w-3 h-3 rounded-full bg-warning" />
                                <div className="w-3 h-3 rounded-full bg-success" />
                                <span className="ml-4 font-mono text-xs text-muted">root@xploitverse:~# ./launch_env</span>
                            </div>
                            <div className="mt-8 font-mono text-xs text-accent leading-loose">
                                <div>[SYS] INFRASTRUCTURE PROVISIONING INITIALIZED...</div>
                                <div className="text-muted">{'>>>>'} ALLOCATING VPC BOUNDARIES</div>
                                <div className="text-muted">{'>>>>'} DEPLOYING SUBNET ISOLATION</div>
                                <div className="text-info mt-4">EC2 Instance i-0abcd12345efgh678 spinning up</div>
                                <div className="text-warning">WARNING: VULNERABILITY VECTORS LOADED.</div>
                                <div className="mt-8 text-ink text-lg blur-[1px]">AWAITING OPERATOR INPUT_</div>
                            </div>

                            {/* Decorative technical elements */}
                            <div className="absolute bottom-4 right-4 text-4xl font-display text-border opacity-20 font-bold">
                                XV-01
                            </div>
                            <div className="absolute top-1/2 -right-4 w-8 h-32 border border-border bg-paper grid grid-rows-4">
                                <div className="border-b border-border bg-accent opacity-20" />
                                <div className="border-b border-border" />
                                <div className="border-b border-border bg-error opacity-20 animate-pulse" />
                                <div />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Band */}
            <div className="border-y border-border bg-surface overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
                        {stats.map((stat) => (
                            <div key={stat.label} className="p-8 text-center group hover:bg-ink transition-colors">
                                <div className="text-4xl font-display font-bold text-ink group-hover:text-paper mb-2">
                                    {stat.value}
                                </div>
                                <div className="font-mono text-xs text-muted group-hover:text-subtle tracking-widest uppercase">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Architecture / Features */}
            <section className="py-24 px-4 bg-paper" style={{ backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)', backgroundSize: '100px 100px' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="mb-16 border-l-4 border-ink pl-6">
                        <h2 className="text-3xl md:text-5xl font-display font-bold text-ink uppercase tracking-tight">
                            System Architecture
                        </h2>
                        <p className="font-mono text-muted mt-4 uppercase text-sm tracking-wider">
                            Engineered for uncompromising realism and rapid iteration.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, idx) => (
                            <div
                                key={feature.title}
                                className="bg-surface border border-border p-8 relative hover:-translate-y-2 transition-transform duration-300 shadow-[8px_8px_0px_rgba(0,0,0,0.05)]"
                            >
                                <div className="absolute top-0 right-0 p-2 font-mono text-xs text-muted font-bold opacity-30">
                                    0{idx + 1}
                                </div>
                                <feature.icon className="w-10 h-10 mb-6" style={{ color: feature.color }} />
                                <h3 className="text-lg font-mono font-bold text-ink mb-4 uppercase tracking-wider">{feature.title}</h3>
                                <p className="text-muted text-sm font-mono leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Modules Grid */}
            <section className="py-24 px-4 bg-ink text-paper">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-border pb-8 gap-8">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-display font-bold uppercase tracking-tight text-paper">
                                Combat Modules
                            </h2>
                            <p className="font-mono text-muted mt-4 uppercase text-sm tracking-wider blur-[0.5px]">
                                Choose your vector of approach.
                            </p>
                        </div>
                        <Button variant="ghost" className="text-paper border-paper hover:bg-paper hover:text-ink">
                            VIEW_ALL_MODULES
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {labTypes.map((lab) => (
                            <div
                                key={lab.name}
                                className="group relative border border-border bg-[#151515] p-8 overflow-hidden hover:bg-paper hover:text-ink transition-colors duration-300"
                            >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]" />
                                <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
                                    <lab.icon className="w-12 h-12 text-muted group-hover:text-ink transition-colors" />
                                    <h3 className="text-xl font-mono font-bold mt-8 tracking-wider">{lab.name}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-32 px-4 bg-surface border-y border-border text-center">
                <div className="max-w-3xl mx-auto">
                    <div className="font-mono text-accent font-bold text-xl mb-6 tracking-[0.3em] uppercase">
                        [ SYSTEM READY ]
                    </div>
                    <h2 className="text-4xl md:text-6xl font-display font-bold text-ink mb-8 uppercase tracking-tighter">
                        Initiate Override
                    </h2>
                    <p className="text-muted font-mono mb-12 max-w-xl mx-auto">
                        Your isolated infrastructure is waiting to be spun up. Create an account and execute your first launch sequence.
                    </p>
                    <Link to="/register">
                        <Button variant="primary" size="lg" className="px-12 py-6 text-lg">
                            BEGIN_EXECUTION
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 bg-paper text-center">
                <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border border-border flex items-center justify-center">
                        <TerminalSquare className="w-5 h-5 text-muted" />
                    </div>
                    <p className="text-muted font-mono text-xs uppercase tracking-widest">
                        END OF FILE. © {new Date().getFullYear()} XPLOITVERSE SYSTEMS.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
