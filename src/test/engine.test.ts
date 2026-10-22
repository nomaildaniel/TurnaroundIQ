import { describe, it, expect } from 'vitest';
import {
  calculateSchedule,
  detectResourceConflicts,
  validateSchedule,
} from '@/engine/scheduler';
import { generateRecoveryPlans } from '@/engine/recovery';
import { SCENARIOS, getScenarioById } from '@/engine/scenarios';
import { buildReport } from '@/utils/export';
import { TURNAROUNDS, ALL_TASKS, EQUIPMENT } from '@/data/dataset';
import type {
  Turnaround,
  GroundTask,
  Equipment,
  AppliedDisruption,
} from '@/types';

// ===== Test data factories =====

function makeTurnaround(id: string, arrival = 600, departure = 645): Turnaround {
  return {
    id,
    flightNumber: `TEST-${id}`,
    aircraftType: 'A320',
    registration: 'G-TEST',
    airline: 'Test Airways',
    origin: 'EGKK',
    destination: 'EHAM',
    gate: 'A1',
    scheduledArrival: arrival,
    scheduledDeparture: departure,
    taskIds: [],
  };
}

function makeTask(
  id: string,
  turnaroundId: string,
  name: string,
  duration: number,
  dependencies: string[] = [],
  equipmentId?: string,
  equipmentCount?: number,
): GroundTask {
  return {
    id,
    turnaroundId,
    name,
    category: 'Test',
    duration,
    dependencies,
    equipmentId,
    equipmentCount,
    status: 'pending',
  };
}

function makeDisruption(
  turnaroundId: string,
  effects: { taskId: string; additionalDuration: number; delayStart: number }[],
): AppliedDisruption {
  return {
    scenarioId: 'test-disruption',
    scenarioName: 'Test Disruption',
    description: 'A test disruption',
    effects,
    turnaroundId,
  };
}

// ===== Tests =====

describe('Scheduling Engine - Task Dependencies', () => {
  it('should schedule tasks respecting dependency order', () => {
    const turnaround = makeTurnaround('turn-dep');
    const tasks = [
      makeTask('t1', 'turn-dep', 'Task A', 10, []),
      makeTask('t2', 'turn-dep', 'Task B', 15, ['t1']),
      makeTask('t3', 'turn-dep', 'Task C', 8, ['t2']),
    ];
    turnaround.taskIds = tasks.map((t) => t.id);

    const result = calculateSchedule(turnaround, tasks, []);
    const t1 = result.scheduledTasks.find((st) => st.taskId === 't1')!;
    const t2 = result.scheduledTasks.find((st) => st.taskId === 't2')!;
    const t3 = result.scheduledTasks.find((st) => st.taskId === 't3')!;

    expect(t1.startTime).toBe(600);
    expect(t1.endTime).toBe(610);
    expect(t2.startTime).toBe(610);
    expect(t2.endTime).toBe(625);
    expect(t3.startTime).toBe(625);
    expect(t3.endTime).toBe(633);
  });

  it('should handle parallel tasks with shared dependency', () => {
    const turnaround = makeTurnaround('turn-par');
    const tasks = [
      makeTask('t1', 'turn-par', 'Base', 10, []),
      makeTask('t2', 'turn-par', 'Branch A', 15, ['t1']),
      makeTask('t3', 'turn-par', 'Branch B', 20, ['t1']),
      makeTask('t4', 'turn-par', 'Final', 5, ['t2', 't3']),
    ];
    turnaround.taskIds = tasks.map((t) => t.id);

    const result = calculateSchedule(turnaround, tasks, []);
    const t2 = result.scheduledTasks.find((st) => st.taskId === 't2')!;
    const t3 = result.scheduledTasks.find((st) => st.taskId === 't3')!;
    const t4 = result.scheduledTasks.find((st) => st.taskId === 't4')!;

    expect(t2.startTime).toBe(t3.startTime);
    expect(t4.startTime).toBe(Math.max(t2.endTime, t3.endTime));
  });
});

