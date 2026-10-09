import { useEffect, useState } from 'react';

/**
 * Leaf clock for an active lab session.
 *
 * The one-second tick is isolated here so the surrounding session card is not
 * re-rendered every second — only the two formatted strings below change. The
 * interval deliberately skips work while the tab is hidden and re-syncs on
 * reveal, since `Date.now()` deltas are recomputed from the stored timestamps.
 */

interface SessionClockProps {
  startedAt?: string;
  expiresAt?: string;
}

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const toMillis = (iso?: string): number | null => {
  if (!iso) return null;
  const parsed = new Date(iso).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export const SessionClock = ({ startedAt, expiresAt }: SessionClockProps) => {
  const start = toMillis(startedAt);
  const end = toMillis(expiresAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (start === null && end === null) return;
    const tick = () => setNow(Date.now());
    const interval = setInterval(() => {
      if (!document.hidden) tick();
    }, 1000);
    const onVisibilityChange = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [start, end]);

  if (start === null && end === null) return null;

  const elapsed = start !== null ? Math.floor((now - start) / 1000) : null;
  const remaining = end !== null ? Math.floor((end - now) / 1000) : null;

  return (
    <div className="flex items-start gap-6">
      {elapsed !== null && (
        <div>
          <p className="text-xs text-fg-muted">Uptime</p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-fg">
            {formatDuration(elapsed)}
          </p>
        </div>
      )}
      {remaining !== null && (
        <div>
          <p className="text-xs text-fg-muted">Time remaining</p>
          <p
            className={`mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight ${
              remaining <= 0 ? 'text-danger' : 'text-fg'
            }`}
          >
            {formatDuration(remaining)}
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionClock;
