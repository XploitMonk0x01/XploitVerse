import { useAuth } from '../../context/AuthContext';
import { Button, Badge } from '../../components/ui';
import { FadeIn } from '../../components/ui/motion';
import {
  Users,
  Server,
  DollarSign,
  Activity,
  TrendingUp,
  BarChart3,
  Settings,
  Download,
  Shield,
  Cpu,
  HardDrive,
  Radio,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface OverviewStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: typeof Users;
  color: string;
  subtext: string;
}

interface SystemNode {
  name: string;
  category: string;
  status: 'healthy' | 'warning' | 'error' | 'standby';
  uptime: string;
  latency: string;
  load: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();

  const overviewStats: OverviewStat[] = [
    {
      label: 'Total Operatives',
      value: '1,428',
      change: '+14.2%',
      trend: 'up',
      icon: Users,
      color: 'text-info',
      subtext: 'across 32 cohorts',
    },
    {
      label: 'Active Runtimes',
      value: '24',
      change: '+6 nodes',
      trend: 'up',
      icon: Server,
      color: 'text-accent',
      subtext: 'isolated sandboxes',
    },
    {
      label: 'Compute Savings',
      value: '68.4%',
      change: 'vs static EC2',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-accent',
      subtext: 'via warm pool scale',
    },
    {
      label: 'Monthly Opex',
      value: '$284.50',
      change: '-18.3%',
      trend: 'down',
      icon: DollarSign,
      color: 'text-warn',
      subtext: 'budget limit $800',
    },
  ];

  const systemNodes: SystemNode[] = [
    {
      name: 'API Gateway Cluster',
      category: 'Edge Router',
      status: 'healthy',
      uptime: '99.99%',
      latency: '18ms',
      load: '14%',
    },
    {
      name: 'PostgreSQL Primary (Neon)',
      category: 'Database Pool',
      status: 'healthy',
      uptime: '99.98%',
      latency: '24ms',
      load: '32%',
    },
    {
      name: 'Isolated VPC Fabric (AWS)',
      category: 'Network SDN',
      status: 'healthy',
      uptime: '100%',
      latency: '8ms',
      load: '19%',
    },
    {
      name: 'Autoscale Target Agent',
      category: 'Container Runner',
      status: 'standby',
      uptime: '99.95%',
      latency: '45ms',
      load: '5%',
    },
  ];

  const recentOperatives = [
    {
      username: 'root_sentinel',
      email: 'sentinel@xploitverse.io',
      role: 'ADMIN',
      status: 'Active',
      joined: 'Today, 14:20',
      score: '4,850 pts',
    },
    {
      username: 'zero_day_hunter',
      email: 'hunter@offensive.sec',
      role: 'INSTRUCTOR',
      status: 'Active',
      joined: 'Yesterday',
      score: '3,920 pts',
    },
    {
      username: 'packet_weaver',
      email: 'weaver@protonmail.ch',
      role: 'STUDENT',
      status: 'In Lab',
      joined: '3 days ago',
      score: '1,450 pts',
    },
    {
      username: 'binary_phantom',
      email: 'phantom@matrix.dev',
      role: 'STUDENT',
      status: 'Offline',
      joined: 'Sep 14, 2026',
      score: '980 pts',
    },
  ];

  const roleVariant = (role: string) =>
    role === 'ADMIN' ? 'error' : role === 'INSTRUCTOR' ? 'info' : 'accent';

