import {
  Zap,
  RotateCcw,
  Play,
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { SCENARIOS } from '@/engine/scenarios';
import { formatTime, formatDelay, formatDuration } from '@/utils/format';

export function SimulatorView() {
  const {
    turnarounds,
    tasks,
    schedules,
    selectedTurnaroundId,
    selectTurnaround,
    activeDisruption,
    applyDisruption,
    resetDisruption,
  } = useApp();

  const selectedId = selectedTurnaroundId ?? turnarounds[0]?.id ?? null;
  const turnaround = turnarounds.find((t) => t.id === selectedId);
  const schedule = schedules.find((s) => s.turnaroundId === selectedId);
  const turnTasks = tasks.filter((t) => t.turnaroundId === selectedId);

  if (!turnaround || !schedule) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-navy-400">No turnaround selected.</p>
      </div>
    );
  }

  const isActive = activeDisruption && activeDisruption.turnaroundId === selectedId;

  return (
    <div className="flex h-full flex-col animate-fade-in">
      {/* Turnaround selector */}
      <div className="border-b border-navy-700/60 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-xs uppercase tracking-wider text-navy-400 mr-2 flex-shrink-0">
            Target:
          </span>
          {turnarounds.map((turn) => {
            const active = turn.id === selectedId;
            return (
              <button
                key={turn.id}
                onClick={() => {
                  selectTurnaround(turn.id);
                  resetDisruption();
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                    : 'border-navy-700/50 bg-navy-800/30 text-navy-300 hover:bg-navy-800/50'
                }`}
              >
                <Plane className="h-3.5 w-3.5" />
                <span className="font-medium text-sm">{turn.flightNumber}</span>
                <span className="text-xs text-navy-500">{turn.gate}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Scenario picker */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
              <div className="border-b border-navy-700/60 px-5 py-3">
                <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning-400" />
                  Disruption Scenarios
                </h2>
              </div>
              <div className="p-3 space-y-2">
                {SCENARIOS.map((scenario) => {
                  const isApplied =
                    activeDisruption?.scenarioId === scenario.id && isActive;
                  return (
                    <div
                      key={scenario.id}
                      className={`rounded-lg border p-3 transition-all ${
                        isApplied
                          ? 'border-warning-500/40 bg-warning-500/10'
                          : 'border-navy-700/50 bg-navy-900/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-navy-100">
                              {scenario.name}
                            </span>
                            <span className="rounded bg-navy-700/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-navy-300">
                              {scenario.category}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-navy-400 leading-snug">
                            {scenario.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => applyDisruption(scenario.id)}
                          disabled={!selectedId}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            isApplied
                              ? 'bg-warning-500/20 text-warning-400 border border-warning-500/30'
                              : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/20'
                          }`}
                        >
                          <Play className="h-3 w-3" />
                          {isApplied ? 'Applied' : 'Trigger'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-navy-700/60 px-3 py-3">
                <button
                  onClick={resetDisruption}
                  disabled={!activeDisruption}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeDisruption
                      ? 'bg-navy-700/40 text-navy-200 hover:bg-navy-700/60 border border-navy-600/40'
                      : 'bg-navy-800/30 text-navy-500 border border-navy-700/30 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset to Baseline
                </button>
              </div>
            </div>
          </div>

          {/* Impact analysis */}
          <div className="lg:col-span-3 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
                <div className="text-xs uppercase tracking-wider text-navy-400">Departure</div>
                <div className="mt-1 font-mono text-lg text-navy-100">
                  {formatTime(schedule.estimatedDeparture)}
                </div>
                <div className="text-xs text-navy-500">
                  STD {formatTime(turnaround.scheduledDeparture)}
                </div>
              </div>
              <div
                className={`rounded-lg border p-3 ${
                  schedule.departureDelay > 0
                    ? 'border-danger-500/30 bg-danger-500/10'
                    : 'border-success-500/30 bg-success-500/10'
                }`}
              >
                <div className="text-xs uppercase tracking-wider text-navy-400">Delay</div>
                <div
                  className={`mt-1 font-mono text-lg font-semibold ${
                    schedule.departureDelay > 0 ? 'text-danger-400' : 'text-success-400'
                  }`}
                >
                  {formatDelay(schedule.departureDelay)}
                </div>
              </div>
              <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
                <div className="text-xs uppercase tracking-wider text-navy-400">Turnaround</div>
                <div className="mt-1 font-mono text-lg text-navy-100">
                  {formatDuration(schedule.turnaroundDuration)}
                </div>
              </div>
              <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
                <div className="text-xs uppercase tracking-wider text-navy-400">Status</div>
                <div className="mt-1">
                  <StatusBadge status={schedule.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Affected tasks */}
            <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
              <div className="border-b border-navy-700/60 px-5 py-3">
                <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning-400" />
                  Affected Tasks
                </h2>
              </div>
              <div className="p-3">
                {schedule.affectedTaskIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-success-500/50" />
                    <p className="mt-2 text-sm text-navy-400">No tasks affected</p>
                    <p className="text-xs text-navy-500">
                      Trigger a disruption to see its impact
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedule.scheduledTasks
                      .filter((st) => st.isAffected)
                      .map((st) => {
                        const task = turnTasks.find((t) => t.id === st.taskId);
                        if (!task) return null;
                        return (
                          <div
                            key={st.taskId}
                            className="rounded-lg border border-danger-500/20 bg-danger-500/5 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-navy-100">
                                {task.name}
                              </span>
                              <span className="font-mono text-sm text-danger-400">
                                +{st.delay}m
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-xs text-navy-400">
                              <span className="font-mono">
                                {formatTime(st.baselineStart)}–{formatTime(st.baselineEnd)}
                              </span>
                              <span className="text-navy-500">→</span>
                              <span className="font-mono text-danger-300">
                                {formatTime(st.startTime)}–{formatTime(st.endTime)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Active disruption detail */}
            {isActive && activeDisruption && (
              <div className="rounded-xl border border-warning-500/30 bg-warning-500/5 p-4 animate-slide-up">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning-400" />
                  <span className="text-sm font-semibold text-warning-400">
                    {activeDisruption.scenarioName}
                  </span>
                </div>
                <p className="mt-2 text-xs text-navy-300 leading-relaxed">
                  {activeDisruption.description}
                </p>
                <div className="mt-3 space-y-1">
                  {activeDisruption.effects.map((eff, i) => {
                    const task = turnTasks.find((t) => t.id === eff.taskId);
                    if (!task) return null;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs border-t border-warning-500/10 pt-1.5"
                      >
                        <span className="text-navy-300">{task.name}</span>
                        <span className="font-mono text-warning-400">
                          {eff.additionalDuration > 0 && `+${eff.additionalDuration}m duration`}
                          {eff.delayStart > 0 && `+${eff.delayStart}m start delay`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resource conflicts */}
            {schedule.resourceConflicts.length > 0 && (
              <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
                <div className="border-b border-navy-700/60 px-5 py-3">
                  <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-warning-400" />
                    Resource Conflicts
                  </h2>
                </div>
                <div className="p-3 space-y-2">
                  {schedule.resourceConflicts.map((conf, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-warning-500/20 bg-warning-500/5 p-3"
                    >
                      <div className="text-sm text-navy-200">
                        {conf.equipmentName} overallocated
                      </div>
                      <div className="mt-1 text-xs text-navy-400">
                        {conf.task1Name} overlaps {conf.task2Name} for{' '}
                        <span className="font-mono text-warning-400">{conf.overlap}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repeatability note */}
            <div className="rounded-lg border border-navy-700/40 bg-navy-900/30 p-4">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-navy-200">Deterministic Engine</div>
                  <p className="mt-1 text-xs text-navy-400 leading-relaxed">
                    The scheduling engine is fully deterministic. Triggering the same scenario on
                    the same turnaround always produces identical results. Reset and re-trigger
                    to verify repeatability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
