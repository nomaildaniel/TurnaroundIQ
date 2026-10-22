import type {
  Turnaround, GroundTask, Equipment, AppliedDisruption,
  RecoveryPlan, RecoveryAction, RecoveryPlanSet,
} from '@/types';
import { calculateSchedule, validateSchedule } from '@/engine/scheduler';

function acceptDelayPlan(turnaround: Turnaround, tasks: GroundTask[], disruption: AppliedDisruption) {
  return {
    actions: [{
      type: 'accept_delay' as const, taskId: turnaround.id, taskName: 'Entire turnaround',
      description: 'Accept the full delay without intervention.',
      detail: 'No recovery actions applied. The disruption delay is absorbed entirely.',
    }],
    modifiedTasks: tasks, modifiedDisruption: disruption,
  };
}

function parallelizePlan(turnaround: Turnaround, tasks: GroundTask[], disruption: AppliedDisruption) {
  const affectedIds = new Set(disruption.effects.map((e) => e.taskId));
  const modifiedTasks = tasks.map((t) =>
    affectedIds.has(t.id) ? { ...t, duration: Math.ceil(t.duration * 0.7) } : t,
  );
  const actions: RecoveryAction[] = [];
  for (const task of tasks) {
    if (affectedIds.has(task.id)) {
      actions.push({
        type: 'parallelize', taskId: task.id, taskName: task.name,
        description: `Deploy additional crew to parallelize ${task.name}.`,
        detail: `Duration reduced from ${task.duration}m to ${Math.ceil(task.duration * 0.7)}m (30% reduction via crew surge).`,
      });
    }
  }
  return { actions, modifiedTasks, modifiedDisruption: disruption };
}

function reallocateEquipmentPlan(turnaround: Turnaround, tasks: GroundTask[], disruption: AppliedDisruption, allEquipment: Equipment[]) {
  const affectedIds = new Set(disruption.effects.map((e) => e.taskId));
  const modifiedTasks = [...tasks];
  const actions: RecoveryAction[] = [];
  const eqByType = new Map<string, Equipment[]>();
  for (const eq of allEquipment) {
    const list = eqByType.get(eq.type) ?? [];
    list.push(eq);
    eqByType.set(eq.type, list);
  }
  for (let i = 0; i < modifiedTasks.length; i++) {
    const task = modifiedTasks[i];
    if (!affectedIds.has(task.id) || !task.equipmentId) continue;
    const originalEq = allEquipment.find((e) => e.id === task.equipmentId);
    if (!originalEq) continue;
    const alternatives = (eqByType.get(originalEq.type) ?? []).filter(
      (e) => e.id !== task.equipmentId && e.total >= (task.equipmentCount ?? 1),
    );
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      modifiedTasks[i] = { ...task, equipmentId: alt.id };
      actions.push({
        type: 'reallocate_equipment', taskId: task.id, taskName: task.name,
        description: `Reassign ${task.name} from ${originalEq.name} to ${alt.name}.`,
        detail: `Equipment swap: ${originalEq.name} -> ${alt.name} to reduce contention.`,
      });
    }
  }
  if (actions.length === 0) {
    actions.push({
      type: 'reallocate_equipment', taskId: turnaround.id, taskName: 'No alternatives',
      description: 'No alternative equipment available for reallocation.',
      detail: 'All equipment of the required types are already assigned or have no spare capacity.',
    });
  }
  return { actions, modifiedTasks, modifiedDisruption: disruption };
}

function reduceDurationPlan(turnaround: Turnaround, tasks: GroundTask[], disruption: AppliedDisruption) {
  const halvedEffects = disruption.effects.map((e) => ({
    taskId: e.taskId, additionalDuration: Math.round(e.additionalDuration / 2),
    delayStart: Math.round(e.delayStart / 2),
  }));
  const modifiedDisruption: AppliedDisruption = { ...disruption, effects: halvedEffects };
  const actions: RecoveryAction[] = halvedEffects.map((e) => {
    const task = tasks.find((t) => t.id === e.taskId);
    return {
      type: 'reduce_duration' as const, taskId: e.taskId, taskName: task?.name ?? e.taskId,
      description: `Partially mitigate disruption on ${task?.name ?? e.taskId}.`,
      detail: `Disruption impact halved: duration +${e.additionalDuration}m, start delay +${e.delayStart}m.`,
    };
  });
  return { actions, modifiedTasks: tasks, modifiedDisruption };
}

function buildPlan(
  id: string, name: string, description: string, actions: RecoveryAction[],
  turnaround: Turnaround, modifiedTasks: GroundTask[], modifiedDisruption: AppliedDisruption,
  baselineDelay: number,
): RecoveryPlan {
  const schedule = calculateSchedule(turnaround, modifiedTasks, [modifiedDisruption]);
  const validation = validateSchedule(turnaround, modifiedTasks, schedule);
  const affectedTaskCount = schedule.scheduledTasks.filter((st) => st.isAffected).length;
  let dependencyViolations = 0;
  const taskMap = new Map(modifiedTasks.map((t) => [t.id, t]));
  for (const st of schedule.scheduledTasks) {
    const task = taskMap.get(st.taskId);
    if (!task) continue;
    for (const dep of task.dependencies) {
      const depTask = schedule.scheduledTasks.find((s) => s.taskId === dep);
      if (depTask && st.startTime < depTask.endTime) dependencyViolations++;
    }
  }
  return {
    id, name, description, actions, schedule,
    feasible: validation.valid && dependencyViolations === 0,
    constraintErrors: validation.errors, departureDelay: schedule.departureDelay,
    affectedTaskCount, resourceConflictCount: schedule.resourceConflicts.length,
    dependencyViolations, delaySaved: Math.max(0, baselineDelay - schedule.departureDelay),
  };
}

export function generateRecoveryPlans(
  turnaround: Turnaround, allTasks: GroundTask[],
  disruption: AppliedDisruption, equipment: Equipment[],
): RecoveryPlanSet {
  const turnTasks = allTasks.filter((t) => t.turnaroundId === turnaround.id);
  const baselineDisrupted = calculateSchedule(turnaround, turnTasks, [disruption]);
  const baselineDelay = baselineDisrupted.departureDelay;
  const s1 = acceptDelayPlan(turnaround, turnTasks, disruption);
  const s2 = parallelizePlan(turnaround, turnTasks, disruption);
  const s3 = reallocateEquipmentPlan(turnaround, turnTasks, disruption, equipment);
  const s4 = reduceDurationPlan(turnaround, turnTasks, disruption);
  const plans: RecoveryPlan[] = [
    buildPlan('plan-accept', 'Accept Delay', 'Take no recovery action — absorb the full delay.', s1.actions, turnaround, s1.modifiedTasks, s1.modifiedDisruption, baselineDelay),
    buildPlan('plan-parallel', 'Crew Surge (Parallelize)', 'Deploy additional crew to reduce affected task durations by 30%.', s2.actions, turnaround, s2.modifiedTasks, s2.modifiedDisruption, baselineDelay),
    buildPlan('plan-reallocate', 'Equipment Reallocation', 'Swap affected tasks to alternative equipment of the same type.', s3.actions, turnaround, s3.modifiedTasks, s3.modifiedDisruption, baselineDelay),
    buildPlan('plan-reduce', 'Partial Mitigation', 'Apply additional resources to halve the disruption impact.', s4.actions, turnaround, s4.modifiedTasks, s4.modifiedDisruption, baselineDelay),
  ];
  plans.sort((a, b) => {
    if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
    return b.delaySaved - a.delaySaved;
  });
  return { turnaroundId: turnaround.id, disruption, baselineDisrupted, plans };
}
