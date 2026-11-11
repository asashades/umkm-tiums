// src/components/common/AccountStatusBanner.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getActivationWaLink, ADMIN_PHONE_DISPLAY } from '../../config/accessControl';

export const AccountStatusBanner: React.FC = () => {
  const { user, isGuest, access, logout } = useAuth();

  if (!user && !isGuest) return null;

  // Inactive / Expired Account Banner (Critical Alert)
  if (access.status === 'inactive') {
    const waLink = getActivationWaLink(user?.businessName || '', user?.email || '');
    return (
      <div className="bg-amber-500 text-slate-900 px-4 py-2.5 shadow-sm text-xs border-b border-amber-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-lock text-sm"></i>
            <span>
              <strong>Mode Hanya-Baca (Read-Only):</strong> Akun usaha Anda saat ini tidak aktif. Anda tetap dapat melihat data, namun penambahan dan pengeditan dinonaktifkan.
            </span>
          </div>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded font-semibold hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <i className="fa-brands fa-whatsapp text-emerald-400"></i>
            <span>Aktivasi via WA ({ADMIN_PHONE_DISPLAY})</span>
          </a>
        </div>
      </div>
    );
  }

  // Guest Mode Notification Banner
  if (isGuest) {
    return (
      <div className="bg-slate-800 text-slate-100 px-3 sm:px-4 py-2 text-xs border-b border-slate-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <i className="fa-solid fa-graduation-cap text-blue-400 shrink-0 text-sm"></i>
            <span className="truncate">
              <strong>Sesi Pelatihan / Tamu:</strong> Data tersimpan lokal di browser ini.
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="px-2.5 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-micro"
            title="Keluar dari sesi demo dan masuk dengan akun Google"
          >
            <i className="fa-solid fa-arrow-right-to-bracket text-[10px]"></i>
            <span>Masuk Google</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
