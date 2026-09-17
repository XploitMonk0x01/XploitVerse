import {
  Clock,
  Play,
  Loader2,
  Terminal,
  Cpu,
} from "lucide-react";
import type { Lab } from '../../types';
import { SpotlightCard } from '../ui/motion/SpotlightCard';
import { TacticalBadge } from '../ui/motion/TacticalBadge';

interface LabCardProps {
  lab: Lab;
  onStartLab: (labId: number | string | null | undefined) => void;
  isStarting?: boolean;
  disabled?: boolean;
}

export const LabCard = ({ lab, onStartLab, isStarting, disabled }: LabCardProps) => {
  const labIdRaw = lab?.id;
  const labId = labIdRaw !== null && labIdRaw !== undefined ? String(labIdRaw) : "";

  const getDifficultyVariant = (diff: string): 'cyan' | 'warning' | 'error' | 'muted' => {
    switch (diff?.toLowerCase()) {
      case 'easy':
      case 'beginner':
        return 'cyan';
      case 'medium':
      case 'intermediate':
        return 'warning';
      case 'hard':
      case 'advanced':
      case 'expert':
        return 'error';
      default:
        return 'muted';
    }
  };

  const targetCode = `L-${labId ? labId.padStart(3, '0') : '001'}`;

  return (
    <SpotlightCard
      className="group flex flex-col h-full font-mono p-5 relative select-none"
      spotlightColor="rgba(0, 240, 255, 0.08)"
      borderColor="rgba(0, 240, 255, 0.25)"
    >
      {/* Corner Blueprint Crosshairs */}
      <span className="absolute top-1 left-1 text-[9px] text-border pointer-events-none">+</span>
      <span className="absolute top-1 right-1 text-[9px] text-border pointer-events-none">+</span>
      <span className="absolute bottom-1 left-1 text-[9px] text-border pointer-events-none">+</span>
      <span className="absolute bottom-1 right-1 text-[9px] text-border pointer-events-none">+</span>

      {/* Target Identifier Header */}
      <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-accent inline-block animate-pulse" />
          <span className="text-[11px] font-bold text-accent tracking-widest uppercase">
            [ TARGET // {targetCode} ]
          </span>
        </div>
        <TacticalBadge label="STANDBY" variant="success" pulse size="sm" />
      </div>

      {/* Title & Description */}
      <div className="mb-4">
        <h3 className="text-sm sm:text-base font-bold text-ink group-hover:text-accent transition-colors uppercase tracking-wider mb-1.5 line-clamp-1">
          {lab.title}
        </h3>
        <p className="text-muted text-xs leading-relaxed line-clamp-2">
          {lab.description || "Containerized offensive testing target with isolated networking."}
        </p>
      </div>

      {/* Tactical Badges & Category */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TacticalBadge
          label={lab.difficulty}
          variant={getDifficultyVariant(lab.difficulty)}
          size="sm"
        />
        <TacticalBadge
          label={lab.category || "RED TEAM"}
          variant="accent"
          size="sm"
        />
        {lab.dockerImage && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-dim border border-border/80 bg-paper truncate max-w-[140px]" title={lab.dockerImage}>
            <Cpu className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{lab.dockerImage.split(':')[0]}</span>
          </span>
        )}
      </div>

      {/* Telemetry Hardware Metrics */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted border-t border-border pt-3 mb-4 tracking-wider uppercase">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-dim" />
          <span>SESSION: {lab.estimatedDuration || 60}M</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-dim" />
          <span>NETWORK: ISOLATED</span>
        </div>
      </div>

      <div className="flex-grow" />

      {/* Execute Target Button */}
      <button
        type="button"
        onClick={() => onStartLab(labIdRaw)}
        disabled={isStarting || disabled || !labId}
        className={`w-full py-2.5 px-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all border select-none rounded-none active:translate-x-[1px] active:translate-y-[1px] ${
          isStarting || disabled
            ? "bg-surface text-muted border-border cursor-not-allowed border-dashed opacity-60"
            : "bg-paper text-ink border-border hover:bg-accent hover:text-paper hover:border-accent shadow-sm"
        }`}
      >
        {isStarting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
            <span>PROVISIONING_CONTAINER...</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 text-accent group-hover:text-paper transition-colors" />
            <span>{">>>"} EXECUTE_LAB</span>
          </>
        )}
      </button>
    </SpotlightCard>
  );
};

export default LabCard;