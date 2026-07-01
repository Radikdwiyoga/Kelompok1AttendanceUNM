'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2, AlertCircle, Loader2, Scan,
  Target, VideoOff, ShieldCheck, Zap, Info, Eye, Move, Smile
} from 'lucide-react';
import { LivenessDetectionComponent, LiveIndicator, LivenessInstructions } from '@/components/LivenessDetectionComponent';

interface RecognitionResult {
  name: string;
  status: string;
  confidence: number;
  time?: string;
  message?: string;
  alreadyAttended?: boolean;
  isWarning?: boolean;
  livenessScore?: number;
  livenessResult?: any;
}

// Module-level cache so models load only ONCE per session across navigations
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
      modelLoadPromise = null;
      throw err;
    }
  })();

  return modelLoadPromise;
}

// Load liveness service
async function loadLivenessService() {
  return import('@/services/livenessService').then(m => m.LivenessService);
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Anti-fake GPS detection (Tingkat 1 & 2)
interface GpsPoint { lat: number; lng: number; accuracy: number; timestamp: number; }

function detectFakeGps(
  current: GpsPoint,
  history: GpsPoint[]
): { isSuspicious: boolean; reason: string | null } {

  // Tingkat 1a: Akurasi terlalu buruk (> 500m biasanya bukan GPS hardware asli)
  if (current.accuracy > 500) {
    return {
      isSuspicious: true,
      reason: `Akurasi GPS terlalu rendah (${Math.round(current.accuracy)}m). Pastikan GPS aktif dan sinyal baik.`,
    };
  }

  // Tingkat 1b: Akurasi terlalu sempurna secara konsisten (< 3m selalu = mencurigakan)
  if (history.length >= 4) {
    const recentAccuracies = [...history.slice(-4), current].map(p => p.accuracy);
    const allTooAccurate = recentAccuracies.every(a => a < 3);
    if (allTooAccurate) {
      return {
        isSuspicious: true,
        reason: 'Sinyal GPS terlalu sempurna dan tidak berfluktuasi. Terindikasi lokasi palsu.',
      };
    }
  }

  // Tingkat 2: Cek kecepatan perpindahan tidak wajar
  if (history.length >= 1) {
    const prev = history[history.length - 1];
    const distanceM = getDistanceFromLatLonInM(prev.lat, prev.lng, current.lat, current.lng);
    const timeDiffSec = (current.timestamp - prev.timestamp) / 1000;

    if (timeDiffSec > 0 && timeDiffSec < 300) { // hanya cek dalam 5 menit terakhir
      const speedKmh = (distanceM / 1000) / (timeDiffSec / 3600);

      // Kecepatan > 300 km/jam tidak mungkin untuk absen kampus
      if (speedKmh > 300) {
        return {
          isSuspicious: true,
          reason: `Lokasi berpindah ${Math.round(distanceM / 1000)}km dalam ${Math.round(timeDiffSec)} detik. Terindikasi lokasi palsu.`,
        };
      }

      // Loncat > 50km dalam < 60 detik
      if (distanceM > 50000 && timeDiffSec < 60) {
        return {
          isSuspicious: true,
          reason: `Lokasi berpindah ${Math.round(distanceM / 1000)}km secara tiba-tiba. Terindikasi lokasi palsu.`,
        };
      }
    }
  }

  return { isSuspicious: false, reason: null };
}

export default function AttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLivenessChecking, setIsLivenessChecking] = useState(false);
  const [livenessResult, setLivenessResult] = useState<any>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [descriptors, setDescriptors] = useState<any[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('Memuat model AI...');
  const [accuracyThreshold, setAccuracyThreshold] = useState(0.65);
  const [attendanceMode, setAttendanceMode] = useState<'IN' | 'OUT'>('IN');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locationPhase, setLocationPhase] = useState<'checking' | 'valid' | 'out_of_bounds' | 'denied' | 'no_gps'>('checking');
  const [campusSettings, setCampusSettings] = useState<{ lat: number, lng: number, rad: number, name: string } | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'camera'>('map');
  const [showOutOfBoundsConfirm, setShowOutOfBoundsConfirm] = useState(false);
  const [enableLivenessCheck, setEnableLivenessCheck] = useState(true);
  const [streamAnalysis, setStreamAnalysis] = useState<any>(null);
  const [fakeGpsWarning, setFakeGpsWarning] = useState<string | null>(null);
  const [gpsHistory, setGpsHistory] = useState<Array<{ lat: number, lng: number, accuracy: number, timestamp: number }>>([]);
  const cleanupStreamRef = useRef<(() => void) | null>(null);

  // Load settings and initialize
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        if (s.face_accuracy_threshold) setAccuracyThreshold(parseFloat(s.face_accuracy_threshold));
        if (s.attendance_mode) setAttendanceMode(s.attendance_mode as any);
        if (s.campus_lat && s.campus_lng && s.campus_radius) {
          setCampusSettings({
            lat: parseFloat(s.campus_lat),
            lng: parseFloat(s.campus_lng),
            rad: parseInt(s.campus_radius),
            name: s.institution_name || 'Lokasi Kampus'
          });
        }
        if (s.liveness_check_enabled !== undefined) {
          setEnableLivenessCheck(s.liveness_check_enabled === 'true' || s.liveness_check_enabled === true);
        }
        setSettingsLoaded(true);
      })
      .catch(err => {
        console.error(err);
        setSettingsLoaded(true);
      });

    if (!('geolocation' in navigator)) {
      setLocationPhase('no_gps');
      return;
    }

    const handleGpsSuccess = (pos: GeolocationPosition) => {
      setLocationDenied(false);
      const newPoint: GpsPoint = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };

      setGpsHistory(prev => {
        // Jalankan deteksi fake GPS
        const { isSuspicious, reason } = detectFakeGps(newPoint, prev);
        if (isSuspicious) {
          setFakeGpsWarning(reason);
        } else {
          setFakeGpsWarning(null);
        }
        // Simpan max 10 titik terakhir
        return [...prev.slice(-9), newPoint];
      });

      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };

    const handleGpsError = (err: GeolocationPositionError) => {
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        setLocationDenied(true);
        setLocationPhase('denied');
      } else {
        setLocationPhase('no_gps');
      }
    };

    navigator.geolocation.getCurrentPosition(handleGpsSuccess, handleGpsError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    const watchId = navigator.geolocation.watchPosition(handleGpsSuccess, handleGpsError, {
      enableHighAccuracy: true,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;

    if (locationDenied) {
      setLocationPhase('denied');
    } else if (userLocation && campusSettings) {
      const dist = getDistanceFromLatLonInM(userLocation.lat, userLocation.lng, campusSettings.lat, campusSettings.lng);
      setCurrentDistance(dist);
      setLocationPhase(dist <= campusSettings.rad ? 'valid' : 'out_of_bounds');
    } else if (userLocation && !campusSettings) {
      setLocationPhase('valid');
    }
  }, [userLocation, locationDenied, campusSettings, settingsLoaded]);

  // Initialize camera and load models
  useEffect(() => {
    if (viewMode !== 'camera') return;
    let active = true;

    const init = async () => {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'user',
              width: { ideal: 320 },
              height: { ideal: 240 }
            }
          });
          if (active && videoRef.current) videoRef.current.srcObject = stream;
        } else {
          setCameraError('Kamera tidak didukung di perangkat ini.');
          return;
        }

        setLoadingMsg(faceApiCache ? 'Menyiapkan descriptor...' : 'Memuat model AI...');
        const faceapi = await loadFaceApi();
        if (!active) return;

        setLoadingMsg('Memuat data wajah...');
        const res = await fetch('/api/students?fields=id,name,faceDescriptor');
        const students = await res.json();
        const sl = Array.isArray(students) ? students : [];
        const labeledDescriptors = sl
          .filter((s: any) => s.faceDescriptor)
          .map((s: any) => {
            const desc = new Float32Array(JSON.parse(s.faceDescriptor));
            return new faceapi.LabeledFaceDescriptors(JSON.stringify({ id: s.id, name: s.name }), [desc]);
          });

        if (active) {
          setDescriptors(labeledDescriptors);
          setIsApiLoaded(true);

          if (enableLivenessCheck && videoRef.current) {
            const faceService = await import('@/services/faceService').then(m => m.FaceService);
            const cleanup = await faceService.getStreamAnalysis(
              videoRef.current,
              (analysis: any) => {
                if (active) setStreamAnalysis(analysis);
              },
              100
            );
            cleanupStreamRef.current = cleanup;
          }
        }
      } catch (err: any) {
        if (active) setCameraError('Gagal memuat kamera atau model AI.');
      }
    };

    init();

    return () => {
      active = false;
      if (cleanupStreamRef.current) {
        cleanupStreamRef.current();
      }
    };
  }, [viewMode, enableLivenessCheck]);

  // Main scan handler with liveness check
  const handleScan = useCallback(
    async (autoTrigger: boolean = false) => {
      if (!videoRef.current || !faceApiCache) return;

      setIsScanning(true);
      setResult(null);

      // Cek fake GPS sebelum mulai scan
      if (fakeGpsWarning) {
        setIsScanning(false);
        setResult({
          name: 'Terdeteksi Lokasi Palsu',
          status: 'Gagal',
          confidence: 0,
          message: `⚠️ ${fakeGpsWarning} Matikan aplikasi fake GPS dan coba lagi.`,
          isWarning: true,
        });
        return;
      }

      try {
        if (enableLivenessCheck) {
          setIsLivenessChecking(true);
          const LivenessService = await loadLivenessService();
          const livenessCheck = await LivenessService.performQuickLivenessCheck(videoRef.current);
          setLivenessResult(livenessCheck);

          if (!livenessCheck.isLive) {
            setIsScanning(false);
            setIsLivenessChecking(false);
            setResult({
              name: 'Gagal Verifikasi',
              status: 'Gagal',
              confidence: livenessCheck.score,
              message: livenessCheck.message || 'Wajah tidak terdeteksi sebagai manusia asli. Silakan lakukan gerakan alami.',
              isWarning: true,
            });
            return;
          }
        }

        setIsLivenessChecking(false);

        const faceapi = await loadFaceApi();
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection || !detection.descriptor) {
          setIsScanning(false);
          setResult({
            name: 'Tidak Terdeteksi',
            status: 'Gagal',
            confidence: 0,
            message: 'Wajah tidak terdeteksi. Pastikan wajah Anda terlihat jelas di layar.',
            isWarning: true,
          });
          return;
        }

        const faceMatcher = new faceapi.FaceMatcher(descriptors, 0.6);
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

        if (bestMatch.distance > accuracyThreshold) {
          setIsScanning(false);
          setResult({
            name: 'Tidak Dikenali',
            status: 'Gagal',
            confidence: Math.max(0, 1 - bestMatch.distance),
            message: 'Wajah tidak dikenali dalam database. Silakan daftarkan wajah Anda terlebih dahulu.',
            isWarning: true,
          });
          return;
        }

        const labelData = JSON.parse(bestMatch.label);

        // Only hard-block when GPS itself isn't readable (denied/no_gps/still checking).
        // 'out_of_bounds' is allowed through — the user already confirmed via the
        // out-of-area dialog, and the server still records locationStatus for audit.
        if (locationPhase === 'denied' || locationPhase === 'no_gps' || locationPhase === 'checking') {
          setIsScanning(false);
          setResult({
            name: labelData.name,
            status: 'Gagal',
            confidence: Math.max(0, 1 - bestMatch.distance),
            message: locationPhase === 'denied'
              ? 'Akses lokasi (GPS) ditolak. Aktifkan izin lokasi untuk melakukan absen.'
              : locationPhase === 'no_gps'
                ? 'GPS tidak aktif atau tidak tersedia. Aktifkan GPS untuk melakukan absen.'
                : 'Lokasi masih dideteksi. Silakan tunggu sebentar lalu coba lagi.',
            isWarning: true,
          });
          return;
        }

        const attendanceRes = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: labelData.id,
            type: attendanceMode,
            confidence: Math.max(0, 1 - bestMatch.distance),
            latitude: userLocation?.lat ?? null,
            longitude: userLocation?.lng ?? null,
            locationDenied: locationDenied,
            livenessScore: livenessResult?.score ?? 1,
            livenessDetails: livenessResult,
            gpsAccuracy: gpsHistory.length > 0 ? gpsHistory[gpsHistory.length - 1].accuracy : null,
            fakeGpsDetected: false, // sudah diblock sebelum sampai sini kalau true
          }),
        });

        const attendanceData = await attendanceRes.json();

        if (!attendanceRes.ok) {
          throw new Error(attendanceData?.message || 'Failed to record attendance');
        }

        if (attendanceData.alreadyAttended) {
          setIsScanning(false);
          setResult({
            name: labelData.name,
            status: 'Peringatan',
            confidence: Math.max(0, 1 - bestMatch.distance),
            message: attendanceData.message || `Anda sudah melakukan absen ${attendanceMode === 'IN' ? 'masuk' : 'keluar'} hari ini.`,
            alreadyAttended: true,
            isWarning: true,
          });
        } else if (attendanceData.success) {
          setIsScanning(false);
          const isOutOfBoundsWarning = !!attendanceData.warning && locationPhase === 'out_of_bounds';
          setResult({
            name: labelData.name,
            status: 'Berhasil',
            confidence: Math.max(0, 1 - bestMatch.distance),
            time: new Date().toLocaleTimeString('id-ID'),
            message: isOutOfBoundsWarning
              ? `${attendanceData.message || 'Absen berhasil dicatat, namun di luar radius kampus.'} Jarak Anda: ${currentDistance ? Math.round(currentDistance) : '-'}m.`
              : (attendanceData.message || `Absen ${attendanceMode === 'IN' ? 'masuk' : 'keluar'} berhasil dicatat.${livenessResult ? ` Liveness Score: ${Math.round(livenessResult.score * 100)}%` : ''}`),
            livenessScore: livenessResult?.score,
            livenessResult: livenessResult,
            isWarning: !!attendanceData.warning,
          });
        } else {
          throw new Error(attendanceData?.message || 'Failed to record attendance');
        }
      } catch (error) {
        console.error('Attendance error:', error);
        setIsScanning(false);
        setResult({
          name: 'Kesalahan',
          status: 'Gagal',
          confidence: 0,
          message: 'Terjadi kesalahan saat mencatat absen. Silakan coba lagi.',
          isWarning: true,
        });
      }
    },
    [descriptors, accuracyThreshold, attendanceMode, locationPhase, enableLivenessCheck, livenessResult, currentDistance, fakeGpsWarning, gpsHistory]
  );

  useEffect(() => {
    if (!result) return;
    const duration = result.status === 'Berhasil' ? 3000 : 6000;
    const timer = setTimeout(() => {
      setResult(null);
      setLivenessResult(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && isApiLoaded && !isScanning && viewMode === 'camera') {
        e.preventDefault();
        handleScan(true);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isApiLoaded, isScanning, viewMode, handleScan]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 space-y-6">
      <div className="max-w-md mx-auto">
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">ABSEN WAJAH</h1>
          </div>
          <p className="text-center text-sm text-slate-600">
            Sistem Absen dengan Deteksi Wajah & Liveness
          </p>
        </div>

        {enableLivenessCheck && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-bold text-emerald-800">
              Verifikasi keaslian wajah AKTIF ✓
            </p>
          </div>
        )}

        {fakeGpsWarning && (
          <div className="bg-rose-50 border border-rose-400 rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-rose-800 uppercase tracking-wide mb-0.5">⚠ Lokasi Mencurigakan</p>
              <p className="text-xs font-semibold text-rose-700 leading-relaxed">{fakeGpsWarning}</p>
            </div>
          </div>
        )}

        {viewMode === 'map' ? (
          <div className="space-y-4">
            <div
              className={`
              rounded-2xl p-6 text-center border-2 transition-all
              ${locationPhase === 'valid'
                ? 'border-emerald-500 bg-emerald-50'
                : locationPhase === 'out_of_bounds'
                  ? 'border-amber-500 bg-amber-50'
                  : locationPhase === 'checking'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-rose-500 bg-rose-50'
              }
            `}
            >
              <div className="flex justify-center mb-3">
                <Target
                  className={`w-10 h-10 ${locationPhase === 'valid'
                    ? 'text-emerald-600'
                    : locationPhase === 'out_of_bounds'
                      ? 'text-amber-600'
                      : locationPhase === 'checking'
                        ? 'text-blue-500 animate-pulse'
                        : 'text-rose-600'
                    }`}
                />
              </div>

              <h3 className="font-black text-lg text-slate-800 uppercase tracking-wider mb-2">
                {locationPhase === 'valid'
                  ? 'Lokasi Valid'
                  : locationPhase === 'out_of_bounds'
                    ? 'Luar Area'
                    : locationPhase === 'checking'
                      ? 'Mendeteksi Lokasi...'
                      : locationPhase === 'denied'
                        ? 'Akses GPS Ditolak'
                        : 'GPS Tidak Aktif'}
              </h3>

              {campusSettings && (
                <div className="space-y-2 text-sm">
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-800">{campusSettings.name}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Radius: {campusSettings.rad} meter
                  </p>
                  {currentDistance !== null && (
                    <p className={`text-sm font-bold ${locationPhase === 'valid' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                      Jarak Anda: {Math.round(currentDistance)} meter
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  if (locationPhase === 'out_of_bounds') {
                    setShowOutOfBoundsConfirm(true);
                  } else {
                    setViewMode('camera');
                  }
                }}
                disabled={locationPhase !== 'valid' && locationPhase !== 'out_of_bounds'}
                className={`w-full mt-4 font-black text-[11px] uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${locationPhase === 'valid'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                  : locationPhase === 'out_of_bounds'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
              >
                <Scan className="w-4 h-4" /> Mulai Pindai Wajah
              </button>
              <button
                onClick={() => {
                  setLocationPhase('checking');
                  setUserLocation(null);
                  setCurrentDistance(null);
                  navigator.geolocation.getCurrentPosition(
                    pos => {
                      setLocationDenied(false);
                      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    },
                    err => {
                      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
                        setLocationDenied(true);
                        setLocationPhase('denied');
                      } else {
                        setLocationPhase('no_gps');
                      }
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
                className="w-full mt-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all"
              >
                Ambil Ulang Lokasi
              </button>
            </div>
          </div>
        ) : (
          <div className="relative aspect-square bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl mx-auto max-w-[340px]">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                <VideoOff className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-xs font-black text-slate-300 uppercase leading-relaxed">{cameraError}</p>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />

                {livenessResult && (
                  <LiveIndicator isLive={livenessResult.isLive} score={livenessResult.score} />
                )}

                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-10 left-10 w-10 h-10 border-t-2 border-l-2 border-white/60 rounded-tl-xl" />
                  <div className="absolute top-10 right-10 w-10 h-10 border-t-2 border-r-2 border-white/60 rounded-tr-xl" />
                  <div className="absolute bottom-10 left-10 w-10 h-10 border-b-2 border-l-2 border-white/60 rounded-bl-xl" />
                  <div className="absolute bottom-10 right-10 w-10 h-10 border-b-2 border-r-2 border-white/60 rounded-br-xl" />
                  {isScanning && (
                    <div className="absolute inset-x-10 h-0.5 top-1/2 bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)] animate-[scan_1.5s_ease-in-out_infinite]" />
                  )}
                </div>

                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 z-10 w-max shadow-lg shadow-black/20">
                  <div className={`w-2 h-2 rounded-full ${locationPhase === 'valid' ? 'bg-emerald-400' : locationPhase === 'out_of_bounds' ? 'bg-amber-400' : 'bg-rose-500'} animate-pulse`} />
                  <span className="text-[9px] font-black tracking-widest text-white uppercase drop-shadow-md">
                    {locationPhase === 'valid'
                      ? 'Area Valid'
                      : locationPhase === 'out_of_bounds'
                        ? `Luar Radius (${currentDistance ? Math.round(currentDistance) : '-'}m)`
                        : locationPhase === 'checking'
                          ? 'Mendeteksi GPS...'
                          : locationPhase === 'denied'
                            ? 'GPS Ditolak'
                            : 'GPS Tidak Aktif'}
                  </span>
                </div>

                {isLivenessChecking && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">Verifikasi Keaslian...</p>
                  </div>
                )}

                {isScanning && !isLivenessChecking && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-4 border-blue-400/50 rounded-full animate-ping" />
                  </div>
                )}

                {!isApiLoaded && !cameraError && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                    <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">{loadingMsg}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {isApiLoaded && viewMode === 'camera' && (
          <div className="flex flex-col items-center justify-center gap-4 mt-6">
            <button
              onClick={() => handleScan(true)}
              disabled={isScanning || isLivenessChecking || !!result}
              className="w-full max-w-[340px] h-14 bg-blue-600 text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.1em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning || isLivenessChecking ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><Scan className="w-5 h-5" /> Pindai Sekarang</>
              )}
            </button>
            <div className="bg-blue-600/10 border border-blue-500/20 px-6 py-3 rounded-xl flex items-center justify-center gap-3 animate-pulse w-full max-w-[340px]">
              <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Atau Tekan Space/Enter</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50/50 border border-blue-100/50 p-5 rounded-3xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">
            <Zap className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none mb-1.5 pt-0.5">Panduan Cepat</h4>
            <p className="text-[12px] text-blue-900/70 font-bold leading-relaxed tracking-tight">
              {enableLivenessCheck
                ? 'Posisikan wajah di dalam bingkai. Lakukan gerakan alami (berkedip, gerakkan kepala). Sistem akan verifikasi keaslian Anda lalu melakukan absen.'
                : 'Posisikan wajah di dalam bingkai, tekan tombol atau Space/Enter untuk memindai.'}
            </p>
            {descriptors.length === 0 && isApiLoaded && (
              <p className="text-[11px] text-amber-600 font-black uppercase tracking-widest mt-2">⚠ Belum ada wajah terdaftar</p>
            )}
          </div>
        </div>

        {/* Out-of-Bounds Confirmation Dialog */}
        {showOutOfBoundsConfirm && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in"
            onClick={() => setShowOutOfBoundsConfirm(false)}
          >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <div
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative z-10 shadow-2xl flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl mb-6 bg-gradient-to-tr from-amber-500 to-amber-400 shadow-amber-500/30 ring-8 ring-slate-50">
                <Target className="w-12 h-12" />
              </div>

              <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase mb-2 leading-tight">
                Anda Berada di Luar Area
              </h2>

              <p className="text-[13px] font-bold text-slate-500 mb-2 px-2 leading-relaxed">
                {campusSettings?.name || 'Lokasi kampus'} memiliki radius {campusSettings?.rad ?? '-'} meter.
              </p>
              <p className="text-[13px] font-bold text-amber-600 mb-6 px-2 leading-relaxed">
                Jarak Anda saat ini: {currentDistance ? Math.round(currentDistance) : '-'} meter.
              </p>
              <p className="text-[12px] text-slate-400 font-semibold mb-6 px-2 leading-relaxed">
                Anda tetap bisa melakukan absen, namun status lokasi akan tercatat sebagai di luar area.
              </p>

              <div className="w-full space-y-3">
                <button
                  onClick={() => {
                    setShowOutOfBoundsConfirm(false);
                    setViewMode('camera');
                  }}
                  className="w-full rounded-2xl font-black text-[12px] uppercase tracking-widest py-4 transition-all active:scale-95 bg-amber-500 text-white hover:bg-amber-600"
                >
                  Lanjutkan Absen
                </button>
                <button
                  onClick={() => setShowOutOfBoundsConfirm(false)}
                  className="w-full rounded-2xl font-black text-[12px] uppercase tracking-widest py-4 transition-all active:scale-95 bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in"
            onClick={() => setResult(null)}
          >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <div
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative z-10 shadow-2xl flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white shadow-xl mb-6 ${result.status === 'Gagal' ? 'bg-gradient-to-tr from-rose-500 to-rose-400 shadow-rose-500/30' : result.isWarning ? 'bg-gradient-to-tr from-amber-500 to-amber-400 shadow-amber-500/30' : 'bg-gradient-to-tr from-blue-600 to-blue-400 shadow-blue-500/30'} animate-[bounce_1s_ease-in-out_infinite] ring-8 ring-slate-50`}>
                {result.status === 'Gagal' ? <AlertCircle className="w-14 h-14" /> : result.isWarning ? <AlertCircle className="w-14 h-14" /> : result.alreadyAttended ? <Info className="w-14 h-14" /> : <CheckCircle2 className="w-14 h-14" />}
              </div>

              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase mb-2 leading-tight">
                {result.alreadyAttended ? 'Sudah Absen' : result.status === 'Gagal' ? 'Gagal Absen' : result.isWarning ? 'Peringatan' : 'Berhasil Absen!'}
              </h2>

              <p className="text-[13px] font-bold text-slate-500 mb-6 px-2 leading-relaxed">
                {result.message}
              </p>

              <div className="w-full space-y-3">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">NAMA / ID PENGGUNA</p>
                  <p className="font-extrabold text-blue-600 text-[15px] truncate px-2 text-center w-full">{result.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  {!result.alreadyAttended && (
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center">
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">WAKTU TERCATAT</p>
                      <p className="font-extrabold text-slate-800 text-sm">{result.time}</p>
                    </div>
                  )}
                  <div className={`bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center ${result.alreadyAttended ? 'col-span-2' : ''}`}>
                    <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">TINGKAT AKURASI</p>
                    <p className={`font-extrabold text-sm ${result.status === 'Gagal' ? 'text-rose-500' : 'text-blue-500'}`}>
                      {Math.round(result.confidence * 100)}%
                    </p>
                  </div>
                  {result.livenessScore !== undefined && (
                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col items-center justify-center col-span-2">
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">SKOR KEASLIAN (LIVENESS)</p>
                      <p className="font-extrabold text-emerald-600 text-sm">
                        {Math.round(result.livenessScore * 100)}%
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setResult(null)}
                  className={`w-full mt-2 rounded-2xl font-black text-[12px] uppercase tracking-widest py-4 transition-all active:scale-95 ${
                    result.status === 'Gagal' || result.isWarning
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {result.status === 'Gagal' || result.isWarning ? 'Coba Lagi' : 'Tutup'}
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'camera' && (
          <button
            onClick={() => {
              setViewMode('map');
              setResult(null);
              setLivenessResult(null);
              if (cleanupStreamRef.current) cleanupStreamRef.current();
            }}
            className="w-full mt-4 bg-white border-2 border-slate-300 text-slate-700 rounded-2xl font-black text-sm py-3 uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Kembali ke Peta
          </button>
        )}
      </div>
    </div>
  );
}
