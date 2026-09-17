import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Terminal,
  BookOpen,
  Shield,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Server,
  Loader2,
  PowerOff,
  Key,
  CheckCircle2,
  Send,
  Globe,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import TerminalWindow from "../components/workspace/TerminalWindow";
import {
  BorderBeam,
  DecryptedText,
  TacticalBadge,
  ScalePress,
} from "../components/ui/motion";
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
  const [activeTab, setActiveTab] = useState<"terminal" | "webapp" | "guide">("terminal");
  const [viewMode, setViewMode] = useState<"terminal" | "webapp">("terminal");
  const [iframeKey, setIframeKey] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [flagInput, setFlagInput] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [flagStatus, setFlagStatus] = useState<{ solved: boolean; message: string; points?: number } | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);

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
    (session?.connectionInfo?.hostPort ? `http://localhost:${session.connectionInfo.hostPort}${subPath}` : undefined);

  if (computedHostUrl && isVulnApp && !computedHostUrl.includes("/VulnerableApp")) {
    computedHostUrl = `${computedHostUrl.replace(/\/+$/, '')}/VulnerableApp`;
  }
  const hostUrl = computedHostUrl;

  const handleCopyUrl = () => {
    if (hostUrl) {
      void navigator.clipboard.writeText(hostUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

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
        setFlagStatus({ solved: true, message: "Flag verified (already solved)!", points: res.pointsEarned });
      } else {
        setFlagStatus({ solved: true, message: "Correct flag! Mission accomplished.", points: res.pointsEarned || 100 });
      }
      setFlagInput("");
    } catch (err: unknown) {
      let msg = "Incorrect flag. Try again!";
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
      setLogs((prev) => [...prev, { type: "system", message: "── Provisioning target: docker build + spawn ──" }]);
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
            setLogs((prev) => [...prev, { type: "system", message: "── Target online ──" }]);
            break;
          }
          if (next === "error" || next === "stopped" || next === "terminated") {
            setSession(detail.session);
            setError("Lab failed to start. Terminate this session and try again.");
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
    // Append the echo immediately for responsiveness
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
          { type: "system", message: "── Terminal connected ──" },
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
    if (!window.confirm("Are you sure you want to terminate this lab session? All progress will be lost.")) {
      return;
    }
    setTerminating(true);
    try {
      await labSessionService.terminate(Number(effectiveSessionId));
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to terminate lab:", err);
      alert("Failed to terminate lab. Please try again.");
      setTerminating(false);
    }
  };

  const handleTerminateVoid = () => {
    void handleTerminate();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        <div className="border border-border bg-surface p-8 w-full max-w-sm flex items-center justify-center shadow-[8px_8px_0px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="font-mono text-accent text-xs font-bold tracking-widest uppercase animate-pulse">
              [ INITIALIZING_WORKSPACE ]
            </span>
            <Loader2 className="w-8 h-8 text-ink animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        <div className="border border-error bg-surface p-8 w-full max-w-md shadow-[8px_8px_0px_rgba(0,0,0,0.2)]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-error mx-auto mb-6 animate-pulse" />
            <h1 className="text-xl font-display font-bold text-ink mb-4 uppercase tracking-wider">WORKSPACE_FAULT</h1>
            <p className="text-muted font-mono text-sm mb-8">Err: {error}</p>
            <Link
              to="/dashboard"
              className="inline-block px-6 py-3 bg-surface hover:bg-ink hover:text-paper text-ink border border-border font-mono text-xs uppercase font-bold tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,0.2)] transition-colors"
            >
              RETURN_TO_DASHBOARD
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans text-ink">
      {/* Top Header Bar */}
      <header className="bg-surface border-b border-border px-4 py-3 relative z-10 shadow-sm overflow-hidden">
        {connected && (
          <BorderBeam size={180} duration={12} colorFrom="#00E699" colorTo="#00F0FF" />
        )}
        <div className="flex items-center justify-between relative z-10">
          {/* Left section */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted hover:text-ink font-mono text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">DASHBOARD</span>
            </button>

            <div className="h-6 w-px bg-border border-r border-dashed" />

            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-paper border border-border flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-ink font-display font-bold text-lg leading-none uppercase tracking-wider mb-1">
                  <DecryptedText text={lab?.title || "WORKSPACE"} animateOn="view" speed={25} />
                </h1>
                <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold tracking-widest">
                  <TacticalBadge
                    variant={
                      lab?.difficulty?.toLowerCase() === "hard"
                        ? "danger"
                        : lab?.difficulty?.toLowerCase() === "medium"
                        ? "warning"
                        : "info"
                    }
                    size="sm"
                  >
                    {lab?.difficulty || "UNKNOWN"}
                  </TacticalBadge>
                  <span className="text-border">•</span>
                  <span className="text-muted text-[11px]">{lab?.category || "SYS_OP"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Connection status */}
            <TacticalBadge
              variant={connected ? "success" : "danger"}
              size="md"
              pulse={!connected}
            >
              {connected ? (
                <Wifi className="w-3 h-3 mr-1 inline" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1 inline animate-pulse" />
              )}
              <span className="hidden sm:inline">
                {connected ? "LINK_ACTIVE" : "NO_LINK"}
              </span>
            </TacticalBadge>

            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-paper border border-border text-muted font-mono text-xs font-bold tracking-widest">
              <Clock className="w-3 h-3 text-accent" />
              <span>{formatTime(elapsedTime)}</span>
            </div>

            {/* VM IP */}
            {session?.publicIp && (
              <TacticalBadge variant="info" size="md">
                <Server className="w-3 h-3 mr-1 inline text-info" />
                <span>{session.publicIp}</span>
              </TacticalBadge>
            )}

            {/* Live Web App Header Button */}
            {hostUrl && (
              <a
                href={hostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 border border-accent/40 text-accent font-mono text-xs font-bold tracking-wider uppercase transition-colors shadow-sm"
                title="Open live web app in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">OPEN WEB APP ↗</span>
                <span className="md:hidden">WEB ↗</span>
              </a>
            )}

            {/* Terminate Button */}
            <ScalePress scale={0.97}>
              <button
                onClick={handleTerminateVoid}
                disabled={terminating}
                className="flex items-center gap-2 px-3 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-mono text-xs font-bold tracking-widest uppercase transition-colors"
              >
                {terminating ? <Loader2 className="w-3 h-3 animate-spin" /> : <PowerOff className="w-3 h-3" />}
                <span className="hidden sm:inline">{terminating ? "TERMINATING..." : "TERMINATE"}</span>
              </button>
            </ScalePress>
          </div>
        </div>
      </header>

      {/* Mobile Tab Selector */}
      <div className="lg:hidden flex bg-surface border-b border-border font-mono text-xs font-bold uppercase tracking-widest">
        <button
          onClick={() => { setActiveTab("terminal"); setViewMode("terminal"); }}
          className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-colors ${activeTab === "terminal"
            ? "text-ink border-accent bg-paper font-bold"
            : "text-muted border-transparent"
            }`}
        >
          <Terminal className="w-4 h-4" />
          <span>SHELL</span>
        </button>
        <button
          onClick={() => { setActiveTab("webapp"); setViewMode("webapp"); }}
          className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 border-l border-r border-border transition-colors ${activeTab === "webapp"
            ? "text-ink border-accent bg-paper font-bold"
            : "text-muted border-transparent"
            }`}
        >
          <Globe className="w-4 h-4" />
          <span>WEB</span>
          {hostUrl && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
        </button>
        <button
          onClick={() => setActiveTab("guide")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-colors ${activeTab === "guide"
            ? "text-ink border-b-accent bg-paper font-bold"
            : "text-muted border-b-transparent"
            }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>DOCS</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {provisioning && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-warning/10 border-b border-warning/40 font-mono text-xs text-warning font-bold uppercase tracking-widest" role="status">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Provisioning target — building image and spawning container. This can take a few minutes.</span>
          </div>
        )}
        <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Terminal & Web View */}
        <div className={`${activeTab === "terminal" || activeTab === "webapp" ? "block" : "hidden"
          } lg:flex lg:flex-col lg:w-1/2 xl:w-3/5 h-full p-0 sm:p-3 bg-paper overflow-hidden`}>
          
          {/* Sub-tab switcher between Shell & Web App */}
          <div className="hidden sm:flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider">
              <button
                onClick={() => setViewMode("terminal")}
                className={`px-3 py-1.5 border transition-colors flex items-center gap-1.5 ${
                  viewMode === "terminal"
                    ? "bg-accent text-paper border-accent font-bold"
                    : "bg-surface text-muted border-border hover:text-ink"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SHELL TERMINAL</span>
              </button>
              <button
                onClick={() => setViewMode("webapp")}
                className={`px-3 py-1.5 border transition-colors flex items-center gap-1.5 ${
                  viewMode === "webapp"
                    ? "bg-accent text-paper border-accent font-bold"
                    : "bg-surface text-muted border-border hover:text-ink"
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>LIVE WEB APP</span>
                {hostUrl && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            </div>
            {hostUrl && (
              <a
                href={hostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-accent hover:underline font-mono text-xs font-bold"
              >
                <span>OPEN IN BROWSER</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* View Mode Content */}
          <div className="flex-1 overflow-hidden h-full">
            {viewMode === "terminal" ? (
              <TerminalWindow
                logs={logs}
                onCommand={handleTerminalCommand}
                isConnected={connected}
                title={`${lab?.title || "LAB"}_SHELL`}
                onClear={() => setLogs([])}
              />
            ) : (
              <div className="flex flex-col h-full border border-border bg-surface overflow-hidden">
                <div className="bg-paper border-b border-border px-3 py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" />
                    <span className="font-mono text-xs font-bold text-ink uppercase tracking-wider">LIVE_TARGET_BROWSER</span>
                  </div>
                  <div className="flex-1 max-w-xl flex items-center bg-surface border border-border px-3 py-1 text-xs font-mono text-muted overflow-hidden">
                    <span className="truncate">{hostUrl || `Target: ${session?.publicIp || "Connecting..."}`}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIframeKey((k) => k + 1)}
                      title="Reload Web App"
                      className="p-1.5 hover:bg-surface border border-border text-muted hover:text-ink transition-colors flex items-center gap-1 text-xs font-mono"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">RELOAD</span>
                    </button>
                    {hostUrl && (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyUrl}
                          className="p-1.5 hover:bg-surface border border-border text-muted hover:text-ink transition-colors flex items-center gap-1 text-xs font-mono"
                          title="Copy Target URL"
                        >
                          {copiedUrl ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline text-[11px]">{copiedUrl ? "COPIED" : "COPY"}</span>
                        </button>
                        <a
                          href={hostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-accent hover:bg-accent/90 text-paper font-mono text-xs font-bold transition-colors uppercase tracking-wider shadow-sm"
                        >
                          <span>OPEN IN BROWSER ↗</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-header auto-start 5 minutes guidance banner */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-amber-300">
                  <span className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Services auto-start with lab. Please wait up to 5 minutes for Spring Boot / MariaDB / Django daemons to boot.</span>
                  </span>
                  <button
                    onClick={() => setIframeKey((k) => k + 1)}
                    className="text-accent underline shrink-0 hover:text-ink ml-2 font-bold"
                  >
                    Refresh View
                  </button>
                </div>

                <div className="flex-1 bg-white relative">
                  {hostUrl ? (
                    <iframe
                      key={iframeKey}
                      src={hostUrl}
                      title="Lab Web Application"
                      className="w-full h-full border-0"
                      sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-paper text-muted font-mono">
                      <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
                      <p className="text-xs font-bold uppercase tracking-widest text-ink">STARTING WEB APP TARGET...</p>
                      <p className="text-[11px] mt-1 text-muted max-w-sm">
                        Services auto-start with lab execution. Complex targets (Spring Boot, Tomcat, MariaDB) may take up to 2–5 minutes to initialize.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Guide */}
        <div className={`${activeTab === "guide" ? "block" : "hidden"
          } lg:block lg:w-1/2 xl:w-2/5 h-full flex flex-col border-l border-border bg-surface`}>
          <div className={`${activeTab === "guide" ? "block" : "hidden"
            } lg:flex lg:flex-col h-full overflow-y-auto`}>
            <div className="bg-paper border-b border-border p-3 flex items-center gap-2 sticky top-0 z-10">
              <BookOpen className="w-4 h-4 text-accent" />
              <h2 className="text-ink font-mono text-xs font-bold uppercase tracking-widest">LAB_DOCUMENTATION</h2>
            </div>
            <div className="p-6 overflow-y-auto">
              {/* Lab Description */}
              <div className="prose prose-invert prose-sm max-w-none font-mono">
                <p className="text-muted leading-relaxed mb-8">{lab?.description}</p>

                {/* Objectives */}
                {lab?.objectives && lab.objectives.length > 0 && (
                  <div className="mb-8 border border-border p-4 bg-surface">
                    <h3 className="text-ink font-bold font-mono uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                      <span className="text-accent">#</span> PRIMARY_OBJECTIVES
                    </h3>
                    <ul className="space-y-3">
                      {lab.objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-3 text-muted text-sm">
                          <ChevronRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {lab?.instructions && (
                  <div className="mb-8">
                    <h3 className="text-ink font-bold font-mono uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                      <span className="text-accent">#</span> EXECUTION_STEPS
                    </h3>
                    <div className="text-muted text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-border pl-4 py-2">
                      {lab.instructions}
                    </div>
                  </div>
                )}

                {/* Dedicated Target Web Application Access Card */}
                <div className="mb-8 border-2 border-accent bg-paper p-5 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <h3 className="text-ink font-bold font-mono uppercase tracking-widest text-xs flex items-center gap-2">
                        <Globe className="w-4 h-4 text-accent" /> TARGET_APPLICATION // BROWSER_ACCESS
                      </h3>
                    </div>
                    <TacticalBadge variant={hostUrl ? "success" : "warning"} size="sm">
                      {hostUrl ? "ONLINE" : "INITIALIZING"}
                    </TacticalBadge>
                  </div>

                  <p className="text-xs text-muted mb-3 font-mono leading-relaxed">
                    This lab hosts an interactive web application target. You can access and interact with it directly in your browser or through the built-in live web viewer.
                  </p>

                  {/* URL Box & Action Buttons */}
                  <div className="bg-surface border border-border p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <span className="text-[10px] font-mono uppercase font-bold text-muted shrink-0">TARGET URL:</span>
                      <code className="text-xs font-mono font-bold text-accent truncate select-all">
                        {hostUrl || "Detecting host port..."}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hostUrl && (
                        <>
                          <button
                            type="button"
                            onClick={handleCopyUrl}
                            className="px-2.5 py-1.5 bg-paper hover:bg-surface border border-border text-muted hover:text-ink font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
                            title="Copy Target URL"
                          >
                            {copiedUrl ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedUrl ? "COPIED" : "COPY"}</span>
                          </button>

                          <a
                            href={hostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-paper font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <span>OPEN IN BROWSER</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode("webapp");
                          setActiveTab("webapp");
                        }}
                        className="px-2.5 py-1.5 bg-paper hover:bg-surface border border-border text-muted hover:text-ink font-mono text-xs font-bold transition-colors"
                      >
                        VIEW IN APP
                      </button>
                    </div>
                  </div>

                  {/* 5-minute Auto-Start / Service Initialization Notice */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 font-mono text-xs flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase tracking-wider text-amber-400 text-[11px]">
                          ⚡ SERVICE AUTO-START NOTICE
                        </span>
                        <span className="text-[10px] text-amber-300/80 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40">
                          WAIT UP TO 5 MINUTES
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        Web services auto-start automatically with lab execution. Complex application stacks (e.g. Spring Boot, Tomcat, MariaDB, Django) take <strong>2 to 5 minutes</strong> to fully initialize their runtime environments.
                      </p>
                      <p className="text-[11px] text-amber-200/70">
                        If the page shows <em>Connection Refused</em>, <em>502</em>, or continues loading, please allow up to 5 minutes for all background services to complete startup, then reload.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Challenge Tasks & Flag Submission (TryHackMe / HTB Style) */}
                <div className="mb-8 border-2 border-accent/40 bg-paper p-5 relative overflow-hidden shadow-md">
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border">
                    <h3 className="text-accent font-bold font-mono uppercase tracking-widest text-xs flex items-center gap-2">
                      <Key className="w-4 h-4 text-accent" /> TASK_QUESTIONS // SUBMIT_FLAG
                    </h3>
                    <TacticalBadge variant={flagStatus?.solved ? "success" : "warning"} size="sm">
                      {flagStatus?.solved ? "SOLVED" : "IN_PROGRESS"}
                    </TacticalBadge>
                  </div>

                  <p className="text-xs text-muted mb-4 font-mono leading-relaxed">
                    Question: Exploit the vulnerable target system using the live shell on the left or the target web application. Extract the security flag and submit it below to earn points.
                  </p>

                  <div className="mb-4 p-3 bg-surface border border-border text-xs font-mono text-muted space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-ink font-bold">BROWSER TARGET:</span>
                      {hostUrl ? (
                        <a
                          href={hostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex items-center gap-1 font-bold"
                        >
                          <span>{hostUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-warning font-bold">STARTING SERVICES (WAIT UP TO 5 MIN)...</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted border-t border-border pt-1.5">
                      <span>Internal Host IP: <strong className="text-ink">{session?.publicIp || "127.0.0.1"}</strong></span>
                      <span>Target Ports: <strong className="text-accent">{lab?.exposedPorts?.join(", ") || "80, 9090"}</strong></span>
                    </div>
                  </div>

                  {flagStatus && (
                    <div className={`mb-4 p-3 border text-xs font-mono flex items-center gap-2 ${flagStatus.solved ? 'bg-success/15 border-success text-success font-bold' : 'bg-error/15 border-error text-error'}`}>
                      {flagStatus.solved ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <span>{flagStatus.message} {flagStatus.points ? `(+${flagStatus.points} PTS)` : ""}</span>
                    </div>
                  )}

                  <form onSubmit={handleFlagSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={flagInput}
                      onChange={(e) => setFlagInput(e.target.value)}
                      placeholder="FLAG{...} or XPLOIT{...}"
                      autoComplete="off"
                      className="flex-1 bg-surface border border-border px-3 py-2 text-xs font-mono text-ink placeholder:text-muted focus:outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      disabled={submittingFlag || !flagInput.trim()}
                      className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-paper font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                    >
                      {submittingFlag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>SUBMIT</span>
                    </button>
                  </form>
                </div>

                {/* Hints */}
                {lab?.hints && lab.hints.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-warning font-bold font-mono uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                      <span className="text-warning">?</span> TACTICAL_HINTS
                    </h3>
                    <ul className="space-y-3">
                      {lab.hints.map((hint, index) => (
                        <li key={index} className="text-muted text-sm pl-4 border-l-2 border-warning/40">
                          {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Resources */}
                {lab?.resources && lab.resources.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-info font-bold font-mono uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                      <span className="text-info">@</span> AUX_RESOURCES
                    </h3>
                    <ul className="space-y-2 font-mono text-sm">
                      {lab.resources.map((resource, index) => (
                        <li key={index}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-info hover:text-ink hover:underline decoration-dashed transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>{resource.title || resource.url}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default LabWorkspace;