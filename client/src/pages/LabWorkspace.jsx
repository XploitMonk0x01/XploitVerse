import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import {
    ArrowLeft,
    Terminal,
    MessageSquare,
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
} from "lucide-react";
import TerminalWindow from "../components/workspace/TerminalWindow";
import ChatWidget from "../components/workspace/ChatWidget";
import api from "../services/api";

const LabWorkspace = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [session, setSession] = useState(null);
    const [lab, setLab] = useState(null);
    const [logs, setLogs] = useState([]);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("terminal"); // terminal, guide, chat
    const [elapsedTime, setElapsedTime] = useState(0);

    const socketRef = useRef(null);
    const terminalWsRef = useRef(null);
    const timerRef = useRef(null);

    // Fetch session and lab data
    useEffect(() => {
        const fetchSessionData = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/lab-sessions/${sessionId}`);
                const sessionData = response.data.data?.session || response.data.data;
                setSession(sessionData);

                // Fetch lab details
                const labId = sessionData.lab?._id || sessionData.lab;
                if (labId) {
                    const labResponse = await api.get(`/labs/${labId}`);
                    setLab(labResponse.data.data.lab);
                }
            } catch (err) {
                console.error("Failed to fetch session:", err);
                setError(err.response?.data?.message || "Failed to load session");
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) {
            fetchSessionData();
        }
    }, [sessionId]);

    // Timer for elapsed time
    useEffect(() => {
        if (session?.startedAt) {
            const startTime = new Date(session.startedAt).getTime();

            timerRef.current = setInterval(() => {
                const now = Date.now();
                setElapsedTime(Math.floor((now - startTime) / 1000));
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [session]);

    // Socket.io connection
    useEffect(() => {
        if (!sessionId) return;

        const token = localStorage.getItem("token");
        const socketUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ["websocket", "polling"],
        });

        socketRef.current.on("connect", () => {
            console.log("Socket connected");
            setConnected(true);

            // Join the lab session room
            socketRef.current.emit("join-lab", sessionId);
        });

        socketRef.current.on("disconnect", () => {
            console.log("Socket disconnected");
            setConnected(false);
        });

        socketRef.current.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            setConnected(false);
        });

        // Listen for lab logs
        socketRef.current.on("lab-log", (logData) => {
            setLogs((prev) => [...prev, logData]);
        });

        // Listen for boot complete
        socketRef.current.on("boot-complete", () => {
            setLogs((prev) => [
                ...prev,
                {
                    type: "success",
                    message: "🎯 Lab environment is ready! You can now start the exercise.",
                    timestamp: new Date().toISOString(),
                },
            ]);
        });

        // Cleanup
        return () => {
            if (socketRef.current) {
                socketRef.current.emit("leave-lab", sessionId);
                socketRef.current.disconnect();
            }
        };
    }, [sessionId]);

    // Handle terminal commands
    const handleTerminalCommand = useCallback((command) => {
        // Append the echo immediately for responsiveness
        setLogs((prev) => [...prev, { type: "input", message: command }]);

        if (terminalWsRef.current && terminalWsRef.current.readyState === WebSocket.OPEN) {
            terminalWsRef.current.send(command + "\n");
        } else if (socketRef.current && connected) {
            // Fallback to socket.io if native WS not available
            socketRef.current.emit("terminal-input", { sessionId, command });
        }
    }, [sessionId, connected]);

    // Native WebSocket terminal — connects to /ws/terminal once session is running
    useEffect(() => {
        if (!sessionId) return;

        const token = localStorage.getItem("token");
        if (!token) return;

        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const apiBase = import.meta.env.VITE_API_BASE || "";
        // Strip /api suffix to get the backend host
        const hostPart = apiBase
            ? apiBase.replace(/^https?:/, proto).replace(/\/api$/, "")
            : `${proto}//${window.location.host}`;

        const url = `${hostPart}/ws/terminal?sessionId=${sessionId}&token=${encodeURIComponent(token)}`;

        let ws;
        let reconnectTimer;

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
                setLogs((prev) => [...prev, { type: "output", message: evt.data }]);
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
            clearTimeout(reconnectTimer);
            if (ws) ws.close();
            terminalWsRef.current = null;
        };
    }, [sessionId]);

    // Format elapsed time
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Difficulty color
    const getDifficultyColor = (difficulty) => {
        const colors = {
            easy: "text-info",
            beginner: "text-info",
            medium: "text-accent",
            intermediate: "text-accent",
            hard: "text-error",
            advanced: "text-error",
            expert: "text-error",
        };
        return colors[difficulty?.toLowerCase()] || "text-muted";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
                <div className="card-cyber p-8 w-full max-w-sm flex items-center justify-center">
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
                <div className="card-cyber p-8 w-full max-w-md border-error">
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
            <header className="bg-surface border-b border-border px-4 py-3 relative z-10 shadow-sm">
                <div className="flex items-center justify-between">
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
                                    {lab?.title || "WORKSPACE"}
                                </h1>
                                <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold tracking-widest">
                                    <span className={getDifficultyColor(lab?.difficulty)}>
                                        [{lab?.difficulty || "UNKNOWN"}]
                                    </span>
                                    <span className="text-border">•</span>
                                    <span className="text-muted">{lab?.category}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-4">
                        {/* Connection status */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 border font-mono text-xs font-bold tracking-widest uppercase ${connected ? "bg-success/10 border-success/30 text-success" : "bg-error/10 border-error/30 text-error"
                            }`}>
                            {connected ? (
                                <Wifi className="w-3 h-3" />
                            ) : (
                                <WifiOff className="w-3 h-3 animate-pulse" />
                            )}
                            <span className="hidden sm:inline">
                                {connected ? "LINK_ACTIVE" : "NO_LINK"}
                            </span>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-paper border border-border text-muted font-mono text-xs font-bold tracking-widest">
                            <Clock className="w-3 h-3 text-accent" />
                            <span>{formatTime(elapsedTime)}</span>
                        </div>

                        {/* VM IP */}
                        {session?.publicIp && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-paper border border-border text-muted font-mono text-xs font-bold tracking-widest">
                                <Server className="w-3 h-3 text-info" />
                                <span>{session.publicIp}</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Tab Selector */}
            <div className="lg:hidden flex bg-surface border-b border-border font-mono text-xs font-bold uppercase tracking-widest">
                <button
                    onClick={() => setActiveTab("terminal")}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-colors ${activeTab === "terminal"
                        ? "text-ink border-accent bg-paper"
                        : "text-muted border-transparent"
                        }`}
                >
                    <Terminal className="w-4 h-4" />
                    <span>SHELL</span>
                </button>
                <button
                    onClick={() => setActiveTab("guide")}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 border-l border-r border-border transition-colors ${activeTab === "guide"
                        ? "text-ink border-b-accent bg-paper"
                        : "text-muted border-b-transparent"
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>DOCS</span>
                </button>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 border-b-2 transition-colors ${activeTab === "chat"
                        ? "text-ink border-accent bg-paper"
                        : "text-muted border-transparent"
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>AI_COMMS</span>
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left Panel - Terminal (Desktop: always visible, Mobile: conditional) */}
                <div className={`${activeTab === "terminal" ? "block" : "hidden"
                    } lg:block lg:w-1/2 xl:w-3/5 h-full p-0 sm:p-4 bg-paper`}>
                    <TerminalWindow
                        logs={logs}
                        onCommand={handleTerminalCommand}
                        isConnected={connected}
                        title={`${lab?.title || "LAB"}_SHELL`}
                        onClear={() => setLogs([])}
                    />
                </div>

                {/* Right Panel - Guide & Chat */}
                <div className={`${activeTab !== "terminal" ? "block" : "hidden"
                    } lg:block lg:w-1/2 xl:w-2/5 h-full flex flex-col border-l border-border bg-surface`}>
                    {/* Guide Section (Desktop: always visible) */}
                    <div className={`${activeTab === "guide" ? "block" : "hidden"
                        } lg:flex lg:flex-col lg:h-1/2 overflow-y-auto border-b border-border`}>
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

                    {/* Chat Section */}
                    <div className={`${activeTab === "chat" ? "flex flex-col" : "hidden"
                        } lg:flex lg:flex-col lg:h-1/2`}>
                        <div className="bg-paper border-b border-border p-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-info" />
                                <h2 className="text-ink font-mono text-xs font-bold uppercase tracking-widest">TACTICAL_AI_COMMS</h2>
                            </div>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
                            </span>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <ChatWidget
                                sessionId={sessionId}
                                labId={lab?._id}
                                labName={lab?.title}
                                className="absolute inset-0 border-none bg-surface"
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LabWorkspace;
