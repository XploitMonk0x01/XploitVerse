import { useState, useEffect, useCallback, useMemo } from "react";
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
  Radio,
  Layers,
  Search,
  Shield,
} from "lucide-react";
import type { Lab, LabSession } from "../../types";
import { FadeIn } from "../../components/ui/motion/MotionWrappers";

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

  // Search and difficulty filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");

  // Stats calculations
  const stats = [
    {
      label: "Total Lab Time",
      value: `${user?.totalLabTime || 0}m`,
      subtext: "Aggregate uptime",
      icon: Clock,
      color: "text-accent",
      badgeColor: "bg-accent/10 text-accent border-accent/20",
    },
    {
      label: "Total Spent",
      value: `$${(user?.totalSpent || 0).toFixed(2)}`,
      subtext: "Metered compute",
      icon: DollarSign,
      color: "text-accent",
      badgeColor: "bg-accent/10 text-accent border-accent/20",
    },
    {
      label: "Active Sessions",
      value: activeSession ? "1" : "0",
      subtext: "Live containers",
      icon: Server,
      color: "text-accent",
      badgeColor: "bg-accent/10 text-accent border-accent/20",
    },
    {
      label: "Security Clearance",
      value: user?.role || "STUDENT",
      subtext: "Access level",
      icon: Shield,
      color: "text-accent",
      badgeColor: "bg-accent/10 text-accent border-accent/20",
    },
  ];

  const resumeActiveSession = useCallback(async (): Promise<number | null> => {
    try {
      const response = await labSessionService.getActive();
      const session = response.session;
      if (!session) return null;

      const sid = session.id;
      if (typeof sid !== 'number') return null;

      const isRunning = String(session.status || '').toLowerCase() === 'running';
      if (!isRunning) {
        return sid;
      }

      const activeLabRef = getSessionLabRef(session);
      const matched = labs.find(
        (item) => sameId(getEntityId(item), activeLabRef) || sameId(item.id, activeLabRef)
      );

      setActiveSession(session);
      if (matched) setActiveLab(matched);
      setDashboardState(DASHBOARD_STATE.RUNNING);
      return null;
    } catch {
      return null;
    }
  }, [labs]);

  const fetchLabs = useCallback(async () => {
    try {
      setDashboardState(DASHBOARD_STATE.LOADING_LABS);
      setError(null);
      const response = await labService.getAll();
      const labList = Array.isArray(response) ? response : response.labs || [];
      setLabs(labList);
      setDashboardState(DASHBOARD_STATE.IDLE);
    } catch (err: unknown) {
      console.error("Failed to load labs:", err);
      setError(getServerMessage(err, "Failed to load labs. Check your connection."));
      setDashboardState(DASHBOARD_STATE.ERROR);
    }
  }, []);

  useEffect(() => {
    void fetchLabs();
  }, [fetchLabs]);

  useEffect(() => {
    if (labs.length > 0) {
      void resumeActiveSession();
    }
  }, [labs, resumeActiveSession]);

  const provisionAndOpen = async (sessionId: number) => {
    setDashboardState(DASHBOARD_STATE.PROVISIONING);
    try {
      await labService.completeProvisioning(sessionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!/not in initializing state/i.test(msg)) {
        throw err;
      }
    }

    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(2000);
      try {
        const detail = await labSessionService.getById(sessionId);
        const status = String(detail.session?.status || "").toLowerCase();
        if (status === "running") {
          setActiveSession(detail.session);
          setDashboardState(DASHBOARD_STATE.RUNNING);
          navigate(`/workspace/${sessionId}`);
          return;
        }
        if (status === "error" || status === "stopped" || status === "terminated") {
          throw new Error("The lab stopped unexpectedly.");
        }
      } catch (pollErr: unknown) {
        if (attempt > 10) throw pollErr;
      }
    }

    navigate(`/workspace/${sessionId}`);
  };

  const handleTerminateStaleAndRetry = async (labId: number | string | null) => {
    if (staleSessionId == null) return;
    try {
      setTerminatingStale(true);
      setError(null);
      await labSessionService.terminate(staleSessionId);
      setStaleSessionId(null);
      setActiveSession(null);
      setActiveLab(null);
      await sleep(800);
      if (labId != null) {
        await handleStartLab(labId);
      }
    } catch (err: unknown) {
      setError(getServerMessage(err, `Failed to terminate orphaned session #${staleSessionId}.`));
    } finally {
      setTerminatingStale(false);
    }
  };

  const handleStartLab = async (labId: number | string | null | undefined) => {
    if (labId == null || labId === "") return;
    const labIdNum = typeof labId === "number" ? labId : parseInt(String(labId), 10);
    if (isNaN(labIdNum)) {
      setError("Invalid lab ID.");
      return;
    }

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
        setError(`Session #${blockerId} is still active. Stop it to free your session slot, then retry.`);
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

  // Filtered labs
  const filteredLabs = useMemo(() => {
    return labs.filter((lab) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lab.description && lab.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (lab.category && lab.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDifficulty =
        selectedDifficulty === "ALL" ||
        lab.difficulty?.toUpperCase() === selectedDifficulty;

      return matchesSearch && matchesDifficulty;
    });
  }, [labs, searchQuery, selectedDifficulty]);

  if (dashboardState === DASHBOARD_STATE.LOADING_LABS && labs.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <LoadingSpinner size="lg" message="Loading labs…" />
      </div>
    );
  }

  const hasActiveSession = activeSession && activeSession.status !== "terminated" && activeSession.status !== "stopped";

  return (
    <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── OPERATOR COMMAND HEADER ── */}
      <FadeIn direction="down" className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-medium uppercase tracking-wider text-accent">Dashboard</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Welcome back, {user?.username || 'there'}
          </h1>
          <p className="mt-1 text-xs text-fg-muted sm:text-sm">
            Launch a lab and track your progress.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchLabs()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
            Refresh labs
          </Button>
        </div>
      </FadeIn>

      {/* ── ERROR NOTIFICATION BANNER ── */}
      {error && (
        <FadeIn className="mb-6">
          <ErrorState error={error} onRetry={() => setError(null)} />
          {staleSessionId != null && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="danger"
                size="sm"
                disabled={terminatingStale}
                onClick={() => void handleTerminateStaleAndRetry(pendingLabId)}
              >
                {terminatingStale ? "Stopping…" : `Stop session #${staleSessionId} and retry`}
              </Button>
            </div>
          )}
        </FadeIn>
      )}

      {/* ── TELEMETRY METRICS ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-bg-raised p-5 transition-colors hover:border-accent/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-fg-muted">
                  {stat.label}
                </span>
                <div className={`rounded-md border p-1.5 ${stat.badgeColor}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
              </div>
              <p className="mb-1 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                {stat.value}
              </p>
              <p className="text-[10px] uppercase text-fg-muted">
                {stat.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── ACTIVE SESSION HUD ── */}
      {hasActiveSession && (
        <FadeIn direction="up">
          <div className="rounded-lg border border-accent/30 bg-bg-raised p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <Radio className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="text-xs font-medium uppercase tracking-wider text-accent">
                Active session
              </h2>
            </div>
            <ActiveSession
              session={activeSession}
              lab={activeLab}
              onOpenWorkspace={handleOpenWorkspaceVoid}
              onStopSession={handleStopSessionVoid}
              isStopping={dashboardState === DASHBOARD_STATE.STOPPING}
            />
          </div>
        </FadeIn>
      )}

      {/* ── LAB CATALOG ── */}
      <FadeIn direction="up" className="space-y-5">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="text-lg font-semibold tracking-tight text-fg">
              Labs
            </h2>
            <span className="rounded border border-border bg-bg-overlay px-2 py-0.5 font-mono text-xs text-accent">
              {filteredLabs.length} online
            </span>
          </div>

          {/* Search and Difficulty Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" strokeWidth={1.75} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search labs..."
                className="w-48 rounded-md border border-border bg-bg-raised py-1.5 pl-8 pr-3 text-xs text-fg transition-colors placeholder:text-fg-subtle focus:border-accent focus:outline-none sm:w-56"
              />
            </div>

            {/* Difficulty Tabs */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-bg-raised p-1 text-[11px]">
              {[
                { label: "All", val: "ALL" },
                { label: "Easy", val: "EASY" },
                { label: "Medium", val: "MEDIUM" },
                { label: "Hard", val: "HARD" },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSelectedDifficulty(val)}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    selectedDifficulty === val
                      ? "bg-accent text-accent-fg"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Labs Grid */}
        {filteredLabs.length === 0 ? (
          <EmptyState
            title="No labs match your search"
            description="Try a different search term, or clear the difficulty filter."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLabs.map((lab) => {
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
    </div>
  );
};

export default Dashboard;