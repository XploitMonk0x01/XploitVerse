import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui";
import { labService, labSessionService } from "../../services";
import LabCard from "../../components/labs/LabCard";
import ActiveSession from "../../components/labs/ActiveSession";
import { LoadingSpinner, ErrorState, EmptyState } from "../../components/ui";
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
            color: "text-ink",
            bg: "bg-surface",
        },
        {
            label: "Total Spent",
            value: `$${(user?.totalSpent || 0).toFixed(2)}`,
            icon: DollarSign,
            color: "text-accent",
            bg: "bg-surface",
        },
        {
            label: "Sessions",
            value: "0",
            icon: Terminal,
            color: "text-info",
            bg: "bg-surface",
        },
        {
            label: "Active Labs",
            value: activeSession ? "1" : "0",
            icon: Server,
            color: "text-warning",
            bg: "bg-surface",
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[60vh] flex items-center justify-center">
                <LoadingSpinner />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono">
            {/* Welcome Header */}
            <div className="mb-8 border-b border-dashed border-border pb-6 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-ink mb-2 uppercase tracking-wide">
                        OPERATOR_ID: {" "}
                        <span className="text-accent">{user?.username}</span>
                    </h1>
                    <p className="text-muted text-sm tracking-widest uppercase">
                        {hasActiveSession
                            ? "[ SYSTEM: ACTIVE SESSION DETECTED ]"
                            : "[ SYSTEM: AWAITING COMMAND ]"}
                    </p>
                </div>
                {!hasActiveSession && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLabs}
                        className="flex items-center gap-2 font-mono text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                        <RefreshCw className="w-4 h-4" />
                        SYNC
                    </Button>
                )}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6">
                    <ErrorState message={error} onRetry={() => setError(null)} />
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-surface border border-border p-5 relative shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                        <div className="absolute top-0 left-0 w-1 h-full bg-border" />
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 border border-border ${stat.bg}`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-2xl font-display font-bold text-ink leading-none mb-1">{stat.value}</p>
                        <p className="text-xs text-muted uppercase tracking-widest">{stat.label}</p>
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
                        <div className="flex items-center gap-3 mb-6 border-b border-border pb-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            <h2 className="text-lg font-display font-bold text-ink uppercase tracking-wider">
                                DEPLOYABLE_TARGETS
                            </h2>
                            <span className="ml-auto px-2 py-1 bg-surface border border-border text-ink text-xs font-bold tracking-widest">
                                AMT: {labs.length}
                            </span>
                        </div>

                        {labs.length === 0 ? (
                            <EmptyState
                                title="TARGET_DB_EMPTY"
                                description="No deployable templates found. Await system admin provisioning."
                            />
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
                <h2 className="text-lg font-display font-bold text-ink mb-4 uppercase tracking-wider border-b border-border pb-2">
                    EXECUTION_LOG
                </h2>
                <div className="bg-surface border border-border shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                    {historyLoading ? (
                        <div className="p-6">
                            <LoadingSpinner />
                        </div>
                    ) : sessionHistory.length === 0 ? (
                        <EmptyState
                            icon={<Clock className="w-8 h-8 text-muted" />}
                            title="NO_PRIOR_EXECUTIONS"
                            description="Boot a lab to populate trace tables."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-paper">
                                        {['TARGET', 'STATUS', 'UPTIME', 'BURN_RATE', 'TIMESTAMP'].map((h) => (
                                            <th
                                                key={h}
                                                className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-widest"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {sessionHistory.map((s) => {
                                        const statusColor = {
                                            COMPLETED: 'text-success bg-success/10 border-success/30',
                                            RUNNING: 'text-info bg-info/10 border-info/30',
                                            TERMINATED: 'text-error bg-error/10 border-error/30',
                                            INITIALIZING: 'text-warning bg-warning/10 border-warning/30',
                                        }[s.status] || 'text-muted bg-surface/50 border-border';

                                        const labName =
                                            s.lab?.name ||
                                            s.labName ||
                                            'UNKNOWN_TARGET';

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
                                                month: '2-digit',
                                                day: '2-digit',
                                                year: '2-digit',
                                            }).replace(/\//g, '.')
                                            : '—';

                                        return (
                                            <tr
                                                key={s._id || s.id}
                                                className="hover:bg-paper transition-colors"
                                            >
                                                <td className="px-5 py-4 text-ink font-bold font-mono text-xs uppercase">
                                                    {labName}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`px-2 py-1 border text-xs font-bold tracking-widest uppercase ${statusColor}`}
                                                    >
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-muted font-mono">{duration}</td>
                                                <td className="px-5 py-4 text-muted font-mono">{cost}</td>
                                                <td className="px-5 py-4 text-muted font-mono">{date}</td>
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
            <div className="mt-8 p-4 bg-paper border-[2px] border-dashed border-accent">
                <div className="flex items-start space-x-4">
                    <Sparkles className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-accent font-bold font-mono text-xs uppercase tracking-widest">
                            [ NOTICE: WEEK_2_PROTOCOL_ACTIVE ]
                        </h3>
                        <p className="text-muted font-mono text-xs mt-2 leading-relaxed max-w-2xl">
                            Simulated Provisioning System operational. Target environments will broadcast a 3-second build latency. Virtualized AWS-analog endpoints will be assigned for penetration testing workflows.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
