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

const getServerMessage = (err: unknown, fallback: string): string => {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  return err instanceof Error ? err.message : fallback;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const [staleSessionId, setStaleSessionId] = useState<number | null>(null);
  const [pendingLabId, setPendingLabId] = useState<number | string | null>(null);
  const [terminatingStale, setTerminatingStale] = useState(false);

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

  // Poll a session until it reaches a terminal provisioning state.
  // Returns true when the container is running.
  const waitForRunning = async (sessionIdNum: number): Promise<boolean> => {
    for (let attempt = 0; attempt < 50; attempt++) {
      await sleep(3000);
      try {
        const detail = await labSessionService.getById(sessionIdNum);
        const status = String(detail.session?.status || "").toLowerCase();
        if (status === "running") return true;
        if (status === "error" || status === "stopped" || status === "terminated") return false;
      } catch {
        // Keep polling through transient read failures.
      }
    }
    return false;
  };

  // Drive an initializing session through docker build + spawn, then open it.
  const provisionAndOpen = async (sessionIdNum: number) => {
    setDashboardState(DASHBOARD_STATE.PROVISIONING);
    try {
      await labService.completeProvisioning(sessionIdNum);
    } catch (provisionErr: unknown) {
      // Provisioning is idempotent on the server for non-initializing states;
      // fall through to polling so a completed-but-unread spawn still resolves.
      const msg = getServerMessage(provisionErr, "");
      if (!/not in initializing state/i.test(msg)) {
        throw provisionErr;
      }
    }
    const running = await waitForRunning(sessionIdNum);
    if (!running) {
      throw new Error("Lab failed to start. Check the session log and try again.");
    }
    const detail = await labSessionService.getById(sessionIdNum);
    setActiveSession(detail.session);
    setDashboardState(DASHBOARD_STATE.RUNNING);
    navigate(`/workspace/${sessionIdNum}`);
  };

  // A previous attempt left an initializing/running row behind: resume it
  // instead of failing with "already have an active lab session".
  // Returns the blocker session id when one exists but could not be resumed.
  const resumeActiveSession = async (): Promise<number | null> => {
    const isResumableStatus = (s: string) => {
      const st = s.toLowerCase();
      return st === "running" || st === "initializing" || st === "pending";
    };
    try {
      const response = await labService.getActiveSession();
      const active = response?.session;
      if (active?.id && isResumableStatus(String(active.status || ""))) {
        const status = String(active.status).toLowerCase();
        if (status === "running") {
          navigate(`/workspace/${active.id}`);
        } else {
          await provisionAndOpen(active.id);
        }
        return null;
      }
    } catch {
      // Fall through to the session-list fallback below.
    }
    try {
      const list = await labSessionService.getAll();
      const blocker = (list.sessions || []).find((s) =>
        isResumableStatus(String(s.status || "")),
      );
      return blocker ? Number(blocker.id) : null;
    } catch {
      return null;
    }
  };

  const handleTerminateStaleAndRetry = async (labId: number | string | null | undefined) => {
    if (staleSessionId == null) return;
    try {
      setTerminatingStale(true);
      setError(null);
      await labSessionService.terminate(staleSessionId);
      setStaleSessionId(null);
      await fetchSessionHistory();
      await handleStartLab(labId);
    } catch (err: unknown) {
      setError(getServerMessage(err, "Failed to terminate the stale session."));
      setDashboardState(DASHBOARD_STATE.ERROR);
    } finally {
      setTerminatingStale(false);
    }
  };

  const handleStartLab = async (labId: number | string | null | undefined) => {
    if (labId == null) return;
    const labIdNum = typeof labId === "string" ? parseInt(labId, 10) : labId;
    if (isNaN(labIdNum)) return;

    try {
      setStartingLabId(labId);
      setPendingLabId(labId);
      setDashboardState(DASHBOARD_STATE.STARTING_LAB);
      setError(null);
      setStaleSessionId(null);

      const targetLab = labs.find((l) => sameId(getEntityId(l), labId));
      if (targetLab) setActiveLab(targetLab);

      const response = await labService.startLab(labIdNum);
      const newSession = response.session;

      if (newSession?.id) {
        await provisionAndOpen(newSession.id);
      }
    } catch (err: unknown) {
      const message = getServerMessage(err, "Failed to initialize lab container.");
      if (/already have an active lab session/i.test(message)) {
        const blockerId = await resumeActiveSession();
        if (blockerId == null) {
          setStaleSessionId(null);
          setStartingLabId(null);
          return;
        }
        setStaleSessionId(blockerId);
        setError(`Session #${blockerId} is still active and could not be resumed. Terminate it to free the slot, then retry.`);
      } else {
        console.error("Failed to launch lab:", err);
        setError(message);
      }
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
          {staleSessionId != null && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Button
                variant="danger"
                size="sm"
                disabled={terminatingStale}
                onClick={() => void handleTerminateStaleAndRetry(pendingLabId)}
              >
                {terminatingStale ? "Terminating..." : `Terminate session #${staleSessionId} and retry`}
              </Button>
            </div>
          )}
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