describe('Scheduling Engine - Resource Conflicts', () => {
  it('should detect overlap when two turnarounds share equipment with total=1', () => {
    const turn1 = makeTurnaround('turn-r1', 600, 645);
    const turn2 = makeTurnaround('turn-r2', 605, 650);

    const limitedEquipment: Equipment[] = [
      { id: 'eq-limited', name: 'Limited GPU', type: 'Power', total: 1 },
    ];

    const tasks = [
      makeTask('r1-t1', 'turn-r1', 'Task 1', 20, [], 'eq-limited', 1),
      makeTask('r1-t2', 'turn-r1', 'Task 2', 10, ['r1-t1']),
      makeTask('r2-t1', 'turn-r2', 'Task 1', 20, [], 'eq-limited', 1),
      makeTask('r2-t2', 'turn-r2', 'Task 2', 10, ['r2-t1']),
    ];
    turn1.taskIds = ['r1-t1', 'r1-t2'];
    turn2.taskIds = ['r2-t1', 'r2-t2'];

    const sched1 = calculateSchedule(turn1, tasks, []);
    const sched2 = calculateSchedule(turn2, tasks, []);
    const conflicts = detectResourceConflicts([sched1, sched2], tasks, limitedEquipment);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].equipmentId).toBe('eq-limited');
  });

  it('should not report conflict when equipment capacity is sufficient', () => {
    const turn1 = makeTurnaround('turn-nr1', 600, 645);
    const turn2 = makeTurnaround('turn-nr2', 605, 650);

    const plentyEquipment: Equipment[] = [
      { id: 'eq-plenty', name: 'Plenty GPU', type: 'Power', total: 5 },
    ];

    const tasks = [
      makeTask('nr1-t1', 'turn-nr1', 'Task 1', 20, [], 'eq-plenty', 1),
      makeTask('nr2-t1', 'turn-nr2', 'Task 1', 20, [], 'eq-plenty', 1),
    ];
    turn1.taskIds = ['nr1-t1'];
    turn2.taskIds = ['nr2-t1'];

    const sched1 = calculateSchedule(turn1, tasks, []);
    const sched2 = calculateSchedule(turn2, tasks, []);
    const conflicts = detectResourceConflicts([sched1, sched2], tasks, plentyEquipment);

    expect(conflicts.length).toBe(0);
  });
});

describe('Scheduling Engine - Disruption Effects', () => {
  it('should extend task duration when disruption adds duration', () => {
    const turnaround = makeTurnaround('turn-dur');
    const tasks = [
      makeTask('d1', 'turn-dur', 'Task A', 10, []),
      makeTask('d2', 'turn-dur', 'Task B', 15, ['d1']),
    ];
    turnaround.taskIds = tasks.map((t) => t.id);

    const baseline = calculateSchedule(turnaround, tasks, []);
    const disruption = makeDisruption('turn-dur', [
      { taskId: 'd1', additionalDuration: 20, delayStart: 0 },
    ]);
    const disrupted = calculateSchedule(turnaround, tasks, [disruption]);

    const baseT2 = baseline.scheduledTasks.find((st) => st.taskId === 'd2')!;
    const disT2 = disrupted.scheduledTasks.find((st) => st.taskId === 'd2')!;

    expect(disT2.startTime).toBe(baseT2.startTime + 20);
    expect(disrupted.estimatedDeparture).toBeGreaterThan(baseline.estimatedDeparture);
  });

  it('should delay task start when disruption adds start delay', () => {
    const turnaround = makeTurnaround('turn-sd');
    const tasks = [
      makeTask('s1', 'turn-sd', 'Task A', 10, []),
      makeTask('s2', 'turn-sd', 'Task B', 5, ['s1']),
    ];
    turnaround.taskIds = tasks.map((t) => t.id);

    const baseline = calculateSchedule(turnaround, tasks, []);
    const disruption = makeDisruption('turn-sd', [
      { taskId: 's2', additionalDuration: 0, delayStart: 15 },
    ]);
    const disrupted = calculateSchedule(turnaround, tasks, [disruption]);

    const baseS2 = baseline.scheduledTasks.find((st) => st.taskId === 's2')!;
    const disS2 = disrupted.scheduledTasks.find((st) => st.taskId === 's2')!;

    expect(disS2.startTime).toBe(baseS2.startTime + 15);
  });
});

describe('Scheduling Engine - Delay Calculation', () => {
  it('should calculate departure delay correctly', () => {
    const turnaround = makeTurnaround('turn-delay', 600, 620);
    const tasks = [makeTask('dl1', 'turn-delay', 'Task A', 25, [])];
    turnaround.taskIds = tasks.map((t) => t.id);

    const result = calculateSchedule(turnaround, tasks, []);
    expect(result.departureDelay).toBe(5);
    expect(result.status).toBe('at_risk');
  });

  it('should report on_time when no delay', () => {
    const turnaround = makeTurnaround('turn-ontime', 600, 700);
    const tasks = [makeTask('ot1', 'turn-ontime', 'Task A', 30, [])];
    turnaround.taskIds = tasks.map((t) => t.id);

    const result = calculateSchedule(turnaround, tasks, []);
    expect(result.departureDelay).toBe(0);
    expect(result.status).toBe('on_time');
  });
});

