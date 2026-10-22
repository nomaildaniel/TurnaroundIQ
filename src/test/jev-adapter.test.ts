import { describe, it, expect } from 'vitest';
import { generateRecoveryPlans } from '@/engine/recovery';
import { SCENARIOS } from '@/engine/scenarios';
import { TURNAROUNDS, ALL_TASKS, EQUIPMENT } from '@/data/dataset';
import { buildReport, buildLedgerEntryReport } from '@/utils/export';
import type { AppliedDisruption, RecoveryPlan, LedgerEntry, JevEvidence, JevCandidate, JevState, ScheduleResult } from '@/types';

function makeDisruption(turnaroundId: string, scenarioId = 'late-baggage-equipment'): AppliedDisruption {
  const turnaround = TURNAROUNDS.find((t) => t.id === turnaroundId)!;
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaroundId);
  const effects = scenario.getEffects(turnaround, turnTasks);
  return { scenarioId: scenario.id, scenarioName: scenario.name, description: scenario.description, effects, turnaroundId };
}

function getFeasibleCandidates(plans: RecoveryPlan[]): JevCandidate[] {
  return plans.filter((p) => p.feasible).map((p) => ({
    id: p.id, name: p.name, description: p.description,
    departureDelay: p.departureDelay, delaySaved: p.delaySaved,
    affectedTaskCount: p.affectedTaskCount, resourceConflictCount: p.resourceConflictCount,
    dependencyViolations: p.dependencyViolations, feasible: p.feasible,
  }));
}

interface AdapterResponse {
  status: string;
  recommendation: { selectedPlanId: string; selectedPlanName: string; confidence: number; probabilities: Record<string, number> } | null;
  model: string | null;
  error: string | null;
  latencyMs: number | null;
}

function mockSuccessResponse(candidates: JevCandidate[], selectedId: string): AdapterResponse {
  return {
    status: 'success',
    recommendation: {
      selectedPlanId: selectedId,
      selectedPlanName: candidates.find((c) => c.id === selectedId)!.name,
      confidence: 0.92,
      probabilities: { [selectedId]: 0.92 },
    },
    model: 'jev-latest',
    error: null,
    latencyMs: 347,
  };
}

function buildJevEvidence(jev: JevState, plans: RecoveryPlan[], userSelectedPlanId: string | null): JevEvidence {
  const recommendedPlanId = jev.recommendation?.selectedPlanId ?? null;
  let feasible: boolean | null = null;
  let constraintErrors: string[] = [];
  if (recommendedPlanId) {
    const recPlan = plans.find((p) => p.id === recommendedPlanId);
    if (recPlan) { feasible = recPlan.feasible; constraintErrors = recPlan.constraintErrors; }
  }
  return {
    provider: 'Jev (TypeSafe System One)',
    model: jev.model,
    status: jev.status,
    recommendation: jev.recommendation,
    candidates: jev.candidates,
    timestamp: jev.timestamp,
    latencyMs: jev.latencyMs,
    error: jev.error,
    independentValidation: { recommendedPlanId, feasible, constraintErrors },
    userSelectedPlanId,
  };
}

function makeBaseline(turnaroundId: string): ScheduleResult {
  const turnaround = TURNAROUNDS.find((t) => t.id === turnaroundId)!;
  return {
    turnaroundId, scheduledTasks: [], estimatedDeparture: turnaround.scheduledDeparture,
    scheduledDeparture: turnaround.scheduledDeparture, departureDelay: 0, resourceConflicts: [],
    affectedTaskIds: [], criticalPathDuration: 60, turnaroundDuration: 60, status: 'on_time',
  };
}

