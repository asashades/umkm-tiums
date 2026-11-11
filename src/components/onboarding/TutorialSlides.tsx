// src/components/onboarding/TutorialSlides.tsx
import React, { useState } from 'react';
import { BusinessSector } from '../../types/account';
import { SECTOR_PRESETS } from '../../config/accessControl';

interface TutorialSlidesProps {
  sector: BusinessSector;
  onFinish: () => void;
}

export const TutorialSlides: React.FC<TutorialSlidesProps> = ({ sector, onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const preset = SECTOR_PRESETS[sector] || SECTOR_PRESETS.mebel;

  const slides = [
    {
      title: 'Preset Bahan Sesuai Sektor Usaha',
      subtitle: `Disesuaikan untuk sektor: ${preset.title}`,
      icon: 'fa-cubes-stacked',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description:
        'Aplikasi langsung menyiapkan daftar bahan baku umum, satuan standar, dan harga acuan pasar sehingga Anda tidak perlu mengetik dari nol.',
      highlight: `Preset ${preset.title} otomatis aktif dengan bahan seperti ${preset.materialsSample.slice(0, 3).join(', ')}.`,
    },
    {
      title: 'Kalkulasi HPP & Biaya Produksi Akurat',
      subtitle: 'Standar Teknik Industri Tanpa Rumus Rumit',
      icon: 'fa-calculator',
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description:
        'HPP memisahkan Biaya Bahan Baku, Upah Tenaga Kerja Langsung, dan Biaya Overhead (listrik, sewa, amplas, penyusutan alat).',
      highlight:
        'Dapatkan rekomendasi Harga Jual dengan simulasi margin laba bersih 20% hingga 50% secara otomatis.',
    },
    {
      title: 'SPK Borongan, Kasbon & Kendali Mutu QC',
      subtitle: 'Cegah Tukang Kabur & Cacat Produksi Berulang',
      icon: 'fa-clipboard-check',
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      description:
        'Pantau tahapan pengerjaan per tukang. Catat kasbon harian bertahap dengan batas aman maksimal, dan lakukan inspeksi QC sebelum pelunasan.',
      highlight:
        'Kirim slip rincian upah & sisa pembayaran ke WhatsApp tukang hanya dengan 1 kali klik.',
    },
    {
      title: 'Rapor Keuangan & Laba Bersih Riil',
      subtitle: 'Pantau Kesehatan Kas & Rekonsiliasi Upah',
      icon: 'fa-chart-pie',
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      description:
        'Selisih upah borongan riil di lapangan vs standar HPP akan direkonsiliasi otomatis ke pos laba bersih riil. Tidak ada lagi margin bocor yang tersembunyi.',
      highlight:
        'Rapor usaha siap dicetak atau ditunjukkan ke perbankan / mitra pembiayaan sebagai laporan keuangan resmi.',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const active = slides[currentSlide];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 max-w-xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Panduan Singkat ({currentSlide + 1} dari {slides.length})
        </span>
        <div className="flex gap-1.5">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? 'w-6 bg-blue-700'
                  : idx < currentSlide
                  ? 'w-2 bg-blue-300'
                  : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Slide Content */}
      <div className="text-center py-4">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${active.bgColor} ${active.iconColor} mb-4 shadow-sm`}
        >
          <i className={`fa-solid ${active.icon} text-2xl`}></i>
        </div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          {active.title}
        </h2>
        <p className="text-xs font-medium text-slate-500 mt-1 mb-4">
          {active.subtitle}
        </p>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          {active.description}
        </p>

        {/* Highlight Card */}
        <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 text-left flex items-start gap-2.5">
          <i className="fa-solid fa-circle-info text-blue-600 mt-0.5 flex-shrink-0"></i>
          <span>{active.highlight}</span>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
        {currentSlide > 0 ? (
          <button
            type="button"
            onClick={handlePrev}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Kembali
          </button>
        ) : (
          <button
            type="button"
            onClick={onFinish}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            Lewati Tutorial
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 ml-auto"
        >
          <span>
            {currentSlide === slides.length - 1
              ? 'Mulai Gunakan TITAN UMKM'
              : 'Selanjutnya'}
          </span>
          <i
            className={`fa-solid ${
              currentSlide === slides.length - 1 ? 'fa-arrow-right' : 'fa-chevron-right'
            } text-[10px]`}
          ></i>
        </button>
      </div>
    </div>
  );
};
