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
            easy: "text-green-400",
            beginner: "text-green-400",
            medium: "text-cyber-orange",
            intermediate: "text-cyber-orange",
            hard: "text-orange-400",
            advanced: "text-orange-400",
            expert: "text-red-400",
        };
        return colors[difficulty?.toLowerCase()] || "text-gray-400";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
                    <p className="text-gray-400">Loading lab workspace...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Error Loading Workspace</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <Link
                        to="/dashboard"
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Top Header Bar */}
            <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Left section */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="hidden sm:inline">Dashboard</span>
                        </button>

                        <div className="h-6 w-px bg-gray-700" />

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h1 className="text-white font-semibold text-lg">
                                    {lab?.title || "Lab Workspace"}
                                </h1>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className={getDifficultyColor(lab?.difficulty)}>
                                        {lab?.difficulty || "Unknown"}
                                    </span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-400">{lab?.category}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-4">
                        {/* Connection status */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${connected ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                            }`}>
                            {connected ? (
                                <Wifi className="w-4 h-4" />
                            ) : (
                                <WifiOff className="w-4 h-4" />
                            )}
                            <span className="text-sm hidden sm:inline">
                                {connected ? "Connected" : "Disconnected"}
                            </span>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full text-gray-300">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
                        </div>

                        {/* VM IP */}
                        {session?.publicIp && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full text-gray-300">
                                <Server className="w-4 h-4" />
                                <span className="text-sm font-mono">{session.publicIp}</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Tab Selector */}
            <div className="lg:hidden flex bg-gray-900 border-b border-gray-800">
                <button
                    onClick={() => setActiveTab("terminal")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 ${activeTab === "terminal"
                        ? "text-green-400 border-b-2 border-green-500"
                        : "text-gray-500"
                        }`}
                >
                    <Terminal className="w-4 h-4" />
                    <span>Terminal</span>
                </button>
                <button
                    onClick={() => setActiveTab("guide")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 ${activeTab === "guide"
                        ? "text-green-400 border-b-2 border-green-500"
                        : "text-gray-500"
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Guide</span>
                </button>
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 ${activeTab === "chat"
                        ? "text-green-400 border-b-2 border-green-500"
                        : "text-gray-500"
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>AI Mentor</span>
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Left Panel - Terminal (Desktop: always visible, Mobile: conditional) */}
                <div className={`${activeTab === "terminal" ? "block" : "hidden"
                    } lg:block lg:w-1/2 xl:w-3/5 h-full p-4`}>
                    <TerminalWindow
                        logs={logs}
                        onCommand={handleTerminalCommand}
                        isConnected={connected}
                        title={`${lab?.title || "Lab"} Terminal`}
                        onClear={() => setLogs([])}
                    />
                </div>

                {/* Right Panel - Guide & Chat */}
                <div className={`${activeTab !== "terminal" ? "block" : "hidden"
                    } lg:block lg:w-1/2 xl:w-2/5 h-full flex flex-col border-l border-gray-800`}>
                    {/* Guide Section (Desktop: always visible) */}
                    <div className={`${activeTab === "guide" ? "block" : "hidden"
                        } lg:block lg:h-1/2 overflow-y-auto p-4 border-b border-gray-800`}>
                        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 h-full overflow-y-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen className="w-5 h-5 text-green-400" />
                                <h2 className="text-white font-semibold">Lab Guide</h2>
                            </div>

                            {/* Lab Description */}
                            <div className="prose prose-invert prose-sm max-w-none">
                                <p className="text-gray-300">{lab?.description}</p>

                                {/* Objectives */}
                                {lab?.objectives && lab.objectives.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-green-400 font-medium mb-2">Objectives</h3>
                                        <ul className="space-y-2">
                                            {lab.objectives.map((objective, index) => (
                                                <li key={index} className="flex items-start gap-2 text-gray-300">
                                                    <ChevronRight className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                                    <span>{objective}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Instructions */}
                                {lab?.instructions && (
                                    <div className="mt-4">
                                        <h3 className="text-green-400 font-medium mb-2">Instructions</h3>
                                        <div className="text-gray-300 whitespace-pre-wrap">
                                            {lab.instructions}
                                        </div>
                                    </div>
                                )}

                                {/* Hints */}
                                {lab?.hints && lab.hints.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-cyber-orange font-medium mb-2">💡 Hints</h3>
                                        <ul className="space-y-2">
                                            {lab.hints.map((hint, index) => (
                                                <li key={index} className="text-gray-400 text-sm pl-4 border-l-2 border-cyber-orange/40">
                                                    {hint}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Resources */}
                                {lab?.resources && lab.resources.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="text-green-400 font-medium mb-2">Resources</h3>
                                        <ul className="space-y-1">
                                            {lab.resources.map((resource, index) => (
                                                <li key={index}>
                                                    <a
                                                        href={resource.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-cyber-blue hover:text-cyber-blue/80"
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
                    <div className={`${activeTab === "chat" ? "block" : "hidden"
                        } lg:block lg:h-1/2 p-4`}>
                        <ChatWidget
                            sessionId={sessionId}
                            labId={lab?._id}
                            labName={lab?.title}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LabWorkspace;
