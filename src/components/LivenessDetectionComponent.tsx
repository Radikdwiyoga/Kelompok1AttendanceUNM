'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Eye, Move, Smile } from 'lucide-react';

interface LivenessDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onComplete: (result: any) => void;
  isLoading: boolean;
}

export const LivenessDetectionComponent = ({
  videoRef,
  onComplete,
  isLoading,
}: LivenessDetectionProps) => {
  const [detectionPhase, setDetectionPhase] = useState<
    'idle' | 'checking' | 'blink' | 'nod' | 'complete'
  >('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    'Lakukan gerakan alami untuk verifikasi keaslian'
  );
  const [detectionResults, setDetectionResults] = useState({
    eyeBlink: false,
    headMovement: false,
    mouthMovement: false,
  });

  // Simulate liveness detection progress
  useEffect(() => {
    if (detectionPhase === 'checking') {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setDetectionPhase('complete');
            return 100;
          }
          return prev + Math.random() * 30;
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [detectionPhase]);

  return (
    <div className="space-y-4">
      {/* Detection Status Display */}
      <div
        className={`
        rounded-2xl p-6 border-2 transition-all
        ${
          detectionPhase === 'complete'
            ? 'border-emerald-500/30 bg-emerald-50/50'
            : 'border-blue-500/30 bg-blue-50/50'
        }
      `}
      >
        <div className="flex items-center gap-4">
          <div
            className={`
            w-12 h-12 rounded-full flex items-center justify-center shrink-0
            ${
              detectionPhase === 'complete'
                ? 'bg-emerald-500'
                : 'bg-blue-500 animate-pulse'
            }
          `}
          >
            {detectionPhase === 'complete' ? (
              <CheckCircle2 className="w-6 h-6 text-white" />
            ) : (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider mb-1">
              {detectionPhase === 'complete'
                ? 'Verifikasi Selesai'
                : 'Sedang Verifikasi Keaslian'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {detectionPhase === 'checking' && (
          <div className="mt-4">
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-blue-500 to-blue-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              {Math.round(progress)}% - Terus lakukan gerakan alami
            </p>
          </div>
        )}
      </div>

      {/* Detection Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {/* Eye Blink Detection */}
        <div
          className={`
          p-4 rounded-xl border-2 transition-all text-center
          ${
            detectionResults.eyeBlink
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 bg-slate-50'
          }
        `}
        >
          <Eye
            className={`w-6 h-6 mx-auto mb-2 ${
              detectionResults.eyeBlink ? 'text-emerald-600' : 'text-slate-400'
            }`}
          />
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Kedipan
          </p>
          <p
            className={`text-xs font-bold mt-1 ${
              detectionResults.eyeBlink ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {detectionResults.eyeBlink ? '✓ Terdeteksi' : 'Menunggu...'}
          </p>
        </div>

        {/* Head Movement Detection */}
        <div
          className={`
          p-4 rounded-xl border-2 transition-all text-center
          ${
            detectionResults.headMovement
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 bg-slate-50'
          }
        `}
        >
          <Move
            className={`w-6 h-6 mx-auto mb-2 ${
              detectionResults.headMovement
                ? 'text-emerald-600'
                : 'text-slate-400'
            }`}
          />
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Gerakan Kepala
          </p>
          <p
            className={`text-xs font-bold mt-1 ${
              detectionResults.headMovement ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {detectionResults.headMovement ? '✓ Terdeteksi' : 'Menunggu...'}
          </p>
        </div>

        {/* Mouth Movement Detection */}
        <div
          className={`
          p-4 rounded-xl border-2 transition-all text-center
          ${
            detectionResults.mouthMovement
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-slate-200 bg-slate-50'
          }
        `}
        >
          <Smile
            className={`w-6 h-6 mx-auto mb-2 ${
              detectionResults.mouthMovement
                ? 'text-emerald-600'
                : 'text-slate-400'
            }`}
          />
          <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Gerakan Mulut
          </p>
          <p
            className={`text-xs font-bold mt-1 ${
              detectionResults.mouthMovement ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {detectionResults.mouthMovement ? '✓ Terdeteksi' : 'Opsional'}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 space-y-1">
          <p className="font-bold">Panduan Liveness Detection:</p>
          <ul className="text-xs space-y-1 ml-2">
            <li>• Posisikan wajah di dalam bingkai dengan cahaya cukup</li>
            <li>• Lakukan gerakan alami (berkedip, gerakkan kepala)</li>
            <li>• Jangan gunakan foto atau video rekaman</li>
            <li>• Sistem akan mendeteksi dalam 5 detik</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Minimal Live Indicator Component
export const LiveIndicator = ({
  isLive,
  score,
}: {
  isLive: boolean;
  score: number;
}) => {
  return (
    <div
      className={`
      absolute bottom-4 left-4 px-3 py-2 rounded-full text-xs font-bold 
      flex items-center gap-2
      ${
        isLive
          ? 'bg-emerald-500/90 text-white'
          : 'bg-rose-500/90 text-white'
      }
      backdrop-blur-sm
    `}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isLive ? 'bg-white animate-pulse' : 'bg-white'
        }`}
      />
      <span className="uppercase tracking-widest">
        {isLive ? 'LIVE' : 'FAKE'} ({Math.round(score * 100)}%)
      </span>
    </div>
  );
};

// Liveness Check Instructions Panel
export const LivenessInstructions = () => {
  return (
    <div className="bg-linear-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          1
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">
            Persiapkan Wajah Anda
          </h4>
          <p className="text-xs text-slate-600 mt-1">
            Pastikan wajah terlihat jelas di layar dengan pencahayaan yang
            cukup.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          2
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">
            Lakukan Gerakan Alami
          </h4>
          <p className="text-xs text-slate-600 mt-1">
            Berkedip beberapa kali, gerakkan kepala ke kiri-kanan, atau tersenyum.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          3
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">
            Tunggu Verifikasi Selesai
          </h4>
          <p className="text-xs text-slate-600 mt-1">
            Sistem akan menganalisis gerakan Anda dan memberi hasil dalam beberapa detik.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
        <p className="text-xs font-bold text-amber-900">
          ⚠️ Tip: Jangan menggunakan foto, video, atau menyembunyikan wajah.
          Sistem akan mendeteksi dan menolak keaslian Anda.
        </p>
      </div>
    </div>
  );
};
