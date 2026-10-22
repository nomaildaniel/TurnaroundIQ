import {
  BookLock,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTime, formatDelay } from '@/utils/format';
import type { LedgerEntry } from '@/types';

function LedgerEntryCard({
  entry,
  onExport,
}: {
  entry: LedgerEntry;
  onExport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-navy-700/60 bg-navy-800/40 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-navy-800/60"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-navy-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-navy-400 flex-shrink-0" />
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-500/15 border border-warning-500/25 flex-shrink-0">
            <Zap className="h-4 w-4 text-warning-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-100">{entry.flightNumber}</span>
              <span className="text-xs text-navy-400">{entry.scenarioName}</span>
            </div>
            <div className="text-[10px] text-navy-500 font-mono">
              {entry.id} · {new Date(entry.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-navy-500">Final Delay</div>
            <div className={`font-mono text-sm ${entry.finalSchedule.departureDelay > 0 ? 'text-warning-400' : 'text-success-400'}`}>
              {formatDelay(entry.finalSchedule.departureDelay)}
            </div>
          </div>
          {entry.selectedPlan ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-success-500/30 bg-success-500/15 px-2 py-0.5 text-[10px] font-medium text-success-400">
              <CheckCircle2 className="h-3 w-3" />
              {entry.selectedPlan.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-navy-600/40 bg-navy-700/30 px-2 py-0.5 text-[10px] font-medium text-navy-400">
              No plan
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-navy-700/60 p-5 space-y-5 animate-fade-in">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-navy-500">Baseline</div>
              <div className="mt-1 font-mono text-sm text-navy-200">
                {formatTime(entry.baselineSchedule.estimatedDeparture)}
              </div>
              <div className="text-xs text-navy-400">{formatDelay(entry.baselineSchedule.departureDelay)}</div>
              <div className="mt-1"><StatusBadge status={entry.baselineSchedule.status} size="sm" /></div>
            </div>
            <div className="rounded-lg border border-warning-500/20 bg-warning-500/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-navy-500">Disrupted</div>
              <div className="mt-1 font-mono text-sm text-warning-400">
                {formatTime(entry.disruptedSchedule.estimatedDeparture)}
              </div>
              <div className="text-xs text-warning-400">{formatDelay(entry.disruptedSchedule.departureDelay)}</div>
              <div className="mt-1"><StatusBadge status={entry.disruptedSchedule.status} size="sm" /></div>
            </div>
            <div className="rounded-lg border border-success-500/20 bg-success-500/5 p-3">
              <div className="text-[10px] uppercase tracking-wider text-navy-500">After Recovery</div>
              <div className="mt-1 font-mono text-sm text-success-400">
                {formatTime(entry.finalSchedule.estimatedDeparture)}
              </div>
              <div className="text-xs text-success-400">{formatDelay(entry.finalSchedule.departureDelay)}</div>
              <div className="mt-1"><StatusBadge status={entry.finalSchedule.status} size="sm" /></div>
            </div>
          </div>

          {entry.disruption && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Disruption Effects
              </div>
              <div className="space-y-1">
                {entry.disruption.effects.map((eff, i) => (
                  <div key={i} className="flex items-center justify-between text-xs border-t border-navy-700/30 pt-1">
                    <span className="text-navy-300 font-mono">{eff.taskId}</span>
                    <span className="text-warning-400 font-mono">
                      {eff.additionalDuration > 0 && `+${eff.additionalDuration}m dur`}
                      {eff.delayStart > 0 && `+${eff.delayStart}m start`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
              Evaluated Recovery Plans
            </div>
            <div className="space-y-2">
              {entry.recoveryPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-3 ${
                    entry.selectedPlanId === plan.id
                      ? 'border-success-500/30 bg-success-500/10'
                      : 'border-navy-700/40 bg-navy-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-navy-100">{plan.name}</span>
                      {plan.feasible ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-danger-400" />
                      )}
                      {entry.selectedPlanId === plan.id && (
                        <span className="text-[10px] text-success-400 font-medium">SELECTED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-navy-300">{formatDelay(plan.departureDelay)}</span>
                      <span className="text-cyan-400">saved {plan.delaySaved}m</span>
                    </div>
                  </div>
                  {plan.constraintErrors.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {plan.constraintErrors.map((err, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] text-danger-400">
                          <AlertTriangle className="h-3 w-3" />
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {entry.constraintErrors.length > 0 && (
            <div className="rounded-lg border border-danger-500/20 bg-danger-500/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-danger-400" />
                <span className="text-xs font-semibold text-danger-400">Constraint Errors</span>
              </div>
              <ul className="space-y-0.5">
                {entry.constraintErrors.map((err, i) => (
                  <li key={i} className="text-xs text-navy-300">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={onExport}
            className="flex items-center gap-2 rounded-lg border border-navy-700/50 bg-navy-800/40 px-3 py-1.5 text-xs font-medium text-navy-200 transition-all hover:bg-navy-800/60"
          >
            <Download className="h-3.5 w-3.5" />
            Export Entry as JSON
          </button>
        </div>
      )}
    </div>
  );
}

export function LedgerView() {
  const { ledger, clearLedger, exportLedgerEntry } = useApp();

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="border-b border-navy-700/60 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookLock className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-navy-100">
              {ledger.length} entr{ledger.length === 1 ? 'y' : 'ies'} recorded
            </span>
          </div>
          {ledger.length > 0 && (
            <button
              onClick={clearLedger}
              className="flex items-center gap-1.5 rounded-lg border border-navy-700/50 bg-navy-800/40 px-3 py-1.5 text-xs font-medium text-navy-300 transition-all hover:bg-navy-800/60"
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {ledger.length === 0 ? (
          <div className="flex items-center justify-center p-6">
            <div className="max-w-md rounded-xl border border-navy-700/60 bg-navy-800/40 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-navy-700/40 border border-navy-600/40">
                <BookLock className="h-7 w-7 text-navy-400" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-navy-50">No Entries Yet</h2>
              <p className="mt-2 text-sm text-navy-400 leading-relaxed">
                Run a disruption simulation and accept a recovery plan, then click "Save to Evidence
                Ledger" in the Recovery Planner. Each entry captures the full audit trail from
                baseline through disruption to final recovery.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {ledger.map((entry) => (
              <LedgerEntryCard
                key={entry.id}
                entry={entry}
                onExport={() => exportLedgerEntry(entry.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-navy-700/60 px-6 py-2">
        <div className="flex items-center gap-2 text-[10px] text-navy-500">
          <Clock className="h-3 w-3" />
          Demo mode — stored in memory, not persisted. Refreshing the page clears the ledger.
        </div>
      </div>
    </div>
  );
}
