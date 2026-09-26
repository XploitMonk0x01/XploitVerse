import { useState } from "react";
import { Globe, Terminal as TerminalIcon, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import TerminalWindow from "./TerminalWindow";

interface LogEntry {
  type: string;
  message: string;
}

interface EnvironmentWindowProps {
  logs: LogEntry[];
  onCommand: (command: string) => void;
  isConnected: boolean;
  onClear: () => void;
  hostUrl?: string;
  terminalTitle: string;
}

type App = "terminal" | "browser";

/**
 * A single workstation-style window that hosts both attack surfaces — the shell
 * terminal and the live web target — switchable from a bottom dock, so students
 * work inside one "machine" instead of two separate panels.
 */
export function EnvironmentWindow({
  logs,
  onCommand,
  isConnected,
  onClear,
  hostUrl,
  terminalTitle,
}: EnvironmentWindowProps) {
  const [activeApp, setActiveApp] = useState<App>("terminal");
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    if (!hostUrl) return;
    void navigator.clipboard.writeText(hostUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-bg-raised shadow-card">
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-bg-overlay px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <span className="ml-1 font-mono text-xs text-fg-muted">xploitverse-workstation</span>
        <div className="ml-auto flex items-center gap-2">
          {activeApp === "browser" && hostUrl && (
            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-raised px-2 py-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
              title="Reload target"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Reload</span>
            </button>
          )}
          {activeApp === "browser" && hostUrl && (
            <a
              href={hostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-raised px-2 py-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
              title="Open target in a new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">New tab</span>
            </a>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1 bg-bg-base p-2">
        {activeApp === "terminal" ? (
          <TerminalWindow
            logs={logs}
            onCommand={onCommand}
            isConnected={isConnected}
            title={terminalTitle}
            onClear={onClear}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-bg-raised">
            {/* Address bar */}
            <div className="flex items-center gap-2 border-b border-border bg-bg-overlay px-3 py-2">
              <Globe className="h-4 w-4 shrink-0 text-fg-subtle" strokeWidth={1.75} />
              <div className="flex-1 truncate rounded-md border border-border bg-bg-raised px-3 py-1 font-mono text-xs text-fg-muted">
                {hostUrl || "Waiting for target address…"}
              </div>
              {hostUrl && (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg-raised px-2 py-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
                  title="Copy target URL"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" strokeWidth={1.75} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </button>
              )}
            </div>

            {/* Viewport */}
            <div className="relative min-h-0 flex-1 bg-white">
              {hostUrl ? (
                <iframe
                  key={iframeKey}
                  src={hostUrl}
                  title="Lab web application"
                  className="h-full w-full border-0"
                  sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <Globe className="h-6 w-6 text-fg-subtle" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-fg">Starting the web target</p>
                  <p className="max-w-xs text-xs leading-relaxed text-fg-muted">
                    Target services initialize automatically with the lab. Complex stacks may take a
                    few minutes to become reachable.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dock */}
      <div className="flex items-center justify-center gap-2 border-t border-border bg-bg-overlay px-4 py-2.5">
        <DockButton
          active={activeApp === "terminal"}
          onClick={() => setActiveApp("terminal")}
          icon={<TerminalIcon className="h-4 w-4" strokeWidth={1.75} />}
          label="Terminal"
        />
        <DockButton
          active={activeApp === "browser"}
          onClick={() => setActiveApp("browser")}
          icon={<Globe className="h-4 w-4" strokeWidth={1.75} />}
          label="Browser"
          indicator={Boolean(hostUrl)}
        />
      </div>
    </div>
  );
}

function DockButton({
  active,
  onClick,
  icon,
  label,
  indicator,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  indicator?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-bg-terminal text-white"
          : "text-fg-muted hover:bg-bg-raised hover:text-fg"
      }`}
    >
      {icon}
      {label}
      {indicator && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-success" />
      )}
    </button>
  );
}

export default EnvironmentWindow;
