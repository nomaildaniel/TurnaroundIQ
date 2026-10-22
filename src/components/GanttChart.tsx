import type { ScheduledTask, GroundTask, Turnaround } from '@/types';
import { formatTime } from '@/utils/format';

interface GanttChartProps {
  schedule: { scheduledTasks: ScheduledTask[]; turnaroundId: string };
  tasks: GroundTask[];
  turnaround: Turnaround;
}

export function GanttChart({ schedule, tasks, turnaround }: GanttChartProps) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const allTasks = schedule.scheduledTasks;

  if (allTasks.length === 0) return null;

  const minStart = turnaround.scheduledArrival;
  const maxEnd = Math.max(
    ...allTasks.map((t) => t.endTime),
    turnaround.scheduledDeparture,
  );
  const span = maxEnd - minStart;
  const spanSafe = Math.max(span, 1);

  const ticks: number[] = [];
  const tickStep = Math.max(15, Math.ceil(spanSafe / 8 / 15) * 15);
  for (let m = minStart; m <= maxEnd; m += tickStep) {
    ticks.push(m);
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <div className="min-w-[640px]">
        <div className="relative mb-2 ml-48 h-5">
          {ticks.map((t) => {
            const left = ((t - minStart) / spanSafe) * 100;
            return (
              <div
                key={t}
                className="absolute -translate-x-1/2 text-xs font-mono text-navy-400"
                style={{ left: `${left}%` }}
              >
                {formatTime(t)}
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          {allTasks.map((st) => {
            const task = taskMap.get(st.taskId);
            if (!task) return null;

            const left = ((st.startTime - minStart) / spanSafe) * 100;
            const width = ((st.endTime - st.startTime) / spanSafe) * 100;
            const baselineLeft = ((st.baselineStart - minStart) / spanSafe) * 100;
            const baselineWidth = ((st.baselineEnd - st.baselineStart) / spanSafe) * 100;

            const barColor = st.isAffected
              ? 'bg-danger-500/70 border-danger-400'
              : st.isOnCriticalPath
                ? 'bg-cyan-500/70 border-cyan-400'
                : 'bg-navy-500/70 border-navy-400';

            return (
              <div key={st.taskId} className="group relative flex items-center hover:bg-navy-800/30">
                <div className="w-48 flex-shrink-0 pr-3 text-right text-sm text-navy-300 truncate">
                  {task.name}
                </div>
                <div className="relative flex-1 h-7 rounded bg-navy-900/50">
                  <div
                    className="absolute top-1 bottom-1 rounded border border-dashed border-navy-500/40"
                    style={{ left: `${baselineLeft}%`, width: `${baselineWidth}%` }}
                  />
                  <div
                    className={`absolute top-1 bottom-1 rounded border ${barColor} transition-all duration-300`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div className="flex h-full items-center justify-center overflow-hidden px-1 text-[10px] font-medium text-white/90">
                      {st.delay > 0 && <span className="whitespace-nowrap">+{st.delay}m</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scheduled departure line */}
        <div className="relative ml-48 mt-2 h-4">
          <div
            className="absolute top-0 bottom-0 w-px bg-accent-400/50"
            style={{ left: `${((turnaround.scheduledDeparture - minStart) / spanSafe) * 100}%` }}
          />
          <div
            className="absolute -translate-x-1/2 text-[10px] font-medium text-accent-400"
            style={{ left: `${((turnaround.scheduledDeparture - minStart) / spanSafe) * 100}%` }}
          >
            STD
          </div>
        </div>
      </div>
    </div>
  );
}
