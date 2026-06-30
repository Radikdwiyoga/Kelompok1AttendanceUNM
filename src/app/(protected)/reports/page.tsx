'use client';

import React, { useState, useEffect } from 'react';
import {
   FileBarChart, Search, Calendar, Download,
   Clock, FileText, Info, Loader2, Filter
} from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceRecord {
   id: string; student: { name: string; nim: string; class?: { name: string } };
   date: string; time: string; status: string; type: 'IN' | 'OUT'; confidenceScore: number;
}

export default function ReportsPage() {
   const [data, setData] = useState<AttendanceRecord[]>([]);
   const [search, setSearch] = useState('');
   const [monthFilter, setMonthFilter] = useState(() => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
   });
   const [loading, setLoading] = useState(true);

   const fetchData = async () => {
      setLoading(true);
      try {
         const res = await fetch(`/api/attendance?month=${monthFilter}`);
         const result = await res.json();
         let parsed = Array.isArray(result) ? result : [];
         // Sort by class name, then by student name
         parsed.sort((a, b) => {
            const classA = a.student.class?.name || 'Z';
            const classB = b.student.class?.name || 'Z';
            if (classA < classB) return -1;
            if (classA > classB) return 1;
            if (a.student.name < b.student.name) return -1;
            if (a.student.name > b.student.name) return 1;
            return 0;
         });
         setData(parsed);
      } catch { } finally { setLoading(false); }
   };

   useEffect(() => { fetchData(); }, [monthFilter]);

   const filteredData = data.filter(record =>
      record.student.name.toLowerCase().includes(search.toLowerCase()) ||
      record.student.nim.includes(search)
   );

   const handleExportExcel = async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rekapitulasi');

      worksheet.columns = [
         { header: 'NAMA MAHASISWA', key: 'name', width: 35 },
         { header: 'NIM', key: 'nim', width: 20 },
         { header: 'KELAS', key: 'class', width: 25 },
         { header: 'TANGGAL', key: 'date', width: 15 },
         { header: 'WAKTU', key: 'time', width: 15 },
         { header: 'TIPE', key: 'type', width: 12 },
         { header: 'STATUS', key: 'status', width: 15 },
         { header: 'AKURASI', key: 'accuracy', width: 12 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      filteredData.forEach(r => {
         worksheet.addRow({
            name: r.student.name.toUpperCase(),
            nim: r.student.nim,
            class: r.student.class?.name || 'UMUM',
            date: new Date(r.date).toLocaleDateString('id-ID'),
            time: new Date(r.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            type: r.type === 'IN' ? 'MASUK' : 'PULANG',
            status: r.status.toUpperCase(),
            accuracy: (r.confidenceScore * 100).toFixed(0) + '%'
         });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan-Presensi-${monthFilter}.xlsx`;
      link.click();
   };

   const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('LAPORAN KEHADIRAN MAHASISWA', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 28);
      doc.text(`Periode: ${monthFilter}`, 14, 34);

      const tableRows = filteredData.map(r => [
         r.student.name.toUpperCase(),
         r.student.nim,
         r.student.class?.name || '-',
         new Date(r.date).toLocaleDateString('id-ID'),
         new Date(r.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
         r.type === 'IN' ? 'MASUK' : 'PULANG',
         r.status.toUpperCase(),
      ]);

      autoTable(doc, {
         startY: 42,
         head: [['NAMA MAHASISWA', 'NIM', 'KELAS', 'TANGGAL', 'WAKTU', 'TIPE', 'STATUS']],
         body: tableRows,
         theme: 'grid',
         headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
         columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 20 },
            2: { cellWidth: 25 },
         },
         bodyStyles: { fontSize: 7 }
      });

      doc.save(`Laporan-Presensi-UNM-${monthFilter}.pdf`);
   };


   return (
      <div className="space-y-6 animate-fade-in pb-12">
         <div className="flex items-center justify-between">
            <div className="space-y-1.5 pt-4">
               <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">Laporan Presensi</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Data Presensi Mahasiswa UNM</p>
            </div>
            <div className="flex gap-3">
               <button onClick={handleExportExcel} className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm active:scale-95 transition-all" title="Export Excel">
                  <Download className="w-6 h-6" />
               </button>
               <button onClick={handleExportPDF} className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm active:scale-95 transition-all" title="Export PDF">
                  <FileText className="w-6 h-6" />
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
               <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
               <input
                  type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
                  className="academic-input !pl-14 !h-14 !text-sm !font-black !rounded-2xl w-full"
               />
            </div>
            <div className="relative">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
               <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Pencarian Mahasiswa..."
                  className="academic-input !pl-14 !h-14 !text-sm !font-black !rounded-2xl"
               />
            </div>
         </div>

         <div className="flex items-center gap-4">
            <div className="flex-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Hadir</p>
               <p className="text-2xl font-black text-blue-600 tabular-nums leading-none">{filteredData.filter((x: AttendanceRecord) => x.status === 'hadir').length}</p>
            </div>
            <div className="flex-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Terlambat</p>
               <p className="text-2xl font-black text-amber-500 tabular-nums leading-none">{filteredData.filter((x: AttendanceRecord) => x.status === 'terlambat').length}</p>
            </div>
         </div>

         <div className="space-y-4">
            {loading ? (
               Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-50 rounded-2xl h-16 animate-pulse" />
               ))
            ) : filteredData.length === 0 ? (
               <div className="py-24 text-center opacity-10 flex flex-col items-center">
                  <FileBarChart className="w-16 h-16 mb-2 text-blue-600" />
                  <p className="text-xs font-black uppercase tracking-widest leading-none">Laporan Tidak Ditemukan</p>
               </div>
            ) : filteredData.map((r: AttendanceRecord) => (
               <div key={r.id} className="bg-white p-5 rounded-[1.75rem] flex items-center justify-between border border-slate-100 shadow-sm hover:border-blue-200 transition-all hover:shadow-md animate-fade-in group">
                  <div className="flex items-center gap-4 min-w-0">
                     <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Clock className="w-6 h-6" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-[14px] font-black text-slate-900 truncate uppercase tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{r.student.name}</p>
                        <p className="text-[10px] text-slate-400 font-extrabold mt-2 uppercase tracking-widest leading-none">
                           {new Date(r.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB • {r.student.nim} • {r.type === 'IN' ? 'MASUK' : 'PULANG'}
                        </p>
                     </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest ${r.status === 'hadir' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                     {r.status}
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

