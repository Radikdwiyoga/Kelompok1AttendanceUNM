'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Loader2,
  Target, VideoOff, Zap, Info
} from 'lucide-react';

// Same shared cache as attendance page - if user visited attendance first, models are instant
let faceApiCache: any = null;
let modelLoadPromise: Promise<any> | null = null;

async function loadFaceApi() {
  if (faceApiCache) return faceApiCache;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      const faceapi = await import('@vladmandic/face-api');

      // Load all necessary models in parallel
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);

      faceApiCache = faceapi;
      return faceapi;
    } catch (err) {
      modelLoadPromise = null; // Clear promise so retry is possible
      throw err;
    }
  })();

  return modelLoadPromise;
}

export default function RegisterFacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [student, setStudent] = useState<any>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('Memuat sistem...');
  const [modal, setModal] = useState<{ show: boolean; title: string; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/students/${id}`).then(r => r.json()).then(setStudent).catch(console.error);

    const init = async () => {
      try {
        // Camera first - don't wait for models
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 240 }
          }
        });
        if (active && videoRef.current) videoRef.current.srcObject = stream;

        setLoadingMsg(faceApiCache ? 'Menyiapkan...' : 'Memuat model AI...');
        await loadFaceApi();
        if (active) {
          setIsApiLoaded(true);
          setLoadingMsg('');
        }
      } catch (err) {
        if (active) setCameraError('Gagal akses kamera atau model AI.');
      }
    };
    init();
    return () => {
      active = false;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [id]);

  const captureSample = useCallback(async () => {
    if (!videoRef.current || !isApiLoaded || isCapturing || samples.length >= 3) return;
    if (videoRef.current.readyState < 2) return;
    setIsCapturing(true);

    try {
      const faceapi = faceApiCache;

      // Fast options: inputSize 128 for max speed, low threshold for bad cameras
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 128,
        scoreThreshold: 0.15
      });

      const detection = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks(true)  // use tiny landmark model for extreme speed
        .withFaceDescriptor();

      if (detection) {
        setSamples(prev => [...prev, Array.from(detection.descriptor)]);
      } else {
        // Don't use alert - use state instead  
        setSamples(prev => prev); // trigger re-render for visual feedback
        setModal({ show: true, title: 'Wajah Tidak Terdeteksi', message: 'Pastikan wajah berada di dalam bingkai dan pencahayaan cukup.' });
      }
    } catch {
      setModal({ show: true, title: 'Gagal', message: 'Terjadi kesalahan saat mengambil sampel biometrik.' });
    } finally {
      setIsCapturing(false);
    }
  }, [isApiLoaded, isCapturing, samples.length]);

  const saveDescriptor = async () => {
    if (samples.length < 3) return;
    setIsCapturing(true);
    try {
      // Average all 3 samples for a better descriptor quality
      const averaged = samples[0].map((_: any, i: number) =>
        samples.reduce((acc, curr) => acc + curr[i], 0) / samples.length
      );
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceDescriptor: JSON.stringify(averaged) }),
      });
      if (res.ok) router.push('/students');
      else setModal({ show: true, title: 'Gagal Simpan', message: 'Sistem gagal menyimpan data wajah ke database.' });
    } catch {
      setModal({ show: true, title: 'Kesalahan Koneksi', message: 'Terputus dari server saat mencoba menyimpan data.' });
    } finally {
      setIsCapturing(false);
    }
  };

  // Keyboard shortcut: Space to capture
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isApiLoaded && !isCapturing && samples.length < 3) {
        e.preventDefault();
        captureSample();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [captureSample, isApiLoaded, isCapturing, samples.length]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <Link href="/students" className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:shadow-md transition-all active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Registrasi Wajah</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 leading-none">Biometrik Mahasiswa UNM</p>
        </div>
      </div>

      <div className="academic-card space-y-6">
        {/* Student Info */}
        <div className="text-center py-3 bg-slate-50/50 rounded-2xl border border-slate-100">
          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{student?.name || '...'}</p>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">NIM: {student?.nim || '...'}</p>
        </div>

        {/* Camera View */}
        <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-900 border-4 border-slate-50 shadow-inner">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <VideoOff className="w-12 h-12 text-slate-700 mb-4" />
              <p className="text-xs font-black text-slate-500 uppercase">{cameraError}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          )}

          {/* Face guide overlay */}
          <div className="absolute inset-0 p-8 flex flex-col items-center justify-center pointer-events-none">
            <div className={`w-full h-full rounded-full border-2 transition-colors ${samples.length >= 3 ? 'border-blue-400/60' : 'border-white/20'}`} />
          </div>

          {/* Loading overlay */}
          {!isApiLoaded && !cameraError && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">{loadingMsg}</p>
            </div>
          )}

          {/* Capture flash feedback */}
          {isCapturing && (
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          )}

          {/* Sample count badge */}
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl">
            <span className="text-xs font-black text-white tabular-nums">{samples.length}<span className="opacity-40">/3</span></span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className={`flex-1 h-2 rounded-full transition-all duration-500 ${samples.length > idx
                ? 'bg-blue-600 shadow-sm shadow-blue-200'
                : 'bg-slate-100'
                }`} />
            ))}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
            {samples.length === 0 ? 'Ambil 3 sampel wajah dari sudut berbeda' :
              samples.length === 1 ? 'Bagus! Miringkan kepala sedikit ke kiri' :
                samples.length === 2 ? 'Hampir selesai! Miringkan ke kanan' :
                  '✓ Semua sampel terkumpul - siap disimpan'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={captureSample}
            disabled={!isApiLoaded || isCapturing || samples.length >= 3 || !!cameraError}
            className="academic-btn academic-btn-primary flex-1 h-14 text-xs font-black tracking-widest uppercase rounded-2xl shadow-lg shadow-blue-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {isCapturing ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" />Memproses...</>
            ) : (
              <><Target className="w-5 h-5 mr-2" />Ambil Sampel</>
            )}
          </button>
          {samples.length === 3 && (
            <button
              onClick={saveDescriptor}
              disabled={isCapturing}
              className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Simpan Data
            </button>
          )}
        </div>
      </div>

      <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none mb-2">Tips Registrasi</h4>
          <p className="text-[12px] text-blue-900/70 font-bold leading-relaxed tracking-tight">
            Pastikan pencahayaan cukup. Tekan <span className="text-blue-600">Space</span> untuk mengambil sampel dengan cepat. Ambil dari posisi depan, kiri, dan kanan.
          </p>
        </div>
      </div>

      {/* Custom Centered Modal */}
      {modal?.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setModal(null)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xs relative z-10 shadow-2xl flex flex-col items-center text-center border-4 border-white">
            <div className="w-20 h-20 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-xl mb-6 shadow-rose-500/30 animate-bounce">
              <Info className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{modal.title}</h2>
            <p className="text-[11px] font-bold text-slate-500 mb-8 uppercase tracking-widest leading-relaxed">
              {modal.message}
            </p>
            <button
              onClick={() => setModal(null)}
              className="w-full h-12 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              Selesaikan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
