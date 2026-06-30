'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, CheckCircle2, Clock, UserX, Activity, Calendar,
  ChevronRight, TrendingUp, ShieldCheck, Loader2, Info, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const [role, setRole] = useState<'ADMIN' | 'MAHASISWA' | null>(null);
  const [username, setUsername] = useState('');
  const [stats, setStats] = useState({ total: 0, hadir: 0, terlambat: 0, absen: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [institutionName, setInstitutionName] = useState('Universitas Nusa Mandiri');

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [profileRes, settingsRes] = await Promise.all([
         fetch('/api/auth/profile'),
         fetch('/api/settings')
      ]);
      const profileData = await profileRes.json();
      const settingsData = await settingsRes.json();
      
      const currentRole = profileData.role;
      setRole(currentRole);
      setUsername(profileData.username);

      if (settingsData && settingsData.institution_name) {
          setInstitutionName(settingsData.institution_name);
      }

      if (currentRole === 'ADMIN') {
        const [statsRes, activityRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/attendance')
        ]);
        setStats(await statsRes.json());
        const allActivities = await activityRes.json();
        setActivities(allActivities.slice(0, 8));
      } else if (currentRole === 'MAHASISWA') {
        const res = await fetch('/api/attendance/student');
        const data = await res.json();
        const rawHistory = data.history || [];
        // Unique per date for student history
        const uniqueHistory = rawHistory.reduce((acc: any[], current: any) => {
          const dateStr = new Date(current.date).toDateString();
          const exists = acc.find(item => new Date(item.date).toDateString() === dateStr);
          if (!exists) acc.push(current);
          return acc;
        }, []);
        setActivities(uniqueHistory);
        setStats({
          total: 0,
          hadir: data.summary?.hadir || 0,
          terlambat: data.summary?.terlambat || 0,
          absen: 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 opacity-20">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest">Sinkronisasi Informasi...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-28">

      {/* HEADER */}
      <div className="text-center space-y-2 mt-4">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.35em]">
          {role === 'ADMIN' ? 'Portal Administrator' : 'Portal Mahasiswa'}
        </p>

        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
          {role === 'ADMIN' ? 'Dashboard' : 'Selamat Datang'}
        </h1>

        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
          {role === 'ADMIN' ? institutionName : username}
        </p>
      </div>

      {/* HERO CARD */}
      <div className="academic-card rounded-[2rem] p-6 md:p-8 text-center space-y-6">

        <div className="flex justify-center gap-6 flex-wrap">
          <div>
            <p className="label mb-1">Hari Ini</p>
            <p className="text-sm font-black text-slate-800 uppercase">
              {currentTime
                ? currentTime.toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })
                : 'Memuat...'}
            </p>
          </div>

          <div className="hidden md:block w-px bg-slate-100" />

          <div>
            <p className="label mb-1">Waktu</p>
            <p className="text-sm font-black text-blue-600 tabular-nums">
              {currentTime
                ? currentTime.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                : '00:00'} WIB
            </p>
          </div>
        </div>

        <div className="bg-blue-50/60 rounded-2xl p-5 border border-blue-100 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
              Otentikasi Wajah Aktif
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider opacity-70 mt-1">
              Sistem siap melakukan verifikasi identitas
            </p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Statistik
          </p>
        </div>

        {role === 'MAHASISWA' && (
          <div className="academic-card text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
              Identitas
            </p>
            <p className="text-lg font-black text-blue-600 uppercase tracking-tight">
              {username}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Hadir', value: stats.hadir, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Terlambat', value: stats.terlambat, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
            ...(role === 'ADMIN'
              ? [
                { label: 'Mahasiswa', value: stats.total, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Absen', value: stats.absen, icon: UserX, color: 'text-rose-500', bg: 'bg-rose-50' }
              ]
              : [])
          ].map((item, i) => (
            <div
              key={i}
              className="academic-card flex flex-col items-center text-center p-5 hover:shadow-md transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color} mb-3`}>
                <item.icon className="w-5 h-5" />
              </div>

              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {item.label}
              </p>

              <p className="text-xl font-black text-slate-900 tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVITY */}
      <div className="academic-card p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-black uppercase tracking-widest">
              Riwayat Kehadiran
            </p>
          </div>

          <Link
            href="/reports"
            className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest"
          >
            Detail
          </Link>
        </div>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-10 opacity-30">
              <Info className="w-10 h-10 mx-auto mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Belum ada data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                     <th className="py-3 px-2">Tanggal</th>
                     <th className="py-3 px-2">{role === 'ADMIN' ? 'Mahasiswa / Waktu' : 'Waktu'}</th>
                     <th className="py-3 px-2 text-right">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {activities.slice(0, 5).map((a) => (
                     <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                       <td className="py-3 px-2 text-xs font-bold text-slate-700">
                         {new Date(a.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                       </td>
                       <td className="py-3 px-2 text-xs font-bold text-slate-900">
                         {role === 'ADMIN' ? (
                            <div>
                               <span className="block truncate max-w-[120px]">{a.student.name}</span>
                               <span className="text-[9px] text-slate-400 block">{new Date(a.time || a.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'}</span>
                            </div>
                         ) : new Date(a.time || a.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'}
                       </td>
                       <td className="py-3 px-2 text-right">
                         <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${a.status === 'hadir' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                           {a.status}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/attendance"
        className="block w-full text-center py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:bg-blue-700 active:scale-95 transition"
      >
        {role === 'ADMIN'
          ? 'Input Presensi Wajah'
          : 'Mulai Presensi'}
      </Link>

    </div>
  );
}
