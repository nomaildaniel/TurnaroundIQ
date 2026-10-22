import type { TurnaroundStatus } from '@/types';

interface StatusBadgeProps {
  status: TurnaroundStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<TurnaroundStatus, { label: string; classes: string; dot: string }> = {
  on_time: {
    label: 'On Time',
    classes: 'bg-success-500/15 text-success-400 border-success-500/30',
    dot: 'bg-success-500',
  },
  at_risk: {
    label: 'At Risk',
    classes: 'bg-warning-500/15 text-warning-400 border-warning-500/30',
    dot: 'bg-warning-500',
  },
  delayed: {
    label: 'Delayed',
    classes: 'bg-danger-500/15 text-danger-400 border-danger-500/30',
    dot: 'bg-danger-500',
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cfg.classes} ${padding}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
