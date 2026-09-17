import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import {
  SpotlightCard,
  DecryptedText,
  TacticalBadge,
  StaggerContainer,
  FadeIn,
  ScalePress,
} from '../../components/ui/motion';
import {
  Users,
  Server,
  DollarSign,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  Download,
} from 'lucide-react';

interface OverviewStat {
  label: string;
  value: string;
  change: string;
  icon: typeof Users;
  color: string;
  badgeVariant?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'cyan' | 'neutral';
}

interface SystemHealth {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'pending';
  uptime: string;
}

const AdminDashboard = () => {
  useAuth();

  const overviewStats: OverviewStat[] = [
    {
      label: 'TOTAL_OPERATIVES',
      value: '0',
      change: '+0.0%',
      icon: Users,
      color: 'text-ink',
      badgeVariant: 'neutral',
    },
    {
      label: 'ACTIVE_SESSIONS',
      value: '0',
      change: '+0.0%',
      icon: Server,
      color: 'text-success',
      badgeVariant: 'success',
    },
    {
      label: 'REVENUE_MTD',
      value: '$0.00',
      change: '+0.0%',
      icon: DollarSign,
      color: 'text-accent',
      badgeVariant: 'accent',
    },
    {
      label: 'COMPUTE_OPTIMIZATION',
      value: '68%',
      change: 'VS_STATIC',
      icon: TrendingUp,
      color: 'text-cyan',
      badgeVariant: 'cyan',
    },
  ];

  const systemHealth: SystemHealth[] = [
    { name: 'API_GATEWAY_NODE_01', status: 'healthy', uptime: '99.9%' },
    { name: 'POSTGRES_CLUSTER_PRIMARY', status: 'healthy', uptime: '99.9%' },
    { name: 'AWS_ISOLATED_VPC_FABRIC', status: 'pending', uptime: 'PHASE_2' },
    { name: 'AUTOSCALE_CONTAINER_AGENT', status: 'pending', uptime: 'PHASE_2' },
  ];

  const getStatusBadge = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
      case 'error':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  return (
    <StaggerContainer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-mono">
      {/* Header */}
      <FadeIn>
        <div className="border border-border bg-surface p-6 shadow-[8px_8px_0px_rgba(0,0,0,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <span className="absolute top-1 left-1 text-[8px] text-border pointer-events-none">+</span>
          <span className="absolute top-1 right-1 text-[8px] text-border pointer-events-none">+</span>

          <div>
            <div className="flex items-center gap-2 text-xs text-accent font-bold tracking-widest uppercase mb-1">
              <span className="w-2 h-2 bg-accent inline-block animate-pulse" />
              ADMINISTRATIVE_CONTROL_CONSOLE // TIER-0
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink uppercase tracking-wider">
              <DecryptedText text="SYSTEM_SURVEILLANCE" animateOn="view" speed={25} />
            </h1>
            <p className="text-muted text-xs uppercase tracking-wider mt-1">
              Telemetry for node health, identity allocations, and containerized session lifecycles
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ScalePress scale={0.97}>
              <Button variant="secondary" size="sm">
                <Download className="w-3.5 h-3.5 mr-2" />
                EXPORT_LOGS
              </Button>
            </ScalePress>
            <ScalePress scale={0.97}>
              <Button variant="secondary" size="sm">
                <Settings className="w-3.5 h-3.5 mr-2" />
                SYS_CONFIG
              </Button>
            </ScalePress>
          </div>
        </div>
      </FadeIn>

      {/* Overview Stats */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewStats.map((stat) => (
            <SpotlightCard
              key={stat.label}
              spotlightColor="rgba(0, 230, 153, 0.12)"
              className="border border-border bg-surface p-5 shadow-[4px_4px_0px_rgba(0,0,0,0.15)] relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted tracking-widest uppercase">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold text-ink">{stat.value}</div>
              <div className="text-[10px] text-accent mt-1 tracking-wider">{stat.change}</div>
            </SpotlightCard>
          ))}
        </div>
      </FadeIn>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* System Health */}
        <FadeIn delay={0.1} className="lg:col-span-1">
          <div className="border border-border bg-surface p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.15)] h-full">
            <h2 className="text-sm font-bold text-ink mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-dashed border-border pb-3">
              <Activity className="w-4 h-4 text-success" />
              CORE_SUBSYSTEMS
            </h2>
            <div className="space-y-3">
              {systemHealth.map((system) => {
                const StatusIcon = getStatusIcon(system.status);
                const badgeVariant = getStatusBadge(system.status);
                return (
                  <div
                    key={system.name}
                    className="flex items-center justify-between p-3 border border-border bg-paper hover:border-accent/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <StatusIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                      <span className="text-ink text-xs font-bold tracking-wider truncate">
                        {system.name}
                      </span>
                    </div>
                    <TacticalBadge
                      variant={badgeVariant}
                      size="sm"
                      pulse={system.status === 'healthy'}
                    >
                      {system.uptime}
                    </TacticalBadge>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>

        {/* Recent Users */}
        <FadeIn delay={0.15} className="lg:col-span-2">
          <div className="border border-border bg-surface p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.15)] h-full">
            <h2 className="text-sm font-bold text-ink mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-dashed border-border pb-3">
              <Users className="w-4 h-4 text-cyan" />
              REGISTERED_IDENTITIES
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted border-b border-border uppercase tracking-widest">
                    <th className="pb-3 font-bold">OPERATIVE</th>
                    <th className="pb-3 font-bold">CLEARANCE</th>
                    <th className="pb-3 font-bold">STATUS</th>
                    <th className="pb-3 font-bold">PROVISIONED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted uppercase tracking-wider">
                      [ RECORD_EMPTY: NO EXTERNAL IDENTITIES REGISTERED ]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Active Sessions */}
      <FadeIn delay={0.2}>
        <div className="border border-border bg-surface p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.15)]">
          <h2 className="text-sm font-bold text-ink mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-dashed border-border pb-3">
            <Server className="w-4 h-4 text-accent" />
            ACTIVE_TARGET_RUNTIMES
          </h2>
          <div className="text-center py-10 border border-dashed border-border bg-paper">
            <Server className="w-10 h-10 text-muted mx-auto mb-3 opacity-60" />
            <p className="text-ink text-xs font-bold uppercase tracking-wider">
              NO RUNTIME CONTAINERS PROVISIONED
            </p>
            <p className="text-muted text-[11px] mt-1 uppercase tracking-widest">
              Telemetry streams live as operatives launch mission challenges
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Cost Analytics Placeholder */}
      <FadeIn delay={0.25}>
        <div className="border border-border bg-surface p-6 shadow-[6px_6px_0px_rgba(0,0,0,0.15)]">
          <h2 className="text-sm font-bold text-ink mb-4 uppercase tracking-widest flex items-center gap-2 border-b border-dashed border-border pb-3">
            <BarChart3 className="w-4 h-4 text-cyan" />
            COMPUTE_EXPENDITURE_MATRIX
          </h2>
          <div className="h-44 flex items-center justify-center border border-dashed border-border bg-paper text-center">
            <div>
              <BarChart3 className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-ink text-xs font-bold uppercase tracking-wider">
                HOURLY EC2 ALLOCATION MONITOR
              </p>
              <p className="text-muted text-[10px] mt-1 uppercase tracking-widest">
                Live consumption curves unlock with target container clusters
              </p>
            </div>
          </div>
        </div>
      </FadeIn>
    </StaggerContainer>
  );
};

export default AdminDashboard;