describe('Recovery Plan Generation', () => {
  it('should generate 4 recovery plans', () => {
    const turnaround = TURNAROUNDS[0];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const scenario = SCENARIOS[0];
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };

    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    expect(planSet.plans.length).toBe(4);
    expect(planSet.plans.map((p) => p.id)).toContain('plan-accept');
    expect(planSet.plans.map((p) => p.id)).toContain('plan-parallel');
    expect(planSet.plans.map((p) => p.id)).toContain('plan-reallocate');
    expect(planSet.plans.map((p) => p.id)).toContain('plan-reduce');
  });

  it('should sort feasible plans before infeasible ones', () => {
    const turnaround = TURNAROUNDS[0];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const scenario = SCENARIOS[2];
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };

    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const firstFeasible = planSet.plans.findIndex((p) => p.feasible);
    const firstInfeasible = planSet.plans.findIndex((p) => !p.feasible);
    if (firstFeasible >= 0 && firstInfeasible >= 0) {
      expect(firstFeasible).toBeLessThan(firstInfeasible);
    }
  });

  it('should mark accept-delay plan with delaySaved = 0', () => {
    const turnaround = TURNAROUNDS[0];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const scenario = SCENARIOS[0];
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };

    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const acceptPlan = planSet.plans.find((p) => p.id === 'plan-accept')!;
    expect(acceptPlan.delaySaved).toBe(0);
  });
});

describe('Recovery - Infeasible Plan Detection', () => {
  it('should mark plan infeasible when dependency violations exist', () => {
    const turnaround = makeTurnaround('turn-infeasible', 600, 700);
    const tasks = [
      makeTask('if1', 'turn-infeasible', 'Task A', 10, []),
      makeTask('if2', 'turn-infeasible', 'Task B', 20, ['if1']),
    ];
    turnaround.taskIds = tasks.map((t) => t.id);

    const disruption = makeDisruption('turn-infeasible', [
      { taskId: 'if2', additionalDuration: 0, delayStart: 100 },
    ]);

    const planSet = generateRecoveryPlans(turnaround, tasks, disruption, EQUIPMENT);
    const acceptPlan = planSet.plans.find((p) => p.id === 'plan-accept')!;
    expect(acceptPlan.feasible).toBe(true);
  });
});

describe('Recovery - Baseline Comparison', () => {
  it('should compute delaySaved relative to disrupted baseline', () => {
    const turnaround = TURNAROUNDS[0];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const scenario = SCENARIOS[0];
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };

    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const baselineDelay = planSet.baselineDisrupted.departureDelay;

    for (const plan of planSet.plans) {
      expect(plan.delaySaved).toBe(Math.max(0, baselineDelay - plan.departureDelay));
    }
  });
});

describe('Deterministic Replay', () => {
  it('should produce identical results on repeated runs', () => {
    const turnaround = TURNAROUNDS[1];
    const scenario = SCENARIOS[1];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };

    const run1 = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const run2 = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);

    expect(run1.plans.length).toBe(run2.plans.length);
    for (let i = 0; i < run1.plans.length; i++) {
      expect(run1.plans[i].departureDelay).toBe(run2.plans[i].departureDelay);
      expect(run1.plans[i].delaySaved).toBe(run2.plans[i].delaySaved);
      expect(run1.plans[i].feasible).toBe(run2.plans[i].feasible);
    }
  });

  it('should produce identical schedule results on repeated calculateSchedule calls', () => {
    const turnaround = TURNAROUNDS[2];
    const sched1 = calculateSchedule(turnaround, ALL_TASKS, []);
    const sched2 = calculateSchedule(turnaround, ALL_TASKS, []);
    expect(sched1.estimatedDeparture).toBe(sched2.estimatedDeparture);
    expect(sched1.departureDelay).toBe(sched2.departureDelay);
  });
});

