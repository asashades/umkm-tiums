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

  return null;
};
