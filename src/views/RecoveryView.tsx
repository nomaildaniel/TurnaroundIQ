import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Save,
  RotateCcw,
  Zap,
  ArrowRight,
  Clock,
  Brain,
  Loader2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { formatTime, formatDelay } from '@/utils/format';
import type { RecoveryPlan } from '@/types';

function PlanRow({
  plan,
  isSelected,
  isAccepted,
  isRejected,
  onSelect,
  onAccept,
  onReject,
}: {
  plan: RecoveryPlan;
  isSelected: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isAccepted
          ? 'border-success-500/40 bg-success-500/10'
          : isRejected
            ? 'border-navy-700/40 bg-navy-900/20 opacity-60'
            : isSelected
              ? 'border-cyan-500/30 bg-cyan-500/10'
              : 'border-navy-700/50 bg-navy-800/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-navy-100">{plan.name}</span>
            {plan.feasible ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success-500/30 bg-success-500/15 px-2 py-0.5 text-[10px] font-medium text-success-400">
                <CheckCircle2 className="h-3 w-3" />
                Feasible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-danger-500/30 bg-danger-500/15 px-2 py-0.5 text-[10px] font-medium text-danger-400">
                <XCircle className="h-3 w-3" />
                Infeasible
              </span>
            )}
            {isAccepted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success-500/30 bg-success-500/15 px-2 py-0.5 text-[10px] font-medium text-success-400">
                Accepted
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 rounded-full border border-navy-600/40 bg-navy-700/30 px-2 py-0.5 text-[10px] font-medium text-navy-400">
                Rejected
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-navy-400 leading-snug">{plan.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isAccepted && !isRejected && (
            <>
              <button
                onClick={onSelect}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300'
                    : 'border-navy-700/50 bg-navy-800/40 text-navy-300 hover:bg-navy-800/60'
                }`}
              >
                View
              </button>
              <button
                onClick={onAccept}
                disabled={!plan.feasible}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  plan.feasible
                    ? 'border-success-500/30 bg-success-500/15 text-success-400 hover:bg-success-500/25'
                    : 'border-navy-700/40 bg-navy-800/20 text-navy-500 cursor-not-allowed'
                }`}
              >
                Accept
              </button>
              <button
                onClick={onReject}
                className="rounded-lg border border-navy-700/50 bg-navy-800/40 px-2.5 py-1.5 text-xs font-medium text-navy-300 transition-all hover:bg-navy-800/60"
              >
                Reject
              </button>
            </>
          )}
          {isAccepted && (
            <span className="text-xs font-mono text-success-400">
              {formatDelay(plan.departureDelay)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500">Departure Delay</div>
          <div className="font-mono text-sm text-navy-200">{formatDelay(plan.departureDelay)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500">Delay Saved</div>
          <div className="font-mono text-sm text-cyan-400">{plan.delaySaved}m</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500">Affected Tasks</div>
          <div className="font-mono text-sm text-navy-200">{plan.affectedTaskCount}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-navy-500">Dep. Violations</div>
          <div className={`font-mono text-sm ${plan.dependencyViolations > 0 ? 'text-danger-400' : 'text-navy-200'}`}>
            {plan.dependencyViolations}
          </div>
        </div>
      </div>

      {isSelected && plan.actions.length > 0 && (
        <div className="mt-3 rounded-lg border border-navy-700/40 bg-navy-900/30 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 mb-2">
            Recovery Actions
          </div>
          <div className="space-y-1.5">
            {plan.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <ArrowRight className="h-3 w-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-navy-200 font-medium">{action.description}</span>
                  <span className="text-navy-500 ml-1">— {action.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSelected && plan.constraintErrors.length > 0 && (
        <div className="mt-2 rounded-lg border border-danger-500/20 bg-danger-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-danger-400" />
            <span className="text-xs font-semibold text-danger-400">Constraint Violations</span>
          </div>
          <ul className="space-y-1">
            {plan.constraintErrors.map((err, i) => (
              <li key={i} className="text-xs text-navy-300">{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function RecoveryView() {
  const {
    turnarounds,
    selectedTurnaroundId,
    selectTurnaround,
    activeDisruption,
    recoveryPlans,
    selectedPlanId,
    acceptedPlanId,
    rejectedPlanIds,
    finalSchedule,
    selectPlan,
    acceptPlan,
    rejectPlan,
    resetRecovery,
    resetDisruption,
    addLedgerEntry,
    exportCurrentReport,
    schedules,
    jev,
    requestJevRecommendation,
    clearJev,
  } = useApp();

  const selectedId = selectedTurnaroundId ?? turnarounds[0]?.id ?? null;
  const turnaround = turnarounds.find((t) => t.id === selectedId);
  const schedule = schedules.find((s) => s.turnaroundId === selectedId);
  const hasDisruption = activeDisruption && activeDisruption.turnaroundId === selectedId;

  if (!turnaround || !schedule) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-navy-400">No turnaround selected.</p>
      </div>
    );
  }

  if (!hasDisruption || !recoveryPlans) {
    return (
      <div className="flex items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md rounded-xl border border-navy-700/60 bg-navy-800/40 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-navy-700/40 border border-navy-600/40">
            <ClipboardCheck className="h-7 w-7 text-navy-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-navy-50">No Disruption Active</h2>
          <p className="mt-2 text-sm text-navy-400 leading-relaxed">
            Go to the Disruption Simulator, select a turnaround, and trigger a scenario. Then return
            here to generate and compare recovery plans.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {turnarounds.map((turn) => (
              <button
                key={turn.id}
                onClick={() => selectTurnaround(turn.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  turn.id === selectedId
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                    : 'border-navy-700/50 bg-navy-800/30 text-navy-300 hover:bg-navy-800/50'
                }`}
              >
                {turn.flightNumber}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const feasiblePlans = recoveryPlans.plans.filter((p) => p.feasible);
  const noFeasible = feasiblePlans.length === 0;
  const disrupted = recoveryPlans.baselineDisrupted;

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="border-b border-navy-700/60 px-6 py-3">
        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-warning-400" />
          <span className="text-sm font-medium text-navy-100">
            Recovery for {turnaround.flightNumber} · {activeDisruption.scenarioName}
          </span>
          <button
            onClick={() => {
              resetDisruption();
            }}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-navy-700/50 bg-navy-800/40 px-3 py-1.5 text-xs font-medium text-navy-300 transition-all hover:bg-navy-800/60"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Disrupted baseline summary */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-warning-500/30 bg-warning-500/10 p-3">
                <div className="text-xs uppercase tracking-wider text-navy-400">Disrupted Delay</div>
                <div className="mt-1 font-mono text-lg font-semibold text-warning-400">
                  {formatDelay(disrupted.departureDelay)}
                </div>
              </div>
              <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
                <div className="text-xs uppercase tracking-wider text-navy-400">Disrupted Departure</div>
                <div className="mt-1 font-mono text-lg text-navy-100">
                  {formatTime(disrupted.estimatedDeparture)}
                </div>
              </div>
              <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
                <div className="text-xs uppercase tracking-wider text-navy-400">Plans Generated</div>
                <div className="mt-1 font-mono text-lg text-navy-100">{recoveryPlans.plans.length}</div>
              </div>
              <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
                <div className="text-xs uppercase tracking-wider text-navy-400">Feasible</div>
                <div className={`mt-1 font-mono text-lg ${noFeasible ? 'text-danger-400' : 'text-success-400'}`}>
                  {feasiblePlans.length}
                </div>
              </div>
            </div>
          </div>

          {/* No feasible plan warning */}
          {noFeasible && (
            <div className="lg:col-span-3 rounded-xl border border-danger-500/30 bg-danger-500/10 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger-400" />
                <span className="text-sm font-semibold text-danger-400">No Feasible Recovery Plan</span>
              </div>
              <p className="mt-2 text-xs text-navy-300 leading-relaxed">
                All generated recovery plans violate scheduling constraints. The disruption may be too
                severe to recover from without rescheduling the flight. Consider accepting the delay or
                escalating to operations management.
              </p>
            </div>
          )}

          {/* Plan comparison */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
              <div className="border-b border-navy-700/60 px-5 py-3">
                <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-cyan-400" />
                  Recovery Plan Comparison
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {recoveryPlans.plans.map((plan) => (
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    isSelected={selectedPlanId === plan.id}
                    isAccepted={acceptedPlanId === plan.id}
                    isRejected={rejectedPlanIds.includes(plan.id)}
                    onSelect={() => selectPlan(plan.id)}
                    onAccept={() => acceptPlan(plan.id)}
                    onReject={() => rejectPlan(plan.id)}
                  />
                ))}
              </div>
            </div>

            {/* Jev AI Recommendation */}
            <div className="mt-4 rounded-xl border border-navy-700/60 bg-navy-800/40">
              <div className="border-b border-navy-700/60 px-5 py-3">
                <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-cyan-400" />
                  Jev AI Recommendation
                </h2>
              </div>
              <div className="p-4">
                {jev.status === 'idle' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg border border-warning-500/20 bg-warning-500/5 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-warning-400">Jev Integration: Not Configured</span>
                        <p className="text-[11px] text-navy-400 leading-snug mt-0.5">
                          Live Jev recommendations are unavailable because API credentials have not been
                          configured. Core recovery planning uses the deterministic scheduling engine.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-navy-400 leading-relaxed">
                      Request a structured recommendation from Jev (TypeSafe System One). Only feasible,
                      constraint-validated plans are submitted. Jev cannot override schedule constraints
                      or automatically execute a plan.
                    </p>
                    <button
                      onClick={requestJevRecommendation}
                      disabled={noFeasible}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        noFeasible
                          ? 'bg-navy-800/20 text-navy-500 border border-navy-700/30 cursor-not-allowed'
                          : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/20'
                      }`}
                    >
                      <Brain className="h-4 w-4" />
                      Evaluate with Jev
                    </button>
                  </div>
                )}
                {jev.status === 'loading' && (
                  <div className="flex items-center gap-3 text-sm text-navy-300">
                    <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                    Querying Jev for recommendation...
                  </div>
                )}
                {jev.status === 'success' && jev.recommendation && (
                  <div className="space-y-4">
                    {/* Scenario + recommended candidate */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success-400" />
                        <span className="text-sm font-semibold text-navy-100">
                          Recommended: {jev.recommendation.selectedPlanName}
                        </span>
                      </div>
                      <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-3 space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-navy-500">Scenario</div>
                        <div className="text-xs text-navy-300">{activeDisruption.scenarioId} — {activeDisruption.scenarioName}</div>
                        {(() => {
                          const recPlan = recoveryPlans.plans.find((p) => p.id === jev.recommendation!.selectedPlanId);
                          if (!recPlan) return null;
                          return (
                            <div className="grid grid-cols-4 gap-2 pt-1">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-navy-500">Dep. Delay</div>
                                <div className="font-mono text-sm text-navy-200">{formatDelay(recPlan.departureDelay)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-navy-500">Delay Saved</div>
                                <div className="font-mono text-sm text-cyan-400">{recPlan.delaySaved}m</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-navy-500">Affected</div>
                                <div className="font-mono text-sm text-navy-200">{recPlan.affectedTaskCount}</div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-navy-500">Constraint OK</div>
                                <div className="font-mono text-sm text-success-400">{recPlan.constraintErrors.length === 0 ? 'Yes' : 'No'}</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Other feasible candidates considered */}
                    {jev.candidates.length > 1 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-navy-500">Other Feasible Candidates</div>
                        {jev.candidates.filter((c) => c.id !== jev.recommendation!.selectedPlanId).map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs">
                            <span className="text-navy-300">{c.name}</span>
                            <span className="font-mono text-navy-500">{formatDelay(c.departureDelay)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-2">
                        <div className="text-[10px] uppercase tracking-wider text-navy-500">Confidence</div>
                        <div className="font-mono text-sm text-cyan-400">
                          {(jev.recommendation.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                      {jev.model && (
                        <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-navy-500">Model</div>
                          <div className="font-mono text-xs text-navy-300 truncate">{jev.model}</div>
                        </div>
                      )}
                    </div>
                    {Object.keys(jev.recommendation.probabilities).length > 1 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-navy-500">All Probabilities</div>
                        {Object.entries(jev.recommendation.probabilities)
                          .sort(([, a], [, b]) => b - a)
                          .map(([id, prob]) => {
                            const plan = recoveryPlans.plans.find((p) => p.id === id);
                            return (
                              <div key={id} className="flex items-center justify-between text-xs">
                                <span className="text-navy-300">{plan?.name ?? id}</span>
                                <span className="font-mono text-navy-400">{(prob * 100).toFixed(1)}%</span>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* Request metadata */}
                    <div className="grid grid-cols-2 gap-3 border-t border-navy-700/40 pt-2">
                      {jev.timestamp && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-navy-500">Request Timestamp</div>
                          <div className="font-mono text-xs text-navy-400">{new Date(jev.timestamp).toLocaleString()}</div>
                        </div>
                      )}
                      {jev.latencyMs !== null && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-navy-500">Measured Latency</div>
                          <div className="font-mono text-xs text-navy-400">{jev.latencyMs}ms</div>
                        </div>
                      )}
                    </div>

                    {/* Independent validation */}
                    {(() => {
                      const recPlan = recoveryPlans.plans.find((p) => p.id === jev.recommendation!.selectedPlanId);
                      return (
                        <div className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-navy-500 mb-1">Independent Validation (Deterministic Engine)</div>
                          <div className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-success-400" />
                            <span className="text-navy-300">
                              {recPlan && recPlan.feasible && recPlan.constraintErrors.length === 0
                                ? 'Passes all scheduling constraints'
                                : 'Has constraint violations'}
                            </span>
                          </div>
                          {recPlan && recPlan.constraintErrors.length > 0 && (
                            <ul className="mt-1 ml-5 space-y-0.5">
                              {recPlan.constraintErrors.map((err, i) => (
                                <li key={i} className="text-xs text-danger-400">{err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })()}

                    {/* Disclaimer */}
                    <div className="flex items-start gap-2 rounded-lg border border-warning-500/20 bg-warning-500/5 p-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-navy-400 leading-relaxed">
                        Simulated decision support only. Not certified aviation guidance.
                      </p>
                    </div>

                    {/* Manual accept/reject */}
                    <div className="flex items-center gap-2 pt-2 border-t border-navy-700/40">
                      <button
                        onClick={() => acceptPlan(jev.recommendation!.selectedPlanId)}
                        className="flex items-center gap-1.5 rounded-lg border border-success-500/30 bg-success-500/15 px-3 py-1.5 text-xs font-medium text-success-400 transition-all hover:bg-success-500/25"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Accept Recommendation
                      </button>
                      <button
                        onClick={() => rejectPlan(jev.recommendation!.selectedPlanId)}
                        className="flex items-center gap-1.5 rounded-lg border border-danger-500/30 bg-danger-500/15 px-3 py-1.5 text-xs font-medium text-danger-400 transition-all hover:bg-danger-500/25"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject Recommendation
                      </button>
                      <button
                        onClick={clearJev}
                        className="ml-auto text-xs text-navy-400 hover:text-navy-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
                {jev.status === 'no_feasible_candidates' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-navy-400">
                      <AlertTriangle className="h-4 w-4 text-warning-400" />
                      No feasible plans to evaluate.
                    </div>
                    <p className="text-xs text-navy-400 leading-relaxed">
                      All generated recovery plans violate scheduling constraints. Jev cannot evaluate infeasible plans.
                    </p>
                  </div>
                )}
                {jev.status === 'integration_unavailable' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-navy-300">
                      <AlertTriangle className="h-4 w-4 text-warning-400" />
                      Integration Unavailable
                    </div>
                    <p className="text-xs text-navy-400 leading-relaxed">{jev.error}</p>
                    <p className="text-xs text-navy-500 leading-relaxed">
                      The deterministic recovery planner remains fully functional without Jev.
                    </p>
                    <button onClick={clearJev} className="text-xs text-navy-400 hover:text-navy-200">Dismiss</button>
                  </div>
                )}
                {(jev.status === 'api_error' || jev.status === 'invalid_response') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-danger-400">
                      <XCircle className="h-4 w-4" />
                      {jev.status === 'invalid_response' ? 'Invalid Response' : 'API Error'}
                    </div>
                    <p className="text-xs text-navy-400 leading-relaxed">{jev.error}</p>
                    {jev.latencyMs !== null && (
                      <p className="text-[10px] text-navy-500">Latency: {jev.latencyMs}ms</p>
                    )}
                    <button onClick={clearJev} className="text-xs text-navy-400 hover:text-navy-200">Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Outcome comparison + actions */}
          <div className="space-y-6">
            <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
              <div className="border-b border-navy-700/60 px-5 py-3">
                <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  Outcome
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-navy-400">Disrupted</span>
                  <span className="font-mono text-sm text-warning-400">
                    {formatDelay(disrupted.departureDelay)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-navy-400">After Recovery</span>
                  <span className={`font-mono text-sm ${finalSchedule ? 'text-success-400' : 'text-navy-500'}`}>
                    {finalSchedule ? formatDelay(finalSchedule.departureDelay) : '—'}
                  </span>
                </div>
                <div className="border-t border-navy-700/50 pt-3 flex items-center justify-between">
                  <span className="text-xs text-navy-400">Delay Saved</span>
                  <span className="font-mono text-sm text-cyan-400">
                    {finalSchedule ? `${Math.max(0, disrupted.departureDelay - finalSchedule.departureDelay)}m` : '—'}
                  </span>
                </div>
                {finalSchedule && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-navy-400">Final Status</span>
                    <StatusBadge status={finalSchedule.status} size="sm" />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-navy-700/60 bg-navy-800/40 p-4 space-y-2">
              <button
                onClick={addLedgerEntry}
                disabled={!finalSchedule}
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  finalSchedule
                    ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/20'
                    : 'bg-navy-800/20 text-navy-500 border border-navy-700/30 cursor-not-allowed'
                }`}
              >
                <Save className="h-4 w-4" />
                Save to Evidence Ledger
              </button>
              <button
                onClick={exportCurrentReport}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy-700/50 bg-navy-800/40 px-3 py-2 text-sm font-medium text-navy-200 transition-all hover:bg-navy-800/60"
              >
                <Download className="h-4 w-4" />
                Export JSON Report
              </button>
              <button
                onClick={resetRecovery}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-navy-700/50 bg-navy-800/40 px-3 py-2 text-sm font-medium text-navy-200 transition-all hover:bg-navy-800/60"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Recovery
              </button>
            </div>

            <div className="rounded-lg border border-warning-500/20 bg-warning-500/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-navy-400 leading-relaxed">
                  All recovery plans are generated from simulated data using a deterministic engine.
                  Results are for training and analysis only, not real-world operations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
