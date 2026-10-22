import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
  Turnaround,
  GroundTask,
  Equipment,
  AppliedDisruption,
  ScheduleResult,
  ResourceConflict,
  TurnaroundId,
  ViewName,
  RecoveryPlanSet,
  LedgerEntry,
  SimulationReport,
  JevState,
  JevCandidate,
  JevEvidence,
} from '@/types';
import { TURNAROUNDS, ALL_TASKS, EQUIPMENT } from '@/data/dataset';
import {
  calculateSchedule,
  detectResourceConflicts,
  validateSchedule,
} from '@/engine/scheduler';
import { getScenarioById } from '@/engine/scenarios';
import { generateRecoveryPlans } from '@/engine/recovery';
import { buildReport, exportReportJson, buildLedgerEntryReport } from '@/utils/export';

interface AppContextValue {
  view: ViewName;
  setView: (v: ViewName) => void;
  turnarounds: Turnaround[];
  tasks: GroundTask[];
  equipment: Equipment[];
  schedules: ScheduleResult[];
  resourceConflicts: ResourceConflict[];
  selectedTurnaroundId: TurnaroundId | null;
  selectTurnaround: (id: TurnaroundId) => void;
  activeDisruption: AppliedDisruption | null;
  applyDisruption: (scenarioId: string) => void;
  resetDisruption: () => void;
  getTurnaroundSchedule: (id: TurnaroundId) => ScheduleResult | undefined;
  validationErrors: string[];
  recoveryPlans: RecoveryPlanSet | null;
  selectedPlanId: string | null;
  acceptedPlanId: string | null;
  rejectedPlanIds: string[];
  finalSchedule: ScheduleResult | null;
  selectPlan: (planId: string) => void;
  acceptPlan: (planId: string) => void;
  rejectPlan: (planId: string) => void;
  resetRecovery: () => void;
  ledger: LedgerEntry[];
  addLedgerEntry: () => void;
  clearLedger: () => void;
  exportCurrentReport: () => void;
  buildCurrentReport: () => SimulationReport | null;
  exportLedgerEntry: (entryId: string) => void;
  jev: JevState;
  requestJevRecommendation: () => Promise<void>;
  clearJev: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function generateLedgerId(): string {
  return `LED-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewName>('overview');
  const [selectedTurnaroundId, setSelectedTurnaroundId] = useState<TurnaroundId | null>(null);
  const [activeDisruption, setActiveDisruption] = useState<AppliedDisruption | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [acceptedPlanId, setAcceptedPlanId] = useState<string | null>(null);
  const [rejectedPlanIds, setRejectedPlanIds] = useState<string[]>([]);
  const [finalSchedule, setFinalSchedule] = useState<ScheduleResult | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [jev, setJev] = useState<JevState>({ status: 'idle', recommendation: null, model: null, error: null, timestamp: null, latencyMs: null, candidates: [] });

  const turnarounds = TURNAROUNDS;
  const tasks = ALL_TASKS;
  const equipment = EQUIPMENT;

  const { schedules, resourceConflicts, validationErrors, baselineSchedules } = useMemo(() => {
    const disruptions = activeDisruption ? [activeDisruption] : [];

    const schedules = turnarounds.map((turn) => calculateSchedule(turn, tasks, disruptions));
    const conflicts = detectResourceConflicts(schedules, tasks, equipment);

    for (const sched of schedules) {
      for (const st of sched.scheduledTasks) {
        st.hasResourceConflict = conflicts.some(
          (c) => c.task1Id === st.taskId || c.task2Id === st.taskId,
        );
      }
    }

    const errors: string[] = [];
    for (const turn of turnarounds) {
      const sched = schedules.find((s) => s.turnaroundId === turn.id);
      if (!sched) continue;
      const validation = validateSchedule(turn, tasks, sched);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    const baselineSchedules = turnarounds.map((turn) =>
      calculateSchedule(turn, tasks, []),
    );

    return { schedules, resourceConflicts: conflicts, validationErrors: errors, baselineSchedules };
  }, [turnarounds, tasks, equipment, activeDisruption]);

  const recoveryPlans = useMemo(() => {
    if (!activeDisruption || !selectedTurnaroundId) return null;
    const turnaround = turnarounds.find((t) => t.id === selectedTurnaroundId);
    if (!turnaround) return null;
    return generateRecoveryPlans(turnaround, tasks, activeDisruption, equipment);
  }, [activeDisruption, selectedTurnaroundId, turnarounds, tasks, equipment]);

  const selectTurnaround = (id: TurnaroundId) => {
    setSelectedTurnaroundId(id);
    setSelectedPlanId(null);
    setAcceptedPlanId(null);
    setRejectedPlanIds([]);
    setFinalSchedule(null);
  };

  const applyDisruption = (scenarioId: string) => {
    if (!selectedTurnaroundId) return;
    const scenario = getScenarioById(scenarioId);
    if (!scenario) return;

    const turnaround = turnarounds.find((t) => t.id === selectedTurnaroundId);
    if (!turnaround) return;

    const turnTasks = tasks.filter((t) => t.turnaroundId === selectedTurnaroundId);
    const effects = scenario.getEffects(turnaround, turnTasks);

    setActiveDisruption({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      description: scenario.description,
      effects,
      turnaroundId: selectedTurnaroundId,
    });
    setSelectedPlanId(null);
    setAcceptedPlanId(null);
    setRejectedPlanIds([]);
    setFinalSchedule(null);
  };

  const resetDisruption = () => {
    setActiveDisruption(null);
    setSelectedPlanId(null);
    setAcceptedPlanId(null);
    setRejectedPlanIds([]);
    setFinalSchedule(null);
  };

  const selectPlan = (planId: string) => setSelectedPlanId(planId);

  const acceptPlan = (planId: string) => {
    if (!recoveryPlans) return;
    const plan = recoveryPlans.plans.find((p) => p.id === planId);
    if (!plan) return;
    setAcceptedPlanId(planId);
    setSelectedPlanId(planId);
    setFinalSchedule(plan.schedule);
  };

  const rejectPlan = (planId: string) => {
    setRejectedPlanIds((prev) =>
      prev.includes(planId) ? prev : [...prev, planId],
    );
    if (selectedPlanId === planId) setSelectedPlanId(null);
  };

  const resetRecovery = () => {
    setSelectedPlanId(null);
    setAcceptedPlanId(null);
    setRejectedPlanIds([]);
    setFinalSchedule(null);
  };

  const addLedgerEntry = () => {
    if (!selectedTurnaroundId || !activeDisruption || !recoveryPlans) return;
    const turnaround = turnarounds.find((t) => t.id === selectedTurnaroundId);
    if (!turnaround) return;

    const baseline = baselineSchedules.find((s) => s.turnaroundId === selectedTurnaroundId);
    if (!baseline) return;

    const disrupted = schedules.find((s) => s.turnaroundId === selectedTurnaroundId);
    if (!disrupted) return;

    const selectedPlan = recoveryPlans.plans.find((p) => p.id === acceptedPlanId) ?? null;
    const finalSched = finalSchedule ?? disrupted;

    const constraintErrors: string[] = [];
    if (selectedPlan) {
      constraintErrors.push(...selectedPlan.constraintErrors);
    }

    let jevEvidence: JevEvidence | null = null;
    if (jev.status !== 'idle') {
      const recommendedPlanId = jev.recommendation?.selectedPlanId ?? null;
      let recommendedFeasible: boolean | null = null;
      let recommendedErrors: string[] = [];
      if (recommendedPlanId) {
        const recPlan = recoveryPlans.plans.find((p) => p.id === recommendedPlanId);
        if (recPlan) {
          recommendedFeasible = recPlan.feasible;
          recommendedErrors = recPlan.constraintErrors;
        }
      }
      jevEvidence = {
        provider: 'Jev (TypeSafe System One)',
        model: jev.model,
        status: jev.status,
        recommendation: jev.recommendation,
        candidates: jev.candidates,
        timestamp: jev.timestamp,
        latencyMs: jev.latencyMs,
        error: jev.error,
        independentValidation: {
          recommendedPlanId,
          feasible: recommendedFeasible,
          constraintErrors: recommendedErrors,
        },
        userSelectedPlanId: acceptedPlanId,
      };
    }

    const entry: LedgerEntry = {
      id: generateLedgerId(),
      timestamp: new Date().toISOString(),
      turnaroundId: selectedTurnaroundId,
      flightNumber: turnaround.flightNumber,
      scenarioId: activeDisruption.scenarioId,
      scenarioName: activeDisruption.scenarioName,
      disruption: activeDisruption,
      baselineSchedule: baseline,
      disruptedSchedule: disrupted,
      recoveryPlans: recoveryPlans.plans,
      selectedPlanId: acceptedPlanId,
      selectedPlan,
      finalSchedule: finalSched,
      constraintErrors,
      jevEvidence,
    };

    setLedger((prev) => [...prev, entry]);
  };

  const clearLedger = () => setLedger([]);

  const clearJev = () => {
    setJev({ status: 'idle', recommendation: null, model: null, error: null, timestamp: null, latencyMs: null, candidates: [] });
  };

  const requestJevRecommendation = async () => {
    if (!selectedTurnaroundId || !activeDisruption || !recoveryPlans) return;
    const turnaround = turnarounds.find((t) => t.id === selectedTurnaroundId);
    if (!turnaround) return;
    const feasibleCandidates = recoveryPlans.plans.filter((p) => p.feasible);
    if (feasibleCandidates.length === 0) {
      setJev({ status: 'no_feasible_candidates', recommendation: null, model: null, error: null, timestamp: null, latencyMs: null, candidates: [] });
      return;
    }
    setJev({ status: 'loading', recommendation: null, model: null, error: null, timestamp: null, latencyMs: null, candidates: [] });
    const scenarioSummary = `${turnaround.flightNumber} (${turnaround.aircraftType}) at gate ${turnaround.gate}. Disruption: ${activeDisruption.scenarioName}. ${activeDisruption.description}`;
    const candidates: JevCandidate[] = feasibleCandidates.map((p) => ({
      id: p.id, name: p.name, description: p.description,
      departureDelay: p.departureDelay, delaySaved: p.delaySaved,
      affectedTaskCount: p.affectedTaskCount, resourceConflictCount: p.resourceConflictCount,
      dependencyViolations: p.dependencyViolations, feasible: p.feasible,
    }));
    const requestTimestamp = new Date().toISOString();
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/jev-recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ scenarioSummary, candidates }),
      });
      const data = await response.json();
      if (data.status === 'integration_unavailable') {
        setJev({ status: 'integration_unavailable', recommendation: null, model: null, error: data.error, timestamp: requestTimestamp, latencyMs: null, candidates });
        return;
      }
      if (data.status === 'no_feasible_candidates') {
        setJev({ status: 'no_feasible_candidates', recommendation: null, model: null, error: null, timestamp: requestTimestamp, latencyMs: null, candidates });
        return;
      }
      if (data.status === 'api_error' || data.status === 'invalid_response') {
        setJev({ status: data.status, recommendation: null, model: data.model ?? null, error: data.error ?? `HTTP ${response.status}`, timestamp: requestTimestamp, latencyMs: data.latencyMs ?? null, candidates });
        return;
      }
      setJev({ status: 'success', recommendation: data.recommendation, model: data.model, error: null, timestamp: requestTimestamp, latencyMs: data.latencyMs ?? null, candidates });
    } catch (err) {
      setJev({ status: 'api_error', recommendation: null, model: null, error: err instanceof Error ? err.message : 'Failed to reach Jev adapter', timestamp: requestTimestamp, latencyMs: null, candidates });
    }
  };

  const getTurnaroundSchedule = (id: TurnaroundId) =>
    schedules.find((s) => s.turnaroundId === id);

  const buildCurrentReport = (): SimulationReport | null => {
    if (!selectedTurnaroundId) return null;
    const turnaround = turnarounds.find((t) => t.id === selectedTurnaroundId);
    if (!turnaround) return null;
    const baseline = baselineSchedules.find((s) => s.turnaroundId === selectedTurnaroundId);
    if (!baseline) return null;
    const disrupted = schedules.find((s) => s.turnaroundId === selectedTurnaroundId);
    if (!disrupted) return null;
    const plans = recoveryPlans?.plans ?? [];
    const finalSched = finalSchedule ?? disrupted;
    return buildReport(
      turnaround, baseline, activeDisruption, disrupted, plans, acceptedPlanId, finalSched,
      jev.status !== 'idle' ? {
        provider: 'Jev (TypeSafe System One)',
        model: jev.model,
        status: jev.status,
        recommendation: jev.recommendation,
        candidates: jev.candidates,
        timestamp: jev.timestamp,
        latencyMs: jev.latencyMs,
        error: jev.error,
        independentValidation: (() => {
          const recId = jev.recommendation?.selectedPlanId ?? null;
          let feasible: boolean | null = null;
          let errors: string[] = [];
          if (recId) {
            const recPlan = plans.find((p) => p.id === recId);
            if (recPlan) { feasible = recPlan.feasible; errors = recPlan.constraintErrors; }
          }
          return { recommendedPlanId: recId, feasible, constraintErrors: errors };
        })(),
        userSelectedPlanId: acceptedPlanId,
      } : null,
    );
  };

  const exportCurrentReport = () => {
    const report = buildCurrentReport();
    if (report) exportReportJson(report);
  };

  const exportLedgerEntry = (entryId: string) => {
    const entry = ledger.find((e) => e.id === entryId);
    if (!entry) return;
    const turnaround = turnarounds.find((t) => t.id === entry.turnaroundId);
    if (!turnaround) return;
    const report = buildLedgerEntryReport(entry, turnaround);
    exportReportJson(report);
  };

  const value: AppContextValue = {
    view,
    setView,
    turnarounds,
    tasks,
    equipment,
    schedules,
    resourceConflicts,
    selectedTurnaroundId,
    selectTurnaround,
    activeDisruption,
    applyDisruption,
    resetDisruption,
    getTurnaroundSchedule,
    validationErrors,
    recoveryPlans,
    selectedPlanId,
    acceptedPlanId,
    rejectedPlanIds,
    finalSchedule,
    selectPlan,
    acceptPlan,
    rejectPlan,
    resetRecovery,
    ledger,
    addLedgerEntry,
    clearLedger,
    exportCurrentReport,
    buildCurrentReport,
    exportLedgerEntry,
    jev,
    requestJevRecommendation,
    clearJev,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
