import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ArrowLeft, Clock, Wifi, WifiOff, Loader2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const apiBase = import.meta.env.VITE_API_BASE;
const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    (typeof apiBase === "string" && apiBase.startsWith("http")
        ? apiBase.replace(/\/api\/?$/, "")
        : window.location.origin);

const formatRemaining = (remainingSeconds) => {
    const safe = Math.max(0, remainingSeconds || 0);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const LabWorkspace = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const terminalContainerRef = useRef(null);
    const termRef = useRef(null);
    const fitAddonRef = useRef(null);
    const socketRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(true);
    const [error, setError] = useState("");
    const [session, setSession] = useState(null);
    const [lab, setLab] = useState(null);
    const [connected, setConnected] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [terminatedReason, setTerminatedReason] = useState("");
    const [extending, setExtending] = useState(false);

    const canExtend = useMemo(() => {
        const plan = (user?.plan || "FREE").toUpperCase();
        return plan === "PRO" || plan === "PREMIUM";
    }, [user?.plan]);

    useEffect(() => {
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: "#0d1117",
                foreground: "#00ff41",
                cursor: "#00ff41",
            },
            fontFamily: "monospace",
            fontSize: 14,
            convertEol: true,
            scrollback: 2000,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        if (terminalContainerRef.current) {
            term.open(terminalContainerRef.current);
            fitAddon.fit();
        }

        return () => {
            term.dispose();
            termRef.current = null;
            fitAddonRef.current = null;
        };
    }, []);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/lab-sessions/${sessionId}`);
                const sessionData = res.data?.data?.session;
                if (!sessionData) throw new Error("Lab session not found");
                setSession(sessionData);

                if (sessionData?.autoTerminateAt) {
                    const initial = Math.max(
                        0,
                        Math.floor((new Date(sessionData.autoTerminateAt).getTime() - Date.now()) / 1000)
                    );
                    setRemainingSeconds(initial);
                }

                const labId = sessionData?.metadata?.labId;
                if (labId) {
                    const labRes = await api.get(`/labs/${labId}`);
                    setLab(labRes.data?.data?.lab || null);
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Failed to load session");
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId || !termRef.current) return;

        const token = localStorage.getItem("token");
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["polling", "websocket"],
            withCredentials: true,
        });

        socketRef.current = socket;

        const handleResize = () => {
            if (!fitAddonRef.current || !termRef.current) return;
            fitAddonRef.current.fit();
            socket.emit("terminal-resize", {
                cols: termRef.current.cols,
                rows: termRef.current.rows,
            });
        };

        socket.on("connect", () => {
            setConnected(true);
            socket.emit("join-lab", { sessionId });
            handleResize();
        });

        socket.on("connect_error", (connectErr) => {
            setConnected(false);
            setJoining(false);
            setError(connectErr?.message || "Failed to connect to lab gateway");
        });

        socket.on("disconnect", () => setConnected(false));

        socket.on("terminal-ready", () => {
            setJoining(false);
            termRef.current?.writeln("\r\n[terminal ready]\r\n");
        });

        socket.on("terminal-output", ({ data }) => {
            termRef.current?.write(data || "");
        });

        socket.on("terminal-error", ({ message }) => {
            const msg = message || "Terminal error";
            termRef.current?.writeln(`\r\n\x1b[31m${msg}\x1b[0m`);
            setError(msg);
            setJoining(false);
        });

        socket.on("lab-time-remaining", ({ remainingSeconds: next, expiresAt }) => {
            setRemainingSeconds(next || 0);
            if (expiresAt) {
                setSession((prev) => (prev ? { ...prev, autoTerminateAt: expiresAt } : prev));
            }
        });

        socket.on("lab-terminated", ({ reason }) => {
            setTerminatedReason(reason || "Session ended");
            setSession((prev) => (prev ? { ...prev, status: "terminated" } : prev));
            termRef.current?.writeln("\r\n\x1b[31m[lab terminated]\x1b[0m\r\n");
        });

        const termDisposable = termRef.current.onData((data) => {
            socket.emit("terminal-input", { data });
        });

        window.addEventListener("resize", handleResize);

        return () => {
            termDisposable?.dispose();
            window.removeEventListener("resize", handleResize);
            socket.emit("leave-lab", { sessionId });
            socket.disconnect();
        };
    }, [sessionId]);

    const handleExtend = async () => {
        try {
            setExtending(true);
            const res = await api.post(`/lab-sessions/${sessionId}/extend`);
            const expiresAt = res.data?.data?.expiresAt;
            if (expiresAt) {
                setSession((prev) => (prev ? { ...prev, autoTerminateAt: expiresAt } : prev));
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to extend session");
        } finally {
            setExtending(false);
        }
    };

    const dangerTimer = remainingSeconds > 0 && remainingSeconds <= 300;

    if (loading) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-ink" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-paper text-ink flex flex-col">
            <header className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Dashboard
                    </button>
                    <div className="text-sm font-semibold">{lab?.title || session?.labName || "Lab Workspace"}</div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 text-xs font-mono ${connected ? "text-success" : "text-error"}`}>
                        {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        {connected ? "connected" : "disconnected"}
                    </div>

                    <div
                        className={`flex items-center gap-2 px-3 py-1 border font-mono text-xs ${dangerTimer ? "text-error border-error animate-pulse" : "text-ink border-border"}`}
                    >
                        <Clock className="w-4 h-4" />
                        ⏱ {formatRemaining(remainingSeconds)} remaining
                    </div>

                    {canExtend && session?.status === "running" && (
                        <button
                            onClick={handleExtend}
                            disabled={extending}
                            className="px-3 py-1 border border-border text-xs font-mono uppercase tracking-widest hover:bg-ink hover:text-paper"
                        >
                            {extending ? "Extending..." : "Extend +1 hour"}
                        </button>
                    )}
                </div>
            </header>

            {error && (
                <div className="px-4 py-2 text-sm bg-error/10 text-error border-b border-error/40">{error}</div>
            )}

            <main className="flex-1 p-4">
                <div className="h-full border border-border bg-[#0d1117] relative">
                    {joining && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white font-mono text-sm">
                            Connecting to lab terminal...
                        </div>
                    )}
                    <div ref={terminalContainerRef} className="h-full w-full" />
                </div>
            </main>

            {terminatedReason && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20 p-4">
                    <div className="bg-surface border border-border p-6 max-w-md w-full">
                        <h2 className="text-lg font-semibold mb-2">Lab session ended</h2>
                        <p className="text-sm text-muted mb-6">Reason: {terminatedReason}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="px-4 py-2 border border-border text-sm"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="px-4 py-2 bg-ink text-paper text-sm"
                            >
                                Start New Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabWorkspace;
