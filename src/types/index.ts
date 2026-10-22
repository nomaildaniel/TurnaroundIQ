// ===== Core identifiers =====
export type TaskId = string;
export type TurnaroundId = string;
export type EquipmentId = string;

// ===== Enums / unions =====
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type TurnaroundStatus = 'on_time' | 'at_risk' | 'delayed';
export type ViewName = 'overview' | 'workspace' | 'simulator' | 'recovery' | 'ledger';

// ===== Domain models =====
export interface Equipment {
  id: EquipmentId;
  name: string;
  type: string;
  total: number;
}

export interface GroundTask {
  id: TaskId;
  turnaroundId: TurnaroundId;
  name: string;
  category: string;
  duration: number;
  dependencies: TaskId[];
  equipmentId?: EquipmentId;
  equipmentCount?: number;
  status: TaskStatus;
}

export interface Turnaround {
  id: TurnaroundId;
  flightNumber: string;
  aircraftType: string;
  registration: string;
  airline: string;
  origin: string;
  destination: string;
  gate: string;
  scheduledArrival: number;
  scheduledDeparture: number;
  taskIds: TaskId[];
}

// ===== Disruption model =====
export interface DisruptionEffect {
  taskId: TaskId;
  additionalDuration: number;
  delayStart: number;
}

export interface DisruptionScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  getEffects: (turnaround: Turnaround, tasks: GroundTask[]) => DisruptionEffect[];
}

export interface AppliedDisruption {
  scenarioId: string;
  scenarioName: string;
  description: string;
  effects: DisruptionEffect[];
  turnaroundId: TurnaroundId;
}

// ===== Schedule results =====
export interface ScheduledTask {
  taskId: TaskId;
  startTime: number;
  endTime: number;
  baselineStart: number;
  baselineEnd: number;
  isOnCriticalPath: boolean;
  isAffected: boolean;
  delay: number;
  hasResourceConflict: boolean;
}

export interface ResourceConflict {
  equipmentId: EquipmentId;
  equipmentName: string;
  task1Id: TaskId;
  task2Id: TaskId;
  task1Name: string;
  task2Name: string;
  overlap: number;
  turnaroundId: TurnaroundId;
}

export interface ScheduleResult {
  turnaroundId: TurnaroundId;
  scheduledTasks: ScheduledTask[];
  estimatedDeparture: number;
  scheduledDeparture: number;
  departureDelay: number;
  resourceConflicts: ResourceConflict[];
  affectedTaskIds: TaskId[];
  criticalPathDuration: number;
  turnaroundDuration: number;
  status: TurnaroundStatus;
}

// ===== Recovery planning =====
export type RecoveryActionType =
  | 'parallelize'
  | 'reallocate_equipment'
  | 'reduce_duration'
  | 'accept_delay';

export interface RecoveryAction {
  type: RecoveryActionType;
  taskId: TaskId;
  taskName: string;
  description: string;
  detail: string;
}

export interface RecoveryPlan {
  id: string;
  name: string;
  description: string;
  actions: RecoveryAction[];
  schedule: ScheduleResult;
  feasible: boolean;
  constraintErrors: string[];
  departureDelay: number;
  affectedTaskCount: number;
  resourceConflictCount: number;
  dependencyViolations: number;
  delaySaved: number;
}

export interface RecoveryPlanSet {
  turnaroundId: TurnaroundId;
  disruption: AppliedDisruption;
  baselineDisrupted: ScheduleResult;
  plans: RecoveryPlan[];
}

// ===== Evidence ledger =====
export interface LedgerEntry {
  id: string;
  timestamp: string;
  turnaroundId: TurnaroundId;
  flightNumber: string;
  scenarioId: string;
  scenarioName: string;
  disruption: AppliedDisruption | null;
  baselineSchedule: ScheduleResult;
  disruptedSchedule: ScheduleResult;
  recoveryPlans: RecoveryPlan[];
  selectedPlanId: string | null;
  selectedPlan: RecoveryPlan | null;
  finalSchedule: ScheduleResult;
  constraintErrors: string[];
  jevEvidence: JevEvidence | null;
}

// ===== JSON export =====
export interface SimulationReport {
  reportId: string;
  timestamp: string;
  disclaimer: string;
  scenarioId: string;
  scenarioName: string;
  turnaroundId: TurnaroundId;
  flightNumber: string;
  aircraftType: string;
  gate: string;
  origin: string;
  destination: string;
  baseline: {
    estimatedDeparture: number;
    departureDelay: number;
    status: TurnaroundStatus;
  };
  disruption: {
    scenarioId: string;
    scenarioName: string;
    effects: DisruptionEffect[];
  } | null;
  disruptedSchedule: {
    estimatedDeparture: number;
    departureDelay: number;
    status: TurnaroundStatus;
    affectedTaskCount: number;
    resourceConflictCount: number;
  };
  recoveryPlans: {
    id: string;
    name: string;
    feasible: boolean;
    departureDelay: number;
    delaySaved: number;
    actions: RecoveryAction[];
    constraintErrors: string[];
  }[];
  selectedPlanId: string | null;
  finalOutcome: {
    estimatedDeparture: number;
    departureDelay: number;
    status: TurnaroundStatus;
    delaySaved: number;
  };
  jevEvidence: JevEvidence | null;
}

// ===== Jev decision adapter =====
export type JevStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'no_feasible_candidates'
  | 'integration_unavailable'
  | 'api_error'
  | 'invalid_response';

export interface JevRecommendation {
  selectedPlanId: string;
  selectedPlanName: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface JevCandidate {
  id: string;
  name: string;
  description: string;
  departureDelay: number;
  delaySaved: number;
  affectedTaskCount: number;
  resourceConflictCount: number;
  dependencyViolations: number;
  feasible: boolean;
}

export interface JevState {
  status: JevStatus;
  recommendation: JevRecommendation | null;
  model: string | null;
  error: string | null;
  timestamp: string | null;
  latencyMs: number | null;
  candidates: JevCandidate[];
}

export interface JevEvidence {
  provider: 'Jev (TypeSafe System One)';
  model: string | null;
  status: JevStatus;
  recommendation: JevRecommendation | null;
  candidates: JevCandidate[];
  timestamp: string | null;
  latencyMs: number | null;
  error: string | null;
  independentValidation: {
    recommendedPlanId: string | null;
    feasible: boolean | null;
    constraintErrors: string[];
  };
  userSelectedPlanId: string | null;
}