  return (
    <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Infrastructure Header */}
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
              Live operational telemetry across container clusters, identity allocations, and ephemeral target sandboxes.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button variant="secondary" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Audit Logs
            </Button>
            <Button variant="primary" size="sm">
              <Settings className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Cluster Settings
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Stat Telemetry Metrics */}
      <FadeIn>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((stat) => (
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

      {/* Nodes Health & Operatives Table */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subsystem Health Nodes */}
        <FadeIn className="lg:col-span-1">
          <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-bg-raised p-6">
            <div>
              <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-fg">
                    Core Subsystems
                  </h2>
                </div>
                <Badge variant="success">Nominal</Badge>
              </div>

              <div className="space-y-3">
                {systemNodes.map((node) => (
                  <div
                    key={node.name}
                    className="rounded-md border border-border bg-bg-overlay p-3.5 transition-colors hover:border-border-strong"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            node.status === 'healthy' ? 'bg-accent' : 'bg-info'
                          }`}
                        />
                        <span className="text-xs font-medium text-fg">{node.name}</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase text-fg-muted">
                        {node.category}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-mono text-[11px] text-fg-muted">
                      <span>Uptime: <strong className="font-medium text-fg">{node.uptime}</strong></span>
                      <span>Ping: <strong className="font-medium text-accent">{node.latency}</strong></span>
                      <span>Load: <strong className="font-medium text-info">{node.load}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Radio className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                Heartbeat polling: 10s
              </span>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-info transition-colors hover:underline"
              >
                Health Logs <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </FadeIn>

        {/* Registered Operatives Directory */}
        <FadeIn className="lg:col-span-2">
          <div className="flex h-full flex-col justify-between rounded-lg border border-border bg-bg-raised p-6">
            <div>
              <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" strokeWidth={1.75} />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">
                    Recent Operatives Directory
                  </h2>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-fg-muted transition-colors hover:text-fg"
                >
                  View All Operatives →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                      <th className="pb-3 font-medium">Operative</th>
                      <th className="pb-3 font-medium">Clearance</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 text-right font-medium">Provisioned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOperatives.map((op) => (
                      <tr key={op.username} className="transition-colors hover:bg-bg-overlay">
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
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                op.status === 'Active' || op.status === 'In Lab'
                                  ? 'bg-accent'
                                  : 'bg-fg-subtle'
                              }`}
                            />
                            {op.status}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-semibold text-fg">{op.score}</td>
                        <td className="py-3 text-right font-mono text-[11px] text-fg-muted">
                          {op.joined}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-fg-muted">
              <span>Showing 4 of 1,428 operatives</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-border bg-bg-raised px-2.5 py-1 text-xs text-fg transition-colors hover:bg-bg-overlay"
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded border border-border bg-bg-raised px-2.5 py-1 text-xs text-fg transition-colors hover:bg-bg-overlay"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Target Sandbox Orchestration & Cost Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Target Runtime Containers */}
        <FadeIn>
          <div className="h-full rounded-lg border border-border bg-bg-raised p-6">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">
                  Target Sandbox Runtimes
                </h2>
              </div>
              <Badge variant="info">Dynamic Pool</Badge>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-bg-overlay p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-fg-muted">Warm Runtimes</div>
                <div className="mt-1 text-xl font-semibold text-fg">12</div>
                <div className="mt-0.5 font-mono text-[10px] text-accent">Pre-provisioned</div>
              </div>
              <div className="rounded-md border border-border bg-bg-overlay p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-fg-muted">Active Sessions</div>
                <div className="mt-1 text-xl font-semibold text-info">24</div>
                <div className="mt-0.5 font-mono text-[10px] text-info">Live Operatives</div>
              </div>
              <div className="rounded-md border border-border bg-bg-overlay p-3 text-center">
                <div className="font-mono text-[10px] uppercase text-fg-muted">Avg Spinup</div>
                <div className="mt-1 text-xl font-semibold text-fg">1.8s</div>
                <div className="mt-0.5 font-mono text-[10px] text-accent">Cold start 4.2s</div>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-border bg-bg-overlay p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-fg">
                  <Cpu className="h-3.5 w-3.5 text-info" strokeWidth={1.75} />
                  Cluster vCPU Usage
                </span>
                <span className="font-mono font-medium text-info">28.4% of 64 Cores</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-base">
                <div className="h-full w-[28.4%] rounded-full bg-info" />
              </div>

              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="flex items-center gap-2 font-medium text-fg">
                  <HardDrive className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                  Cluster Memory Allocation
                </span>
                <span className="font-mono font-medium text-accent">41.2 GB of 128 GB</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-base">
                <div className="h-full w-[32.1%] rounded-full bg-accent" />
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Compute Expenditure Matrix */}
        <FadeIn>
          <div className="h-full rounded-lg border border-border bg-bg-raised p-6">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-info" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">
                  Compute Expenditure Matrix
                </h2>
              </div>
              <span className="font-mono text-xs text-fg-muted">CURRENT BILLING CYCLE</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-info/20 bg-info/10">
                    <Server className="h-4 w-4 text-info" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-fg">AWS Fargate ECS Ephemeral Tasks</div>
                    <div className="font-mono text-[10px] text-fg-muted">Billed per container-second</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-semibold text-fg">$142.10</div>
                  <div className="text-[10px] text-accent">52% of total</div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/20 bg-accent/10">
                    <Layers className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-fg">Neon Serverless PostgreSQL</div>
                    <div className="font-mono text-[10px] text-fg-muted">Autoscaling compute units &amp; storage</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-semibold text-fg">$68.40</div>
                  <div className="text-[10px] text-fg-muted">25% of total</div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded border border-warn/20 bg-warn/10">
                    <Shield className="h-4 w-4 text-warn" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-fg">Egress &amp; Cloudflare CDN Tunnel</div>
                    <div className="font-mono text-[10px] text-fg-muted">Zero Trust isolated lab proxies</div>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-semibold text-fg">$74.00</div>
                  <div className="text-[10px] text-fg-muted">23% of total</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-fg-muted">
                Total Run-Rate: <strong className="font-mono text-fg">$284.50</strong>
              </span>
              <span className="font-mono font-medium text-accent">Safe Margin: 64.4% below threshold</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default AdminDashboard;
