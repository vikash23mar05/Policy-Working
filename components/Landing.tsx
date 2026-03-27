import React, { useEffect, useState } from 'react';

interface LandingProps {
  onEnter: () => void;
}

const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans relative overflow-hidden selection:bg-orange-500/30 w-full flex flex-col">
      {/* Tech Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      {/* Glow Effects */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-orange-500 rounded flex items-center justify-center">
             <span className="material-symbols-outlined text-white text-base">air</span>
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight leading-tight">D-AQCC</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">Gov. of NCT Delhi</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono whitespace-nowrap">
           <div className="flex items-center gap-2 text-green-500">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             SYSTEM ONLINE
           </div>
           <span className="text-zinc-600 hidden sm:inline-block">/</span>
           <span className="text-zinc-500 hidden sm:inline-block">AUTHORIZED PERSONNEL ONLY</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 py-12 text-center w-full">
        <div className={`transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            <span className="material-symbols-outlined text-[12px]">radar</span>
            Integrated Sensor Mesh &amp; AI Platform
          </div>
          
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-[1.1] max-w-4xl mx-auto">
            Delhi Air Quality <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Command Center</span>
          </h2>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-md">
            Centralized intelligence hub for ward-level pollution monitoring, AI-driven source attribution, and automated rapid-response dispatch.
          </p>

          <button 
            onClick={onEnter}
            className="group relative inline-flex items-center justify-center gap-3 bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-sm tracking-wide overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(249,115,22,0.4)] active:scale-95"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite]"></div>
            <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
            <span>Authenticate Secure Login</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>

        {/* Features Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto mt-24 transition-all duration-1000 delay-300 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
           <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-left hover:bg-zinc-900 transition-colors">
              <div className="size-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-4 text-orange-500 border border-white/5">
                <span className="material-symbols-outlined text-xl">psychology</span>
              </div>
              <h3 className="text-white font-bold text-base mb-2">AI Source Attribution</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">Gemini 2.0 rapidly analyzes chemical signatures (PM2.5, SO2, CO) to pinpoint exact pollution origins per ward.</p>
           </div>
           <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-left hover:bg-zinc-900 transition-colors">
              <div className="size-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-4 text-orange-500 border border-white/5">
                <span className="material-symbols-outlined text-xl">policy</span>
              </div>
              <h3 className="text-white font-bold text-base mb-2">Policy Simulation</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">Predict the AQI reduction impact of deploying immediate countermeasures like construction bans or odd-even rules.</p>
           </div>
           <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-left hover:bg-zinc-900 transition-colors">
              <div className="size-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-4 text-orange-500 border border-white/5">
                <span className="material-symbols-outlined text-xl">gavel</span>
              </div>
              <h3 className="text-white font-bold text-base mb-2">Verified Enforcements</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">SHA-256 anchored incident reports logged securely by verified officers and field inspectors across 272 wards.</p>
           </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 px-8 flex justify-between items-center text-[10px] text-zinc-600 font-mono w-full">
         <span>v2.4.0-stable // ENCRYPTED CONNECTION</span>
         <span className="hidden sm:inline-block">D-AQCC IS A RESTRICTED GOVERNMENT APPLICATION</span>
      </footer>
    </div>
  );
};

export default Landing;
