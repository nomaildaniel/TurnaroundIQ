import type {
  Turnaround,
  GroundTask,
  Equipment,
  AppliedDisruption,
  ScheduleResult,
  ScheduledTask,
  ResourceConflict,
  TurnaroundStatus,
  TaskId,
  TurnaroundId,
  EquipmentId,
} from '@/types';

function topologicalSort(taskIds: TaskId[], tasks: GroundTask[]): TaskId[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<TaskId>();
  const visiting = new Set<TaskId>();
  const order: TaskId[] = [];

  function visit(id: TaskId): void {
    if (visited.has(id) || visiting.has(id)) return;
    visiting.add(id);
    const task = taskMap.get(id);
    if (task) {
      for (const dep of task.dependencies) {
        visit(dep);
      }
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }

  for (const id of taskIds) visit(id);
  return order;
}

interface TimeMap {
  starts: Map<TaskId, number>;
  ends: Map<TaskId, number>;
}

function forwardPass(
  order: TaskId[],
  tasks: GroundTask[],
  arrivalTime: number,
  durationOverrides: Map<TaskId, number>,
  startDelays: Map<TaskId, number>,
): TimeMap {
  const starts = new Map<TaskId, number>();
  const ends = new Map<TaskId, number>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  for (const id of order) {
    const task = taskMap.get(id);
    if (!task) continue;

    let earliest = arrivalTime;
    for (const dep of task.dependencies) {
      const depEnd = ends.get(dep);
      if (depEnd !== undefined) earliest = Math.max(earliest, depEnd);
    }

    earliest += startDelays.get(id) ?? 0;
    const dur = task.duration + (durationOverrides.get(id) ?? 0);

    starts.set(id, earliest);
    ends.set(id, earliest + dur);
  }

  return { starts, ends };
}

function backwardPass(
  order: TaskId[],
  tasks: GroundTask[],
  estimatedDeparture: number,
  durationOverrides: Map<TaskId, number>,
): { latestStart: Map<TaskId, number>; latestFinish: Map<TaskId, number> } {
  const latestStart = new Map<TaskId, number>();
  const latestFinish = new Map<TaskId, number>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const dependents = new Map<TaskId, TaskId[]>();
  for (const task of tasks) {
    for (const dep of task.dependencies) {
      const list = dependents.get(dep) ?? [];
      list.push(task.id);
      dependents.set(dep, list);
    }
  }

  const reverseOrder = [...order].reverse();
  for (const id of reverseOrder) {
    const task = taskMap.get(id);
    if (!task) continue;

    const deps = dependents.get(id) ?? [];
    if (deps.length === 0) {
      latestFinish.set(id, estimatedDeparture);
    } else {
      let minLatestStart = Infinity;
      for (const depId of deps) {
        const ls = latestStart.get(depId);
        if (ls !== undefined) minLatestStart = Math.min(minLatestStart, ls);
      }
      latestFinish.set(id, minLatestStart);
    }

    const dur = task.duration + (durationOverrides.get(id) ?? 0);
    latestStart.set(id, (latestFinish.get(id) ?? estimatedDeparture) - dur);
  }

  return { latestStart, latestFinish };
}

function computeCriticalPath(
  order: TaskId[],
  forwardStarts: Map<TaskId, number>,
  latestStarts: Map<TaskId, number>,
): Set<TaskId> {
  const critical = new Set<TaskId>();
  for (const id of order) {
    const fs = forwardStarts.get(id) ?? 0;
    const ls = latestStarts.get(id) ?? 0;
    if (ls - fs <= 0) critical.add(id);
  }
  return critical;
}

export function calculateSchedule(
  turnaround: Turnaround,
  allTasks: GroundTask[],
  disruptions: AppliedDisruption[],
): ScheduleResult {
  const tasks = allTasks.filter((t) => t.turnaroundId === turnaround.id);
  const order = topologicalSort(
    tasks.map((t) => t.id),
    tasks,
  );

  const durationOverrides = new Map<TaskId, number>();
  const startDelays = new Map<TaskId, number>();

  for (const d of disruptions) {
    if (d.turnaroundId !== turnaround.id) continue;
    for (const effect of d.effects) {
      durationOverrides.set(
        effect.taskId,
        (durationOverrides.get(effect.taskId) ?? 0) + effect.additionalDuration,
      );
      startDelays.set(
        effect.taskId,
        (startDelays.get(effect.taskId) ?? 0) + effect.delayStart,
      );
    }
  }

  const emptyDur = new Map<TaskId, number>();
  const emptyStart = new Map<TaskId, number>();
  const baseline = forwardPass(order, tasks, turnaround.scheduledArrival, emptyDur, emptyStart);

  const disrupted = forwardPass(
    order,
    tasks,
    turnaround.scheduledArrival,
    durationOverrides,
    startDelays,
  );

  const baselineDeparture = Math.max(...Array.from(baseline.ends.values()));
  const estimatedDeparture = Math.max(...Array.from(disrupted.ends.values()));
  const departureDelay = Math.max(0, estimatedDeparture - turnaround.scheduledDeparture);

  const { latestStart } = backwardPass(
    order,
    tasks,
    estimatedDeparture,
    durationOverrides,
  );
  const criticalPath = computeCriticalPath(order, disrupted.starts, latestStart);

  const scheduledTasks: ScheduledTask[] = order.map((id) => {
    const bs = baseline.starts.get(id) ?? turnaround.scheduledArrival;
    const be = baseline.ends.get(id) ?? turnaround.scheduledArrival;
    const ds = disrupted.starts.get(id) ?? turnaround.scheduledArrival;
    const de = disrupted.ends.get(id) ?? turnaround.scheduledArrival;
    return {
      taskId: id,
      startTime: ds,
      endTime: de,
      baselineStart: bs,
      baselineEnd: be,
      isOnCriticalPath: criticalPath.has(id),
      isAffected: ds !== bs || de !== be,
      delay: Math.max(0, de - be),
      hasResourceConflict: false,
    };
  });

  const affectedTaskIds = scheduledTasks.filter((st) => st.isAffected).map((st) => st.taskId);
  const turnaroundDuration = estimatedDeparture - turnaround.scheduledArrival;
  const status: TurnaroundStatus =
    departureDelay === 0 ? 'on_time' : departureDelay <= 5 ? 'at_risk' : 'delayed';

  void baselineDeparture;

  return {
    turnaroundId: turnaround.id,
    scheduledTasks,
    estimatedDeparture,
    scheduledDeparture: turnaround.scheduledDeparture,
    departureDelay,
    resourceConflicts: [],
    affectedTaskIds,
    criticalPathDuration: turnaroundDuration,
    turnaroundDuration,
    status,
  };
}

export function detectResourceConflicts(
  schedules: ScheduleResult[],
  tasks: GroundTask[],
  equipment: Equipment[],
): ResourceConflict[] {
  const conflicts: ResourceConflict[] = [];
  const eqMap = new Map(equipment.map((e) => [e.id, e]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  interface Slot {
    taskId: TaskId;
    turnaroundId: TurnaroundId;
    equipmentId: EquipmentId;
    count: number;
    start: number;
    end: number;
    name: string;
  }

  const slots: Slot[] = [];
  for (const sched of schedules) {
    for (const st of sched.scheduledTasks) {
      const task = taskMap.get(st.taskId);
      if (!task?.equipmentId) continue;
      slots.push({
        taskId: st.taskId,
        turnaroundId: sched.turnaroundId,
        equipmentId: task.equipmentId,
        count: task.equipmentCount ?? 1,
        start: st.startTime,
        end: st.endTime,
        name: task.name,
      });
    }
  }

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (a.equipmentId !== b.equipmentId) continue;
      const eq = eqMap.get(a.equipmentId);
      if (!eq) continue;

      const overlapStart = Math.max(a.start, b.start);
      const overlapEnd = Math.min(a.end, b.end);
      const overlap = overlapEnd - overlapStart;

      if (overlap > 0 && a.count + b.count > eq.total) {
        conflicts.push({
          equipmentId: a.equipmentId,
          equipmentName: eq.name,
          task1Id: a.taskId,
          task2Id: b.taskId,
          task1Name: a.name,
          task2Name: b.name,
          overlap,
          turnaroundId: a.turnaroundId,
        });
      }
    }
  }

  return conflicts;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSchedule(
  turnaround: Turnaround,
  tasks: GroundTask[],
  result: ScheduleResult,
): ValidationResult {
  const errors: string[] = [];
  const localTasks = tasks.filter((t) => t.turnaroundId === turnaround.id);

  for (const task of localTasks) {
    for (const dep of task.dependencies) {
      if (!tasks.some((t) => t.id === dep)) {
        errors.push(`Task "${task.name}" depends on unknown task "${dep}"`);
      }
    }
  }

  if (result.scheduledTasks.length !== localTasks.length) {
    errors.push('Circular dependency detected in task graph');
  }

  if (result.estimatedDeparture < turnaround.scheduledArrival) {
    errors.push('Estimated departure is before scheduled arrival');
  }

  for (const st of result.scheduledTasks) {
    if (st.endTime < st.startTime) {
      errors.push('Task has negative duration');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}
