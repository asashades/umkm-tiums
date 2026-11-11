import React from 'react';
import { useUmkm } from '../../context/UmkmContext';
import { useAuth } from '../../context/AuthContext';
import { SECTOR_PRESETS } from '../../config/sectorPresets';

interface HeaderProps {
  onOpenMockDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMockDrawer }) => {
  const { profile, activeTab, setActiveTab } = useUmkm();
  const { user, isGuest, access, logout } = useAuth();
  const currentSector = SECTOR_PRESETS[profile.sector] || SECTOR_PRESETS.mebel;

  return (
    <header className="bg-primary text-white border-b border-primary/20 sticky top-0 z-30 shadow-micro">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 shrink-0">
            <i className={`${currentSector.icon} text-xs sm:text-sm`}></i>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-xs sm:text-base tracking-tight leading-tight text-white truncate">
              {profile.name}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-white/80 font-medium leading-none mt-0.5 truncate">
              {profile.ownerName} &bull; <span className="text-white/95 font-semibold">{currentSector.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Superadmin Console Button */}
          {access.isAdmin && (
            activeTab === 'admin' ? (
              <button
                type="button"
                onClick={() => setActiveTab('hpp')}
                className="bg-white text-blue-900 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full shadow-micro flex items-center gap-1 hover:bg-slate-100 transition-colors"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                <span className="hidden sm:inline">Ke</span>
                <span>Aplikasi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="bg-purple-600/90 hover:bg-purple-600 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full border border-purple-400/40 flex items-center gap-1 transition-colors"
                title="Buka Konsol Superadmin"
              >
                <i className="fa-solid fa-shield-halved text-[10px]"></i>
                <span>Admin</span>
              </button>
            )
          )}

          {/* Portal Dosen Button (Hanya tampil untuk Superadmin & Admin yang ditugaskan) */}
          {access.isAdmin && (
            activeTab === 'monitoring' ? (
              <button
                type="button"
                onClick={() => setActiveTab('hpp')}
                className="bg-white text-primary text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full shadow-micro flex items-center gap-1 hover:bg-neutral-1 transition-colors"
              >
                <i className="fa-solid fa-arrow-left text-[10px]"></i>
                <span className="hidden sm:inline">Kembali ke</span>
                <span>UMKM</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('monitoring')}
                className="bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1 transition-colors"
                title="Buka Portal Dosen & Proyektor"
              >
                <i className="fa-solid fa-chalkboard-user text-[10px]"></i>
                <span className="hidden sm:inline">Portal</span>
                <span>Dosen</span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={onOpenMockDrawer}
            className="bg-badge-gold text-ink text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full shadow-micro flex items-center gap-1 hover:opacity-95 transition-opacity"
          >
            <i className="fa-solid fa-flask text-[10px]"></i>
            <span className="hidden sm:inline">Uji</span>
            <span>Mock</span>
          </button>

          {/* Tombol Login / Keluar Akun */}
          {isGuest ? (
            <button
              type="button"
              onClick={logout}
              className="bg-white text-primary text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-full shadow-micro flex items-center gap-1 hover:bg-neutral-1 transition-colors"
              title="Kembali ke Halaman Login untuk masuk dengan Google"
            >
              <i className="fa-solid fa-arrow-right-to-bracket text-[10px]"></i>
              <span>Login</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 rounded-full border border-white/20 flex items-center gap-1 transition-colors"
              title={`Keluar (${user?.email || 'Akun'})`}
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
