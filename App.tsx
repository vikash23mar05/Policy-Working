import React, { useState } from 'react';
import Landing from './components/Landing';
import Login from './components/Login';
import AuthorityDashboard from './components/AuthorityDashboard';
import InteractiveMap from './components/InteractiveMap';
import { WardDataProvider } from './contexts/WardDataContext';
import { ViewMode, UserRole } from './types';

// Simple Error Boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Sentinel Hub Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-20 bg-red-950 text-white font-headline h-screen flex flex-col items-center justify-center text-center gap-6">
           <h1 className="text-6xl font-black uppercase tracking-tighter">Command System Failure</h1>
           <p className="max-w-xl text-red-200 uppercase tracking-widest text-xs font-bold opacity-70">A critical telemetry disruption has been detected in the Sentinel Command interface.</p>
           <div className="bg-black/50 p-6 rounded border border-red-500/50 font-mono-tech text-[10px] text-left overflow-auto max-w-[80vw] max-h-[40vh]">
              {this.state.error?.stack || this.state.error?.message || "Unknown Core Exception"}
           </div>
           <button onClick={() => window.location.reload()} className="bg-white text-black px-10 py-5 font-black uppercase tracking-[0.3em] text-xs hover:bg-neutral-200 transition-all active:scale-95">Re-Sync Neural Link</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <WardDataProvider>
        <AppContent />
      </WardDataProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LANDING);
  const [showAgent, setShowAgent] = useState(false);

  const handleRoleSelection = (role: UserRole) => {
    if (role === 'AUTHORITY') {
      setViewMode(ViewMode.AUTHORITY_DASHBOARD);
    }
  };

  const handleSignOut = () => {
    setViewMode(ViewMode.LOGIN);
  };

  const renderContent = () => {
    switch (viewMode) {
      case ViewMode.LANDING:
        return <Landing onEnter={() => setViewMode(ViewMode.LOGIN)} />;
      case ViewMode.LOGIN:
        return <Login onSelectRole={handleRoleSelection} />;
      case ViewMode.AUTHORITY_DASHBOARD:
        return <AuthorityDashboard onNavigateMap={() => setViewMode(ViewMode.MAP_VIEW)} onSignOut={handleSignOut} />;
      case ViewMode.MAP_VIEW:
        return <InteractiveMap onBack={() => setViewMode(ViewMode.AUTHORITY_DASHBOARD)} />;
      default:
        return <Landing onEnter={() => setViewMode(ViewMode.LOGIN)} />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-zinc-950 text-white flex flex-col selection:bg-orange-500/30 font-sans w-full max-w-full">
      <main className="flex flex-col flex-1 overflow-x-hidden w-full m-0 p-0">
        {renderContent()}
      </main>

      {/* ElevenLabs AI Agent — toggleable */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        {showAgent ? (
          <>
            <button
              onClick={() => setShowAgent(false)}
              title="Hide assistant"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold rounded-full shadow-lg transition-all border border-zinc-700 self-end"
            >
              <span className="material-symbols-outlined text-sm">visibility_off</span>
              Hide assistant
            </button>
            <elevenlabs-convai agent-id="agent_1301kepesa21eg39f6q2nktr14cj"></elevenlabs-convai>
          </>
        ) : (
          <button
            onClick={() => setShowAgent(true)}
            title="Show AI assistant"
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-semibold rounded-full shadow-xl transition-all border border-zinc-700"
          >
            <span className="material-symbols-outlined text-base">support_agent</span>
            Need help?
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
