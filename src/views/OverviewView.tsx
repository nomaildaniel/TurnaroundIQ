import {
  Plane,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Activity,
  ChevronRight,
  Timer,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import { formatTime, formatDelay } from '@/utils/format';
import type { TurnaroundStatus } from '@/types';

export function OverviewView() {
  const { turnarounds, schedules, equipment, tasks, selectTurnaround, setView } = useApp();

  const total = turnarounds.length;
  const byStatus = (s: TurnaroundStatus) => schedules.filter((sch) => sch.status === s).length;
  const onTime = byStatus('on_time');
  const atRisk = byStatus('at_risk');
  const delayed = byStatus('delayed');

  const equipmentUsage = equipment.map((eq) => {
    const used = tasks.filter(
      (t) => t.equipmentId === eq.id && t.status === 'in_progress',
    ).length;
    return { ...eq, inUse: used, available: eq.total - used };
  });

  const totalInUse = equipmentUsage.reduce((sum, e) => sum + e.inUse, 0);
  const totalAvail = equipmentUsage.reduce((sum, e) => sum + e.available, 0);

  const activeDisruptions = schedules
    .filter((s) => s.departureDelay > 0)
    .sort((a, b) => b.departureDelay - a.departureDelay);

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total Turnarounds" value={total} icon={Plane} accent="cyan" />
        <MetricCard label="On Time" value={onTime} icon={CheckCircle2} accent="success" />
        <MetricCard label="At Risk" value={atRisk} icon={AlertTriangle} accent="warning" />
        <MetricCard label="Delayed" value={delayed} icon={Clock} accent="danger" />
        <MetricCard label="Equipment In Use" value={totalInUse} icon={Wrench} accent="cyan" />
        <MetricCard label="Equipment Avail." value={totalAvail} icon={Activity} accent="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
            <div className="border-b border-navy-700/60 px-5 py-3">
              <h2 className="text-sm font-semibold text-navy-100">Simulated Turnarounds</h2>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/40 text-left text-xs uppercase tracking-wider text-navy-400">
                    <th className="px-5 py-2.5 font-medium">Flight</th>
                    <th className="px-3 py-2.5 font-medium">Aircraft</th>
                    <th className="px-3 py-2.5 font-medium">Gate</th>
                    <th className="px-3 py-2.5 font-medium">Departure</th>
                    <th className="px-3 py-2.5 font-medium">Est. Delay</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {turnarounds.map((turn) => {
                    const sched = schedules.find((s) => s.turnaroundId === turn.id);
                    return (
                      <tr
                        key={turn.id}
                        className="border-b border-navy-800/40 transition-colors hover:bg-navy-800/40 cursor-pointer"
                        onClick={() => {
                          selectTurnaround(turn.id);
                          setView('workspace');
                        }}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-navy-100">{turn.flightNumber}</div>
                          <div className="text-xs text-navy-400">{turn.airline}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-navy-200">{turn.aircraftType}</div>
                          <div className="text-xs text-navy-400 font-mono">{turn.registration}</div>
                        </td>
                        <td className="px-3 py-3 text-navy-300">{turn.gate}</td>
                        <td className="px-3 py-3 font-mono text-navy-200">
                          {formatTime(turn.scheduledDeparture)}
                        </td>
                        <td className="px-3 py-3 font-mono">
                          {sched && sched.departureDelay > 0 ? (
                            <span className="text-danger-400">
                              {formatDelay(sched.departureDelay)}
                            </span>
                          ) : (
                            <span className="text-success-400">On time</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {sched && <StatusBadge status={sched.status} size="sm" />}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <ChevronRight className="h-4 w-4 text-navy-500" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
            <div className="border-b border-navy-700/60 px-5 py-3">
              <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning-400" />
                Active Disruptions
              </h2>
            </div>
            <div className="p-3">
              {activeDisruptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success-500/50" />
                  <p className="mt-2 text-sm text-navy-400">No active disruptions</p>
                  <p className="text-xs text-navy-500">All turnarounds are operating on schedule</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeDisruptions.map((sched) => {
                    const turn = turnarounds.find((t) => t.id === sched.turnaroundId);
                    if (!turn) return null;
                    return (
                      <div
                        key={sched.turnaroundId}
                        className="rounded-lg border border-navy-700/50 bg-navy-900/40 p-3 transition-colors hover:border-navy-600/50 cursor-pointer"
                        onClick={() => {
                          selectTurnaround(turn.id);
                          setView('workspace');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-navy-100">{turn.flightNumber}</span>
                          <span className="font-mono text-sm text-danger-400">
                            +{Math.round(sched.departureDelay)}m
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-navy-400">
                          {turn.gate} · {turn.aircraftType} · {sched.affectedTaskIds.length} task
                          {sched.affectedTaskIds.length === 1 ? '' : 's'} affected
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-navy-700/60 bg-navy-800/40">
            <div className="border-b border-navy-700/60 px-5 py-3">
              <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-cyan-400" />
                Ground Equipment
              </h2>
            </div>
            <div className="p-3 space-y-2">
              {equipmentUsage.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-sm text-navy-200">{eq.name}</span>
                    <span className="ml-2 text-xs text-navy-500">{eq.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: eq.total }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-4 rounded-sm ${
                            i < eq.inUse ? 'bg-cyan-500/70' : 'bg-navy-600/50'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-mono text-navy-400">
                      {eq.inUse}/{eq.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-navy-700/60 bg-navy-800/40">
        <div className="border-b border-navy-700/60 px-5 py-3">
          <h2 className="text-sm font-semibold text-navy-100 flex items-center gap-2">
            <Timer className="h-4 w-4 text-cyan-400" />
            Ground-Service Task Progress
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {turnarounds.map((turn) => {
            const turnTasks = tasks.filter((t) => t.turnaroundId === turn.id);
            const completed = turnTasks.filter((t) => t.status === 'completed').length;
            const inProgress = turnTasks.filter((t) => t.status === 'in_progress').length;
            const pending = turnTasks.filter((t) => t.status === 'pending').length;
            const taskTotal = turnTasks.length;
            const pct = taskTotal > 0 ? Math.round((completed / taskTotal) * 100) : 0;

            return (
              <div key={turn.id} className="rounded-lg border border-navy-700/50 bg-navy-900/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy-100">{turn.flightNumber}</span>
                  <span className="text-xs text-navy-400">{pct}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-navy-700/50">
                  <div
                    className="h-1.5 rounded-full bg-cyan-500/70 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-success-400">{completed} done</span>
                  <span className="text-cyan-400">{inProgress} active</span>
                  <span className="text-navy-400">{pending} pending</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
