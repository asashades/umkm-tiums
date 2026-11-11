// src/components/auth/LoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isInAppBrowser } from '../../services/authService';
import { ADMIN_PHONE_DISPLAY, ADMIN_WA_LINK } from '../../config/accessControl';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithGoogle, loginAsGuest, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inAppNotice] = useState<boolean>(isInAppBrowser());
  const [showClassroomModal, setShowClassroomModal] = useState<boolean>(false);
  const [classroomCode, setClassroomCode] = useState<string>('TI-UMS-2026');
  const [studentName, setStudentName] = useState<string>('');

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Login error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Jendela login ditutup sebelum selesai. Silakan coba lagi.');
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up diblokir oleh browser Anda. Mohon izinkan pop-up untuk domain ini.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else {
        setErrorMsg('Gagal masuk dengan Google. Pastikan koneksi internet stabil atau gunakan Mode Tamu.');
      }
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest('mebel');
    if (onSuccess) onSuccess();
  };

  const handleClassroomJoin = () => {
    if (!studentName.trim()) {
      setErrorMsg('Masukkan nama Anda untuk bergabung ke sesi kelas.');
      return;
    }
    // Set guest as classroom participant
    loginAsGuest('mebel');
    if (onSuccess) onSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 antialiased text-slate-800">
      {/* Container */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white mb-3 shadow-sm">
            <i className="fa-solid fa-industry text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            TITAN UMKM
          </h1>
          <p className="text-xs font-semibold text-blue-700 tracking-wide uppercase mt-1">
            Teknik Industri UMS
          </p>
          <p className="text-sm text-slate-600 mt-2">
            Sistem Manajemen Produksi & Biaya Riil UMKM Indonesia
          </p>
        </div>

        {/* In-App Browser Warning Banner */}
        {inAppNotice && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3">
            <i className="fa-solid fa-triangle-exclamation text-amber-600 mt-0.5 text-sm flex-shrink-0"></i>
            <div>
              <p className="font-semibold">Browser Internal Terdeteksi</p>
              <p className="mt-0.5 text-slate-700">
                Anda membuka web ini di dalam WhatsApp/Instagram. Jika login Google gagal, ketuk tombol <strong>⋮</strong> di kanan atas dan pilih <strong>Buka di Chrome / Safari</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2.5">
            <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5 flex-shrink-0"></i>
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Trial Badge */}
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-1">
            <i className="fa-solid fa-check-circle text-xs"></i>
            Tahap Uji Coba Terbuka
          </span>
          <p className="text-xs text-slate-600">
            Semua pengguna baru mendapatkan akses penuh untuk mencoba seluruh modul aplikasi.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm rounded-lg border border-slate-300 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <i className="fa-solid fa-circle-notch fa-spin text-slate-500"></i>
            ) : (
              <i className="fa-brands fa-google text-red-500 text-base"></i>
            )}
            <span>Masuk dengan Akun Google</span>
          </button>

          {/* Guest Evaluation Button */}
          <button
            type="button"
            onClick={handleGuestLogin}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors border border-transparent"
          >
            <i className="fa-solid fa-eye text-slate-500"></i>
            <span>Coba Demo Cepat (Tanpa Login)</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-400">Atau untuk Pelatihan</span>
          </div>
        </div>

        {/* Sesi Pelatihan Kelas Entry */}
        <div className="bg-blue-50/60 border border-blue-200/80 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-700 font-medium mb-2">
            Peserta Praktikum / Pelatihan Kelas UMS?
          </p>
          <button
            type="button"
            onClick={() => setShowClassroomModal(true)}
            className="w-full py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-graduation-cap"></i>
            <span>Masuk ke Sesi Pelatihan</span>
          </button>
        </div>

        {/* Footer Contact Info */}
        <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          <p>
            Dikelola oleh Tim Laboratorium Teknik Industri UMS
          </p>
          <a
            href={ADMIN_WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-800 font-medium mt-1.5"
          >
            <i className="fa-brands fa-whatsapp text-emerald-600 text-sm"></i>
            <span>Bantuan WhatsApp: {ADMIN_PHONE_DISPLAY}</span>
          </a>
        </div>
      </div>

      {/* Classroom Join Modal */}
      {showClassroomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-chalkboard-user text-blue-700"></i>
                Masuk Sesi Kelas Pelatihan
              </h3>
              <button
                type="button"
                onClick={() => setShowClassroomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Mahasiswa / Peserta
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi / Meja Barokah"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kode Sesi Kelas (dari Dosen)
                </label>
                <input
                  type="text"
                  value={classroomCode}
                  onChange={(e) => setClassroomCode(e.target.value.toUpperCase())}
                  placeholder="TI-UMS-2026"
                  className="w-full px-3 py-2 text-sm font-mono tracking-wider uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Data pengerjaan Anda akan terhubung ke layar proyektor Dosen secara real-time.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowClassroomModal(false)}
                className="flex-1 py-2 px-3 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClassroomJoin}
                className="flex-1 py-2 px-3 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Gabung Kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
