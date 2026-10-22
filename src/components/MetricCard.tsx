import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'cyan' | 'success' | 'warning' | 'danger' | 'neutral';
}

const ACCENT_CLASSES: Record<NonNullable<MetricCardProps['accent']>, string> = {
  cyan: 'text-cyan-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
  neutral: 'text-navy-300',
};

export function MetricCard({ label, value, sub, icon: Icon, accent = 'neutral' }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-navy-700/60 bg-navy-800/40 p-4 transition-colors hover:border-navy-600/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-navy-400">{label}</span>
        {Icon && <Icon className={`h-4 w-4 ${ACCENT_CLASSES[accent]}`} />}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${ACCENT_CLASSES[accent]}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-navy-400">{sub}</div>}
    </div>
  );
}
