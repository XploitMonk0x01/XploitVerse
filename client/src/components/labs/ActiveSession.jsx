import React, { useState, useEffect } from "react";
import {
    Server,
    Clock,
    Terminal,
    StopCircle,
    Copy,
    CheckCircle,
    Loader2,
    Globe,
    Cpu,
    HardDrive,
} from "lucide-react";

const ActiveSession = ({ session, lab, onStopSession, isStopping }) => {
    const [elapsed, setElapsed] = useState(0);
    const [copied, setCopied] = useState(false);

    // Timer effect
    useEffect(() => {
        if (!session?.startTime) return;

        const calculateElapsed = () => {
            const start = new Date(session.startTime);
            const now = new Date();
            return Math.floor((now - start) / 1000);
        };

        setElapsed(calculateElapsed());

        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
    }, [session?.startTime]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, "0")}:${mins
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isProvisioning = session?.status === "INITIALIZING";

    return (
        <div className="bg-surface border border-border p-8 font-mono shadow-[8px_8px_0px_rgba(0,0,0,0.2)] relative">
            <div className="absolute top-0 right-0 p-2 font-mono text-[10px] text-muted font-bold opacity-30 tracking-widest uppercase">
                PID: {session?._id?.slice(-6) || "SYS_PROC"}
            </div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border border-dashed">
                <div className="flex items-center gap-4">
                    <div
                        className={`p-3 border ${isProvisioning
                            ? "border-warning text-warning animate-pulse"
                            : "border-success text-success"
                            } shadow-[2px_2px_0px_currentColor]`}
                    >
                        <Server className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-display font-bold text-ink uppercase tracking-wider mb-1">
                            {lab?.title || "ACTIVE_TARGET"}
                        </h2>
                        <p
                            className={`text-xs font-bold tracking-widest uppercase ${isProvisioning ? "text-warning" : "text-success"
                                }`}
                        >
                            {isProvisioning ? "[ PROVISIONING_INFRASTRUCTURE ]" : "[ SYSTEM_ONLINE ]"}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase tracking-widest justify-end mb-1">
                        <Clock className="w-3 h-3" />
                        <span>RUNTIME</span>
                    </div>
                    <p className="text-2xl font-bold text-ink tracking-tight">
                        {formatTime(elapsed)}
                    </p>
                </div>
            </div>

            {/* Provisioning State */}
            {isProvisioning && (
                <div className="border border-warning bg-warning/5 p-6 mb-8 border-dashed">
                    <div className="flex items-center gap-4 mb-4">
                        <Loader2 className="w-6 h-6 text-warning animate-spin" />
                        <div>
                            <h3 className="text-warning font-bold text-sm tracking-widest uppercase">
                                INITIALIZING DEPLOYMENT ROUTINE
                            </h3>
                            <p className="text-muted text-xs mt-1">
                                Allocating resources. Estimated TTI: ~4.5s
                            </p>
                        </div>
                    </div>
                    <div className="w-full bg-surface border border-border h-3 p-0.5">
                        <div
                            className="bg-warning h-full shadow-[inset_0_0_10px_rgba(255,166,0,0.5)] animate-pulse"
                            style={{ width: "60%" }}
                        />
                    </div>
                </div>
            )}

            {/* Active State - Show instance details */}
            {!isProvisioning && (session?.publicIp || session?.instanceDetails) && (
                <>
                    {/* Instance Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {/* IP Address */}
                        <div className="bg-paper border border-border p-5 border-l-2 border-l-info">
                            <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase tracking-widest mb-3">
                                <Globe className="w-4 h-4" />
                                <span>TARGET_IP</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <code className="text-lg font-bold text-info">
                                    {session.publicIp || session.instanceDetails?.publicIp || "PENDING..."}
                                </code>
                                <button
                                    onClick={() =>
                                        copyToClipboard(session.publicIp || session.instanceDetails?.publicIp)
                                    }
                                    className="p-2 border border-border text-muted hover:text-ink hover:border-ink transition-colors"
                                >
                                    {copied ? (
                                        <CheckCircle className="w-4 h-4 text-info" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Instance Type */}
                        <div className="bg-paper border border-border p-5 border-l-2 border-l-accent">
                            <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase tracking-widest mb-3">
                                <Cpu className="w-4 h-4" />
                                <span>COMPUTE_TYPE</span>
                            </div>
                            <p className="text-lg font-bold text-ink">
                                {session.instanceType || session.instanceDetails?.instanceType || "t2.micro"}
                            </p>
                        </div>

                        {/* Region */}
                        <div className="bg-paper border border-border p-5 border-l-2 border-l-muted">
                            <div className="flex items-center gap-2 text-muted text-xs font-bold uppercase tracking-widest mb-3">
                                <HardDrive className="w-4 h-4" />
                                <span>DATACENTER_LOC</span>
                            </div>
                            <p className="text-lg font-bold text-ink">
                                {session.region || session.instanceDetails?.region || "us-east-1"}
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="border border-border p-6 mb-8 bg-[#1a1a1a]">
                        <p className="text-muted text-xs font-bold uppercase tracking-widest mb-4">DIRECT_SHELL_ACCESS:</p>
                        <div className="flex items-center gap-4 bg-paper border border-border p-3">
                            <Terminal className="w-4 h-4 text-success flex-shrink-0" />
                            <code className="text-success text-sm flex-1 overflow-x-auto whitespace-nowrap">
                                ssh student@{session.publicIp || session.instanceDetails?.publicIp || "10.0.0.x"}
                            </code>
                            <button
                                onClick={() =>
                                    copyToClipboard(
                                        `ssh student@${session.publicIp || session.instanceDetails?.publicIp || "10.0.0.x"}`
                                    )
                                }
                                className="p-2 bg-surface border border-border hover:bg-ink hover:text-paper hover:border-ink text-muted transition-colors flex-shrink-0"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Lab Description */}
            {lab && (
                <div className="mb-8 border border-border p-6 bg-surface">
                    <h3 className="text-ink font-bold font-mono uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <span className="text-accent">#</span> PRIMARY_OBJECTIVES
                    </h3>
                    <ul className="space-y-3">
                        {lab.objectives?.map((objective, index) => (
                            <li key={index} className="flex items-start gap-4 text-muted text-sm border-b border-border border-dashed pb-2 last:border-0 last:pb-0">
                                <span className="text-accent font-bold mt-0.5">[{index + 1}]</span>
                                <span className="leading-relaxed">{objective}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Stop Button */}
            <button
                onClick={onStopSession}
                disabled={isStopping || isProvisioning}
                className={`w-full py-4 px-6 text-sm font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 border ${isStopping || isProvisioning
                    ? "bg-surface text-muted border-border cursor-not-allowed border-dashed"
                    : "bg-error text-paper border-error hover:bg-paper hover:text-error shadow-[4px_4px_0px_rgba(255,69,0,0.3)] hover:shadow-none hover:translate-y-1 hover:translate-x-1"
                    }`}
            >
                {isStopping ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        TERMINATING_INSTANCE...
                    </>
                ) : (
                    <>
                        <StopCircle className="w-4 h-4" />
                        TERMINATE_TARGET
                    </>
                )}
            </button>

            {/* Cost Warning */}
            <p className="text-center text-muted font-mono text-[10px] uppercase tracking-widest mt-6">
                [!] EXECUTING TARGETS CONSUMES METERED RESOURCES. HALT WHEN INACTIVE.
            </p>
        </div>
    );
};

export default ActiveSession;
