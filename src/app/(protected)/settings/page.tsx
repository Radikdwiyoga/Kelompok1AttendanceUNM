'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon, Database, Shield, Lock,
  Save, Trash2, Plus, Info, ChevronRight, Loader2, Clock, CheckCircle2,
  AlertTriangle, Edit2, MapPin, Locate
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [newClassName, setNewClassName] = useState('');
  
  // States
  const [threshold, setThreshold] = useState('0.65');
  const [institutionName, setInstitutionName] = useState('UNIVERSITAS NUSA MANDIRI');
  const [campusLat, setCampusLat] = useState('-6.200000');
  const [campusLng, setCampusLng] = useState('106.816666');
  const [campusRadius, setCampusRadius] = useState('100');
  
  // Initial states for dirty checking
  const [initialState, setInitialState] = useState<any>({});
  const [isDirty, setIsDirty] = useState(false);

  // Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  
  const [geoStatus, setGeoStatus] = useState<'idle'|'loading'|'valid'|'denied'|'error'>('idle');

  useEffect(() => {
    Promise.all([
      fetch('/api/classes').then(r => r.json()),
      fetch('/api/settings').then(r => r.json())
    ]).then(([cls, set]) => {
      setClasses(Array.isArray(cls) ? cls : []);
      
      const st: any = {
        threshold: set?.face_accuracy_threshold || '0.65',
        institutionName: set?.institution_name || 'UNIVERSITAS NUSA MANDIRI',
        campusLat: set?.campus_lat || '-6.200000',
        campusLng: set?.campus_lng || '106.816666',
        campusRadius: set?.campus_radius || '100',
      };
      
      setThreshold(st.threshold);
      setInstitutionName(st.institutionName);
      setCampusLat(st.campusLat);
      setCampusLng(st.campusLng);
      setCampusRadius(st.campusRadius);
      
      setInitialState(st);
    }).catch(err => console.error('Load error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Dirty state checker
  useEffect(() => {
    if (Object.keys(initialState).length === 0) return;
    const current = { threshold, institutionName, campusLat, campusLng, campusRadius };
    const changed = Object.keys(current).some(k => (current as any)[k] !== initialState[k]);
    setIsDirty(changed);
  }, [threshold, institutionName, campusLat, campusLng, campusRadius, initialState]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      if (res.ok) {
        setNewClassName('');
        const updated = await fetch('/api/classes').then(r => r.json());
        setClasses(Array.isArray(updated) ? updated : []);
      }
    } catch { }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kelas ini?")) return;
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClasses(classes.filter(c => c.id !== id));
      } else {
        const data = await res.json();
        alert(data.message || 'Gagal menghapus kelas');
      }
    } catch { }
  };

  const handleUpdateClass = async (id: string) => {
    if (!editClassName.trim()) return;
    try {
      const res = await fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editClassName.trim() }),
      });
      if (res.ok) {
        const updated = await fetch('/api/classes').then(r => r.json());
        setClasses(Array.isArray(updated) ? updated : []);
        setEditingClass(null);
        setEditClassName('');
      }
    } catch { }
  };

  const handleSaveSettings = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          face_accuracy_threshold: threshold,
          institution_name: institutionName,
          campus_lat: campusLat,
          campus_lng: campusLng,
          campus_radius: campusRadius,
        }),
      });
      
      setInitialState({ threshold, institutionName, campusLat, campusLng, campusRadius });
      setIsDirty(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch { } finally { setSaving(false); }
  };

  const getMyLocation = () => {
    setGeoStatus('loading');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setCampusLat(pos.coords.latitude.toFixed(6));
          setCampusLng(pos.coords.longitude.toFixed(6));
          setGeoStatus('valid');
          setTimeout(() => setGeoStatus('idle'), 3000);
        },
        err => {
          if (err.code === 1) setGeoStatus('denied');
          else setGeoStatus('error');
          setTimeout(() => setGeoStatus('idle'), 4000);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoStatus('error');
      setTimeout(() => setGeoStatus('idle'), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 opacity-20">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest">Memuat Konfigurasi...</p>
      </div>
    );
  }

  return (
    <div className="relative animate-fade-in max-w-2xl mx-auto space-y-6 pb-32">
      
      {/* Header Page */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Konfigurasi Sistem</h1>
        <p className="text-xs font-semibold text-slate-500">Pengaturan Parameter Sistem Presensi Mahasiswa UNM</p>
      </div>

      <div className="space-y-6">
        
        {/* Section: Keamanan & Biometrik */}
        <section className="bg-white rounded-[1rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
               <Shield className="w-4 h-4" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-800">Keamanan & Biometrik</h2>
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-end pb-1">
              <label className="text-xs font-semibold text-slate-700">Akurasi AI (%)</label>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{Math.round(parseFloat(threshold) * 100)}%</span>
            </div>
            <input
              type="range" step="0.01" min="0.1" max="0.9" value={threshold} onChange={e => setThreshold(e.target.value)}
              className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] font-medium text-slate-400">
              <span className={parseFloat(threshold) < 0.4 ? 'text-blue-500 font-bold' : ''}>Rendah (Cepat)</span>
              <span className={parseFloat(threshold) >= 0.7 ? 'text-blue-500 font-bold' : ''}>Tinggi (Ketat)</span>
            </div>
            <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-[11px] leading-relaxed text-slate-500">
                <span className="font-bold text-slate-600">Tip:</span> Gunakan akurasi di atas 65% untuk hasil optimal.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Informasi Instansi */}
        <section className="bg-white rounded-[1rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
               <Database className="w-4 h-4" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-800">Informasi Instansi</h2>
          </div>
          <div className="p-4 sm:p-5">
             <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nama Instansi</label>
                <input 
                  type="text" 
                  value={institutionName} 
                  onChange={e => setInstitutionName(e.target.value)} 
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:text-slate-400" 
                  placeholder="Masukkan Nama Instansi..." 
                />
             </div>
          </div>
        </section>

        {/* Section: Geofencing Lokasi */}
        <section className="bg-white rounded-[1rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
               <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-800 flex-1">Geofencing Lokasi</h2>
            {geoStatus === 'valid' && <span className="text-[10px] bg-teal-50 text-teal-600 font-bold px-2 py-1 rounded-md">Valid</span>}
            {geoStatus === 'denied' && <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-1 rounded-md">GPS Off</span>}
            {geoStatus === 'error' && <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-1 rounded-md">Gagal</span>}
          </div>
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-slate-700">Latitude</label>
                 <input type="number" step="any" value={campusLat} onChange={e => setCampusLat(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-medium text-slate-800 focus:border-blue-500 outline-none transition-all" />
               </div>
               <div className="space-y-1.5">
                 <label className="text-xs font-semibold text-slate-700">Longitude</label>
                 <input type="number" step="any" value={campusLng} onChange={e => setCampusLng(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-medium text-slate-800 focus:border-blue-500 outline-none transition-all" />
               </div>
               <div className="space-y-1.5 sm:col-span-2">
                 <label className="text-xs font-semibold text-slate-700">Radius Valid (Meter)</label>
                 <input type="number" min="0" value={campusRadius} onChange={e => setCampusRadius(e.target.value)} className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm font-medium text-slate-800 focus:border-blue-500 outline-none transition-all" />
               </div>
            </div>

            {campusLat && campusLng && (
               <div className="w-full h-40 mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(campusLng)-0.005},${Number(campusLat)-0.005},${Number(campusLng)+0.005},${Number(campusLat)+0.005}&layer=mapnik&marker=${campusLat},${campusLng}`}
                    style={{ border: 'none', filter: 'hue-rotate(10deg) contrast(1.05)' }}
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm text-[9px] font-bold text-slate-600 border border-slate-100 flex items-center gap-1">
                     <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                     {institutionName}
                  </div>
               </div>
            )}
            
            <button 
              type="button" 
              onClick={getMyLocation}
              disabled={geoStatus === 'loading'}
              className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {geoStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <Locate className="w-4 h-4" />}
              {geoStatus === 'loading' ? 'Mendapatkan Lokasi...' : 'Ambil Lokasi Saat Ini'}
            </button>
          </div>
        </section>

        {/* Section: Jadwal & Akademik */}
        <section className="bg-white rounded-[1rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
               <SettingsIcon className="w-4 h-4" />
            </div>
            <h2 className="text-[13px] font-bold text-slate-800">Jadwal & Akademik</h2>
          </div>
          
          <div className="p-4 sm:p-5 space-y-4">
             <Link href="/schedules" className="w-full h-11 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors border border-purple-100">
               Kelola Jadwal & Mata Kuliah
             </Link>
             
             <div className="pt-2">
               <h3 className="text-xs font-semibold text-slate-700 mb-2">Program Studi</h3>
               <form onSubmit={handleCreateClass} className="flex gap-2 mb-3">
                 <input
                   type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)}
                   placeholder="Tambah Prodi Baru..."
                   className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                 />
                 <button type="submit" className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                   <Plus className="w-4 h-4" />
                 </button>
               </form>
               
               <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                 {classes.length === 0 ? (
                   <p className="text-[11px] text-slate-400 text-center py-4">Pustaka Kosong</p>
                 ) : (
                   classes.map(c => (
                     <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group">
                       {editingClass === c.id ? (
                         <div className="flex items-center gap-2 w-full">
                            <input
                              type="text" value={editClassName} onChange={e => setEditClassName(e.target.value)}
                              className="h-8 bg-white border border-slate-200 rounded-md px-2 text-xs flex-1 outline-none"
                            />
                            <button onClick={() => handleUpdateClass(c.id)} className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingClass(null)} className="w-8 h-8 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
                              X
                            </button>
                         </div>
                       ) : (
                         <>
                           <span className="text-[12px] font-semibold text-slate-700">{c.name}</span>
                           <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { setEditingClass(c.id); setEditClassName(c.name); }} className="text-slate-400 hover:text-blue-600">
                               <Edit2 className="w-3.5 h-3.5" />
                             </button>
                             <button onClick={() => handleDeleteClass(c.id)} className="text-slate-400 hover:text-rose-500">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           </div>
                         </>
                       )}
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>
        </section>

        {/* Section: Informasi Sistem (Non-editable) */}
        <section className="bg-blue-50/50 rounded-[1rem] border border-blue-100 p-4 sm:p-5">
           <div className="flex items-center gap-2 mb-3">
             <AlertTriangle className="w-4 h-4 text-blue-600" />
             <h3 className="text-[11px] font-bold text-blue-800 uppercase tracking-widest">Informasi Sistem</h3>
           </div>
           <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <p className="text-[11px] text-blue-900/80 leading-relaxed"><span className="font-bold">Pencahayaan:</span> Pastikan area pemindaian terminal cukup terang dan merata.</p>
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <p className="text-[11px] text-blue-900/80 leading-relaxed"><span className="font-bold">Kamera:</span> Gunakan WebCam / kamera perangkat minimal 720p untuk akurasi tinggi.</p>
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <p className="text-[11px] text-blue-900/80 leading-relaxed"><span className="font-bold">Backup Data:</span> Terapkan backup rutin setiap minggu via manajemen server.</p>
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <p className="text-[11px] text-blue-900/80 leading-relaxed"><span className="font-bold">Instruksi Penggunaan:</span> Edukasikan mahasiswa untuk memposisikan wajah lurus saat memindai.</p>
              </li>
           </ul>
        </section>

      </div>

      {/* Sticky Bottom Action Button */}
      <div className="fixed bottom-[80px] md:bottom-0 left-0 right-0 p-4 md:p-6 bg-white/90 backdrop-blur-md border-t border-slate-100 z-50">
        <div className="max-w-2xl mx-auto">
           <button
             onClick={handleSaveSettings}
             disabled={!isDirty || saving}
             className="w-full h-12 sm:h-14 bg-blue-600 text-white rounded-xl shadow-lg border-2 border-transparent focus:ring-4 focus:ring-blue-100 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
           >
             {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />}
             {saving ? 'MENYIMPAN...' : 'SIMPAN SEMUA PENGATURAN'}
           </button>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-fade-in pointer-events-none">
          <div className="bg-slate-800 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-[11px] font-bold tracking-wide">Pengaturan berhasil diperbarui!</p>
          </div>
        </div>
      )}

    </div>
  );
}
