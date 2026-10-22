import type { Turnaround, GroundTask, Equipment } from '@/types';

export const EQUIPMENT: Equipment[] = [
  { id: 'eq-belt-loader', name: 'Belt Loader', type: 'Baggage', total: 3 },
  { id: 'eq-bag-tractor', name: 'Baggage Tractor', type: 'Baggage', total: 4 },
  { id: 'eq-catering-truck', name: 'Catering Truck', type: 'Catering', total: 2 },
  { id: 'eq-fuel-truck', name: 'Fuel Truck', type: 'Fueling', total: 2 },
  { id: 'eq-cleaning-crew', name: 'Cleaning Crew', type: 'Cleaning', total: 3 },
  { id: 'eq-pushback-tractor', name: 'Pushback Tractor', type: 'Ground', total: 2 },
  { id: 'eq-gpu', name: 'GPU', type: 'Power', total: 4 },
  { id: 'eq-boarding-stairs', name: 'Boarding Stairs', type: 'Boarding', total: 3 },
];

export const TURNAROUNDS: Turnaround[] = [
  {
    id: 'turn-001',
    flightNumber: 'AVF2041',
    aircraftType: 'A320',
    registration: 'G-HTCJ',
    airline: 'Aurora Virtual Airways',
    origin: 'EGKK',
    destination: 'EHAM',
    gate: 'A12',
    scheduledArrival: 9 * 60,
    scheduledDeparture: 9 * 60 + 45,
    taskIds: [],
  },
  {
    id: 'turn-002',
    flightNumber: 'AVF3110',
    aircraftType: 'B738',
    registration: 'G-PRUF',
    airline: 'Aurora Virtual Airways',
    origin: 'LFPG',
    destination: 'EGGW',
    gate: 'B07',
    scheduledArrival: 10 * 60 + 15,
    scheduledDeparture: 10 * 60 + 55,
    taskIds: [],
  },
  {
    id: 'turn-003',
    flightNumber: 'AVF4520',
    aircraftType: 'A321',
    registration: 'G-EVID',
    airline: 'Aurora Virtual Airways',
    origin: 'EDDF',
    destination: 'LEMD',
    gate: 'C03',
    scheduledArrival: 11 * 60,
    scheduledDeparture: 11 * 60 + 50,
    taskIds: [],
  },
  {
    id: 'turn-004',
    flightNumber: 'AVF6707',
    aircraftType: 'B789',
    registration: 'G-DATA',
    airline: 'Aurora Virtual Airways',
    origin: 'KJFK',
    destination: 'EGLL',
    gate: 'D15',
    scheduledArrival: 13 * 60 + 20,
    scheduledDeparture: 14 * 60 + 10,
    taskIds: [],
  },
];

function makeTaskId(turnId: string, suffix: string): string {
  return `${turnId}-${suffix}`;
}

function makeTurnaroundTasks(turnaround: Turnaround): GroundTask[] {
  const t = turnaround.id;
  const tasks: GroundTask[] = [];

  tasks.push({
    id: makeTaskId(t, 'chocks'),
    turnaroundId: t,
    name: 'Chocks On & GPU Connect',
    category: 'Arrival',
    duration: 5,
    dependencies: [],
    equipmentId: 'eq-gpu',
    equipmentCount: 1,
    status: 'completed',
  });

  tasks.push({
    id: makeTaskId(t, 'disembark'),
    turnaroundId: t,
    name: 'Passenger Disembarkation',
    category: 'Passenger',
    duration: 12,
    dependencies: [makeTaskId(t, 'chocks')],
    equipmentId: 'eq-boarding-stairs',
    equipmentCount: 1,
    status: 'completed',
  });

  tasks.push({
    id: makeTaskId(t, 'bag-unload'),
    turnaroundId: t,
    name: 'Baggage Unloading',
    category: 'Baggage',
    duration: 15,
    dependencies: [makeTaskId(t, 'chocks')],
    equipmentId: 'eq-belt-loader',
    equipmentCount: 1,
    status: 'in_progress',
  });

  tasks.push({
    id: makeTaskId(t, 'cleaning'),
    turnaroundId: t,
    name: 'Cabin Cleaning',
    category: 'Cleaning',
    duration: 20,
    dependencies: [makeTaskId(t, 'disembark')],
    equipmentId: 'eq-cleaning-crew',
    equipmentCount: 1,
    status: 'pending',
  });

  tasks.push({
    id: makeTaskId(t, 'catering'),
    turnaroundId: t,
    name: 'Catering Loading',
    category: 'Catering',
    duration: 10,
    dependencies: [makeTaskId(t, 'disembark')],
    equipmentId: 'eq-catering-truck',
    equipmentCount: 1,
    status: 'pending',
  });

  tasks.push({
    id: makeTaskId(t, 'fueling'),
    turnaroundId: t,
    name: 'Aircraft Fueling',
    category: 'Fueling',
    duration: 18,
    dependencies: [makeTaskId(t, 'chocks')],
    equipmentId: 'eq-fuel-truck',
    equipmentCount: 1,
    status: 'pending',
  });

  tasks.push({
    id: makeTaskId(t, 'bag-load'),
    turnaroundId: t,
    name: 'Baggage Loading',
    category: 'Baggage',
    duration: 12,
    dependencies: [makeTaskId(t, 'bag-unload')],
    equipmentId: 'eq-belt-loader',
    equipmentCount: 1,
    status: 'pending',
  });

  tasks.push({
    id: makeTaskId(t, 'boarding'),
    turnaroundId: t,
    name: 'Passenger Boarding',
    category: 'Passenger',
    duration: 15,
    dependencies: [makeTaskId(t, 'cleaning'), makeTaskId(t, 'catering')],
    equipmentId: 'eq-boarding-stairs',
    equipmentCount: 1,
    status: 'pending',
  });

  tasks.push({
    id: makeTaskId(t, 'dispatch'),
    turnaroundId: t,
    name: 'Dispatch Preparation & Pushback',
    category: 'Departure',
    duration: 8,
    dependencies: [makeTaskId(t, 'boarding'), makeTaskId(t, 'bag-load'), makeTaskId(t, 'fueling')],
    equipmentId: 'eq-pushback-tractor',
    equipmentCount: 1,
    status: 'pending',
  });

  return tasks;
}

export const ALL_TASKS: GroundTask[] = TURNAROUNDS.flatMap(makeTurnaroundTasks);

for (const turn of TURNAROUNDS) {
  turn.taskIds = ALL_TASKS.filter((t) => t.turnaroundId === turn.id).map((t) => t.id);
}
