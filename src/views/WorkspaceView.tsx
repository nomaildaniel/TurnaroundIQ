import { useState } from 'react';
import {
  Plane,
  Clock,
  GitBranch,
  Wrench,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { GanttChart } from '@/components/GanttChart';
import { formatTime, formatDuration, formatDelay } from '@/utils/format';
import type { GroundTask, TaskStatus } from '@/types';

const STATUS_STYLES: Record<TaskStatus, { dot: string; text: string; label: string }> = {
  completed: { dot: 'bg-success-500', text: 'text-success-400', label: 'Completed' },
  in_progress: { dot: 'bg-cyan-500', text: 'text-cyan-400', label: 'In Progress' },
  pending: { dot: 'bg-navy-500', text: 'text-navy-400', label: 'Pending' },
  delayed: { dot: 'bg-danger-500', text: 'text-danger-400', label: 'Delayed' },
};

export function WorkspaceView() {
  const { turnarounds, tasks, equipment, schedules, selectedTurnaroundId, selectTurnaround } =
    useApp();

  const selectedId = selectedTurnaroundId ?? turnarounds[0]?.id ?? null;
  const turnaround = turnarounds.find((t) => t.id === selectedId);
  const schedule = schedules.find((s) => s.turnaroundId === selectedId);
  const turnTasks = tasks.filter((t) => t.turnaroundId === selectedId);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!turnaround || !schedule) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-navy-400">No turnaround selected.</p>
      </div>
    );
  }

  const taskMap = new Map(turnTasks.map((t) => [t.id, t]));
  const eqMap = new Map(equipment.map((e) => [e.id, e]));

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="border-b border-navy-700/60 px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          {turnarounds.map((turn) => {
            const sched = schedules.find((s) => s.turnaroundId === turn.id);
            const active = turn.id === selectedId;
            return (
              <button
                key={turn.id}
                onClick={() => selectTurnaround(turn.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all whitespace-nowrap ${
                  active
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
                    : 'border-navy-700/50 bg-navy-800/30 text-navy-300 hover:bg-navy-800/50'
                }`}
              >
                <Plane className="h-3.5 w-3.5" />
                <span className="font-medium text-sm">{turn.flightNumber}</span>
                <span className="text-xs text-navy-500">{turn.aircraftType}</span>
                {sched && <StatusBadge status={sched.status} size="sm" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
            <div className="text-xs uppercase tracking-wider text-navy-400">Flight</div>
            <div className="mt-1 text-sm font-medium text-navy-100">{turnaround.flightNumber}</div>
          </div>
          <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
            <div className="text-xs uppercase tracking-wider text-navy-400">Route</div>
            <div className="mt-1 text-sm font-medium text-navy-100">
              {turnaround.origin} → {turnaround.destination}
            </div>
          </div>
          <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
            <div className="text-xs uppercase tracking-wider text-navy-400">Aircraft</div>
            <div className="mt-1 text-sm font-medium text-navy-100">
              {turnaround.aircraftType} · {turnaround.registration}
            </div>
          </div>
          <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
            <div className="text-xs uppercase tracking-wider text-navy-400">Arrival</div>
            <div className="mt-1 text-sm font-mono text-navy-100">
              {formatTime(turnaround.scheduledArrival)}
            </div>
          </div>
          <div className="rounded-lg border border-navy-700/50 bg-navy-800/30 p-3">
            <div className="text-xs uppercase tracking-wider text-navy-400">Scheduled Dep.</div>
            <div className="mt-1 text-sm font-mono text-navy-100">
              {formatTime(turnaround.scheduledDeparture)}
            </div>
          </div>
          <div
            className={`rounded-lg border p-3 ${
              schedule.departureDelay > 0
                ? 'border-danger-500/30 bg-danger-500/10'
                : 'border-success-500/30 bg-success-500/10'
            }`}
          >
            <div className="text-xs uppercase tracking-wider text-navy-400">Est. Dep. Delay</div>
            <div
              className={`mt-1 text-sm font-mono font-semibold ${
                schedule.departureDelay > 0 ? 'text-danger-400' : 'text-success-400'
              }`}
            >
              {formatDelay(schedule.departureDelay)}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-navy-700/60 bg-navy-800/40 p-5">
          <h2 className="text-sm font-semibold text-navy-100 mb-4">Schedule Timeline</h2>
          <GanttChart schedule={schedule} tasks={turnTasks} turnaround={turnaround} />
          <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-navy-400">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-cyan-500/70 border border-cyan-400" />
              <span>Critical path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-navy-500/70 border border-navy-400" />
              <span>Standard task</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-danger-500/70 border border-danger-400" />
              <span>Affected by disruption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded border border-dashed border-navy-500/40" />
              <span>Baseline (pre-disruption)</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-navy-700/60 bg-navy-800/40">
          <div className="border-b border-navy-700/60 px-5 py-3">
            <h2 className="text-sm font-semibold text-navy-100">
              Task List · {turnTasks.length} tasks
            </h2>
          </div>
          <div className="divide-y divide-navy-800/40">
            {schedule.scheduledTasks.map((st) => {
              const task = taskMap.get(st.taskId);
              if (!task) return null;
              const isExpanded = expandedTasks.has(st.taskId);
              const deps = task.dependencies
                .map((d) => taskMap.get(d))
                .filter((t): t is GroundTask => !!t);
              const eq = task.equipmentId ? eqMap.get(task.equipmentId) : null;

              return (
                <div key={st.taskId} className="px-5 py-3 transition-colors hover:bg-navy-800/20">
                  <button
                    onClick={() => toggleTask(st.taskId)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-navy-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-navy-500 flex-shrink-0" />
                    )}
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_STYLES[task.status].dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-navy-100">{task.name}</span>
                        {st.isOnCriticalPath && (
                          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                            Critical
                          </span>
                        )}
                        {st.isAffected && (
                          <span className="rounded bg-danger-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-danger-400">
                            Affected
                          </span>
                        )}
                        {st.hasResourceConflict && (
                          <span className="rounded bg-warning-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning-400">
                            Conflict
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-navy-400">{task.category}</div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-right">
                        <div className="font-mono text-navy-200">
                          {formatTime(st.startTime)} – {formatTime(st.endTime)}
                        </div>
                        <div className="text-navy-500">{formatDuration(st.endTime - st.startTime)}</div>
                      </div>
                      {st.delay > 0 && (
                        <div className="font-mono text-danger-400">+{st.delay}m</div>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="ml-7 mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up">
                      <div className="rounded-lg bg-navy-900/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-400 mb-2">
                          <GitBranch className="h-3.5 w-3.5" />
                          Dependencies
                        </div>
                        {deps.length === 0 ? (
                          <span className="text-xs text-navy-500">None — starts on arrival</span>
                        ) : (
                          <div className="space-y-1">
                            {deps.map((d) => (
                              <div key={d.id} className="flex items-center gap-1.5 text-xs text-navy-300">
                                <ArrowRight className="h-3 w-3 text-navy-500" />
                                {d.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg bg-navy-900/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-400 mb-2">
                          <Wrench className="h-3.5 w-3.5" />
                          Resource
                        </div>
                        {eq ? (
                          <div>
                            <div className="text-sm text-navy-200">{eq.name}</div>
                            <div className="text-xs text-navy-400">
                              {task.equipmentCount} unit{task.equipmentCount === 1 ? '' : 's'} · {eq.total} avail
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-navy-500">No equipment required</span>
                        )}
                      </div>

                      <div className="rounded-lg bg-navy-900/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-400 mb-2">
                          <Clock className="h-3.5 w-3.5" />
                          Timing
                        </div>
                        <div className="space-y-0.5 text-xs text-navy-300">
                          <div>Planned: <span className="font-mono">{formatTime(st.baselineStart)} – {formatTime(st.baselineEnd)}</span></div>
                          <div>Current: <span className="font-mono">{formatTime(st.startTime)} – {formatTime(st.endTime)}</span></div>
                          {st.delay > 0 && (
                            <div className="text-danger-400">Shifted: +{st.delay} min</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg bg-navy-900/40 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-navy-400 mb-2">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Status
                        </div>
                        <div className={`text-sm ${STATUS_STYLES[task.status].text}`}>
                          {STATUS_STYLES[task.status].label}
                        </div>
                        {st.isOnCriticalPath && (
                          <div className="text-xs text-cyan-400 mt-1">On critical path</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
