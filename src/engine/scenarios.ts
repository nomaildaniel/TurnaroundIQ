import type { DisruptionScenario } from '@/types';

export const SCENARIOS: DisruptionScenario[] = [
  {
    id: 'late-baggage-equipment',
    name: 'Late Baggage Equipment',
    description:
      'The baggage loading belt and tractor arrive 18 minutes late, extending the baggage unloading and loading tasks.',
    category: 'Equipment Delay',
    getEffects: (_turnaround, tasks) =>
      tasks
        .filter((t) => t.name.toLowerCase().includes('baggage'))
        .map((t) => ({ taskId: t.id, additionalDuration: 18, delayStart: 0 })),
  },
  {
    id: 'delayed-catering-vehicle',
    name: 'Delayed Catering Vehicle',
    description:
      'The catering truck is delayed by 22 minutes, pushing back the start of the catering service task.',
    category: 'Equipment Delay',
    getEffects: (_turnaround, tasks) =>
      tasks
        .filter((t) => t.name.toLowerCase().includes('catering'))
        .map((t) => ({ taskId: t.id, additionalDuration: 0, delayStart: 22 })),
  },
  {
    id: 'cleaning-overrun',
    name: 'Cleaning Task Overrun',
    description:
      'The cabin cleaning crew encounters a spill requiring 25 additional minutes, extending the cleaning task duration.',
    category: 'Task Overrun',
    getEffects: (_turnaround, tasks) =>
      tasks
        .filter((t) => t.name.toLowerCase().includes('cleaning'))
        .map((t) => ({ taskId: t.id, additionalDuration: 25, delayStart: 0 })),
  },
  {
    id: 'gate-stand-conflict',
    name: 'Gate / Stand Conflict',
    description:
      'The assigned gate is still occupied by a delayed departure. All ground tasks are pushed back by 12 minutes until the stand becomes available.',
    category: 'Stand Conflict',
    getEffects: (_turnaround, tasks) =>
      tasks
        .filter((t) => t.dependencies.length === 0)
        .map((t) => ({ taskId: t.id, additionalDuration: 0, delayStart: 12 })),
  },
  {
    id: 'multiple-simultaneous',
    name: 'Multiple Simultaneous Disruptions',
    description:
      'Baggage equipment is late (+15 min), catering is delayed (+10 min start), and cleaning overruns (+20 min) — all at once.',
    category: 'Compound',
    getEffects: (_turnaround, tasks) => {
      const effects: { taskId: string; additionalDuration: number; delayStart: number }[] = [];
      for (const task of tasks) {
        const name = task.name.toLowerCase();
        if (name.includes('baggage')) {
          effects.push({ taskId: task.id, additionalDuration: 15, delayStart: 0 });
        }
        if (name.includes('catering')) {
          effects.push({ taskId: task.id, additionalDuration: 0, delayStart: 10 });
        }
        if (name.includes('cleaning')) {
          effects.push({ taskId: task.id, additionalDuration: 20, delayStart: 0 });
        }
      }
      return effects;
    },
  },
];

export function getScenarioById(id: string): DisruptionScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
