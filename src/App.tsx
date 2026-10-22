import { AppProvider, useApp } from '@/context/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { OverviewView } from '@/views/OverviewView';
import { WorkspaceView } from '@/views/WorkspaceView';
import { SimulatorView } from '@/views/SimulatorView';
import { RecoveryView } from '@/views/RecoveryView';
import { LedgerView } from '@/views/LedgerView';

function MainContent() {
  const { view } = useApp();

  switch (view) {
    case 'overview':
      return <OverviewView />;
    case 'workspace':
      return <WorkspaceView />;
    case 'simulator':
      return <SimulatorView />;
    case 'recovery':
      return <RecoveryView />;
    case 'ledger':
      return <LedgerView />;
    default:
      return <OverviewView />;
  }
}

function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <MainContent />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
