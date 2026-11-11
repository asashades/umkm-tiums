// src/components/onboarding/OnboardingFlow.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BusinessSector } from '../../types/account';
import { SECTOR_PRESETS } from '../../config/accessControl';
import { TutorialSlides } from './TutorialSlides';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState<string>(user?.businessName || '');
  const [ownerName, setOwnerName] = useState<string>(user?.ownerName || user?.displayName || '');
  const [phoneWhatsApp, setPhoneWhatsApp] = useState<string>(user?.phoneWhatsApp || '');
  const [city, setCity] = useState<string>(user?.city || 'Jepara');
  const [selectedSector, setSelectedSector] = useState<BusinessSector>(user?.sector || 'mebel');
  const [pdpConsent, setPdpConsent] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const sectorList: BusinessSector[] = ['mebel', 'fnb', 'fashion', 'custom'];

  const handleStep1Next = () => {
    setErrorMsg(null);
    if (!businessName.trim()) {
      setErrorMsg('Nama usaha wajib diisi.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Nama pemilik usaha wajib diisi.');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    setStep(3);
  };

  const handleStep3Next = () => {
    setErrorMsg(null);
    if (!pdpConsent) {
      setErrorMsg('Anda harus menyetujui ketentuan pemrosesan data untuk melanjutkan.');
      return;
    }
    setStep(4);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const preset = SECTOR_PRESETS[selectedSector];
      await completeOnboarding({
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        phoneWhatsApp: phoneWhatsApp.trim(),
        city: city.trim(),
        sector: selectedSector,
        sectorLabel: preset.title,
      });
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setErrorMsg('Gagal menyimpan profil usaha. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 antialiased text-slate-800">
      <div className="w-full max-w-2xl">
        {/* Step Progress Header */}
        {step < 4 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Langkah {step} dari 3: Inisialisasi Akun Usaha</span>
              <span>{step === 1 ? 'Profil' : step === 2 ? 'Sektor' : 'Konfirmasi'}</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-700 h-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 1: Profil Usaha */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-700 mb-3">
                <i className="fa-solid fa-store text-xl"></i>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Selamat Datang di TITAN UMKM
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Lengkapi identitas dasar usaha Anda untuk penyesuaian kop surat, SPK, dan laporan.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Usaha / Workshop <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Contoh: Barokah Jati Furniture"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pemilik / Pengelola <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp (untuk Slip Tukang)
                  </label>
                  <input
                    type="tel"
                    value={phoneWhatsApp}
                    onChange={(e) => setPhoneWhatsApp(e.target.value)}
                    placeholder="08123456789 / 62812..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kota / Kabupaten
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Jepara / Surakarta"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleStep1Next}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Lanjut: Pilih Sektor Usaha</span>
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pilih Sektor Usaha */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 mb-3">
                <i className="fa-solid fa-shapes text-xl"></i>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Pilih Sektor Usaha Anda
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Sistem akan menyiapkan preset rumus biaya, bahan baku, dan SPK yang relevan dengan industri Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sectorList.map((secKey) => {
                const item = SECTOR_PRESETS[secKey];
                const isSelected = selectedSector === secKey;
                return (
                  <div
                    key={secKey}
                    onClick={() => setSelectedSector(secKey)}
                    className={`cursor-pointer rounded-xl p-4 border transition-all text-left ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <i className={`fa-solid ${item.icon} text-base`}></i>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {item.badgeText}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-[11px] font-medium text-slate-500 mb-2">
                      {item.subtitle}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {item.description}
                    </p>

                    {isSelected && (
                      <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                        <i className="fa-solid fa-circle-check"></i>
                        <span>Preset Terpilih</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Lanjut: Konfirmasi Preset</span>
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Pengaturan Preset & PDP Consent */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 mb-3">
                <i className="fa-solid fa-clipboard-check text-xl"></i>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Konfirmasi Preset & Privasi Data
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Tinjau konfigurasi awal sebelum memulai penggunaan sistem.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Selected Preset Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Sektor Usaha</span>
                <span className="text-xs font-bold text-blue-700">
                  {SECTOR_PRESETS[selectedSector].title}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Nama Usaha</span>
                <span className="text-xs font-medium text-slate-800">{businessName}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-500">Pemilik / Lokasi</span>
                <span className="text-xs font-medium text-slate-800">
                  {ownerName} ({city || 'Indonesia'})
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1.5">
                  Bahan Baku & Fitur Standar yang Diaktifkan:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTOR_PRESETS[selectedSector].materialsSample.map((mat, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                    >
                      {mat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* PDP Data Consent Checkbox */}
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl mb-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdpConsent}
                  onChange={(e) => setPdpConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  <strong>Persetujuan Privasi Data Usaha (UU PDP):</strong> Saya menyetujui penyimpanan dan enkripsi data produksi serta laporan keuangan usaha saya pada Cloud Firestore TITAN UMKM untuk keperluan operasional harian dan evaluasi akademik Teknik Industri UMS.
                </span>
              </label>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleStep3Next}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Lihat Panduan Singkat</span>
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Tutorial Slides */}
        {step === 4 && (
          <TutorialSlides
            sector={selectedSector}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  );
};
