import React, { useState, useEffect } from 'react';
import { useUmkm, MockPersona } from '../../context/UmkmContext';
import { useAuth } from '../../context/AuthContext';
import { SECTOR_PRESETS } from '../../config/sectorPresets';
import { SectorId } from '../../types/titan';
import { ADMIN_PHONE_DISPLAY, ADMIN_WA_LINK } from '../../config/accessControl';

export const ProfileModule: React.FC = () => {
  const {
    profile,
    updateProfile,
    changeSector,
    toggleTrainingMode,
    isHpViewport,
    setIsHpViewport,
    mockPersona,
    switchPersona,
    resetToInitialSeed,
    setActiveTab,
  } = useUmkm();
  const { user, isGuest, access, logout } = useAuth();

  const [editName, setEditName] = useState(profile.name);
  const [editOwner, setEditOwner] = useState(profile.ownerName);
  const [editPhone, setEditPhone] = useState(profile.phone);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setEditName(profile.name);
    setEditOwner(profile.ownerName);
    setEditPhone(profile.phone);
  }, [profile.name, profile.ownerName, profile.phone]);

  const currentSector = SECTOR_PRESETS[profile.sector] || SECTOR_PRESETS.mebel;

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanPhone = editPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    updateProfile({
      name: editName.trim() || profile.name,
      ownerName: editOwner.trim() || profile.ownerName,
      phone: cleanPhone || profile.phone,
    });

    setSaveMessage('Profil identitas usaha berhasil disimpan.');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleSectorSelect = (secKey: SectorId) => {
    changeSector(secKey);
    setSaveMessage(`Sektor usaha diubah ke "${SECTOR_PRESETS[secKey].name}". Istilah & Checklist telah disesuaikan.`);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Feedback Banner */}
      {saveMessage && (
        <div className="bg-primary text-white px-4 py-2.5 rounded-md text-xs font-bold flex items-center justify-between shadow-micro">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-check"></i>
            <span>{saveMessage}</span>
          </div>
          <button type="button" onClick={() => setSaveMessage(null)} className="text-white/80 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-ink tracking-tight">
          Pengaturan Profil & Sektor Usaha
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Atur identitas nota WhatsApp, pilih preset sektor produksi, dan kelola akun pengguna.
        </p>
      </div>

      {/* Section 0: Akun & Status Langganan Cloud */}
      <div className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro">
        <div className="border-b border-hairline pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-user-shield text-primary text-sm"></i>
            <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
              Akun Pengguna & Layanan Cloud
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            access.isSuperAdmin
              ? 'bg-purple-100 text-purple-800'
              : access.isAdmin
              ? 'bg-blue-100 text-blue-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {access.isSuperAdmin ? 'Superadmin Utama' : access.isAdmin ? 'Admin' : isGuest ? 'Mode Tamu' : 'Pengguna Aktif'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-1/60 p-3 rounded-md text-xs">
          <div>
            <div className="font-bold text-ink">
              {user?.displayName || 'Pengguna UMKM'} {isGuest && '(Sesi Tamu Lokal)'}
            </div>
            <div className="text-[11px] text-muted">
              {user?.email || 'tamu@demo.local'}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <i className="fa-solid fa-circle-check"></i>
                Status: {access.status === 'active' ? 'Aktif (Akses Penuh)' : access.status.toUpperCase()}
              </span>
              <span className="text-muted">&bull;</span>
              <span className="text-muted">Cloud Firestore: Tersinkronisasi</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {access.isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="px-3 py-1.5 bg-primary text-white rounded text-xs font-bold shadow-micro hover:opacity-95 transition-opacity flex items-center gap-1.5"
              >
                <i className="fa-solid fa-shield-halved text-[10px]"></i>
                <span>Konsol Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 border border-hairline bg-canvas text-body hover:text-danger-text rounded text-xs font-semibold hover:bg-neutral-1 transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
              <span>{isGuest ? 'Keluar Demo' : 'Keluar Akun'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted pt-1">
          <span>Butuh perpanjangan atau bantuan aktivasi?</span>
          <a
            href={ADMIN_WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-bold inline-flex items-center gap-1"
          >
            <i className="fa-brands fa-whatsapp text-emerald-600"></i>
            <span>Admin WA: {ADMIN_PHONE_DISPLAY}</span>
          </a>
        </div>
      </div>

      {/* Section 1: Pilihan Sektor Usaha (Universal Engine Preset) */}
      <div className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro">
        <div className="border-b border-hairline pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-industry text-primary text-sm"></i>
            <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
              1. Preset Sektor Produksi
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-primary/10 text-primary uppercase">
            Aktif: {currentSector.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(Object.keys(SECTOR_PRESETS) as SectorId[]).map((secKey) => {
            const sec = SECTOR_PRESETS[secKey];
            const isSelected = profile.sector === secKey;
            return (
              <button
                type="button"
                key={secKey}
                onClick={() => handleSectorSelect(secKey)}
                className={`p-3 rounded-sm border text-left transition-all flex items-start gap-3 ${
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-hairline hover:border-neutral-2 text-body'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'bg-primary text-white' : 'bg-neutral-1 text-muted'
                  }`}
                >
                  <i className={`${sec.icon} text-xs`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-ink">{sec.name}</span>
                    {isSelected && <i className="fa-solid fa-circle-check text-primary text-xs"></i>}
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    Default: {sec.defaultCalcMode === 'unit_based' ? 'Per Unit / Satuan' : 'Per Batch / Resep'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Kamus Istilah Aktif */}
        <div className="bg-neutral-1 p-3 rounded-sm border border-hairline grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] font-bold text-muted uppercase block">Istilah Produk</span>
            <span className="font-bold text-ink">{currentSector.productLabel}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted uppercase block">Bahan Utama</span>
            <span className="font-bold text-ink">{currentSector.mainMaterialLabel}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted uppercase block">Bahan Penolong</span>
            <span className="font-bold text-ink">{currentSector.auxiliaryMaterialLabel}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted uppercase block">Tenaga Kerja</span>
            <span className="font-bold text-ink">{currentSector.laborLabel}</span>
          </div>
        </div>
      </div>

      {/* Section 2: Identitas Usaha */}
      <form
        onSubmit={handleSaveIdentity}
        className="bg-canvas border border-hairline rounded-md p-4 space-y-3.5 shadow-micro"
      >
        <div className="border-b border-hairline pb-2.5 flex items-center gap-2">
          <i className="fa-solid fa-id-card text-primary text-sm"></i>
          <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
            2. Identitas Usaha & Kontak Nota WhatsApp
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Nama Usaha / Bengkel / Dapur *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary outline-none text-sm text-ink font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Nama Pemilik (Owner) *
            </label>
            <input
              type="text"
              required
              value={editOwner}
              onChange={(e) => setEditOwner(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary outline-none text-sm text-ink font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Nomor WhatsApp Usaha *
            </label>
            <input
              type="tel"
              required
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary outline-none text-sm text-ink font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-hairline">
          <button
            type="submit"
            className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro flex items-center gap-1.5"
          >
            <i className="fa-solid fa-floppy-disk text-xs"></i>
            <span>Simpan Identitas Usaha</span>
          </button>
        </div>
      </form>

      {/* Section 3: Preferensi Mode & Data Simulasi */}
      <div className="bg-canvas border border-hairline rounded-md p-4 space-y-3.5 shadow-micro">
        <div className="border-b border-hairline pb-2.5 flex items-center gap-2">
          <i className="fa-solid fa-gears text-primary text-sm"></i>
          <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
            3. Mode Tampilan & Simulasi Data
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Toggle Training Mode */}
          <div className="p-3 rounded-sm bg-neutral-1 border border-hairline flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-ink">Banner Target Pelatihan</div>
              <div className="text-[11px] text-muted">
                {profile.trainingModeEnabled ? 'Aktif (Tampil di atas layar)' : 'Nonaktif (Mode aplikasi harian)'}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTrainingMode}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
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

          {/* Toggle 375px Mobile Frame */}
          <div className="p-3 rounded-sm bg-neutral-1 border border-hairline flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-ink">Bingkai Layar Smartphone (375px)</div>
              <div className="text-[11px] text-muted">
                {isHpViewport ? 'Aktif (Simulasi HP)' : 'Nonaktif (Layar penuh responsif)'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHpViewport(!isHpViewport)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
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

        {/* Quick Persona Switcher */}
        <div className="pt-2 border-t border-hairline space-y-2">
          <div className="text-[10px] font-bold text-ink uppercase tracking-wider">
            Muat Cepat Data Contoh (Persona Simulasi):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'mebel' as MockPersona, label: 'Contoh UMKM Mebel', icon: 'fa-solid fa-couch' },
              { id: 'fnb' as MockPersona, label: 'Contoh UMKM FnB', icon: 'fa-solid fa-utensils' },
              { id: 'custom' as MockPersona, label: 'Contoh UMKM Kriya', icon: 'fa-solid fa-shirt' },
              { id: 'empty' as MockPersona, label: 'Mulai Data Kosong', icon: 'fa-solid fa-file' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  switchPersona(p.id);
                  setSaveMessage(`Berhasil memuat skenario: ${p.label}`);
                  setTimeout(() => setSaveMessage(null), 3000);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                  mockPersona === p.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-canvas text-body border-neutral-2 hover:bg-neutral-1'
                }`}
              >
                <i className={`${p.icon} text-[11px]`}></i>
                <span>{p.label}</span>
              </button>
            ))}

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border border-danger-text/30 text-danger-text hover:bg-danger-subtle flex items-center gap-1.5 ml-auto"
              >
                <i className="fa-solid fa-rotate-left text-[11px]"></i>
                <span>Reset Data Awal</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    resetToInitialSeed();
                    setConfirmReset(false);
                    setSaveMessage('Seluruh data telah dikembalikan ke kondisi awal.');
                    setTimeout(() => setSaveMessage(null), 3000);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-danger-text text-white"
                >
                  Ya, Reset Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1.5 rounded-full text-xs font-semibold border border-neutral-2 text-body"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
