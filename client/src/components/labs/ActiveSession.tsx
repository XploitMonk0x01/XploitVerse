import { useState, useEffect } from "react";
import {
  Server,
  Clock,
  Terminal,
  StopCircle,
  ExternalLink,
  Copy,
  CheckCircle,
  Loader2,
  Globe,
  Cpu,
  HardDrive,
  AlertTriangle,
} from "lucide-react";
import type { LabSession, Lab } from '../../types';
import { BorderBeam } from '../ui/motion/BorderBeam';
import { TacticalBadge } from '../ui/motion/TacticalBadge';

interface ActiveSessionProps {
  session: LabSession | null;
  lab: Lab | null;
  onOpenWorkspace: () => void;
  onStopSession: () => void;
  isStopping?: boolean;
}

export const ActiveSession = ({ session, lab, onOpenWorkspace, onStopSession, isStopping }: ActiveSessionProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const sessionIdRaw = session?.id;
  const sessionId = sessionIdRaw !== null && sessionIdRaw !== undefined ? String(sessionIdRaw) : "";

  useEffect(() => {
    if (!session?.startedAt) return;

    const calculateElapsed = () => {
      if (!session?.startedAt) return 0;
      const start = new Date(session.startedAt).getTime();
      const now = Date.now();
      return Math.floor((now - start) / 1000);
    };

    setElapsed(calculateElapsed());
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.startedAt]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isProvisioning = session?.status === "initializing";

  return (
    <div className="bg-surface border border-accent/60 p-6 sm:p-8 font-mono shadow-md relative overflow-hidden">
      {/* Animated Border Beam around active session card */}
      <BorderBeam size={250} duration={8} colorFrom="#FF4500" colorTo="#00F0FF" />

      <div className="absolute top-0 right-0 px-3 py-1 font-mono text-[10px] text-accent bg-accent/10 border-b border-l border-accent/40 font-bold tracking-widest uppercase z-10">
        PID: {sessionId ? sessionId.slice(-6).toUpperCase() : "PROC_01"} // LIVE_OPS
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-border relative z-10">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-2.5 border ${
              isProvisioning
                ? "border-warning text-warning animate-pulse bg-warning/10"
                : "border-success text-success bg-success/10"
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-display font-black text-ink uppercase tracking-wider">
              {lab?.title || "ACTIVE_CONTAINER_TARGET"}
            </h2>
            <div className="mt-1">
              {isProvisioning ? (
                <TacticalBadge label="INITIALIZING_CONTAINER_RUNTIME" variant="warning" pulse size="sm" />
              ) : (
                <TacticalBadge label="TARGET_ONLINE // READY" variant="success" pulse size="sm" />
              )}
            </div>
          </div>
        </div>

        <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end">
          <div className="flex items-center gap-1.5 text-muted text-xs font-bold uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span>MISSION_UPTIME</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-ink tracking-tight font-mono">
            {formatTime(elapsed)}
          </p>
        </div>
      </div>

      {/* Provisioning Progress Bar */}
      {isProvisioning && (
        <div className="border border-warning bg-warning/5 p-5 mb-6 relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-warning animate-spin" />
            <div>
              <h3 className="text-warning font-bold text-xs tracking-widest uppercase">
                ALLOCATING RUNTIME PORTS & VIRTUAL ENVIRONMENT
              </h3>
              <p className="text-muted text-[11px] mt-0.5">
                Target environment spin-up in progress. Ready in ~3.2s
              </p>
            </div>
          </div>
          <div className="w-full bg-paper border border-border h-2 p-0.5">
            <div
              className="bg-warning h-full animate-pulse"
              style={{ width: "65%" }}
            />
          </div>
        </div>
      )}

      {/* Active Container Readout */}
      {!isProvisioning && (
        <div className="relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-paper border border-border p-3.5 border-l-2 border-l-cyan">
              <div className="flex items-center gap-1.5 text-muted text-[10px] font-bold uppercase tracking-widest mb-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan" />
                <span>CONTAINER_IP</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-bold text-cyan truncate">
                  {session?.publicIp || "127.0.0.1 (LOCAL_DOCKER)"}
                </code>
                <button
                  type="button"
                  title="Copy IP"
                  onClick={() => copyToClipboard(session?.publicIp || "127.0.0.1")}
                  className="p-1 text-muted hover:text-ink hover:bg-surface border border-border"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="bg-paper border border-border p-3.5 border-l-2 border-l-accent">
              <div className="flex items-center gap-1.5 text-muted text-[10px] font-bold uppercase tracking-widest mb-1.5">
                <Cpu className="w-3.5 h-3.5 text-accent" />
                <span>INSTANCE_PROFILE</span>
              </div>
              <p className="text-sm font-bold text-ink">
                ISOLATED_CONTAINER
              </p>
            </div>

            <div className="bg-paper border border-border p-3.5 border-l-2 border-l-muted">
              <div className="flex items-center gap-1.5 text-muted text-[10px] font-bold uppercase tracking-widest mb-1.5">
                <HardDrive className="w-3.5 h-3.5 text-muted" />
                <span>HOST_PORTS</span>
              </div>
              <p className="text-sm font-bold text-ink">
                80/TCP, 8080/TCP
              </p>
            </div>
          </div>

          {/* Quick Terminal Command */}
          <div className="border border-border p-3.5 mb-6 bg-paper flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <Terminal className="w-4 h-4 text-accent shrink-0" />
              <span className="text-muted shrink-0">DIRECT_CONSOLE:</span>
              <code className="text-success truncate">
                ssh student@{session?.publicIp || "localhost"}
              </code>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(`ssh student@${session?.publicIp || "localhost"}`)}
              className="px-2 py-1 text-[11px] bg-surface border border-border hover:border-ink text-muted hover:text-ink shrink-0"
            >
              COPY
            </button>
          </div>
        </div>
      )}

      {/* Action Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
        <button
          type="button"
          onClick={onOpenWorkspace}
          disabled={!sessionId || isProvisioning}
          className="w-full py-3 px-5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 border bg-ink text-paper hover:bg-accent hover:text-paper hover:border-accent transition-all shadow-sm disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>OPEN_WORKSPACE_CONSOLE</span>
        </button>

        <button
          type="button"
          onClick={onStopSession}
          disabled={isStopping || isProvisioning}
          className="w-full py-3 px-5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-error bg-error/10 text-error hover:bg-error hover:text-paper transition-all disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px]"
        >
          {isStopping ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>TERMINATING_INSTANCE...</span>
            </>
          ) : (
            <>
              <StopCircle className="w-3.5 h-3.5" />
              <span>HALT_TARGET_CONTAINER</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted tracking-widest uppercase relative z-10">
        <AlertTriangle className="w-3 h-3 text-warning" />
        <span>REMINDER: TERMINATE INSTANCE WHEN MISSION COMPLETED TO RELEASE PORTS</span>
      </div>
    </div>
  );
};

export default ActiveSession;