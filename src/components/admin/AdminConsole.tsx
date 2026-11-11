// src/components/admin/AdminConsole.tsx
import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  UserProfile,
  UserRole,
  AccountStatus,
  AuditLogEntry,
} from '../../types/account';
import {
  SUPERADMIN_EMAIL,
  isSuperAdminEmail,
} from '../../config/accessControl';
import { recordAuditLog } from '../../services/authService';

interface AdminConsoleProps {
  onBack: () => void;
  onOpenClassroomMonitor?: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  onBack,
  onOpenClassroomMonitor,
}) => {
  const { user, access, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'audit' | 'classroom'>('users');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Live subscription to all users in Firestore
  useEffect(() => {
    if (!access.isAdmin) return;

    const usersCol = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCol, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      // Sort newest first
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setUsersList(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching users:', err);
      setLoading(false);
    });

    // Fetch audit logs
    const auditQuery = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubAudit = onSnapshot(auditQuery, (snapshot) => {
      const logs: AuditLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...(docSnap.data() as Omit<AuditLogEntry, 'id'>) });
      });
      setAuditLogs(logs);
    }, (err) => {
      console.warn('Audit logs query fallback:', err);
    });

    return () => {
      unsubUsers();
      unsubAudit();
    };
  }, [access.isAdmin]);

  const showNotification = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Toggle user account status
  const handleToggleStatus = async (targetUser: UserProfile, newStatus: AccountStatus) => {
    if (isSuperAdminEmail(targetUser.email)) {
      showNotification('Akun Superadmin Utama tidak dapat dinonaktifkan.');
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        status: newStatus,
        statusReason: newStatus === 'inactive' ? 'Dinonaktifkan oleh Admin' : 'Diaktifkan oleh Admin',
        updatedAt: new Date().toISOString(),
      });

      await recordAuditLog({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || '',
        actorRole: access.role,
        action: 'UPDATE_STATUS',
        targetUid: targetUser.uid,
        targetEmail: targetUser.email,
        previousValue: targetUser.status,
        newValue: newStatus,
        notes: `Status diubah menjadi ${newStatus}`,
      });

      showNotification(`Status ${targetUser.email} berhasil diubah ke ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Failed to update user status:', err);
      showNotification('Gagal memperbarui status pengguna.');
    }
  };

  // Promote / Demote Admin
  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (!access.isSuperAdmin) {
      showNotification('Hanya Superadmin Utama yang berhak mengubah hak akses admin.');
      return;
    }
    if (isSuperAdminEmail(targetUser.email)) {
      showNotification('Peran Superadmin Utama dilindungi dan tidak dapat diubah.');
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });

      await recordAuditLog({
        actorUid: user?.uid || 'system',
        actorEmail: user?.email || '',
        actorRole: access.role,
        action: newRole === 'admin' ? 'PROMOTE_ADMIN' : 'REVOKE_ADMIN',
        targetUid: targetUser.uid,
        targetEmail: targetUser.email,
        previousValue: targetUser.role,
        newValue: newRole,
        notes: `Role diubah menjadi ${newRole}`,
      });

      showNotification(`Role ${targetUser.email} berhasil diubah menjadi ${newRole.toUpperCase()}`);
    } catch (err) {
      console.error('Failed to change role:', err);
      showNotification('Gagal mengubah hak akses role.');
    }
  };

  // Filtered users list
  const filteredUsers = usersList.filter((u) => {
    const matchesFilter =
      filterStatus === 'all' ? true : u.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.businessName && u.businessName.toLowerCase().includes(q)) ||
      (u.city && u.city.toLowerCase().includes(q)) ||
      (u.sector && u.sector.toLowerCase().includes(q));

    return matchesFilter && matchesQuery;
  });

  if (!access.isAdmin) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <i className="fa-solid fa-ban text-xl"></i>
        </div>
        <h2 className="text-base font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-xs text-slate-600 mt-1 mb-4">
          Konsol Superadmin ini hanya dapat diakses oleh Administrator resmi ({SUPERADMIN_EMAIL}).
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
        >
          Kembali ke Aplikasi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Kembali"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-blue-700"></i>
              Konsol Superadmin TITAN UMKM
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {access.isSuperAdmin ? 'Superadmin Utama' : 'Admin'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-8">
            Pengelolaan Akun Pengguna, Akses Pembayaran/Aktivasi, dan Pemantauan Kelas Pelatihan UMS
          </p>
        </div>

        {/* Classroom Quick Launcher & Logout */}
        <div className="flex items-center gap-2">
          {onOpenClassroomMonitor && (
            <button
              onClick={onOpenClassroomMonitor}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-chalkboard-user"></i>
              <span>Layar Dosen</span>
            </button>
          )}
          <button
            onClick={logout}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            title="Keluar dari sesi Admin"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 shadow-sm">
          <i className="fa-solid fa-circle-check text-emerald-600"></i>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 gap-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <i className="fa-solid fa-users"></i>
          <span>Pengguna Terdaftar ({usersList.length})</span>
        </button>

        {access.isSuperAdmin && (
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'admins'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fa-solid fa-user-shield"></i>
            <span>Tim Admin & Peran</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span>Log Audit ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Pengguna UMKM */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm p-5 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <i className="fa-solid fa-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, email, usaha, kota..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Status:</span>
              {(['all', 'active', 'trial', 'inactive'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    filterStatus === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Pengguna & Usaha</th>
                  <th className="py-2.5 px-3">Sektor</th>
                  <th className="py-2.5 px-3">WhatsApp</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status Langganan</th>
                  <th className="py-2.5 px-3 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                      Memuat data pengguna...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada pengguna yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuper = isSuperAdminEmail(u.email);
                    const isActive = u.status === 'active';
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">
                            {u.businessName || u.displayName || 'Tanpa Nama'}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                          {u.city && (
                            <span className="text-[10px] text-slate-400">
                              <i className="fa-solid fa-location-dot mr-1 text-[9px]"></i>
                              {u.city}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {u.sectorLabel || u.sector || 'Mebel'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {u.phoneWhatsApp ? (
                            <a
                              href={`https://wa.me/${u.phoneWhatsApp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                            >
                              <i className="fa-brands fa-whatsapp text-emerald-600"></i>
                              <span>{u.phoneWhatsApp}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isSuper ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                              Superadmin
                            </span>
                          ) : u.role === 'admin' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                              User
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <i className="fa-solid fa-circle text-[6px]"></i>
                              Aktif (Full)
                            </span>
                          ) : u.status === 'trial' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                              <i className="fa-solid fa-circle text-[6px]"></i>
                              Trial
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <i className="fa-solid fa-lock text-[8px]"></i>
                              Nonaktif (Read-Only)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {isSuper ? (
                            <span className="text-[11px] text-slate-400 italic">Terkunci</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              {isActive ? (
                                <button
                                  onClick={() => handleToggleStatus(u, 'inactive')}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-medium transition-colors"
                                  title="Ubah ke Read-Only"
                                >
                                  Nonaktifkan
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleStatus(u, 'active')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors"
                                  title="Buka Akses Penuh"
                                >
                                  Aktifkan
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Tim Admin & Hak Akses (Superadmin Only) */}
      {activeTab === 'admins' && access.isSuperAdmin && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Kelola Tim Pengelola / Administrator TITAN UMKM
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin dapat memantau pengguna dan melihat laporan usaha. Superadmin Utama adalah <code className="text-blue-700 font-semibold">{SUPERADMIN_EMAIL}</code>.
            </p>
          </div>

          <div className="space-y-2">
            {usersList.map((u) => {
              const isSuper = isSuperAdminEmail(u.email);
              const isAdmin = u.role === 'admin' || isSuper;

              return (
                <div
                  key={u.uid}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50/50"
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                      <span>{u.displayName || u.email}</span>
                      {isSuper && (
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800">
                          Superadmin Utama (Protected)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                  </div>

                  <div>
                    {isSuper ? (
                      <span className="text-xs text-slate-400 italic">Permanen</span>
                    ) : isAdmin ? (
                      <button
                        onClick={() => handleRoleChange(u, 'user')}
                        className="px-2.5 py-1 border border-red-300 text-red-700 hover:bg-red-50 rounded text-xs font-medium transition-colors"
                      >
                        Cabut Hak Admin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(u, 'admin')}
                        className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Jadikan Admin
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Log Audit */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-b-xl shadow-sm p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Log Aktivitas & Audit Perubahan</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Riwayat perubahan status akun, promosi admin, dan inisialisasi pengguna.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">50 Terakhir</span>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">Belum ada riwayat log tercatat.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 border border-slate-100 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/40"
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                        {log.action}
                      </span>
                      <span>Target: {log.targetEmail}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      {log.notes || `${log.previousValue || ''} ➔ ${log.newValue || ''}`} (Oleh: {log.actorEmail})
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono sm:text-right">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
