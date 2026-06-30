'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
   Search, Plus, ScanFace, Pencil, Trash2,
   Users, Filter, GraduationCap, Loader2, Info, CheckCircle2
} from 'lucide-react';

interface Student {
   id: string; name: string; nim: string;
   faceDescriptor: string | null;
   class: { id: string; name: string };
}

export default function StudentsPage() {
   const [students, setStudents] = useState<Student[]>([]);
   const [search, setSearch] = useState('');
   const [loading, setLoading] = useState(true);
   const [modal, setModal] = useState<{ show: boolean; title: string; message: string; type: 'confirm' | 'alert'; onConfirm?: () => void } | null>(null);

   const loadData = async () => {
      try {
         const res = await fetch('/api/students');
         const data = await res.json();
         setStudents(Array.isArray(data) ? data : []);
      } catch { } finally { setLoading(false); }
   };

   useEffect(() => { loadData(); }, []);

   const onDelete = async (id: string) => {
      setModal({
         show: true,
         title: 'Hapus Data',
         message: 'Apakah Anda yakin ingin menghapus data mahasiswa ini?',
         type: 'confirm',
         onConfirm: async () => {
            try {
               await fetch(`/api/students/${id}`, { method: 'DELETE' });
               loadData();
               setModal(null);
            } catch {
               setModal({ show: true, title: 'Gagal', message: 'Gagal menghapus data.', type: 'alert' });
            }
         }
      });
   };

   const filtered = students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) || s.nim.includes(search)
   );

   return (
      <div className="space-y-6 animate-fade-in pb-12 relative">
         <div className="flex items-center justify-between">
            <div className="space-y-1">
               <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] leading-none">Manajemen Data</h3>
               <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Data Mahasiswa</h1>
            </div>
            <Link href="/students/create" className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all">
               <Plus className="w-5 h-5 stroke-[3]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] pt-0.5">Tambah</span>
            </Link>
         </div>

         <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
               type="text" value={search} onChange={e => setSearch(e.target.value)}
               placeholder="Cari NIM atau Nama Mahasiswa..."
               className="w-full h-12 bg-white border border-slate-100 rounded-2xl pl-12 pr-4 text-[13px] font-bold text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
            />
         </div>

         <div className="space-y-3">
            {loading ? (
               Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl h-20 animate-pulse border border-slate-100" />
               ))
            ) : filtered.length === 0 ? (
               <div className="py-20 text-center opacity-20 flex flex-col items-center">
                  <Users className="w-16 h-16 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none">Data Kosong</p>
               </div>
            ) : filtered.map((s) => (
               <div key={s.id} className="bg-white p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between border border-slate-100 rounded-2xl hover:border-blue-400 transition-all group shadow-sm hover:shadow-blue-500/5 gap-4 md:gap-0">
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <p className="text-[14px] md:text-[15px] font-black text-slate-900 uppercase tracking-tight truncate">{s.name}</p>
                        {s.faceDescriptor && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
                     </div>
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1.5 shrink-0">
                           <GraduationCap className="w-3 h-3" />
                           {s.nim}
                        </span>
                        <span className="text-[9px] md:text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none pt-px truncate max-w-full block">
                           {s.class?.name || 'UMUM'}
                        </span>
                     </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 md:ml-4 w-full md:w-auto justify-end border-t border-slate-50 md:border-0 pt-3 md:pt-0">
                     <Link href={`/students/${s.id}/register-face`} className={`flex-1 md:flex-none flex justify-center items-center p-2.5 rounded-xl transition-all ${s.faceDescriptor ? 'text-blue-500 bg-blue-50 border border-blue-100' : 'text-slate-300 bg-white border border-slate-100 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50'}`} title="Scan Wajah">
                        <ScanFace className="w-5 h-5" />
                     </Link>
                     <Link href={`/students/${s.id}/edit`} className="flex-1 md:flex-none flex justify-center items-center p-2.5 rounded-xl text-slate-300 bg-white border border-slate-100 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all" title="Edit Profil">
                        <Pencil className="w-5 h-5" />
                     </Link>
                     <button onClick={() => onDelete(s.id)} className="flex-1 md:flex-none flex justify-center items-center p-2.5 rounded-xl text-slate-200 bg-white border border-slate-100 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all" title="Hapus Data">
                        <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
               </div>
            ))}
         </div>

         <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
               TERDAFTAR: {filtered.length} UNIT DATA
            </p>
         </div>

         {/* Custom Centered Modal */}
         {modal?.show && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-fade-in">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setModal(null)} />
               <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs relative z-10 shadow-2xl flex flex-col items-center text-center border-4 border-white">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl mb-6 ${modal.type === 'confirm' ? 'bg-amber-500 shadow-amber-500/30' : 'bg-rose-500 shadow-rose-500/30'} animate-bounce`}>
                     {modal.type === 'confirm' ? <Users className="w-10 h-10" /> : <Info className="w-10 h-10" />}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{modal.title}</h2>
                  <p className="text-[11px] font-bold text-slate-500 mb-8 uppercase tracking-widest leading-relaxed">
                     {modal.message}
                  </p>
                  <div className="flex gap-3 w-full">
                     {modal.type === 'confirm' && (
                        <button
                           onClick={() => setModal(null)}
                           className="flex-1 h-12 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                        >
                           Batal
                        </button>
                     )}
                     <button
                        onClick={modal.type === 'confirm' ? modal.onConfirm : () => setModal(null)}
                        className={`flex-1 h-12 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${modal.type === 'confirm' ? 'bg-rose-600 shadow-rose-200' : 'bg-slate-900 shadow-slate-200'}`}
                     >
                        {modal.type === 'confirm' ? 'Ya, Hapus' : 'Mengerti'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
