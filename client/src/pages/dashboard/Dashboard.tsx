import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { labService, labSessionService } from "../../services";
import { LabCard } from "../../components/labs/LabCard";
import { ActiveSession } from "../../components/labs/ActiveSession";
import { Button, LoadingSpinner, EmptyState, ErrorState } from "../../components/ui";
import {
  Clock,
  DollarSign,
  Server,
  RefreshCw,
  Target,
  Activity,
  Radio,
  Layers,
} from "lucide-react";
import type { Lab, LabSession, LabSessionsListResponse } from "../../types";
import { SpotlightCard } from "../../components/ui/motion/SpotlightCard";
import { StaggerContainer, FadeIn } from "../../components/ui/motion/MotionWrappers";
import { DecryptedText } from "../../components/ui/motion/DecryptedText";
import { TacticalBadge } from "../../components/ui/motion/TacticalBadge";

const DASHBOARD_STATE = {
  LOADING_LABS: "loading_labs",
  IDLE: "idle",
  STARTING_LAB: "starting_lab",
  PROVISIONING: "provisioning",
  RUNNING: "running",
  STOPPING: "stopping",
  ERROR: "error",
} as const;

type DashboardState = (typeof DASHBOARD_STATE)[keyof typeof DASHBOARD_STATE];

const sameId = (a: unknown, b: unknown): boolean => {
  if (a == null || b == null) return false;
  return String(a) === String(b);
};

const toIdString = (val: unknown): string => {
  if (val == null) return "";
  return String(val);
};

const getEntityId = (obj: { id?: number; _id?: number } | null | undefined): string => {
  if (!obj) return "";
  return toIdString(obj.id ?? obj._id ?? "");
};

