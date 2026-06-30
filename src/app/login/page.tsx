'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Lock, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [institutionName, setInstitutionName] = React.useState('UNM');
  const router = useRouter();

  React.useEffect(() => {
    setIsMounted(true);
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.institution_name) {
             const abbrev = data.institution_name.split(' ').map((n: string) => n[0]).join('').substring(0, 4).toUpperCase();
             setInstitutionName(abbrev);
        }
      })
      .catch(console.error);
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-slate-50" />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.message || 'Kredensial tidak valid.');
      }
    } catch {
      setError('Masalah sinkronisasi data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-5 relative overflow-hidden">

      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-100 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-50 blur-[80px] rounded-full" />
      </div>

      <div className="w-full max-w-[400px] relative z-10 animate-fade-in">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_25px_60px_-15px_rgba(30,64,175,0.06)] border border-slate-100 flex flex-col items-center">

          {/* Official Logo / Badge */}
          <div className="w-20 h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-6 mt-1 transition-all ring-6 ring-blue-50">
            <ShieldCheck className="w-10 h-10" />
          </div>

          <div className="text-center space-y-1.5 mb-8">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
              {institutionName} <span className="text-blue-600">Attendance</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.3em] pt-1 opacity-70">
              Portal Autentikasi Sistem
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] pl-1">NIM / ID Pengguna</label>
              <div className="relative group">
                <User className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-13 pr-6 text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-6 focus:ring-blue-50 transition-all placeholder:text-slate-300 placeholder:font-bold"
                  placeholder="Masukkan NIM / ID"
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] pl-1">Kata Sandi</label>
              <div className="relative group">
                <Lock className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-13 pr-14 text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-6 focus:ring-blue-50 transition-all placeholder:text-slate-300 placeholder:font-bold"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-rose-600 text-[9px] font-black uppercase text-center tracking-widest flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white text-[11px] font-black shadow-xl shadow-blue-500/20 uppercase tracking-[0.3em] rounded-2xl hover:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center ring-4 ring-white"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'MASUK'}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-50 w-full text-center">
            <p className="text-[9px] text-slate-300 font-extrabold uppercase tracking-[0.3em] opacity-80">
              {institutionName} Face Attendance <span className="text-blue-200">2026</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
