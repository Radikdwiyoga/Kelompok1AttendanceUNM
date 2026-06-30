'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, Edit2, Trash2, Clock, CheckCircle2,
  X, Loader2, BookOpen, AlertCircle, ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

const DAYS = [
  { id: 1, name: 'Senin' },
  { id: 2, name: 'Selasa' },
  { id: 3, name: 'Rabu' },
  { id: 4, name: 'Kamis' },
  { id: 5, name: 'Jumat' },
  { id: 6, name: 'Sabtu' },
  { id: 7, name: 'Minggu' },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    subjectName: '',
    classId: '',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '10:00'
  });

  const [activeDay, setActiveDay] = useState<number>(1);

  useEffect(() => {
    fetchData();
    fetchClasses();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedules');
      setSchedules(await res.json() || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      setClasses(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, classId: data[0].id }));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      subjectName: '',
      classId: classes[0]?.id || '',
      dayOfWeek: activeDay,
      startTime: '08:00',
      endTime: '10:00'
    });
  };

  const handleOpenModal = (sched?: any) => {
    if (sched) {
      setFormData({
        id: sched.id,
        subjectName: sched.subjectName,
        classId: sched.classId,
        dayOfWeek: sched.dayOfWeek,
        startTime: sched.startTime,
        endTime: sched.endTime
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subjectName || !formData.classId || !formData.startTime || !formData.endTime) return;
    
    setSaving(true);
    try {
      const url = formData.id ? `/api/schedules/${formData.id}` : '/api/schedules';
      const method = formData.id ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        await fetchData();
        setShowModal(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah anda yakin ingin menghapus jadwal ini?')) return;
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      await fetchData();
    } catch (error) {
      console.error(error);
    }
  };
  
  const schedulesByDay = schedules.filter(s => s.dayOfWeek === activeDay);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
        <Link href="/settings" className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
           <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">Pengaturan Jadwal</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 leading-none">Manajemen Matkul Berdasarkan Hari</p>
        </div>
      </div>

      {/* Tabs Hari */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
        {DAYS.map(day => (
           <button 
             key={day.id} 
             onClick={() => setActiveDay(day.id)}
             className={`px-4 py-2 mt-2 whitespace-nowrap rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeDay === day.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
           >
              {day.name}
           </button>
        ))}
      </div>

      {/* Konten Jadwal per Hari */}
      <div className="academic-card p-4 md:p-6 space-y-4">
         <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
               Jadwal Hari {DAYS.find(d => d.id === activeDay)?.name}
            </h2>
            <button 
              onClick={() => handleOpenModal()} 
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-colors flex items-center gap-2"
            >
               <Plus className="w-4 h-4" /> TAMBAH
            </button>
         </div>

         {loading ? (
            <div className="flex justify-center py-10 opacity-50">
               <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
         ) : schedulesByDay.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-100 rounded-3xl opacity-40">
               <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-slate-400" />
               </div>
               <p className="text-xs font-black uppercase tracking-widest mb-1">Belum Ada Jadwal</p>
               <p className="text-[10px] font-bold tracking-widest">Silahkan tambahkan matkul untuk hari ini.</p>
            </div>
         ) : (
            <div className="grid gap-3">
               {schedulesByDay.map(sched => (
                  <div key={sched.id} className="p-4 bg-white border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl hover:border-indigo-200 transition-all group shadow-sm hover:shadow-md">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 flex flex-col items-center justify-center rounded-[1rem] text-indigo-600 border border-indigo-100 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                           <Clock className="w-4 h-4 mb-0.5" />
                        </div>
                        <div>
                           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                              {sched.subjectName}
                           </h3>
                           <p className="text-[10px] font-extrabold text-slate-400 mt-1 uppercase tracking-widest">
                              {sched.class?.name || '-'} • {sched.startTime} - {sched.endTime} WIB
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button onClick={() => handleOpenModal(sched)} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                           <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(sched.id)} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 flex flex-col items-center justify-center z-[200] p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 md:p-6 border-b border-slate-50 flex items-center justify-between bg-white relative z-10 shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl">
                     <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                     <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
                        {formData.id ? 'Edit Jadwal' : 'Tambah Jadwal'}
                     </h2>
                     <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest px-1">
                        Formulir Matkul & Sesi
                     </p>
                  </div>
               </div>
               <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
               </button>
            </div>

            <div className="p-6 overflow-y-auto w-full academic-scrollbar space-y-5">
               <form id="schedule-form" onSubmit={handleSave} className="space-y-4">
                  
                  <div className="space-y-2">
                     <label className="label">Nama Mata Kuliah</label>
                     <input 
                        type="text" required 
                        value={formData.subjectName} 
                        onChange={e => setFormData({ ...formData, subjectName: e.target.value })}
                        className="academic-input w-full h-12 text-sm !px-4"
                        placeholder="Contoh: Rekayasa Perangkat Lunak"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="label">Kelas / Program Studi</label>
                     <select 
                        required 
                        value={formData.classId} 
                        onChange={e => setFormData({ ...formData, classId: e.target.value })}
                        className="academic-input w-full h-12 text-sm !px-4 appearance-none font-bold"
                     >
                        {classes.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="label">Hari</label>
                     <select 
                        required 
                        value={formData.dayOfWeek} 
                        onChange={e => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                        className="academic-input w-full h-12 text-sm !px-4 appearance-none font-bold"
                     >
                        {DAYS.map(d => (
                           <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="label">Jam Mulai</label>
                        <input 
                           type="time" required 
                           value={formData.startTime} 
                           onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                           className="academic-input w-full h-12 text-sm !px-4 font-bold"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="label">Jam Selesai</label>
                        <input 
                           type="time" required 
                           value={formData.endTime} 
                           onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                           className="academic-input w-full h-12 text-sm !px-4 font-bold"
                        />
                     </div>
                  </div>

               </form>
            </div>

            <div className="p-5 md:p-6 bg-slate-50 border-t border-slate-100 shrink-0">
               <button 
                  type="submit" form="schedule-form" disabled={saving}
                  className="w-full h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 gap-2"
               >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> SIMPAN JADWAL</>}
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
