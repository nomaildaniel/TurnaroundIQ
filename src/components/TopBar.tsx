import { Clock, AlertTriangle, Zap } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const VIEW_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: { title: 'Operations Overview', subtitle: 'Live snapshot of all simulated turnarounds' },
  workspace: { title: 'Turnaround Workspace', subtitle: 'Inspect tasks, dependencies, and timing' },
  simulator: { title: 'Disruption Simulator', subtitle: 'Trigger and analyze ground-service disruptions' },
  recovery: { title: 'Recovery Planner', subtitle: 'Generate, compare, and accept recovery plans' },
  ledger: { title: 'Evidence Ledger', subtitle: 'Audit trail of all simulation runs' },
};

export function TopBar() {
  const { view, activeDisruption, validationErrors } = useApp();
  const info = VIEW_TITLES[view] ?? VIEW_TITLES.overview;

  return (
    <header className="flex items-center justify-between border-b border-navy-700/60 bg-navy-900/40 px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-navy-50">{info.title}</h1>
        <p className="text-sm text-navy-400">{info.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {validationErrors.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-1.5">
            <AlertTriangle className="h-4 w-4 text-danger-400" />
            <span className="text-xs font-medium text-danger-400">
              {validationErrors.length} schedule error{validationErrors.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {activeDisruption && (
          <div className="flex items-center gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 px-3 py-1.5">
            <Zap className="h-4 w-4 text-warning-400" />
            <span className="text-xs font-medium text-warning-400">
              {activeDisruption.scenarioName} active
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-navy-300">
          <Clock className="h-4 w-4 text-navy-400" />
          <span className="font-mono">Sim Day 1 · UTC</span>
        </div>
      </div>
    </header>
  );
}