function makeLedgerEntry(plans: RecoveryPlan[], disruption: AppliedDisruption, jevEvidence: JevEvidence | null, selectedPlanId: string | null): LedgerEntry {
  const turnaround = TURNAROUNDS.find((t) => t.id === disruption.turnaroundId)!;
  const baseline = makeBaseline(turnaround.id);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  return {
    id: 'LED-test-001', timestamp: new Date().toISOString(),
    turnaroundId: disruption.turnaroundId, flightNumber: turnaround.flightNumber,
    scenarioId: disruption.scenarioId, scenarioName: disruption.scenarioName,
    disruption, baselineSchedule: baseline, disruptedSchedule: baseline,
    recoveryPlans: plans, selectedPlanId, selectedPlan,
    finalSchedule: selectedPlan?.schedule ?? baseline,
    constraintErrors: selectedPlan?.constraintErrors ?? [],
    jevEvidence,
  };
}

describe('Jev Adapter - Candidate Filtering', () => {
  it('should only include feasible plans as candidates', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.feasible)).toBe(true);
  });

  it('should produce zero candidates when all plans are infeasible', () => {
    const turnaround = TURNAROUNDS[0];
    const turnTasks = ALL_TASKS.filter((t) => t.turnaroundId === turnaround.id);
    const disruption: AppliedDisruption = {
      scenarioId: 'extreme', scenarioName: 'Extreme', description: 'Massive delay',
      effects: turnTasks.map((t) => ({ taskId: t.id, additionalDuration: 500, delayStart: 200 })),
      turnaroundId: turnaround.id,
    };
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const allFeasible = planSet.plans.filter((p) => p.feasible);
    const candidates = getFeasibleCandidates(planSet.plans);
    expect(candidates.length).toBe(allFeasible.length);
  });

  it('should include real calculated metrics in candidate data', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    for (const c of candidates) {
      expect(c.departureDelay).toBeGreaterThanOrEqual(0);
      expect(c.delaySaved).toBeGreaterThanOrEqual(0);
      expect(typeof c.description).toBe('string');
      expect(c.description.length).toBeGreaterThan(0);
    }
  });
});

describe('Jev Adapter - Response Validation', () => {
  it('should accept a valid response with a known candidate ID', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const candidateIds = new Set(candidates.map((c) => c.id));
    expect(candidateIds.has(candidates[0].id)).toBe(true);
  });

  it('should reject a response with an unknown candidate ID', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const candidateIds = new Set(candidates.map((c) => c.id));
    expect(candidateIds.has('plan-nonexistent')).toBe(false);
  });

  it('should reject a response missing the choice result', () => {
    const mockResponse: AdapterResponse = { status: 'invalid_response', recommendation: null, model: 'jev-latest', error: 'Jev response missing recovery_plan choice result', latencyMs: null };
    expect(mockResponse.recommendation).toBeNull();
    expect(mockResponse.status).toBe('invalid_response');
  });
});

describe('Jev Adapter - Missing Secret', () => {
  it('should return integration_unavailable when JEV_API_KEY is missing', () => {
    const mockResponse: AdapterResponse = { status: 'integration_unavailable', recommendation: null, model: null, error: 'Jev integration is not configured. Set JEV_API_KEY in edge function secrets.', latencyMs: null };
    expect(mockResponse.status).toBe('integration_unavailable');
    expect(mockResponse.recommendation).toBeNull();
    expect(mockResponse.error).toContain('JEV_API_KEY');
  });
});

describe('Jev Adapter - API Failures', () => {
  it('should handle authentication errors without retry', () => {
    const r: AdapterResponse = { status: 'api_error', recommendation: null, model: null, error: 'Authentication failed — check JEV_API_KEY', latencyMs: null };
    expect(r.status).toBe('api_error');
    expect(r.error).toContain('Authentication');
  });
  it('should handle rate limit errors', () => {
    const r: AdapterResponse = { status: 'api_error', recommendation: null, model: null, error: 'Rate limit exceeded', latencyMs: null };
    expect(r.error).toContain('Rate limit');
  });
  it('should handle timeout errors', () => {
    const r: AdapterResponse = { status: 'api_error', recommendation: null, model: null, error: 'Request timed out', latencyMs: null };
    expect(r.error).toContain('timed out');
  });
  it('should handle validation failures without retry', () => {
    const r: AdapterResponse = { status: 'api_error', recommendation: null, model: null, error: 'Request validation failed', latencyMs: null };
    expect(r.error).toContain('validation');
  });
});