const getSessionLabRef = (session: LabSession | null): string => {
  if (!session) return "";
  if (session.lab != null) {
    return toIdString(session.lab);
  }
  return "";
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardState, setDashboardState] = useState<DashboardState>(DASHBOARD_STATE.LOADING_LABS);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [activeSession, setActiveSession] = useState<LabSession | null>(null);
  const [activeLab, setActiveLab] = useState<Lab | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingLabId, setStartingLabId] = useState<number | string | null>(null);

  // Session history
  const [sessionHistory, setSessionHistory] = useState<LabSessionsListResponse['sessions']>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Stats calculations - using real backend data only
  const stats = [
    {
      label: "TOTAL_LAB_TIME",
      value: `${user?.totalLabTime || 0}m`,
      subtext: "AGGREGATE UPTIME",
      icon: Clock,
      color: "text-ink",
    },
    {
      label: "TOTAL_SPENT",
      value: `$${(user?.totalSpent || 0).toFixed(2)}`,
      subtext: "ACCUMULATED COST",
      icon: DollarSign,
      color: "text-accent",
    },
    {
      label: "ACTIVE_TARGETS",
      value: activeSession ? "01" : "00",
      subtext: activeSession ? "SYSTEM ONLINE" : "STANDBY POOL",
      icon: Server,
      color: activeSession ? "text-success" : "text-muted",
    },
    {
      label: "OPERATIVE_CLEARANCE",
      value: user?.role?.toUpperCase() || "ROLE_UNKNOWN",
      subtext: "ACCESS_LEVEL",
      icon: Target,
      color: "text-cyan",
    },
  ];

  const fetchSessionHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await labSessionService.getAll();
      setSessionHistory(res.sessions || []);
    } catch {
      // Non-critical telemetry error
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchLabs = useCallback(async () => {
    try {
      setDashboardState(DASHBOARD_STATE.LOADING_LABS);
      setError(null);
      const response = await labService.getAll();
      const labList = response.labs || [];
      setLabs(labList);
      setDashboardState(DASHBOARD_STATE.IDLE);
    } catch (err) {
      console.error("Failed to fetch labs:", err);
      setError("Failed to load targets. Database unreachable.");
      setDashboardState(DASHBOARD_STATE.ERROR);
    }
  }, []);

  const checkActiveSession = useCallback(async () => {
    try {
      const response = await labService.getActiveSession();
      const session = response.session;

      if (session) {
        // Convert ActiveSessionResponse to LabSession
        const labSession: LabSession = {
          id: session.id,
          userId: 0,
          roomId: session.roomId,
          taskId: session.taskId,
          status: session.status.toLowerCase() as LabSession['status'],
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
          networkName: session.networkName,
          targetContainerId: session.containerId,
          connectionInfo: {},
          publicIp: session.containerId,
        };
        setActiveSession(labSession);
        setDashboardState(DASHBOARD_STATE.RUNNING);

        const currentLabRef = getSessionLabRef(labSession);
        if (currentLabRef && labs.length > 0) {
          const matchedLab = labs.find((l) => sameId(getEntityId(l), currentLabRef));
          if (matchedLab) {
            setActiveLab(matchedLab);
          }
        }
      } else {
        setActiveSession(null);
        setActiveLab(null);
      }
    } catch (err) {
      console.error("Failed to check active session:", err);
    }
  }, [labs]);

  useEffect(() => {
    void fetchLabs();
    void fetchSessionHistory();
  }, [fetchLabs, fetchSessionHistory]);

  useEffect(() => {
    if (labs.length > 0) {
      void checkActiveSession();
    }
  }, [labs, checkActiveSession]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      void checkActiveSession();
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [checkActiveSession]);

  const handleStartLab = async (labId: number | string | null | undefined) => {
    if (labId == null) return;
    const labIdNum = typeof labId === "string" ? parseInt(labId, 10) : labId;
    if (isNaN(labIdNum)) return;

    try {
      setStartingLabId(labId);
      setDashboardState(DASHBOARD_STATE.STARTING_LAB);
      setError(null);

      const targetLab = labs.find((l) => sameId(getEntityId(l), labId));
      if (targetLab) setActiveLab(targetLab);

      const response = await labService.startLab(labIdNum);
      const newSession = response.session;

      if (newSession) {
        // Convert LabStartResponse session to LabSession
        const labSession: LabSession = {
          id: newSession.id,
          userId: 0,
          lab: newSession.lab,
          status: newSession.status.toLowerCase() as LabSession['status'],
          startedAt: new Date().toISOString(),
          connectionInfo: {},
        };
        setActiveSession(labSession);
        setDashboardState(DASHBOARD_STATE.RUNNING);
        const targetSessionId = getEntityId(labSession);
        if (targetSessionId) {
          navigate(`/workspace/${targetSessionId}`);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to launch lab:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize lab container.");
      setDashboardState(DASHBOARD_STATE.ERROR);
    } finally {
      setStartingLabId(null);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    const activeSessionId = getEntityId(activeSession);
    const sessionIdNum = parseInt(activeSessionId, 10);
    if (isNaN(sessionIdNum)) return;

    try {
      setDashboardState(DASHBOARD_STATE.STOPPING);
      await labService.stopLab(sessionIdNum);
      setActiveSession(null);
      setActiveLab(null);
      setDashboardState(DASHBOARD_STATE.IDLE);
      void fetchSessionHistory();
    } catch (err: unknown) {
      console.error("Failed to stop session:", err);
      setError(err instanceof Error ? err.message : "Failed to terminate session.");
      setDashboardState(DASHBOARD_STATE.RUNNING);
    }
  };

  const handleOpenWorkspace = () => {
    if (activeSession) {
      const activeSessionId = getEntityId(activeSession);
      navigate(`/workspace/${activeSessionId}`);
    }
  };

  const handleStartLabVoid = (labId: number | string | null | undefined) => {
    void handleStartLab(labId);
  };

  const handleStopSessionVoid = () => {
    void handleStopSession();
  };

  const handleOpenWorkspaceVoid = () => {
    void handleOpenWorkspace();
  };

  if (dashboardState === DASHBOARD_STATE.LOADING_LABS && labs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <LoadingSpinner size="lg" message="Loading targets" />
      </div>
    );
  }

  const hasActiveSession = activeSession && activeSession.status !== "terminated" && activeSession.status !== "stopped";

  return (
    <StaggerContainer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono">
      {/* Page Header */}
      <FadeIn direction="down" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-ink tracking-tight uppercase leading-none">
            <DecryptedText text="Dashboard" speed={20} />
          </h1>
          <p className="text-xs text-muted mt-1.5">
            Operative: <span className="text-ink font-bold">{user?.username?.toUpperCase()}</span>
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void fetchLabs()}>
          <RefreshCw className="w-3 h-3" />
          Sync
        </Button>
      </FadeIn>

      {/* Error State */}
      {error && (
        <FadeIn className="mb-6">
          <ErrorState error={error} onRetry={() => setError(null)} />
        </FadeIn>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <SpotlightCard
              key={stat.label}
              className="p-5 sm:p-6 bg-surface"
              spotlightColor="rgba(0, 229, 255, 0.06)"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] text-muted font-bold tracking-[0.15em] uppercase">
                  {stat.label}
                </span>
                <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <p className="text-[clamp(1.75rem,3vw,2.5rem)] font-display font-black text-ink leading-none mb-1">
                {stat.value}
              </p>
              <p className="text-[10px] text-dim tracking-wider uppercase mt-1">
                {stat.subtext}
              </p>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Active Session Mission HUD */}
      {hasActiveSession ? (
        <FadeIn direction="up">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-accent animate-pulse" />
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              CURRENT_ENGAGEMENT_TARGET
            </h2>
          </div>
          <ActiveSession
            session={activeSession}
            lab={activeLab}
            onOpenWorkspace={handleOpenWorkspaceVoid}
            onStopSession={handleStopSessionVoid}
            isStopping={dashboardState === DASHBOARD_STATE.STOPPING}
          />
        </FadeIn>
      ) : null}

      {/* Deployable Targets Grid */}
      <FadeIn direction="up">
        <div className="flex items-center justify-between gap-3 mb-5 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-sm font-display font-black text-ink uppercase tracking-tight">
              Deployable Targets
            </h2>
          </div>
          <TacticalBadge label={`${labs.length} available`} variant="muted" size="sm" />
        </div>

        {labs.length === 0 ? (
          <EmptyState
            title="TARGET_DB_EMPTY"
            description="No deployable templates found in registry. Await system admin provisioning."
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {labs.map((lab) => {
              const labId = getEntityId(lab);
              return (
                <LabCard
                  key={toIdString(labId) || lab.title}
                  lab={lab}
                  onStartLab={handleStartLabVoid}
                  isStarting={sameId(startingLabId, labId)}
                  disabled={
                    dashboardState === DASHBOARD_STATE.STARTING_LAB &&
                    !sameId(startingLabId, labId)
                  }
                />
              );
            })}
          </div>
        )}
      </FadeIn>

      {/* Execution Log */}
      <FadeIn direction="up">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan" />
            <h2 className="text-sm font-display font-black text-ink uppercase tracking-tight">
              Session Log
            </h2>
          </div>
          <span className="text-[10px] text-muted tracking-widest uppercase">
            {sessionHistory.length} records
          </span>
        </div>

        <div className="bg-surface border border-border">
          {historyLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading logs" />
            </div>
          ) : sessionHistory.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6 text-muted" />}
              title="No sessions yet"
              description="Deploy a target to start recording session history."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-paper/60 text-[10px] text-muted tracking-[0.12em] uppercase">
                    <th className="px-5 py-3 text-left">Target</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Started</th>
                    <th className="px-5 py-3 text-left">Expires</th>
                    <th className="px-5 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {sessionHistory.map((s) => {
                    const getStatusBadge = (status: string) => {
                      const st = String(status || "").toUpperCase();
                      if (st === "RUNNING" || st === "INITIALIZING") {
                        return <TacticalBadge label={st} variant="success" pulse size="sm" />;
                      }
                      if (st === "STOPPED" || st === "TERMINATED") {
                        return <TacticalBadge label={st} variant="muted" size="sm" />;
                      }
                      return <TacticalBadge label={st || "UNKNOWN"} variant="error" size="sm" />;
                    };

                    const labName = "TARGET_CONTAINER";

                    const date = s.createdAt
                      ? new Date(s.createdAt).toLocaleString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })
                      : "—";

                    return (
                      <tr key={s.id} className="hover:bg-paper/40 transition-colors">
                        <td className="px-5 py-3.5 text-ink font-bold uppercase">
                          {labName}
                        </td>
                        <td className="px-5 py-3.5">
                          {getStatusBadge(s.status)}
                        </td>
                        <td className="px-5 py-3.5 text-muted">{s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}</td>
                        <td className="px-5 py-3.5 text-muted">{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "—"}</td>
                        <td className="px-5 py-3.5 text-dim">{date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </StaggerContainer>
  );
};

export default Dashboard;