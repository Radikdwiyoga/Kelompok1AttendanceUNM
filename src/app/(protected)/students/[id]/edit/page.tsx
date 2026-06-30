'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditStudentPage() {
  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classList, setClassList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch(`/api/students/${id}`).then(r => r.json()),
      fetch('/api/classes').then(r => r.json())
    ]).then(([student, classes]) => {
      if (student) {
        setName(student.name);
        setNim(student.nim);
        setSelectedClass(student.classId?.toString() || '');
      }
      setClassList(Array.isArray(classes) ? classes : []);
    }).catch(() => {
      setErrorMessage('Gagal muat data.');
    }).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nim: nim.trim(),
          classId: selectedClass,
          ...(password.trim() && { password: password.trim() }),
        }),
      });
      if (res.ok) {
        router.push('/students');
      } else {
        const result = await res.json();
        setErrorMessage(result.message || 'Gagal update.');
      }
    } catch {
      setErrorMessage('Kesalahan sistem.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-blue-600">
      <Loader2 className="w-10 h-10 animate-spin opacity-40" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <Link href="/students" className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] leading-none mb-1.5">Manajemen Profil</h3>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Edit Mahasiswa</h1>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Lengkap</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Masukkan Nama Lengkap..." className="w-full h-12 bg-slate-50 border-none rounded-xl px-5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">NIM (Nomor Induk)</label>
                <input required type="text" value={nim} onChange={e => setNim(e.target.value)} placeholder="Masukkan NIM..." className="w-full h-12 bg-slate-50 border-none rounded-xl px-5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono tracking-widest" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ubah Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Kosongkan jika tidak ingin diubah..." className="w-full h-12 bg-slate-50 border-none rounded-xl px-5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono tracking-widest" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pilih Kelas</label>
                <div className="relative">
                  <select required value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full h-12 bg-slate-50 border-none rounded-xl px-5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none">
                    <option value="">— Pilih Kelas —</option>
                    {classList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl text-center border border-rose-100">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-slate-50">
            <Link href="/students" className="flex-1 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-100 hover:text-slate-600 transition-all">
              Batal
            </Link>
            <button type="submit" disabled={isSaving} className="flex-[2] h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/10 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Simpan Perubahan</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

