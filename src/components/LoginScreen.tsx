// src/components/LoginScreen.tsx
import React, { useState } from 'react';
import { Building2, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginWithCredentials(employeeId, password);
      if (!result.success) {
        setError(result.message || 'Invalid Employee ID or Password. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Subtle Corporate Architectural Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-900/20 via-blue-900/20 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Container with 3D Depth & Fine Hairline Borders */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
          {/* Header Banner */}
          <div className="p-7 sm:p-8 text-center relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 border border-slate-700/80 flex items-center justify-center font-bold text-white shadow-xl relative group">
              <Building2 className="w-7 h-7 text-amber-400 drop-shadow" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              RENAISSANCE GROUP
            </h1>
            <div className="inline-flex items-center space-x-1.5 mt-2 bg-slate-800/90 text-amber-300 text-[11px] px-3 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider border border-amber-500/30">
              <span>Department of HR &amp; OD</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Enterprise Recruitment Status &amp; Performance Portal
            </p>
          </div>

          {/* Form Body */}
          <div className="p-7 sm:p-8 bg-slate-900/40">
            <div className="mb-6 text-center">
              <h2 className="text-base font-bold text-white">Sign In to Executive Portal</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your authorized Employee ID &amp; Password
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start space-x-2.5 text-xs text-rose-200 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Employee ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. 22-02-1826"
                    value={employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-700/80 rounded-xl focus:bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-mono transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-700/80 rounded-xl focus:bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-medium transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-70 mt-3 active:scale-[0.99] cursor-pointer"
              >
                <span>{loading ? 'Verifying Credentials...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-slate-400 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enterprise Single Sign-On · Renaissance Group</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Internal HR &amp; OD Portal • Authorized Access Only
        </div>
      </div>
    </div>
  );
};