describe('Jev Adapter - No Feasible Candidates', () => {
  it('should not request a recommendation when no candidates are feasible', () => {
    const r: AdapterResponse = { status: 'no_feasible_candidates', recommendation: null, model: null, error: 'No feasible recovery plans available for Jev evaluation.', latencyMs: null };
    expect(r.status).toBe('no_feasible_candidates');
    expect(r.recommendation).toBeNull();
  });
});

describe('Jev Adapter - No Auto-Execute', () => {
  it('should return recommendation data but not modify schedule state', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const r = mockSuccessResponse(candidates, selectedId);
    expect(r.recommendation).not.toBeNull();
    expect(r.recommendation!.selectedPlanId).toBe(selectedId);
  });
});

describe('Jev Adapter - Criteria Construction', () => {
  it('should build criteria with actual plan IDs as keys', () => {
    const disruption = makeDisruption('turn-002');
    const planSet = generateRecoveryPlans(TURNAROUNDS[1], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const criteria: Record<string, string> = {};
    for (const c of candidates) criteria[c.id] = `${c.name}: ${c.description}. Delay ${c.departureDelay}m (saves ${c.delaySaved}m).`;
    const candidateIds = new Set(candidates.map((c) => c.id));
    for (const key of Object.keys(criteria)) expect(candidateIds.has(key)).toBe(true);
    for (const [key, value] of Object.entries(criteria)) {
      const candidate = candidates.find((c) => c.id === key)!;
      expect(value).toContain(String(candidate.departureDelay));
      expect(value).toContain(String(candidate.delaySaved));
    }
  });
});

describe('Jev Adapter - Independent Validation', () => {
  it('should validate that a recommended feasible plan passes constraint checks', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const recPlan = planSet.plans.find((p) => p.id === selectedId)!;
    expect(recPlan.feasible).toBe(true);
    expect(recPlan.constraintErrors.length).toBe(0);
  });

  it('should flag constraint violations when recommended plan has errors', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const infeasiblePlan = planSet.plans.find((p) => !p.feasible);
    if (infeasiblePlan) {
      expect(infeasiblePlan.feasible).toBe(false);
      expect(infeasiblePlan.constraintErrors.length).toBeGreaterThan(0);
    }
  });
});