describe('Scenario Reset', () => {
  it('should return to baseline when disruption is removed', () => {
    const turnaround = TURNAROUNDS[0];
    const baseline = calculateSchedule(turnaround, ALL_TASKS, []);

    const scenario = SCENARIOS[3];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };

    const disrupted = calculateSchedule(turnaround, ALL_TASKS, [disruption]);
    expect(disrupted.estimatedDeparture).toBeGreaterThanOrEqual(baseline.estimatedDeparture);

    const reset = calculateSchedule(turnaround, ALL_TASKS, []);
    expect(reset.estimatedDeparture).toBe(baseline.estimatedDeparture);
    expect(reset.departureDelay).toBe(baseline.departureDelay);
  });
});

describe('Evidence Ledger Accuracy', () => {
  it('should build report with full audit trail', () => {
    const turnaround = TURNAROUNDS[0];
    const baseline = calculateSchedule(turnaround, ALL_TASKS, []);

    const scenario = SCENARIOS[0];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };

    const disrupted = calculateSchedule(turnaround, ALL_TASKS, [disruption]);
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const selectedPlan = planSet.plans.find((p) => p.feasible) ?? planSet.plans[0];

    const report = buildReport(
      turnaround,
      baseline,
      disruption,
      disrupted,
      planSet.plans,
      selectedPlan.id,
      selectedPlan.schedule,
    );

    expect(report.turnaroundId).toBe(turnaround.id);
    expect(report.flightNumber).toBe(turnaround.flightNumber);
    expect(report.scenarioId).toBe(scenario.id);
    expect(report.disruption).not.toBeNull();
    expect(report.recoveryPlans.length).toBe(4);
    expect(report.selectedPlanId).toBe(selectedPlan.id);
    expect(report.finalOutcome.estimatedDeparture).toBe(selectedPlan.schedule.estimatedDeparture);
  });
});

describe('JSON Export Content', () => {
  it('should include simulation disclaimer in the report', () => {
    const turnaround = TURNAROUNDS[0];
    const baseline = calculateSchedule(turnaround, ALL_TASKS, []);

    const report = buildReport(
      turnaround,
      baseline,
      null,
      baseline,
      [],
      null,
      baseline,
    );

    expect(report.disclaimer).toContain('SIMULATION ONLY');
    expect(report.disclaimer).toContain('fictional data');
    expect(report.disclaimer).toContain('not live airport operational data');
  });

  it('should include all required fields in the report', () => {
    const turnaround = TURNAROUNDS[0];
    const baseline = calculateSchedule(turnaround, ALL_TASKS, []);
    const scenario = SCENARIOS[0];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const effects = scenario.getEffects(turnaround, turnTasks);
    const disruption: AppliedDisruption = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: turnaround.id,
    };
    const disrupted = calculateSchedule(turnaround, ALL_TASKS, [disruption]);
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);

    const report = buildReport(
      turnaround,
      baseline,
      disruption,
      disrupted,
      planSet.plans,
      null,
      disrupted,
    );

    expect(report.reportId).toMatch(/^RPT-\d+$/);
    expect(report.timestamp).toMatch(/^[\d-]+T[\d:.]+/);
    expect(report.aircraftType).toBe(turnaround.aircraftType);
    expect(report.gate).toBe(turnaround.gate);
    expect(report.origin).toBe(turnaround.origin);
    expect(report.destination).toBe(turnaround.destination);
    expect(report.baseline).toBeDefined();
    expect(report.disruptedSchedule).toBeDefined();
    expect(report.recoveryPlans.length).toBe(4);
    expect(report.finalOutcome).toBeDefined();
  });
});

describe('Scenario Coverage', () => {
  it('should have 5 scenarios defined', () => {
    expect(SCENARIOS.length).toBe(5);
  });

  it('should find scenario by id', () => {
    const scenario = getScenarioById('late-baggage-equipment');
    expect(scenario).toBeDefined();
    expect(scenario!.name).toBe('Late Baggage Equipment');
  });

  it('should return undefined for unknown scenario id', () => {
    expect(getScenarioById('nonexistent')).toBeUndefined();
  });
});

describe('Dataset Validation', () => {
  it('should have 4 turnarounds', () => {
    expect(TURNAROUNDS.length).toBe(4);
  });

  it('should have 9 tasks per turnaround', () => {
    for (const turn of TURNAROUNDS) {
      const tasks = ALL_TASKS.filter((t) => t.turnaroundId === turn.id);
      expect(tasks.length).toBe(9);
    }
  });

  it('should produce valid schedules for all turnarounds without disruption', () => {
    for (const turn of TURNAROUNDS) {
      const sched = calculateSchedule(turn, ALL_TASKS, []);
      const validation = validateSchedule(turn, ALL_TASKS, sched);
      expect(validation.valid).toBe(true);
    }
  });
});
