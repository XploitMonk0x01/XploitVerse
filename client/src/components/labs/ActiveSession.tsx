import { ExternalLink, Globe, Loader2, Server, StopCircle } from "lucide-react";
import { Badge, Button, ProgressBar } from '../ui';
import { SessionClock } from './SessionClock';
import type { LabSession, Lab } from '../../types';

interface ActiveSessionProps {
  session: LabSession | null;
  lab: Lab | null;
  onOpenWorkspace: () => void;
  onStopSession: () => void;
  isStopping?: boolean;
}

/**
 * Body of the active-session card rendered inside the dashboard HUD. The card
 * chrome (border, background, section heading) belongs to the caller, so this
 * component only renders session content.
 */
export const ActiveSession = ({ session, lab, onOpenWorkspace, onStopSession, isStopping }: ActiveSessionProps) => {
  const sessionId = session?.id;
  const isProvisioning = session?.status === "initializing" || session?.status === "pending";
  const targetUrl = session?.hostUrl;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
              isProvisioning
                ? 'border-warn/30 bg-warn/10 text-warn'
                : 'border-success/30 bg-success/10 text-success'
            }`}
          >
            <Server className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-tight text-fg">
              {lab?.title || "Lab environment"}
            </h3>
            <div className="mt-1.5">
              <Badge variant={isProvisioning ? "warning" : "success"} size="sm" pulse>
                {isProvisioning ? "Starting" : "Online"}
              </Badge>
            </div>
          </div>
        </div>

        <SessionClock startedAt={session?.startedAt} expiresAt={session?.expiresAt} />
      </div>

      {isProvisioning ? (
        <div className="rounded-md border border-warn/30 bg-warn/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <Loader2 className="h-4 w-4 animate-spin text-warn" strokeWidth={1.75} />
            Starting environment
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            The environment is being allocated. The workspace opens once it is reachable.
          </p>
          <ProgressBar indeterminate tone="warn" size="sm" className="mt-3" />
        </div>
      ) : (
        targetUrl && (
          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-2 text-sm text-fg-muted transition-colors hover:text-accent"
          >
            <Globe className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="truncate font-mono">{targetUrl.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          </a>
        )
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="primary"
          onClick={onOpenWorkspace}
          disabled={!sessionId || isProvisioning}
          iconLeft={<ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />}
        >
          Open workspace
        </Button>

        <Button
          variant="danger"
          onClick={onStopSession}
          disabled={isStopping || isProvisioning}
          iconLeft={
            isStopping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
            ) : (
              <StopCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            )
          }
        >
          {isStopping ? "Stopping…" : "Stop session"}
        </Button>
      </div>
    </div>
  );
};

export default ActiveSession;
