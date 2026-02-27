import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui";
import { labService, labSessionService } from "../../services";
import LabCard from "../../components/labs/LabCard";
import ActiveSession from "../../components/labs/ActiveSession";
import {
    Clock,
    DollarSign,
    Terminal,
    Server,
    AlertCircle,
    Loader2,
    RefreshCw,
    Sparkles,
} from "lucide-react";

// Dashboard States
const DASHBOARD_STATE = {
    IDLE: "IDLE",
    LOADING_LABS: "LOADING_LABS",
    STARTING_LAB: "STARTING_LAB",
    PROVISIONING: "PROVISIONING",
    RUNNING: "RUNNING",
    STOPPING: "STOPPING",
    ERROR: "ERROR",
};

const Dashboard = () => {
    const { user } = useAuth();
    const [dashboardState, setDashboardState] = useState(DASHBOARD_STATE.LOADING_LABS);
    const [labs, setLabs] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [activeLab, setActiveLab] = useState(null);
    const [error, setError] = useState(null);
    const [startingLabId, setStartingLabId] = useState(null);

    // Session history
    const [sessionHistory, setSessionHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Stats calculations
    const stats = [
        {
            label: "Total Lab Time",
            value: `${user?.totalLabTime || 0} min`,
            icon: Clock,
            color: "text-cyber-blue",
            bg: "bg-cyber-blue/10",
        },
        {
            label: "Total Spent",
            value: `$${(user?.totalSpent || 0).toFixed(2)}`,
            icon: DollarSign,
            color: "text-green-400",
            bg: "bg-green-500/10",
        },
        {
            label: "Sessions",
            value: "0",
            icon: Terminal,
            color: "text-cyber-blue",
            bg: "bg-cyber-blue/10",
        },
        {
            label: "Active Labs",
            value: activeSession ? "1" : "0",
            icon: Server,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
        },
    ];

    // Fetch labs on mount
    const fetchLabs = useCallback(async () => {
        try {
            setDashboardState(DASHBOARD_STATE.LOADING_LABS);
            setError(null);

            const [labsResponse, sessionResponse] = await Promise.all([
                labService.getAll(),
                labService.getActiveSession(),
            ]);

            // API returns { data: { labs: [...], pagination: {...} } }
            const labsData = labsResponse.data.data?.labs || labsResponse.data.labs || [];
            setLabs(labsData);

            // Check if there's an active session
            if (sessionResponse.data.data) {
                const session = sessionResponse.data.data;
                setActiveSession(session);
                // Find the lab details
                const lab = labsData.find(
                    (l) => l._id === session.lab || l._id === session.lab?._id
                );
                setActiveLab(lab || session.lab);
                setDashboardState(
                    session.status === "INITIALIZING"
                        ? DASHBOARD_STATE.PROVISIONING
                        : DASHBOARD_STATE.RUNNING
                );
            } else {
                setDashboardState(DASHBOARD_STATE.IDLE);
            }
        } catch (err) {
            console.error("Failed to fetch labs:", err);
            setError(err.response?.data?.message || "Failed to load labs");
            setDashboardState(DASHBOARD_STATE.ERROR);
        }
    }, []);

    // Fetch recent session history
    const fetchHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const res = await labSessionService.getAll({ limit: 5, sort: '-createdAt' });
            const sessions =
                res.data.data?.sessions ||
                res.data.data?.labSessions ||
                res.data.sessions ||
                [];
            setSessionHistory(sessions);
        } catch {
            // Non-critical — silently ignore
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLabs();
        fetchHistory();
    }, [fetchLabs, fetchHistory]);

    // Start a lab
    const handleStartLab = async (labId) => {
        try {
            setStartingLabId(labId);
            setDashboardState(DASHBOARD_STATE.STARTING_LAB);
            setError(null);

            // Start the lab session
            const response = await labService.startLab(labId);
            console.log("Start lab response:", response.data);

            // API returns { success, data: { session: { id, status, labName } } }
            const sessionData = response.data.data?.session || response.data.session || response.data.data;
            console.log("Session data extracted:", sessionData);

            // Normalize id to _id for consistency
            const sessionId = sessionData?._id || sessionData?.id;
            if (!sessionId) {
                throw new Error("Failed to get session ID from server response");
            }
            const session = { ...sessionData, _id: sessionId };

            // Find the lab details
            const lab = labs.find((l) => l._id === labId);
            setActiveSession(session);
            setActiveLab(lab);
            setDashboardState(DASHBOARD_STATE.PROVISIONING);

            // Simulate provisioning delay (mock cloud service)
            setTimeout(async () => {
                try {
                    const provisionResponse = await labService.completeProvisioning(
                        session._id
                    );
                    console.log("Provision response:", provisionResponse.data);

                    // Normalize the provisioned session data
                    const provisionedData = provisionResponse.data.data?.session || provisionResponse.data.session || provisionResponse.data.data;
                    const provisionedId = provisionedData?._id || provisionedData?.id;
                    const provisionedSession = { ...provisionedData, _id: provisionedId };
                    setActiveSession(provisionedSession);
                    setDashboardState(DASHBOARD_STATE.RUNNING);
                } catch (provisionError) {
                    console.error("Provisioning failed:", provisionError);
                    setError("Failed to provision lab environment");
                    setDashboardState(DASHBOARD_STATE.ERROR);
                }
            }, 3500); // Slightly longer than server delay for UX
        } catch (err) {
            console.error("Failed to start lab:", err);
            setError(err.response?.data?.message || "Failed to start lab");
            setDashboardState(DASHBOARD_STATE.ERROR);
        } finally {
            setStartingLabId(null);
        }
    };

    // Stop the active session
    const handleStopSession = async () => {
        if (!activeSession) return;

        try {
            setDashboardState(DASHBOARD_STATE.STOPPING);
            setError(null);

            // Use _id or id (API returns id, we normalize to _id)
            const sessionId = activeSession._id || activeSession.id;
            console.log("Stopping session with ID:", sessionId, "Full session:", activeSession);

            if (!sessionId) {
                throw new Error("No session ID available");
            }

            await labService.stopLab(sessionId);

            setActiveSession(null);
            setActiveLab(null);
            setDashboardState(DASHBOARD_STATE.IDLE);
        } catch (err) {
            console.error("Failed to stop session:", err);
            setError(err.response?.data?.message || err.message || "Failed to stop session");
            setDashboardState(DASHBOARD_STATE.RUNNING);
        }
    };

    // Render loading state
    if (dashboardState === DASHBOARD_STATE.LOADING_LABS) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-green-400 animate-spin mb-4" />
                    <p className="text-gray-400">Loading your lab environment...</p>
                </div>
            </div>
        );
    }

    // Check if session is active (running or provisioning)
    const hasActiveSession = [
        DASHBOARD_STATE.PROVISIONING,
        DASHBOARD_STATE.RUNNING,
        DASHBOARD_STATE.STOPPING,
    ].includes(dashboardState);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">
                            Welcome back,{" "}
                            <span className="gradient-text">{user?.username}</span>
                        </h1>
                        <p className="text-gray-400 mt-1">
                            {hasActiveSession
                                ? "You have an active lab session running."
                                : "Ready to sharpen your skills? Launch a lab to get started."}
                        </p>
                    </div>
                    {!hasActiveSession && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchLabs}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-300"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="card-cyber p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                        <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Active Session or Lab Grid */}
            {hasActiveSession ? (
                <div className="mb-8">
                    <ActiveSession
                        session={activeSession}
                        lab={activeLab}
                        onStopSession={handleStopSession}
                        isStopping={dashboardState === DASHBOARD_STATE.STOPPING}
                    />
                </div>
            ) : (
                <>
                    {/* Available Labs */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <Sparkles className="w-5 h-5 text-green-400" />
                            <h2 className="text-xl font-semibold text-white">
                                Available Labs
                            </h2>
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">
                                {labs.length} labs
                            </span>
                        </div>

                        {labs.length === 0 ? (
                            <div className="card-cyber p-8 text-center">
                                <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                                    No Labs Available
                                </h3>
                                <p className="text-gray-500">
                                    Check back later or contact an administrator.
                                </p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {labs.map((lab) => (
                                    <LabCard
                                        key={lab._id}
                                        lab={lab}
                                        onStartLab={handleStartLab}
                                        isStarting={startingLabId === lab._id}
                                        disabled={
                                            dashboardState === DASHBOARD_STATE.STARTING_LAB &&
                                            startingLabId !== lab._id
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Recent Activity */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                    Recent Activity
                </h2>
                <div className="card-cyber overflow-hidden">
                    {historyLoading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-10 bg-gray-800/60 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    ) : sessionHistory.length === 0 ? (
                        <div className="p-8 text-center">
                            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No recent activity yet.</p>
                            <p className="text-gray-500 text-sm">
                                Launch a lab to see your history here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-800">
                                        {['Lab', 'Status', 'Duration', 'Cost', 'Date'].map((h) => (
                                            <th
                                                key={h}
                                                className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {sessionHistory.map((s) => {
                                        const statusColor = {
                                            COMPLETED: 'text-green-400 bg-green-500/10',
                                            RUNNING: 'text-cyber-blue bg-cyber-blue/10',
                                            TERMINATED: 'text-red-400 bg-red-500/10',
                                            INITIALIZING: 'text-cyber-orange bg-cyber-orange/10',
                                        }[s.status] || 'text-gray-400 bg-gray-500/10';

                                        const labName =
                                            s.lab?.name ||
                                            s.labName ||
                                            'Unknown Lab';

                                        const duration =
                                            s.duration != null
                                                ? `${s.duration} min`
                                                : s.startedAt && s.endedAt
                                                    ? `${Math.round(
                                                        (new Date(s.endedAt) - new Date(s.startedAt)) /
                                                        60000
                                                    )} min`
                                                    : '—';

                                        const cost =
                                            s.cost != null
                                                ? `$${s.cost.toFixed(2)}`
                                                : '—';

                                        const date = s.createdAt
                                            ? new Date(s.createdAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })
                                            : '—';

                                        return (
                                            <tr
                                                key={s._id || s.id}
                                                className="hover:bg-gray-800/30 transition-colors"
                                            >
                                                <td className="px-5 py-3 text-white font-medium">
                                                    {labName}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-gray-400">{duration}</td>
                                                <td className="px-5 py-3 text-gray-400">{cost}</td>
                                                <td className="px-5 py-3 text-gray-400">{date}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Week 2 Status Notice */}
            <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                        <h3 className="text-green-400 font-medium">
                            Week 2: Lab Management Active
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                            Mock Cloud Service is enabled. Labs will simulate a 3-second
                            provisioning delay and assign fake instance IPs. This provides a
                            realistic AWS-like experience for development and testing.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