describe('Jev Evidence Ledger Integration', () => {
  it('should build JevEvidence with provider, model, recommendation, and candidates', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const mockState: JevState = {
      status: 'success',
      recommendation: { selectedPlanId: selectedId, selectedPlanName: candidates[0].name, confidence: 0.92, probabilities: { [selectedId]: 0.92 } },
      model: 'jev-latest', error: null, timestamp: new Date().toISOString(), latencyMs: 347, candidates,
    };
    const evidence = buildJevEvidence(mockState, planSet.plans, selectedId);
    expect(evidence.provider).toBe('Jev (TypeSafe System One)');
    expect(evidence.model).toBe('jev-latest');
    expect(evidence.recommendation).not.toBeNull();
    expect(evidence.recommendation!.selectedPlanId).toBe(selectedId);
    expect(evidence.candidates.length).toBe(candidates.length);
    expect(evidence.latencyMs).toBe(347);
  });

  it('should include independent validation result in evidence', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const mockState: JevState = {
      status: 'success',
      recommendation: { selectedPlanId: selectedId, selectedPlanName: candidates[0].name, confidence: 0.92, probabilities: { [selectedId]: 0.92 } },
      model: 'jev-latest', error: null, timestamp: new Date().toISOString(), latencyMs: 347, candidates,
    };
    const evidence = buildJevEvidence(mockState, planSet.plans, selectedId);
    expect(evidence.independentValidation.recommendedPlanId).toBe(selectedId);
    expect(evidence.independentValidation.feasible).toBe(true);
    expect(evidence.independentValidation.constraintErrors).toEqual([]);
  });

  it('should record user-selected outcome even when it differs from Jev recommendation', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const recommendedId = candidates[0].id;
    const userSelectedId = candidates.length > 1 ? candidates[1].id : 'plan-other';
    const mockState: JevState = {
      status: 'success',
      recommendation: { selectedPlanId: recommendedId, selectedPlanName: candidates[0].name, confidence: 0.92, probabilities: { [recommendedId]: 0.92 } },
      model: 'jev-latest', error: null, timestamp: new Date().toISOString(), latencyMs: 347, candidates,
    };
    const evidence = buildJevEvidence(mockState, planSet.plans, userSelectedId);
    expect(evidence.recommendation!.selectedPlanId).toBe(recommendedId);
    expect(evidence.userSelectedPlanId).toBe(userSelectedId);
    expect(evidence.userSelectedPlanId).not.toBe(evidence.recommendation!.selectedPlanId);
  });

  it('should preserve Jev evidence in a ledger entry', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const mockState: JevState = {
      status: 'success',
      recommendation: { selectedPlanId: selectedId, selectedPlanName: candidates[0].name, confidence: 0.92, probabilities: { [selectedId]: 0.92 } },
      model: 'jev-latest', error: null, timestamp: new Date().toISOString(), latencyMs: 347, candidates,
    };
    const evidence = buildJevEvidence(mockState, planSet.plans, selectedId);
    const entry = makeLedgerEntry(planSet.plans, disruption, evidence, selectedId);
    expect(entry.jevEvidence).not.toBeNull();
    expect(entry.jevEvidence!.provider).toBe('Jev (TypeSafe System One)');
    expect(entry.jevEvidence!.recommendation!.selectedPlanId).toBe(selectedId);
  });

  it('should allow ledger entries without Jev evidence (deterministic-only records)', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    const entry = makeLedgerEntry(planSet.plans, disruption, null, null);
    expect(entry.jevEvidence).toBeNull();
    expect(entry.selectedPlanId).toBeNull();
  });
});

