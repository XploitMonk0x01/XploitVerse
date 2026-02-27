import React, { useEffect, useRef, useState } from "react";
import { Terminal, Maximize2, Minimize2, X, Copy, Trash2 } from "lucide-react";

/**
 * Log type to color mapping for Matrix-style terminal
 */
const LOG_COLORS = {
    system: "text-gray-400",
    kernel: "text-gray-300",
    network: "text-cyber-blue",
    service: "text-gray-300",
    tool: "text-cyber-orange",
    ready: "text-green-400 font-semibold",
    prompt: "text-green-400",
    input: "text-white",
    output: "text-gray-300",
    alert: "text-red-400",
    error: "text-red-500",
    info: "text-gray-400",
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
            className={`flex flex-col bg-black rounded-lg border border-gray-800 overflow-hidden ${isMaximized ? "fixed inset-4 z-50" : "h-full"
                }`}
        >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    {/* Traffic light buttons */}
                    <div className="flex items-center gap-1.5">
                        <button className="w-3 h-3 rounded-full bg-cyber-red hover:bg-cyber-red/80 transition-colors" />
                        <button className="w-3 h-3 rounded-full bg-cyber-orange hover:bg-cyber-orange/80 transition-colors" />
                        <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors" />
                    </div>
                    <Terminal className="w-4 h-4 text-green-400 ml-2" />
                    <span className="text-sm text-gray-400 font-mono">{title}</span>
                    {isConnected && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Connected
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                        title="Copy logs"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                            title="Clear terminal"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsMaximized(!isMaximized)}
                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
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
                className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed cursor-text min-h-0 bg-black"
            >
                {/* Log entries */}
                {logs.map((log, index) => (
                    <div
                        key={index}
                        className={`${LOG_COLORS[log.type] || "text-green-400"} ${log.type === "prompt" ? "" : "mb-0.5"
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
                    <form onSubmit={handleSubmit} className="flex items-center mt-1">
                        <span className="text-green-400">$&nbsp;</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-green-400 outline-none font-mono caret-green-400"
                            placeholder={isConnected ? "Enter command..." : "Connecting..."}
                            disabled={!isConnected}
                            autoFocus
                        />
                    </form>
                )}

                {/* Blinking cursor for inactive state */}
                {!onCommand && (
                    <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1" />
                )}
            </div>

            {/* Terminal Footer / Status Bar */}
            <div className="px-4 py-1.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>
                    {logs.length} lines | {isConnected ? "SSH Connected" : "Connecting..."}
                </span>
                <span>UTF-8 | bash</span>
            </div>
        </div>
    );
};

export default TerminalWindow;
