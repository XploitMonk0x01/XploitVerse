import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Shield,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Loader2,
  PowerOff,
  Key,
  CheckCircle2,
  Send,
  Info,
  Lightbulb,
  Link2,
} from "lucide-react";
import EnvironmentWindow from "../components/workspace/EnvironmentWindow";
import { Badge, difficultyVariant } from "../components/ui";
import { labSessionService, labService, flagService } from "../services";
import type { Lab, LabSession } from "../types";

const LabWorkspace = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<LabSession | null>(null);
  const [lab, setLab] = useState<Lab | null>(null);
  const [logs, setLogs] = useState<Array<{ type: string; message: string }>>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [mobileView, setMobileView] = useState<"docs" | "env">("env");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [flagInput, setFlagInput] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [flagStatus, setFlagStatus] = useState<{ solved: boolean; message: string; points?: number } | null>(null);

  const isVulnApp = Boolean(
    lab?.title?.toLowerCase().includes("vulnerableapp") ||
    lab?.description?.toLowerCase().includes("vulnerableapp") ||
    lab?.dockerImage?.toLowerCase().includes("vulnerable-app") ||
    lab?.dockerImage?.toLowerCase().includes("vulnerableapp")
  );
  const subPath = isVulnApp ? "/VulnerableApp" : "";

  let computedHostUrl =
    session?.hostUrl ||
    (session?.connectionInfo?.hostUrl as string | undefined) ||
    (session?.hostPort ? `http://localhost:${session.hostPort}${subPath}` : undefined) ||
    (session?.connectionInfo?.hostPort ? `http://localhost:${String(session.connectionInfo.hostPort)}${subPath}` : undefined);

  if (computedHostUrl && isVulnApp && !computedHostUrl.includes("/VulnerableApp")) {
    computedHostUrl = `${computedHostUrl.replace(/\/+$/, '')}/VulnerableApp`;
  }
  const hostUrl = computedHostUrl;

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFlag = flagInput.trim();
    if (!cleanFlag) return;
    const tId = Number(session?.taskId || lab?.id || 1);
    setSubmittingFlag(true);
    setFlagStatus(null);
    try {
      const res = await flagService.submit({ taskId: tId, flag: cleanFlag });
      if (res.alreadySolved) {
        setFlagStatus({ solved: true, message: "Flag verified (already solved).", points: res.pointsEarned });
      } else {
        setFlagStatus({ solved: true, message: "Correct flag submitted.", points: res.pointsEarned || 100 });
      }
      setFlagInput("");
    } catch (err: unknown) {
      let msg = "That flag was not accepted. Try again.";
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response?: { data?: { message?: string } } }).response?.data;
        if (data?.message) msg = data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setFlagStatus({ solved: false, message: msg });
    } finally {
      setSubmittingFlag(false);
    }
  };

  const terminalWsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const provisioningRef = useRef(false);

  const getEntityId = (entity: { id?: number } | number | null | undefined) => {
    if (typeof entity === 'number') return entity;
    return entity?.id ?? null;
  };

  const effectiveSessionId = getEntityId(session) || sessionId;

  // Fetch session and lab data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        let sessionData: LabSession | null = null;

        try {
          const response = await labSessionService.getById(Number(sessionId));
          sessionData = response.session;
        } catch (err: unknown) {
          const notFound = err instanceof Error && 'status' in err && (err as { status?: number }).status === 404;
          if (!notFound) {
            throw err;
          }

          // If the route carries a stale session id, recover by using the current active session.
          const activeResponse = await labService.getActiveSession();
          const activeData = activeResponse.session;
          if (!activeData) {
            throw err;
          }

          // Convert ActiveSessionResponse to LabSession
          const activeConn = ((activeData as { connectionInfo?: Record<string, unknown> }).connectionInfo) || {};
          const activeHostUrl =
            (activeData as { hostUrl?: string }).hostUrl ||
            (activeConn.hostUrl as string | undefined) ||
            (activeConn.url as string | undefined);
          const activeHostPort =
            (activeData as { hostPort?: number }).hostPort ||
            (activeConn.hostPort as number | undefined) ||
            (activeConn.port as number | undefined);

          sessionData = {
            id: activeData.id,
            userId: 0,
            roomId: activeData.roomId,
            taskId: activeData.taskId,
            status: activeData.status.toLowerCase() as LabSession['status'],
            startedAt: activeData.startedAt,
            expiresAt: activeData.expiresAt,
            networkName: activeData.networkName,
            targetContainerId: activeData.containerId,
            connectionInfo: activeConn,
            publicIp: (activeData as { publicIp?: string }).publicIp || (activeConn.ip as string) || activeData.containerId,
            hostUrl: activeHostUrl,
            hostPort: activeHostPort,
          };
          const activeId = getEntityId(sessionData);
          if (activeId && String(activeId) !== String(sessionId)) {
            navigate(`/workspace/${activeId}`, { replace: true });
          }
        }

        setSession(sessionData);

        // Fetch lab details
        const labId =
          getEntityId(sessionData?.lab) ||
          sessionData?.lab ||
          sessionData?.roomId;
        if (labId) {
          const labResponse = await labService.getById(labId);
          setLab(labResponse.lab);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch session:", err);
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      void fetchSessionData();
    }
  }, [sessionId, navigate]);

  // If the session never finished provisioning (docker build + spawn),
  // drive it here so the workspace never sits on a dead initializing row.
  useEffect(() => {
    const status = String(session?.status || "").toLowerCase();
    const id = Number(session?.id ?? sessionId);
    if (!id || Number.isNaN(id)) return;
    if (status !== "initializing" && status !== "pending") return;
    if (provisioningRef.current) return;
    provisioningRef.current = true;

    const provision = async () => {
      setProvisioning(true);
      setLogs((prev) => [...prev, { type: "system", message: "Provisioning target: building image and starting container…" }]);
      try {
        await labService.completeProvisioning(id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (!/not in initializing state/i.test(msg)) {
          setError(msg || "Provisioning failed. The container image could not be built.");
          setProvisioning(false);
          return;
        }
      }
      for (let attempt = 0; attempt < 50; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        try {
          const detail = await labSessionService.getById(id);
          const next = String(detail.session?.status || "").toLowerCase();
          if (next === "running") {
            setSession(detail.session);
            setLogs((prev) => [...prev, { type: "ready", message: "Target is online." }]);
            break;
          }
          if (next === "error" || next === "stopped" || next === "terminated") {
            setSession(detail.session);
            setError("The lab failed to start. End this session and try again.");
            break;
          }
        } catch {
          // Keep polling through transient read failures.
        }
      }
      setProvisioning(false);
    };

    void provision();
  }, [session?.status, session?.id, sessionId]);

  // Timer for elapsed time
  useEffect(() => {
    const started = session?.startedAt;
    if (!started) return;

    const calculateElapsed = () => {
      const start = new Date(started).getTime();
      const now = Date.now();
      return Math.floor((now - start) / 1000);
    };

    setElapsedTime(calculateElapsed());

    timerRef.current = setInterval(() => {
      setElapsedTime(calculateElapsed());
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [session?.startedAt]);

  // Handle terminal commands
  const handleTerminalCommand = useCallback((command: string) => {
    setLogs((prev) => [...prev, { type: "input", message: command }]);

    if (terminalWsRef.current && terminalWsRef.current.readyState === WebSocket.OPEN) {
      terminalWsRef.current.send(command + "\n");
    }
  }, []);

  // Native WebSocket terminal — connects to /ws/terminal only for active session states.
  useEffect(() => {
    if (!effectiveSessionId) return;

    const currentStatus = String(session?.status || "").toLowerCase();
    const shouldConnect = ["running", "initializing", "pending"].includes(currentStatus);
    if (!shouldConnect) {
      setConnected(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const explicitWsBase = (import.meta as { env: { VITE_WS_BASE?: string } }).env.VITE_WS_BASE || "";
    let hostPart = "";

    if (explicitWsBase) {
      hostPart = explicitWsBase.replace(/^https?:/, proto).replace(/\/$/, "");
    } else {
      const host = window.location.hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
      hostPart = isLocal ? `${proto}//127.0.0.1:5000` : `${proto}//${window.location.host}`;
    }

    const url = `${hostPart}/ws/terminal?sessionId=${effectiveSessionId}&token=${encodeURIComponent(token)}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(url);
      terminalWsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setLogs((prev) => [
          ...prev,
          { type: "system", message: "Terminal connected." },
          { type: "prompt", message: "$ " },
        ]);
      };

      ws.onmessage = (evt) => {
        const message = typeof evt.data === 'string' ? evt.data : String(evt.data);
        setLogs((prev) => [...prev, { type: "output", message }]);
      };

      ws.onclose = () => {
        setConnected(false);
        terminalWsRef.current = null;
        // Attempt reconnect after 3s while component is mounted
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      terminalWsRef.current = null;
    };
  }, [effectiveSessionId, session?.status]);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTerminate = async () => {
    if (!window.confirm("Terminate this lab session? Any unsaved progress will be lost.")) {
      return;
    }
    setTerminating(true);
    try {
      await labSessionService.terminate(Number(effectiveSessionId));
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to terminate lab:", err);
      alert("Unable to terminate the lab. Please try again.");
      setTerminating(false);
    }
  };

  const handleTerminateVoid = () => {
    void handleTerminate();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <span className="font-mono text-xs uppercase tracking-widest text-fg-subtle">
            Preparing workspace
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
        <div className="w-full max-w-md rounded-xl border border-danger/30 bg-bg-raised p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto mb-5 h-10 w-10 text-danger" strokeWidth={1.5} />
          <h1 className="text-lg font-semibold tracking-tight text-fg">Workspace unavailable</h1>
          <p className="mt-2 font-mono text-sm text-fg-muted">{error}</p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-base font-sans text-fg">
      {/* Header */}
      <header className="z-topbar flex shrink-0 items-center justify-between gap-4 border-b border-border bg-bg-raised px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="h-6 w-px shrink-0 bg-border" />

          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Shield className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-fg">
                {lab?.title || "Workspace"}
              </h1>
              <div className="flex items-center gap-2 text-xs text-fg-subtle">
                <Badge variant={difficultyVariant(lab?.difficulty)} size="sm">
                  {lab?.difficulty || "Unknown"}
                </Badge>
                {lab?.category && <span className="truncate">{lab.category}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium " +
              (connected
                ? "border-success/30 bg-success/10 text-success"
                : "border-warn/30 bg-warn/10 text-warn")
            }
          >
            {connected ? (
              <Wifi className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <WifiOff className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            <span className="hidden sm:inline">{connected ? "Connected" : "Connecting"}</span>
          </span>

          <span className="flex items-center gap-1.5 rounded-full border border-border bg-bg-base px-2.5 py-1 font-mono text-xs text-fg-muted">
            <Clock className="h-3.5 w-3.5 text-fg-subtle" strokeWidth={1.75} />
            {formatTime(elapsedTime)}
          </span>

          <button
            onClick={handleTerminateVoid}
            disabled={terminating}
            className="flex items-center gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
          >
            {terminating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <PowerOff className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            <span className="hidden sm:inline">{terminating ? "Ending…" : "Terminate"}</span>
          </button>
        </div>
      </header>

      {/* Mobile view switch */}
      <div className="flex shrink-0 gap-1 border-b border-border bg-bg-raised p-1.5 lg:hidden">
        <button
          onClick={() => setMobileView("docs")}
          className={
            "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors " +
            (mobileView === "docs" ? "bg-bg-terminal text-white" : "text-fg-muted")
          }
        >
          <BookOpen className="h-4 w-4" strokeWidth={1.75} />
          Documentation
        </button>
        <button
          onClick={() => setMobileView("env")}
          className={
            "flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors " +
            (mobileView === "env" ? "bg-bg-terminal text-white" : "text-fg-muted")
          }
        >
          <Shield className="h-4 w-4" strokeWidth={1.75} />
          Environment
        </button>
      </div>

      {provisioning && (
        <div
          className="flex shrink-0 items-center gap-2.5 border-b border-info/30 bg-info/10 px-4 py-2 text-xs text-info"
          role="status"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.75} />
          Provisioning target — building the image and starting the container. This can take a few minutes.
        </div>
      )}

      {/* Main — documentation left, environment right, equal height */}
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: documentation */}
        <section
          className={
            "min-h-0 w-full flex-col border-border bg-bg-raised lg:flex lg:w-[42%] lg:border-r xl:w-[40%] " +
            (mobileView === "docs" ? "flex" : "hidden")
          }
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
            <BookOpen className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold tracking-tight text-fg">Lab Documentation</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <p className="text-sm leading-relaxed text-fg-muted">{lab?.description}</p>

            {lab?.objectives && lab.objectives.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Objectives
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {lab.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-fg-muted">
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lab?.instructions && (
              <div className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Walkthrough
                </h3>
                <div className="mt-3 whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-relaxed text-fg-muted">
                  {lab.instructions}
                </div>
              </div>
            )}

            {/* Target & flag submission */}
            <div className="mt-8 rounded-lg border border-border bg-bg-base p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Key className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  Submit the flag
                </h3>
                <Badge variant={flagStatus?.solved ? "success" : "muted"} size="sm">
                  {flagStatus?.solved ? "Solved" : "In progress"}
                </Badge>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                Compromise the target from the workstation on the right, retrieve the flag, and
                submit it below to record your progress.
              </p>

              {hostUrl && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-bg-raised px-3 py-2">
                  <span className="flex items-center gap-2 text-xs text-fg-muted">
                    <Info className="h-3.5 w-3.5 text-fg-subtle" strokeWidth={1.75} />
                    Target is served from the Browser app
                  </span>
                  <a
                    href={hostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    <span className="max-w-[16rem] truncate">{hostUrl}</span>
                    <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                  </a>
                </div>
              )}

              {flagStatus && (
                <div
                  className={
                    "mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm " +
                    (flagStatus.solved
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-danger/30 bg-danger/10 text-danger")
                  }
                >
                  {flagStatus.solved ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  )}
                  <span>
                    {flagStatus.message}
                    {flagStatus.points ? ` (+${flagStatus.points} pts)` : ""}
                  </span>
                </div>
              )}

              <form onSubmit={(e) => { void handleFlagSubmit(e); }} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="FLAG{…}"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 rounded-md border border-border bg-bg-raised px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <button
                  type="submit"
                  disabled={submittingFlag || !flagInput.trim()}
                  className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {submittingFlag ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <Send className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  Submit
                </button>
              </form>
            </div>

            {lab?.hints && lab.hints.length > 0 && (
              <div className="mt-8">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Hints
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {lab.hints.map((hint, index) => (
                    <li key={index} className="border-l-2 border-warn/40 pl-4 text-sm text-fg-muted">
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lab?.resources && lab.resources.length > 0 && (
              <div className="mt-8">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Resources
                </h3>
                <ul className="mt-3 space-y-2">
                  {lab.resources.map((resource, index) => (
                    <li key={index}>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-info transition-colors hover:text-accent"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                        <span>{resource.title || resource.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Right: unified environment workstation */}
        <section
          className={
            "min-h-0 w-full flex-1 flex-col bg-bg-base p-3 lg:flex " +
            (mobileView === "env" ? "flex" : "hidden")
          }
        >
          <EnvironmentWindow
            logs={logs}
            onCommand={handleTerminalCommand}
            isConnected={connected}
            onClear={() => setLogs([])}
            hostUrl={hostUrl}
            terminalTitle={`${lab?.title || "Lab"} · shell`}
          />
        </section>
      </main>
    </div>
  );
};

export default LabWorkspace;
