import {
  Clock,
  Play,
  Loader2,
  Cpu,
  Wrench,
} from "lucide-react";
import type { Lab } from '../../types';
import { Card, Badge, Button, difficultyVariant } from '../ui';

interface LabCardProps {
  lab: Lab;
  onStartLab: (labId: number | string | null | undefined) => void;
  isStarting?: boolean;
  disabled?: boolean;
}

export const LabCard = ({ lab, onStartLab, isStarting, disabled }: LabCardProps) => {
  const labIdRaw = lab?.id;
  const labId = labIdRaw !== null && labIdRaw !== undefined ? String(labIdRaw) : "";

  const targetCode = `L-${labId ? labId.padStart(3, '0') : '001'}`;

  return (
    <Card padding="lg" className="flex h-full select-none flex-col">
      {/* Target identifier */}
      <div className="mb-3.5 flex items-center justify-between border-b border-border-subtle pb-2.5">
        <span className="font-mono text-xs text-fg-subtle">{targetCode}</span>
        <Badge variant="success" size="sm">
          Ready
        </Badge>
      </div>

      {/* Title & Description */}
      <div className="mb-4">
        <h3 className="mb-1.5 line-clamp-1 text-base font-semibold tracking-tight text-fg">
          {lab.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
          {lab.description || "Containerized testing target on an isolated network."}
        </p>
      </div>

      {/* Difficulty & category */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={difficultyVariant(lab.difficulty)} size="sm">
          {lab.difficulty}
        </Badge>
        <Badge variant="neutral" size="sm">
          {lab.category || "General"}
        </Badge>
        {lab.dockerImage && (
          <span
            className="hidden max-w-[140px] items-center gap-1 truncate rounded border border-border-subtle bg-bg-overlay px-2 py-0.5 text-xs text-fg-subtle sm:inline-flex"
            title={lab.dockerImage}
          >
            <Cpu className="h-2.5 w-2.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{lab.dockerImage.split(':')[0]}</span>
          </span>
        )}
        {lab.buildContextPath && (
          <Badge variant="accent" size="sm" icon={<Wrench className="h-3 w-3" strokeWidth={1.75} />}>
            Custom build
          </Badge>
        )}
      </div>

      {/* Duration */}
      <div className="mb-4 flex items-center gap-1.5 border-t border-border-subtle pt-3 text-sm text-fg-muted">
        <Clock className="h-3.5 w-3.5 text-fg-subtle" strokeWidth={1.75} />
        <span>{lab.estimatedDuration || 60} min session</span>
      </div>

      <div className="flex-grow" />

      <Button
        variant="primary"
        fullWidth
        onClick={() => onStartLab(labIdRaw)}
        disabled={isStarting || disabled || !labId}
        iconLeft={
          isStarting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
          )
        }
      >
        {isStarting ? "Starting…" : "Start lab"}
      </Button>
    </Card>
  );
};

export default LabCard;
