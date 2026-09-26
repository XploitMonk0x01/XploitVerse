import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Copy, Trash2, Maximize2, Minimize2 } from "lucide-react";

/**
 * Log type → colour mapping. Rendered on a dark canvas, so neutral lines use
 * white opacities and only semantic states pull from the design tokens.
 */
const LOG_COLORS: Record<string, string> = {
  system: "text-white/45",
  kernel: "text-white/40",
  network: "text-info",
  service: "text-white/55",
  tool: "text-warn",
  ready: "text-success",
  prompt: "text-success",
  input: "text-white",
  output: "text-white/75",
  alert: "text-danger",
  error: "text-danger",
  info: "text-info",
};

interface LogEntry {
  type: string;
  message: string;
}

interface TerminalWindowProps {
  logs: LogEntry[];
  title?: string;
  onCommand?: (command: string) => void;
  isConnected?: boolean;
  onClear?: () => void;
}

const TerminalWindow = ({
  logs = [],
  title = "Terminal",
  onCommand,
  isConnected = false,
  onClear,
}: TerminalWindowProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !onCommand) return;

    onCommand(command);
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setCommand("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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

  const handleCopy = () => {
    const text = logs.map((log) => log.message).join("\n");
    void navigator.clipboard.writeText(text);
  };

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-fg/10 bg-bg-terminal font-mono ${
        isMaximized ? "fixed inset-4 z-modal" : ""
      }`}
    >
      {/* Tool bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-medium text-white/70">{title}</span>
          {isConnected && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Connected
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleCopy}
            className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            title="Copy logs"
            aria-label="Copy logs"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-danger/15 hover:text-danger"
              title="Clear terminal"
              aria-label="Clear terminal"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          )}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            title={isMaximized ? "Minimize" : "Maximize"}
            aria-label={isMaximized ? "Minimize terminal" : "Maximize terminal"}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        ref={terminalRef}
        onClick={handleTerminalClick}
        className="min-h-0 flex-1 cursor-text overflow-y-auto p-4 text-[13px] leading-relaxed"
      >
        {logs.map((log, index) => (
          <div
            key={index}
            className={`${LOG_COLORS[log.type] || "text-white/75"} ${
              log.type === "prompt" ? "" : "mb-0.5"
            }`}
          >
            {log.type === "prompt" ? (
              <span className="inline">{log.message}</span>
            ) : (
              <span className="break-all whitespace-pre-wrap">{log.message}</span>
            )}
          </div>
        ))}

        {onCommand && (
          <form onSubmit={handleSubmit} className="mt-2 flex items-center">
            <span className="shrink-0 font-medium text-success">
              root@xploitverse:~#&nbsp;
            </span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white caret-accent outline-none"
              placeholder={isConnected ? "" : "Awaiting connection…"}
              disabled={!isConnected}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
          </form>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-white/40">
        <span>
          {logs.length} lines · {isConnected ? "Secure link" : "Offline"}
        </span>
        <span>UTF-8 · bash</span>
      </div>
    </div>
  );
};

export default TerminalWindow;
