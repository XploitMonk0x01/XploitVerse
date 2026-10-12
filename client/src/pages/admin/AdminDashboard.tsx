import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services';
import type { AdminOverview } from '../../types';
import { Alert, Badge, Button, EmptyState, LoadingSpinner } from '../../components/ui';
import { FadeIn } from '../../components/ui/motion';
import {
  Activity,
  Boxes,
  CheckCircle2,
  Database,
  HardDrive,
  Layers,
  Radio,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

const numberFmt = new Intl.NumberFormat('en-US');
const formatNumber = (value: number) => numberFmt.format(value ?? 0);

const formatDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const roleVariant = (role: string) =>
  role === 'ADMIN' ? 'error' : role === 'INSTRUCTOR' ? 'info' : 'accent';

const sessionVariant = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'running') return 'success' as const;
  if (s === 'pending' || s === 'initializing') return 'info' as const;
  if (s === 'error') return 'error' as const;
  return 'muted' as const;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getOverview();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const header = (
    <FadeIn>
      <div className="flex flex-col justify-between gap-6 rounded-lg border border-border bg-bg-raised p-6 shadow-sm md:flex-row md:items-center sm:p-7">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-medium uppercase tracking-wider text-accent">Command Center</span>
            <span className="ml-2 text-xs text-fg-muted">
              Clearance: <strong className="text-accent">{user?.role || 'ADMIN'}</strong>
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            System Telemetry &amp; Command
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-fg-muted sm:text-sm">
            Live platform telemetry across operatives, container runtimes, challenge catalog, and revenue.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => void load()} isLoading={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/labs')}>
            <Boxes className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Manage Labs
          </Button>
        </div>
      </div>
    </FadeIn>
  );

  if (loading && !overview) {
    return (
      <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {header}
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {header}
        <Alert variant="error" title="Telemetry unavailable">
          {error}
        </Alert>
        <div>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const { stats, system, recentUsers, topUsers, recentSessions } = overview;

  const statCards = [
    {
      label: 'Total Operatives',
      value: formatNumber(stats.totalUsers),
      icon: Users,
      color: 'text-info',
      change: `${formatNumber(stats.activeUsers)} active`,
      subtext: `${formatNumber(stats.students)} students · ${formatNumber(stats.instructors + stats.admins)} staff`,
    },
    {
      label: 'Active Runtimes',
      value: formatNumber(stats.activeSessions),
      icon: Server,
      color: 'text-accent',
      change: `${formatNumber(system.activeContainers)} containers`,
      subtext: `${formatNumber(stats.totalSessions)} sessions all-time`,
    },
    {
      label: 'Published Labs',
      value: formatNumber(stats.activeLabs),
      icon: Boxes,
      color: 'text-accent',
      change: `${formatNumber(stats.totalTasks)} tasks`,
      subtext: `${formatNumber(stats.totalRooms)} rooms · ${formatNumber(stats.totalLabs)} registered`,
    },
    {
      label: 'Tasks Solved',
      value: formatNumber(stats.solvedTasks),
      icon: TrendingUp,
      color: 'text-warn',
      change: `${formatNumber(stats.totalPoints)} pts`,
      subtext: `${formatNumber(stats.sessionsLast24h)} sessions in 24h`,
    },
  ];

  const systemNodes = [
    {
      name: 'Docker Engine',
      category: 'Container Runtime',
      ok: system.dockerAvailable,
      detail: system.dockerAvailable ? 'Reachable' : 'Mock mode',
    },
    {
      name: 'PostgreSQL Primary',
      category: 'Database Pool',
      ok: system.postgresOk,
      detail: system.postgresOk ? 'Connected' : 'Unreachable',
    },
    {
      name: 'Redis Cache',
      category: 'Cache & Sessions',
      ok: system.redisAvailable,
      detail: system.redisAvailable ? 'Connected' : 'Disabled',
    },
    {
      name: 'Lab Sandboxes',
      category: 'Isolated Runtimes',
      ok: true,
      detail: `${formatNumber(system.activeContainers)} active`,
    },
  ];

  const utilization = stats.totalSessions > 0
    ? Math.min(100, Math.round((stats.activeSessions / stats.totalSessions) * 100))
    : 0;

  return (
    <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {header}

      {error && (
        <Alert variant="warning" title="Showing last known data" dismissible onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stat telemetry metrics */}
      <FadeIn>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-bg-raised p-5 transition-colors hover:border-accent/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-fg-muted">
                  {stat.label}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-overlay">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} strokeWidth={1.75} />
                </div>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                {stat.value}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="flex items-center gap-1 font-medium text-accent">
                  <TrendingUp className="inline h-3 w-3" strokeWidth={1.75} />
                  {stat.change}
                </span>
                <span className="text-[11px] text-fg-muted">{stat.subtext}</span>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Core subsystems + operatives */}
      <div className="grid gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-1">
          <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-bg-raised p-6">
            <div>
              <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">Core Subsystems</h2>
                </div>
                <Badge variant={system.postgresOk && system.dockerAvailable ? 'success' : 'warning'}>
                  {system.postgresOk && system.dockerAvailable ? 'Nominal' : 'Degraded'}
                </Badge>
              </div>

              <div className="space-y-3">
                {systemNodes.map((node) => (
                  <div
                    key={node.name}
                    className="rounded-md border border-border bg-bg-overlay p-3.5 transition-colors hover:border-border-strong"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${node.ok ? 'bg-accent' : 'bg-danger'}`} />
                        <span className="text-xs font-medium text-fg">{node.name}</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase text-fg-muted">{node.category}</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-mono text-[11px] text-fg-muted">
                      <span className={node.ok ? 'text-accent' : 'text-danger'}>{node.detail}</span>
                      <span>{node.ok ? 'OK' : 'DOWN'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Radio className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                Manual refresh
              </span>
              <Button variant="ghost" size="sm" onClick={() => void load()}>
                <RefreshCw className="mr-1.5 h-3 w-3" strokeWidth={1.75} />
                Reload
              </Button>
            </div>
          </div>
        </FadeIn>

        {/* Registered operatives directory */}
        <FadeIn className="lg:col-span-2">
          <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-bg-raised p-6">
            <div>
              <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" strokeWidth={1.75} />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">
                    Recent Operatives
                  </h2>
                </div>
                <span className="font-mono text-xs text-fg-muted">latest {recentUsers.length}</span>
              </div>

              {recentUsers.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="No operatives yet"
                  description="Registered accounts will appear here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                        <th className="pb-3 font-medium">Operative</th>
                        <th className="pb-3 font-medium">Clearance</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Score</th>
                        <th className="pb-3 text-right font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {recentUsers.map((op) => (
                        <tr key={op.id} className="transition-colors hover:bg-bg-overlay">
                          <td className="py-3 font-medium text-fg">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-bg-overlay font-mono text-[10px] font-semibold text-accent">
                                {op.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-fg">{op.username}</div>
                                <div className="font-mono text-[10px] text-fg-muted">{op.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant={roleVariant(op.role)}>{op.role}</Badge>
                          </td>
                          <td className="py-3 font-mono text-[11px]">
                            <span className="flex items-center gap-1.5 text-fg-muted">
                              <span className={`h-1.5 w-1.5 rounded-full ${op.isActive ? 'bg-accent' : 'bg-fg-subtle'}`} />
                              {op.isActive ? 'Active' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 font-mono font-semibold text-fg">
                            {formatNumber(op.points)} pts
                            <span className="ml-1 font-normal text-fg-muted">/ {op.solved} solved</span>
                          </td>
                          <td className="py-3 text-right font-mono text-[11px] text-fg-muted">
                            {formatDate(op.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Runtime telemetry + platform activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lab runtime telemetry */}
        <FadeIn>
          <div className="h-full rounded-lg border border-border bg-bg-raised p-6">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">Lab Runtime Telemetry</h2>
              </div>
              <Badge variant="info">Live</Badge>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-bg-overlay p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-fg-muted">Active Sessions</div>
                <div className="mt-1 text-xl font-semibold text-info">{formatNumber(stats.activeSessions)}</div>
                <div className="mt-0.5 font-mono text-[10px] text-info">Live operatives</div>
              </div>
              <div className="rounded-md border border-border bg-bg-overlay p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-fg-muted">Containers</div>
                <div className="mt-1 text-xl font-semibold text-fg">{formatNumber(system.activeContainers)}</div>
                <div className="mt-0.5 font-mono text-[10px] text-accent">Running</div>
              </div>
              <div className="rounded-md border border-border bg-bg-overlay p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-fg-muted">Last 24h</div>
                <div className="mt-1 text-xl font-semibold text-fg">{formatNumber(stats.sessionsLast24h)}</div>
                <div className="mt-0.5 font-mono text-[10px] text-fg-muted">New sessions</div>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-bg-overlay p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-fg">
                  <HardDrive className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                  Active share of all sessions
                </span>
                <span className="font-mono font-medium text-accent">{utilization}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-base">
                <div className="h-full rounded-full bg-accent" style={{ width: `${utilization}%` }} />
              </div>
              <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-fg-muted">
                <span>Total sessions: <strong className="text-fg">{formatNumber(stats.totalSessions)}</strong></span>
                <span>Containers: <strong className="text-fg">{formatNumber(stats.activeContainers)}</strong></span>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">Recent Sessions</h3>
              {recentSessions.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-xs text-fg-subtle">
                  No lab sessions recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-[11px] text-fg-muted">#{session.id}</span>
                      <span className="flex-1 px-3 font-medium text-fg">{session.username}</span>
                      <span className="mr-3 font-mono text-[10px] text-fg-muted">
                        {formatDateTime(session.startedAt || session.createdAt)}
                      </span>
                      <Badge variant={sessionVariant(session.status)}>{session.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Platform activity & leaderboard */}
        <FadeIn>
          <div className="h-full rounded-lg border border-border bg-bg-raised p-6">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-info" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">Platform Activity</h2>
              </div>
              <span className="font-mono text-xs text-fg-muted">ALL TIME</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-info/20 bg-info/10">
                    <CheckCircle2 className="h-4 w-4 text-info" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-fg">Tasks Solved</div>
                    <div className="font-mono text-[10px] text-fg-muted">Completed challenge tasks</div>
                  </div>
                </div>
                <div className="text-right font-mono text-sm font-semibold text-fg">
                  {formatNumber(stats.solvedTasks)}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/20 bg-accent/10">
                    <Trophy className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-fg">Points Awarded</div>
                    <div className="font-mono text-[10px] text-fg-muted">Total score across users</div>
                  </div>
                </div>
                <div className="text-right font-mono text-sm font-semibold text-fg">
                  {formatNumber(stats.totalPoints)}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-warn/20 bg-warn/10">
                    <Database className="h-4 w-4 text-warn" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-fg">Paid Extensions</div>
                    <div className="font-mono text-[10px] text-fg-muted">
                      {formatNumber(stats.paidOrders)} settled orders
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-sm font-semibold text-fg">
                  ₹{formatNumber(Math.round(stats.revenueInr))}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                <h3 className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">Top Operatives</h3>
              </div>
              {topUsers.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-4 py-4 text-center text-xs text-fg-subtle">
                  No scoring data yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {topUsers.map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center justify-between rounded-md border border-border bg-bg-overlay px-3 py-2 text-xs"
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded border border-border bg-bg-raised font-mono text-[10px] font-semibold text-accent">
                          {entry.rank}
                        </span>
                        <span className="font-medium text-fg">{entry.username}</span>
                      </span>
                      <span className="font-mono font-semibold text-fg">
                        {formatNumber(entry.points)} pts
                        <span className="ml-1 font-normal text-fg-muted">/ {entry.solved} solved</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default AdminDashboard;
