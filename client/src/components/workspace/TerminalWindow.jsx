import React, { useEffect, useRef, useState } from "react";
import { Terminal, Maximize2, Minimize2, X, Copy, Trash2 } from "lucide-react";

/**
 * Log type to color mapping for Matrix-style terminal
 */
const LOG_COLORS = {
    system: "text-muted",
    kernel: "text-muted opacity-80",
    network: "text-info",
    service: "text-muted",
    tool: "text-warning",
    ready: "text-success font-bold",
    prompt: "text-success font-bold",
    input: "text-ink",
    output: "text-muted",
    alert: "text-error font-bold",
    error: "text-error font-bold",
    info: "text-info",
};

const TerminalWindow = ({
    logs = [],
    title = "XploitVerse Terminal",
    onCommand,
    isConnected = false,
    onClear,
}) => {
    const terminalRef = useRef(null);
    const inputRef = useRef(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const [command, setCommand] = useState("");
    const [commandHistory, setCommandHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    // Handle command submission
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!command.trim() || !onCommand) return;

        onCommand(command);
        setCommandHistory((prev) => [...prev, command]);
        setHistoryIndex(-1);
        setCommand("");
    };

    // Handle keyboard navigation through history
    const handleKeyDown = (e) => {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (historyIndex < commandHistory.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setCommand("");
            }
        }
    };

    // Copy logs to clipboard
    const handleCopy = () => {
        const text = logs.map((log) => log.message).join("\n");
        navigator.clipboard.writeText(text);
    };

    // Focus input when clicking terminal
    const handleTerminalClick = () => {
        inputRef.current?.focus();
    };

    return (
        <div
            className={`flex flex-col bg-paper border-2 border-border shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden font-mono ${isMaximized ? "fixed inset-4 z-50" : "h-full"
                }`}
        >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b-2 border-border">
                <div className="flex items-center gap-3">
                    {/* Traffic light buttons */}
                    <div className="flex items-center gap-2">
                        <button className="w-3 h-3 border border-border bg-error hover:bg-error/80 transition-colors" />
                        <button className="w-3 h-3 border border-border bg-warning hover:bg-warning/80 transition-colors" />
                        <button className="w-3 h-3 border border-border bg-success hover:bg-success/80 transition-colors" />
                    </div>
                    <Terminal className="w-4 h-4 text-ink ml-2" />
                    <span className="text-xs text-ink font-bold uppercase tracking-widest">{title}</span>
                    {isConnected && (
                        <span className="flex items-center gap-2 text-[10px] text-success font-bold uppercase tracking-widest ml-2 border border-success/30 px-2 py-0.5 bg-success/10">
                            <span className="w-1.5 h-1.5 bg-success animate-pulse" />
                            LINK_ESTABLISHED
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-border transition-all"
                        title="Copy logs"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="p-1.5 text-muted hover:text-error hover:bg-error/10 border border-transparent hover:border-error/30 transition-all"
                            title="Clear terminal"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1.5 text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-border transition-all"
                        title={isMaximized ? "Minimize" : "Maximize"}
                    >
                        {isMaximized ? (
                            <Minimize2 className="w-4 h-4" />
                        ) : (
                            <Maximize2 className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Terminal Body */}
            <div
                ref={terminalRef}
                onClick={handleTerminalClick}
                className="flex-1 overflow-y-auto p-5 font-mono text-sm leading-relaxed cursor-text min-h-0 bg-paper"
            >
                {/* Log entries */}
                {logs.map((log, index) => (
                    <div
                        key={index}
                        className={`${LOG_COLORS[log.type] || "text-success font-bold"} ${log.type === "prompt" ? "" : "mb-0.5"
                            }`}
                    >
                        {log.type === "prompt" ? (
                            <span className="inline">{log.message}</span>
                        ) : (
                            <span className="break-all">
                                {log.message}
                            </span>
                        )}
                    </div>
                ))}

                {/* Command input */}
                {onCommand && (
                    <form onSubmit={handleSubmit} className="flex items-center mt-2">
                        <span className="text-success font-bold">root@xploitverse:~#&nbsp;</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-ink outline-none font-mono caret-ink"
                            placeholder={isConnected ? "_" : "AWAITING_CONNECTION..."}
                            disabled={!isConnected}
                            autoFocus
                        />
                    </form>
                )}

                {/* Blinking cursor for inactive state */}
                {!onCommand && (
                    <span className="inline-block w-2.5 h-4 bg-ink animate-pulse ml-1 align-middle" />
                )}
            </div>

            {/* Terminal Footer / Status Bar */}
            <div className="px-4 py-2 bg-surface border-t-2 border-border flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-widest">
                <span>
                    LINES: {logs.length} | STATUS: {isConnected ? "SECURE_LINK" : "OFFLINE"}
                </span>
                <span>ENCODING: UTF-8 | SHELL: BASH</span>
            </div>
        </div>
    );
};

export default TerminalWindow;
