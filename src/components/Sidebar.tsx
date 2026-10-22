import {
  LayoutDashboard,
  Plane,
  Zap,
  ClipboardCheck,
  BookLock,
} from 'lucide-react';
import type { ViewName } from '@/types';
import { useApp } from '@/context/AppContext';

const NAV_ITEMS: { id: ViewName; label: string; icon: typeof LayoutDashboard; phase?: 'B' }[] = [
  { id: 'overview', label: 'Operations Overview', icon: LayoutDashboard },
  { id: 'workspace', label: 'Turnaround Workspace', icon: Plane },
  { id: 'simulator', label: 'Disruption Simulator', icon: Zap },
  { id: 'recovery', label: 'Recovery Planner', icon: ClipboardCheck, phase: 'B' },
  { id: 'ledger', label: 'Evidence Ledger', icon: BookLock, phase: 'B' },
];

export function Sidebar() {
  const { view, setView } = useApp();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-navy-700/60 bg-navy-900/80">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30">
          <Plane className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-navy-50 leading-tight">TurnaroundIQ</div>
          <div className="text-[10px] text-navy-400 leading-tight">Every minute matters</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                active
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                  : 'text-navy-300 hover:bg-navy-800/60 hover:text-navy-100 border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-cyan-400' : ''}`} />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.phase && (
                <span className="rounded bg-navy-700/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-navy-300">
                  Phase B
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        <div className="rounded-lg border border-warning-500/30 bg-warning-500/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-warning-500 animate-pulse-slow" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warning-400">
              Simulated Data
            </span>
          </div>
          <p className="mt-1 text-[10px] leading-snug text-navy-400">
            Not live airport data. For training and exploration only.
          </p>
        </div>
      </div>
    </aside>
  );
}
