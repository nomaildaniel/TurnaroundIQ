import { ClipboardCheck, BookLock, type LucideIcon } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

function PlaceholderView({ title, description, icon: Icon, features }: PlaceholderProps) {
  return (
    <div className="flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-lg rounded-xl border border-navy-700/60 bg-navy-800/40 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-navy-700/40 border border-navy-600/40">
          <Icon className="h-7 w-7 text-navy-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-navy-50">{title}</h2>
        <p className="mt-2 text-sm text-navy-400 leading-relaxed">{description}</p>

        <div className="mt-6 rounded-lg border border-navy-700/40 bg-navy-900/40 p-4 text-left">
          <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
            Planned for Phase B
          </div>
          <ul className="space-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-navy-300">
                <span className="mt-1 h-1 w-1 rounded-full bg-navy-500 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-navy-700/50 bg-navy-900/30 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-warning-500" />
          <span className="text-xs font-medium text-warning-400">Phase B — Not yet available</span>
        </div>
      </div>
    </div>
  );
}

export function RecoveryPlaceholder() {
  return (
    <PlaceholderView
      title="Recovery Planner"
      description="This module will allow operations coordinators to build and compare recovery options after a disruption is detected — re-sequencing tasks, reassigning equipment, and estimating the cost-benefit tradeoff of each option."
      icon={ClipboardCheck}
      features={[
        'Automated recovery option generation from active disruptions',
        'Task re-sequencing and equipment reallocation suggestions',
        'Cost-benefit comparison of each recovery path',
        'What-if simulation of recovery plans before commitment',
      ]}
    />
  );
}

export function LedgerPlaceholder() {
  return (
    <PlaceholderView
      title="Evidence Ledger"
      description="This module will provide an immutable audit trail of every scheduling decision, disruption event, and recovery action — giving coordinators defensible evidence for delay attribution and post-ops review."
      icon={BookLock}
      features={[
        'Chronological log of all disruption and recovery events',
        'Delay attribution with full causal chain traceability',
        'Exportable evidence records for post-ops review',
        'Integration with the deterministic engine for verifiable audit data',
      ]}
    />
  );
}