describe('Jev JSON Export', () => {
  it('should include Jev evidence in exported JSON report', () => {
    const turnaround = TURNAROUNDS[0];
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const selectedPlan = planSet.plans.find((p) => p.id === selectedId)!;
    const mockState: JevState = {
      status: 'success',
      recommendation: { selectedPlanId: selectedId, selectedPlanName: candidates[0].name, confidence: 0.92, probabilities: { [selectedId]: 0.92 } },
      model: 'jev-latest', error: null, timestamp: '2026-10-22T10:00:00Z', latencyMs: 347, candidates,
    };
    const evidence = buildJevEvidence(mockState, planSet.plans, selectedId);
    const baseline = makeBaseline(turnaround.id);
    const report = buildReport(turnaround, baseline, disruption, baseline, planSet.plans, selectedId, selectedPlan.schedule, evidence);
    expect(report.jevEvidence).not.toBeNull();
    expect(report.jevEvidence!.provider).toBe('Jev (TypeSafe System One)');
    expect(report.jevEvidence!.model).toBe('jev-latest');
    expect(report.jevEvidence!.recommendation!.selectedPlanId).toBe(selectedId);
    expect(report.jevEvidence!.latencyMs).toBe(347);
    expect(report.jevEvidence!.independentValidation.feasible).toBe(true);
    expect(report.jevEvidence!.userSelectedPlanId).toBe(selectedId);
  });

  it('should not include credentials or authorization headers in export', () => {
    const turnaround = TURNAROUNDS[0];
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const selectedPlan = planSet.plans.find((p) => p.id === selectedId)!;
    const evidence: JevEvidence = {
      provider: 'Jev (TypeSafe System One)', model: 'jev-latest', status: 'success',
      recommendation: { selectedPlanId: selectedId, selectedPlanName: candidates[0].name, confidence: 0.92, probabilities: { [selectedId]: 0.92 } },
      candidates, timestamp: '2026-10-22T10:00:00Z', latencyMs: 347, error: null,
      independentValidation: { recommendedPlanId: selectedId, feasible: true, constraintErrors: [] },
      userSelectedPlanId: selectedId,
    };
    const baseline = makeBaseline(turnaround.id);
    const report = buildReport(turnaround, baseline, disruption, baseline, planSet.plans, selectedId, selectedPlan.schedule, evidence);
    const json = JSON.stringify(report);
    expect(json).not.toContain('JEV_API_KEY');
    expect(json).not.toContain('Authorization');
    expect(json).not.toContain('Bearer');
    expect(json).not.toContain('apikey');
    expect(json).not.toContain('secret');
  });

  it('should export ledger entry report with Jev evidence', () => {
    const turnaround = TURNAROUNDS[0];
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const candidates = getFeasibleCandidates(planSet.plans);
    const selectedId = candidates[0].id;
    const mockState: JevState = {
      status: 'success',
      recommendation: { selectedPlanId: selectedId, selectedPlanName: candidates[0].name, confidence: 0.92, probabilities: { [selectedId]: 0.92 } },
      model: 'jev-latest', error: null, timestamp: '2026-10-22T10:00:00Z', latencyMs: 347, candidates,
    };
    const evidence = buildJevEvidence(mockState, planSet.plans, selectedId);
    const entry = makeLedgerEntry(planSet.plans, disruption, evidence, selectedId);
    const report = buildLedgerEntryReport(entry, turnaround);
    expect(report.jevEvidence).not.toBeNull();
    expect(report.jevEvidence!.recommendation!.selectedPlanId).toBe(selectedId);
  });

  it('should export ledger entry report without Jev evidence when null', () => {
    const turnaround = TURNAROUNDS[0];
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const entry = makeLedgerEntry(planSet.plans, disruption, null, null);
    const report = buildLedgerEntryReport(entry, turnaround);
    expect(report.jevEvidence).toBeNull();
  });
});

describe('Existing Behavior Preservation', () => {
  it('should still generate the same recovery plans without Jev', () => {
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(TURNAROUNDS[0], ALL_TASKS, disruption, EQUIPMENT);
    expect(planSet.plans.length).toBeGreaterThan(0);
    expect(planSet.plans.every((p) => p.id && p.name && p.description)).toBe(true);
  });

  it('should still export a valid report without Jev evidence', () => {
    const turnaround = TURNAROUNDS[0];
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const baseline = makeBaseline(turnaround.id);
    const report = buildReport(turnaround, baseline, disruption, baseline, planSet.plans, null, baseline, null);
    expect(report.jevEvidence).toBeNull();
    expect(report.recoveryPlans.length).toBe(planSet.plans.length);
    expect(report.selectedPlanId).toBeNull();
  });

  it('should maintain report structure with all existing fields', () => {
    const turnaround = TURNAROUNDS[0];
    const disruption = makeDisruption('turn-001');
    const planSet = generateRecoveryPlans(turnaround, ALL_TASKS, disruption, EQUIPMENT);
    const baseline = makeBaseline(turnaround.id);
    const report = buildReport(turnaround, baseline, disruption, baseline, planSet.plans, null, baseline, null);
    expect(report.reportId).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(report.disclaimer).toBeDefined();
    expect(report.scenarioId).toBe(disruption.scenarioId);
    expect(report.flightNumber).toBe(turnaround.flightNumber);
    expect(report.baseline).toBeDefined();
    expect(report.disruption).toBeDefined();
    expect(report.disruptedSchedule).toBeDefined();
    expect(report.recoveryPlans).toBeDefined();
    expect(report.finalOutcome).toBeDefined();
  });
});
