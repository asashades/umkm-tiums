import React, { useState } from 'react';
import { useUmkm, MockPersona } from '../../context/UmkmContext';
import { useAuth } from '../../context/AuthContext';

interface MockControlDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MockControlDrawer: React.FC<MockControlDrawerProps> = ({ isOpen, onClose }) => {
  const {
    mockPersona,
    switchPersona,
    profile,
    toggleTrainingMode,
    isHpViewport,
    setIsHpViewport,
    resetToInitialSeed,
    activeTab,
    setActiveTab,
  } = useUmkm();
  const { access } = useAuth();

  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-canvas w-full max-w-sm h-full shadow-xl border-l border-hairline flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-badge-gold text-ink flex items-center justify-center text-xs font-black">
                <i className="fa-solid fa-flask"></i>
              </span>
              <div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-ink">Panel Pengujian Mock</h3>
                <p className="text-[10px] text-muted font-medium">Uji Coba Cepat & Ganti Skenario</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-ink text-sm p-1.5 rounded-sm hover:bg-hairline"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* 1. Persona Switcher */}
            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-2">
                Pilih Skenario / Persona Pengujian
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'mebel' as MockPersona,
                    label: 'UMKM Mebel (Jati Luhur Furniture)',
                    sub: '2 Produk HPP (Kursi & Meja), 3 Order, 2 Cacat',
                    icon: 'fa-solid fa-couch',
                  },
                  {
                    id: 'fnb' as MockPersona,
                    label: 'UMKM Kuliner (Dapur Pesisir Jepara)',
                    sub: '2 Produk Batch (Kerupuk & Sambal), 2 Order, 2 Cacat',
                    icon: 'fa-solid fa-utensils',
                  },
                  {
                    id: 'custom' as MockPersona,
                    label: 'UMKM Kriya / Fashion (Universal)',
                    sub: 'Profil Kustom Tanpa Produk Awal',
                    icon: 'fa-solid fa-shirt',
                  },
                  {
                    id: 'empty' as MockPersona,
                    label: 'Data Kosong (Pengguna Baru)',
                    sub: 'Uji pengalaman input dari nol',
                    icon: 'fa-solid fa-folder-open',
                  },
                ].map((item) => {
                  const isCurrent = mockPersona === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        switchPersona(item.id);
                        onClose();
                      }}
                      className={`w-full p-2.5 rounded-sm border text-left transition-all flex items-start gap-3 ${
                        isCurrent
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-hairline hover:border-neutral-2 text-body'
                      }`}
                    >
                      <i className={`${item.icon} text-base mt-0.5 ${isCurrent ? 'text-primary' : 'text-muted'}`}></i>
                      <div>
                        <div className="text-xs font-bold leading-tight text-ink">{item.label}</div>
                        <div className="text-[11px] text-muted mt-0.5 leading-snug">{item.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Mode Pelatihan Toggle */}
            <div className="border-t border-hairline pt-4">
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-2">
                Mode Pelatihan (Homework Tracker)
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-sm bg-neutral-1 border border-hairline">
                <div>
                  <div className="text-xs font-bold text-ink">Banner Tugas Rumah</div>
                  <div className="text-[11px] text-muted">
                    {profile.trainingModeEnabled ? 'Aktif (Untuk sesi pelatihan)' : 'Nonaktif (Aplikasi harian UMKM)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTrainingMode}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    profile.trainingModeEnabled ? 'bg-primary' : 'bg-neutral-2'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-micro transform transition-transform ${
                      profile.trainingModeEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 3. Mobile Frame Toggle */}
            <div className="border-t border-hairline pt-4">
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-2">
                Simulasi Tampilan Smartphone (375px)
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-sm bg-neutral-1 border border-hairline">
                <div>
                  <div className="text-xs font-bold text-ink">Bingkai Mobile 375px</div>
                  <div className="text-[11px] text-muted">
                    {isHpViewport ? 'Aktif (Preview layar HP di laptop)' : 'Responsif Penuh Layar'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHpViewport(!isHpViewport)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isHpViewport ? 'bg-primary' : 'bg-neutral-2'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-micro transform transition-transform ${
                      isHpViewport ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 4. Portal Dosen Button (Khusus Admin / Superadmin) */}
            {access.isAdmin && (
              <div className="border-t border-hairline pt-4 space-y-2">
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                  Akses Khusus Tim Dosen (SNH, ASA, PSN)
                </label>
                <button
                  onClick={() => {
                    setActiveTab('monitoring');
                    onClose();
                  }}
                  className={`w-full py-2.5 px-3 rounded-sm border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'monitoring'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-ink border-neutral-2 hover:bg-neutral-1'
                  }`}
                >
                  <i className="fa-solid fa-chalkboard-user"></i>
                  <span>Buka Dashboard Monitoring (/monitoring)</span>
                </button>
                <p className="text-[11px] text-muted leading-relaxed">
                  Menampilkan rekapitulasi 35 UMKM kelas Jepara, bedah kasus HPP di proyektor, dan ekspor CSV.
                </p>
              </div>
            )}

            {/* 5. Live Dual-Sync Info */}
            <div className="border-t border-hairline pt-4">
              <div className="p-2.5 bg-neutral-1 rounded-sm border border-hairline text-[11px] text-muted leading-relaxed">
                <div className="font-bold text-ink flex items-center gap-1.5 mb-1">
                  <i className="fa-solid fa-arrows-rotate text-primary text-[10px]"></i>
                  <span>Live Dual-Sync Aktif</span>
                </div>
                Perubahan pada persona aktif otomatis disiarkan ke tab monitoring dosen secara real-time.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-hairline bg-neutral-1 flex justify-between items-center">
          {confirmReset ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-danger-text">Yakin reset?</span>
              <button
                type="button"
                onClick={() => {
                  resetToInitialSeed();
                  setConfirmReset(false);
                  onClose();
                }}
                className="px-2.5 py-1 bg-danger-text text-white rounded-sm text-[11px] font-bold"
              >
                Ya, Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1 bg-white border border-neutral-2 text-body rounded-sm text-[11px] font-bold"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-xs text-muted hover:text-danger-text font-semibold flex items-center gap-1.5"
            >
              <i className="fa-solid fa-rotate-left text-[11px]"></i>
              <span>Reset Data Contoh</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-ink text-white rounded-full text-xs font-bold hover:bg-body shadow-micro"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
