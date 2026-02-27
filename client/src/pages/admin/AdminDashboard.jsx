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
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Active Sessions',
            value: '0',
            change: '+0%',
            icon: Server,
            color: 'text-green-400',
            bg: 'bg-green-500/10'
        },
        {
            label: 'Revenue (This Month)',
            value: '$0.00',
            change: '+0%',
            icon: DollarSign,
            color: 'text-cyber-orange',
            bg: 'bg-cyber-orange/10'
        },
        {
            label: 'Cost Savings',
            value: '68%',
            change: 'vs Traditional',
            icon: TrendingUp,
            color: 'text-cyber-blue',
            bg: 'bg-cyber-blue/10'
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
                return 'text-green-400 bg-green-500/20';
            case 'warning':
                return 'text-cyber-orange bg-cyber-orange/20';
            case 'error':
                return 'text-red-400 bg-red-500/20';
            case 'pending':
                return 'text-gray-400 bg-gray-500/20';
            default:
                return 'text-gray-400 bg-gray-500/20';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-gray-400 mt-1">
                        Monitor system health, users, and lab sessions
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button variant="ghost">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                    <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {overviewStats.map((stat) => (
                    <div key={stat.label} className="card-cyber p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <span className="text-xs text-green-400">{stat.change}</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* System Health */}
                <div className="lg:col-span-1">
                    <div className="card-cyber p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Activity className="w-5 h-5 mr-2 text-green-400" />
                            System Health
                        </h2>
                        <div className="space-y-3">
                            {systemHealth.map((system) => {
                                const StatusIcon = getStatusIcon(system.status);
                                return (
                                    <div
                                        key={system.name}
                                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <StatusIcon className={`w-4 h-4 ${getStatusColor(system.status).split(' ')[0]}`} />
                                            <span className="text-white text-sm">{system.name}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(system.status)}`}>
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
                    <div className="card-cyber p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-blue-400" />
                            Recent Users
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-gray-400 text-sm">
                                        <th className="pb-3">User</th>
                                        <th className="pb-3">Role</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-gray-500">
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
                <div className="card-cyber p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Server className="w-5 h-5 mr-2 text-cyber-blue" />
                        Active Lab Sessions
                    </h2>
                    <div className="text-center py-8">
                        <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No active sessions</p>
                        <p className="text-gray-500 text-sm mt-1">
                            Active lab sessions will be displayed here in real-time (Phase 2)
                        </p>
                    </div>
                </div>
            </div>

            {/* Cost Analytics Placeholder */}
            <div className="mt-8">
                <div className="card-cyber p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-cyber-orange" />
                        Cost Analytics
                    </h2>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
                        <div className="text-center">
                            <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">Cost analytics coming in Phase 2</p>
                            <p className="text-gray-500 text-sm mt-1">
                                Track hourly usage, revenue, and AWS costs
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phase 2 Notice */}
            <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                <div className="flex items-start space-x-3">
                    <Settings className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                        <h3 className="text-green-400 font-medium">Admin Panel - Phase 1</h3>
                        <p className="text-gray-400 text-sm mt-1">
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
