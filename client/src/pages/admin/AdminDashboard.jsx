import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import {
    Users,
    Server,
    DollarSign,
    Activity,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    BarChart3,
    Settings,
    Download
} from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();

    // Placeholder stats for admin demo
    const overviewStats = [
        {
            label: 'Total Users',
            value: '0',
            change: '+0%',
            icon: Users,
            color: 'text-info',
            bg: 'bg-info/10'
        },
        {
            label: 'Active Sessions',
            value: '0',
            change: '+0%',
            icon: Server,
            color: 'text-success',
            bg: 'bg-success/10'
        },
        {
            label: 'Revenue (This Month)',
            value: '$0.00',
            change: '+0%',
            icon: DollarSign,
            color: 'text-accent',
            bg: 'bg-accent/10'
        },
        {
            label: 'Cost Savings',
            value: '68%',
            change: 'vs Traditional',
            icon: TrendingUp,
            color: 'text-warning',
            bg: 'bg-warning/10'
        },
    ];

    const systemHealth = [
        { name: 'API Server', status: 'healthy', uptime: '99.9%' },
        { name: 'MongoDB', status: 'healthy', uptime: '99.9%' },
        { name: 'AWS EC2', status: 'pending', uptime: 'Phase 2' },
        { name: 'Auto Scaling', status: 'pending', uptime: 'Phase 2' },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'healthy':
                return 'text-success bg-success/10 border-success/30';
            case 'warning':
                return 'text-warning bg-warning/10 border-warning/30';
            case 'error':
                return 'text-error bg-error/10 border-error/30';
            case 'pending':
                return 'text-muted bg-paper border-border';
            default:
                return 'text-muted bg-paper border-border';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy':
                return CheckCircle;
            case 'warning':
                return AlertTriangle;
            case 'error':
                return AlertTriangle;
            default:
                return Clock;
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono">
            {/* Header */}
            <div className="mb-8 border-b border-dashed border-border pb-6 flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-ink uppercase tracking-wide">
                        Command <span className="text-accent">Center</span>
                    </h1>
                    <p className="text-muted text-xs uppercase tracking-[0.18em] mt-2">
                        Monitor system health, users, and lab execution telemetry.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="font-mono text-xs uppercase tracking-widest border-border bg-paper hover:bg-surface"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                    <Button
                        variant="outline"
                        className="font-mono text-xs uppercase tracking-widest border-border bg-paper hover:bg-surface"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {overviewStats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-surface border border-border p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.2)]"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 border border-border ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <span className="text-xs font-bold tracking-wider uppercase text-muted">{stat.change}</span>
                        </div>
                        <p className="text-2xl font-display font-bold text-ink">{stat.value}</p>
                        <p className="text-xs text-muted uppercase tracking-widest">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* System Health */}
                <div className="lg:col-span-1">
                    <div className="bg-surface border border-border p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.16)]">
                        <h2 className="text-lg font-display font-bold text-ink mb-4 flex items-center uppercase tracking-wider border-b border-border pb-2">
                            <Activity className="w-5 h-5 mr-2 text-success" />
                            System Health
                        </h2>
                        <div className="space-y-3">
                            {systemHealth.map((system) => {
                                const StatusIcon = getStatusIcon(system.status);
                                return (
                                    <div
                                        key={system.name}
                                        className="flex items-center justify-between p-3 bg-paper border border-border"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <StatusIcon className={`w-4 h-4 ${getStatusColor(system.status).split(' ')[0]}`} />
                                            <span className="text-ink text-xs font-bold uppercase tracking-wide">{system.name}</span>
                                        </div>
                                        <span className={`text-[10px] px-2 py-1 border font-bold uppercase tracking-wider ${getStatusColor(system.status)}`}>
                                            {system.uptime}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Recent Users */}
                <div className="lg:col-span-2">
                    <div className="bg-surface border border-border p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.16)]">
                        <h2 className="text-lg font-display font-bold text-ink mb-4 flex items-center uppercase tracking-wider border-b border-border pb-2">
                            <Users className="w-5 h-5 mr-2 text-info" />
                            Recent Users
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-muted text-xs uppercase tracking-widest border-b border-border">
                                        <th className="pb-3">User</th>
                                        <th className="pb-3">Role</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-muted text-xs uppercase tracking-wide">
                                            No users yet. They will appear here after registration.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Sessions */}
            <div className="mt-8">
                <div className="bg-surface border border-border p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.16)]">
                    <h2 className="text-lg font-display font-bold text-ink mb-4 flex items-center uppercase tracking-wider border-b border-border pb-2">
                        <Server className="w-5 h-5 mr-2 text-info" />
                        Active Lab Sessions
                    </h2>
                    <div className="text-center py-8">
                        <Server className="w-12 h-12 text-muted mx-auto mb-4" />
                        <p className="text-ink text-sm font-bold uppercase tracking-wide">No active sessions</p>
                        <p className="text-muted text-xs mt-2 uppercase tracking-wide">
                            Active lab sessions will be displayed here in real-time (Phase 2)
                        </p>
                    </div>
                </div>
            </div>

            {/* Cost Analytics Placeholder */}
            <div className="mt-8">
                <div className="bg-surface border border-border p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.16)]">
                    <h2 className="text-lg font-display font-bold text-ink mb-4 flex items-center uppercase tracking-wider border-b border-border pb-2">
                        <BarChart3 className="w-5 h-5 mr-2 text-accent" />
                        Cost Analytics
                    </h2>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-border bg-paper">
                        <div className="text-center">
                            <BarChart3 className="w-12 h-12 text-muted mx-auto mb-4" />
                            <p className="text-ink text-sm font-bold uppercase tracking-wide">Cost analytics coming in Phase 2</p>
                            <p className="text-muted text-xs mt-2 uppercase tracking-wide">
                                Track hourly usage, revenue, and AWS costs
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase 2 Notice */}
            <div className="mt-8 p-4 bg-paper border-[2px] border-dashed border-accent">
                <div className="flex items-start space-x-3">
                    <Settings className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                        <h3 className="text-accent font-bold font-mono text-xs uppercase tracking-widest">[ ADMIN_PANEL :: PHASE_1 ]</h3>
                        <p className="text-muted font-mono text-xs mt-2 leading-relaxed max-w-2xl uppercase tracking-wide">
                            Full admin functionality including user management, real-time session monitoring,
                            and AWS instance control will be available in Phase 2. This is the dashboard layout preview.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
