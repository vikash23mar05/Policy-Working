import React, { useState } from 'react';
import { UserRole } from '../types';
import { createSession } from '../services/sessionStore';

interface LoginProps {
  onSelectRole: (role: UserRole) => void;
}

const Login: React.FC<LoginProps> = ({ onSelectRole }) => {
  const [officerId, setOfficerId] = useState('');
  const [department, setDepartment] = useState('DPCC');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId || !password) {
      setError('Officer ID and Secure Key are required.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Simulate secure login
    setTimeout(() => {
      createSession(`${department}_${officerId}`, 'Secure Gov SSO');
      onSelectRole('AUTHORITY');
    }, 1200);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950 animate-in fade-in duration-700 h-screen w-full relative overflow-hidden">
      
      {/* Map Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 pointer-events-none"
        style={{ backgroundImage: 'url(/delhi-wards-map.png)' }}
      ></div>
      
      {/* Radial Gradient overlay to blend edges into the dark dashboard theme */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-950/60 via-zinc-950/80 to-zinc-950 pointer-events-none"></div>

      {/* Background accents */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
      <div className="absolute -top-[300px] -right-[300px] w-[600px] h-[600px] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="size-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
            <span className="material-symbols-outlined text-white text-3xl">shield_lock</span>
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">Authority Access</h2>
          <p className="text-white/40 text-sm font-medium">Delhi AQI Command &amp; Control Center</p>
        </div>
        
        <form onSubmit={handleLogin} className="glass-panel p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden bg-zinc-900/60 backdrop-blur-xl">
           <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
           
           {error && (
             <div className="mb-6 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold text-center animate-in slide-in-from-top-2">
               {error}
             </div>
           )}

           <div className="space-y-5">
             <div>
               <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Department</label>
               <select 
                 value={department}
                 onChange={(e) => setDepartment(e.target.value)}
                 className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all appearance-none cursor-pointer"
               >
                 <option value="DPCC">Delhi Pollution Control Committee (DPCC)</option>
                 <option value="CPCB">Central Pollution Control Board (CPCB)</option>
                 <option value="MCD">Municipal Corporation of Delhi (MCD)</option>
                 <option value="TRAFFIC">Delhi Traffic Police</option>
               </select>
             </div>

             <div>
               <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Officer ID / Badge No.</label>
               <input 
                 type="text" 
                 value={officerId}
                 onChange={(e) => setOfficerId(e.target.value)}
                 placeholder="e.g. DPCC-8429" 
                 className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-white/20" 
               />
             </div>

             <div>
               <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2">Secure Key</label>
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 placeholder="••••••••" 
                 className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-white/20" 
               />
             </div>
           </div>

           <button 
             type="submit"
             disabled={loading}
             className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm mt-8 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
           >
             {loading ? (
               <>
                 <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 <span>Authenticating...</span>
               </>
             ) : (
               <>
                 <span>Enter Command Center</span>
                 <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
               </>
             )}
           </button>
        </form>

        <p className="mt-8 text-center text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[12px]">encrypted</span>
          256-bit Encrypted Gov Network
        </p>
      </div>
    </div>
  );
};

export default Login;
