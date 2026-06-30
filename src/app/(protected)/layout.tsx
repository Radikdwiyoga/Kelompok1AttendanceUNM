'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, FileBarChart,
  Settings as SettingsIcon, LogOut, ShieldCheck, X, Activity, Clock
} from 'lucide-react';

import { ScanFace } from 'lucide-react';

const ADMIN_NAV = [
  { label: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Siswa', href: '/students', icon: Users },
  { label: 'Scan', href: '/attendance', icon: ScanFace, isCenter: true },
  { label: 'Rekap', href: '/reports', icon: FileBarChart },
  { label: 'Sistem', href: '/settings', icon: SettingsIcon },
];

const STUDENT_NAV = [
  { label: 'Beranda', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Scan', href: '/attendance', icon: ScanFace, isCenter: true },
  { label: 'Rekap', href: '/reports', icon: FileBarChart },
];

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = React.useState(false);
  const [user, setUser] = useState<{ role: string; username: string } | null>(null);
  const [institutionName, setInstitutionName] = useState('Universitas Nusa Mandiri');

  useEffect(() => {
    setIsMounted(true);
    fetch('/api/auth/profile')
      .then(res => res.json())
      .then(data => {
        if (data.role) setUser(data);
        else router.push('/login');
      })
      .catch(() => router.push('/login'));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.institution_name) setInstitutionName(data.institution_name);
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const navItems = user?.role === 'ADMIN' ? ADMIN_NAV : STUDENT_NAV;

  if (!isMounted || !user) return <div className="min-h-screen bg-[#fcfdfe]" />;

  return (
    <div className="min-h-screen bg-[#fcfdfe] font-lato pb-12">
      <div className="app-container relative">
        <header className="app-header sticky top-0 z-[100] border-b border-slate-100 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-800 tracking-tight leading-none uppercase">Presensi Wajah</h1>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1.5 opacity-80">{institutionName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleLogout} className="p-3 rounded-2xl text-slate-300 hover:text-rose-600 transition-all">
              <LogOut className="w-5.5 h-5.5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 pb-24 relative z-10">
          {children}
        </main>

        <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] px-2 pb-safe z-50 flex items-center justify-between h-[70px] rounded-t-3xl">
          <div className="flex-1 flex items-center justify-evenly">
            {navItems.filter(i => !i.isCenter).slice(0, Math.ceil((navItems.length - 1) / 2)).map((item) => (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-300 relative ${isActive(item.href) ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <item.icon className={`w-5.5 h-5.5 ${isActive(item.href) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider mt-1">{item.label}</span>
                {isActive(item.href) && <div className="absolute -bottom-1 w-4 h-1 bg-blue-600 rounded-t-full" />}
              </Link>
            ))}
          </div>

          <div className="relative w-16 h-full flex items-center justify-center shrink-0">
             {navItems.filter(i => i.isCenter).map(item => (
                <Link key={item.href} href={item.href} className="absolute -top-8 flex flex-col items-center justify-center group animate-fade-in shadow-2xl rounded-full">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl ${isActive(item.href) ? 'bg-blue-700 shadow-blue-200' : 'bg-blue-600 shadow-blue-100'} transition-transform group-active:scale-90 border-4 border-white`}>
                     <item.icon className="w-8 h-8" />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1.5">{item.label}</span>
                </Link>
             ))}
          </div>

          <div className="flex-1 flex items-center justify-evenly">
            {navItems.filter(i => !i.isCenter).slice(Math.ceil((navItems.length - 1) / 2)).map((item) => (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-300 relative ${isActive(item.href) ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <item.icon className={`w-5.5 h-5.5 ${isActive(item.href) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider mt-1">{item.label}</span>
                {isActive(item.href) && <div className="absolute -bottom-1 w-4 h-1 bg-blue-600 rounded-t-full" />}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
