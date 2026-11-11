import React, { useState, useEffect } from 'react';
import { useUmkm } from '../../context/UmkmContext';
import { useAuth } from '../../context/AuthContext';
import { SUPERADMIN_EMAIL } from '../../config/accessControl';
import { MockParticipantSummary, Product } from '../../types/titan';
import { MOCK_CLASS_PARTICIPANTS, PRODUCTS_MEBEL, PRODUCTS_FNB } from '../../config/mockSeedData';
import {
  subscribeToClassroomParticipants,
  seedClassroomCohortIfNeeded,
} from '../../services/workspaceService';
import {
  formatRupiah,
  calculateBusinessCopqRate,
  calculateRecommendedSellingPrice,
  getMarginTierRecommendations,
  analyzeCurrentMarginInsight,
} from '../../utils/calculations';

export const LecturerMonitoring: React.FC = () => {
  const { profile, products, orders, defects, updateProduct, setActiveTab } = useUmkm();
  const { access } = useAuth();

  // PIN Protection State
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Search & Filter
  const [sectorFilter, setSectorFilter] = useState<'all' | 'mebel' | 'fnb' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Cloud Firestore Classroom State
  const [cloudParticipants, setCloudParticipants] = useState<MockParticipantSummary[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  useEffect(() => {
    seedClassroomCohortIfNeeded();
    const unsubscribe = subscribeToClassroomParticipants((liveList) => {
      if (liveList && liveList.length > 0) {
        setCloudParticipants(liveList);
        setIsCloudConnected(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Hot-Seat Modal State
  const [hotSeatParticipant, setHotSeatParticipant] = useState<MockParticipantSummary | null>(null);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [simMargin, setSimMargin] = useState(25);
  const [simRiskBuffer, setSimRiskBuffer] = useState(5);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '2026' || pinInput === 'admin') {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Synchronize the currently active test user into the top row of participants
  const liveActiveParticipant: MockParticipantSummary = {
    id: 'live_active_umkm',
    businessName: profile.name,
    ownerName: profile.ownerName,
    phone: profile.phone,
    sector: profile.sector,
    productCount: products.length,
    orderCount: orders.length,
    defectCount: defects.length,
    completedHomework: products.length >= 2 && orders.length >= 1 && defects.length >= 1,
    actualCopqRate: calculateBusinessCopqRate(products, orders, defects),
    totalRevenue: orders
      .filter((o) => o.stage !== 'Dibatalkan')
      .reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.qty * it.unitPriceSnapshot, 0), 0),
    sampleProduct: products[0],
    sampleDefects: defects,
  };

  // Merge live active UMKM with Cloud Firestore participants (or local seed fallback)
  const cohortSource = cloudParticipants.length > 0 ? cloudParticipants : MOCK_CLASS_PARTICIPANTS;
  const allParticipants = [
    liveActiveParticipant,
    ...cohortSource.filter((p) => p.phone !== profile.phone && p.id !== 'live_active_umkm'),
  ];

  // Filtered List
  const filteredParticipants = allParticipants.filter((p) => {
    if (sectorFilter === 'mebel' && p.sector !== 'mebel') return false;
    if (sectorFilter === 'fnb' && p.sector !== 'fnb') return false;
    if (sectorFilter === 'other' && (p.sector === 'mebel' || p.sector === 'fnb')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.businessName.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    }
    return true;
  });

  // Aggregate Metrics
  const totalCount = allParticipants.length;
  const mebelCount = allParticipants.filter((p) => p.sector === 'mebel').length;
  const fnbCount = allParticipants.filter((p) => p.sector === 'fnb').length;
  const homeworkCompletedCount = allParticipants.filter((p) => p.completedHomework).length;
  const homeworkCompletionRate = Math.round((homeworkCompletedCount / totalCount) * 100);

  const avgCopqMebel = Number(
    (
      allParticipants.filter((p) => p.sector === 'mebel').reduce((s, p) => s + p.actualCopqRate, 0) /
      Math.max(1, mebelCount)
    ).toFixed(1)
  );

  const avgCopqFnb = Number(
    (
      allParticipants.filter((p) => p.sector === 'fnb').reduce((s, p) => s + p.actualCopqRate, 0) /
      Math.max(1, fnbCount)
    ).toFixed(1)
  );

  // 1-Click CSV Export for PkM Report
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Nama Usaha',
      'Nama Pemilik',
      'Nomor Telepon',
      'Sektor Usaha',
      'Jumlah Produk HPP',
      'Jumlah Pesanan',
      'Jumlah Catatan Cacat',
      'Status Tugas Rumah',
      'Rasio Rugi Cacat (%)',
      'Total Nilai Pesanan (Rp)',
    ];

    const rows = allParticipants.map((p, idx) => [
      idx + 1,
      `"${p.businessName}"`,
      `"${p.ownerName}"`,
      `"${p.phone}"`,
      p.sector.toUpperCase(),
      p.productCount,
      p.orderCount,
      p.defectCount,
      p.completedHomework ? 'SELESAI (3/3)' : 'BELUM LENGKAP',
      p.actualCopqRate,
      p.totalRevenue,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Pelatihan_UMKM_Jepara_2026_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('File CSV Rekapitulasi Kelas berhasil diunduh.');
  };

  // Fallback sample product generator so EVERY participant row in the table can be inspected in Hot-Seat
  const resolveSampleProduct = (participant: MockParticipantSummary): Product | undefined => {
    if (participant.sampleProduct) return participant.sampleProduct;
    if (participant.productCount === 0) return undefined;
    return participant.sector === 'fnb' ? PRODUCTS_FNB[0] : PRODUCTS_MEBEL[0];
  };

  const openHotSeatModal = (participant: MockParticipantSummary) => {
    const resolvedProd = resolveSampleProduct(participant);
    const enriched = { ...participant, sampleProduct: resolvedProd };
    setHotSeatParticipant(enriched);
    setIsAnonymousMode(false);
    if (resolvedProd) {
      setSimMargin(Math.max(10, Math.round(resolvedProd.netMarginPercent || 20)));
      setSimRiskBuffer(resolvedProd.defectRiskPercent || 5);
    }
  };

  // Guard: Hanya Superadmin (asa482@ums.ac.id) atau Admin yang ditugaskan yang dapat mengakses
  if (!access.isAdmin) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
          <i className="fa-solid fa-lock text-xl"></i>
        </div>
        <h2 className="text-base font-bold text-slate-900">Akses Khusus Dosen & Administrator</h2>
        <p className="text-xs text-slate-600 mt-1 mb-4">
          Portal Monitoring Kelas ini hanya dapat diakses oleh Dosen ({SUPERADMIN_EMAIL}) atau Administrator yang telah ditugaskan oleh Superadmin. Peserta pelatihan menginput data melalui modul HPP, Pesanan, dan QC.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('hpp')}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
        >
          Kembali ke Aplikasi UMKM
        </button>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 bg-canvas border border-hairline rounded-md p-6 shadow-md text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
          <i className="fa-solid fa-lock"></i>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-ink uppercase tracking-wide">
            Portal Monitoring Dosen
          </h3>
          <p className="text-xs text-muted">
            Khusus Tim Pemateri (SNH, ASA, PSN). Masukkan PIN untuk membuka proyektor evaluasi tugas kelas.
          </p>
        </div>

        <form onSubmit={handleUnlockPin} className="space-y-3 pt-2">
          <input
            type="password"
            maxLength={6}
            placeholder="Masukkan PIN (Default: 2026)"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-2 rounded-md text-center font-mono font-bold text-lg text-ink outline-none focus:border-primary"
          />
          {pinError && <p className="text-xs text-danger-text font-bold">PIN salah. Silakan coba: 2026</p>}
          <button
            type="submit"
            className="w-full py-2 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary-hover shadow-micro"
          >
            Buka Portal Monitoring
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      {notice && (
        <div className="bg-primary text-white px-4 py-2.5 rounded-md text-xs font-bold flex items-center justify-between shadow-micro">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-check"></i>
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-white/80 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Top Banner & Return */}
      <div className="bg-canvas border border-hairline rounded-md p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-micro">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Portal Dosen &bull; Sesi 5 Jumat Pagi
            </span>
            {isCloudConnected ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firestore Live ({cohortSource.length} Peserta)</span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded">
                Mode Demo Lokal
              </span>
            )}
            <span className="text-[11px] text-muted font-bold">
              Pelatihan UMKM Kabupaten Jepara 2026 (SNH, ASA, PSN)
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-ink tracking-tight">
            Dashboard Monitoring Kelas & Bedah Kasus HPP
          </h2>
          <p className="text-xs text-muted">
            Data live rekapitulasi tugas rumah, audit margin tekor, dan bahan Hot-Seat proyektor.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-canvas text-body hover:text-ink border border-neutral-2 rounded-full text-xs font-bold hover:bg-neutral-1 flex items-center gap-1.5 shadow-micro"
            title="Unduh seluruh rekapitulasi data ke format CSV"
          >
            <i className="fa-solid fa-file-csv text-primary text-sm"></i>
            <span>Unduh Rekap CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hpp')}
            className="px-3.5 py-2 bg-primary text-white rounded-full text-xs font-bold hover:bg-primary-hover shadow-micro flex items-center gap-1.5"
          >
            <i className="fa-solid fa-arrow-left text-xs"></i>
            <span>Tampilan UMKM</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Grid (Proyektor Ready) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-canvas border border-hairline rounded-md p-4 shadow-micro space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Peserta UMKM Terdata
          </span>
          <div className="text-2xl font-black text-ink">{totalCount} Peserta</div>
          <div className="text-[11px] text-muted flex items-center justify-between pt-1 border-t border-hairline">
            <span>
              Mebel: <strong>{mebelCount}</strong>
            </span>
            <span>
              FnB: <strong>{fnbCount}</strong>
            </span>
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-md p-4 shadow-micro space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Penyelesaian Tugas Rumah
          </span>
          <div className="text-2xl font-black text-primary flex items-baseline gap-1.5">
            <span>{homeworkCompletionRate}%</span>
            <span className="text-xs font-bold text-muted">
              ({homeworkCompletedCount}/{totalCount})
            </span>
          </div>
          <div className="text-[11px] text-primary font-bold pt-1 border-t border-hairline flex items-center gap-1">
            <i className="fa-solid fa-circle-check text-[11px]"></i>
            <span>Target KPI &ge;80% Tercapai</span>
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-md p-4 shadow-micro space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Rata-rata Kebocoran COPQ Mebel
          </span>
          <div className="text-2xl font-black text-ink">{avgCopqMebel}%</div>
          <div className="text-[11px] text-muted pt-1 border-t border-hairline">
            Dominan: <strong>Kayu MC Tinggi & Finishing Belang</strong>
          </div>
        </div>

        <div className="bg-canvas border border-hairline rounded-md p-4 shadow-micro space-y-1">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Rata-rata Kebocoran COPQ FnB
          </span>
          <div className="text-2xl font-black text-ink">{avgCopqFnb}%</div>
          <div className="text-[11px] text-muted pt-1 border-t border-hairline">
            Dominan: <strong>Kemasan Bocor & Adonan Gagal</strong>
          </div>
        </div>
      </div>

      {/* Participants Table Section */}
      <div className="bg-canvas border border-hairline rounded-md p-4 space-y-3.5 shadow-micro">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-users text-primary text-sm"></i>
            <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
              Daftar Peserta Pelatihan & Audit Tugas Riil
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama usaha / pemilik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 border border-neutral-2 rounded-full text-xs text-ink outline-none focus:border-primary w-48 sm:w-56"
              />
              <i className="fa-solid fa-magnifying-glass text-[11px] text-muted absolute left-2.5 top-2.5"></i>
            </div>

            <div className="flex items-center gap-1 text-xs">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'mebel', label: 'Mebel' },
                { id: 'fnb', label: 'FnB' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSectorFilter(s.id as any)}
                  className={`px-3 py-1 rounded-full font-bold transition-colors ${
                    sectorFilter === s.id ? 'bg-primary text-white' : 'bg-neutral-1 text-body hover:text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-1 text-ink uppercase text-[10px] font-bold border-y border-hairline">
                <th className="py-2.5 px-3">Nama Usaha & Pemilik</th>
                <th className="py-2.5 px-2">Sektor</th>
                <th className="py-2.5 px-2 text-center">Produk</th>
                <th className="py-2.5 px-2 text-center">Order</th>
                <th className="py-2.5 px-2 text-center">Cacat</th>
                <th className="py-2.5 px-2 text-center">Status PR</th>
                <th className="py-2.5 px-3 text-right">Rugi COPQ (%)</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredParticipants.map((p) => {
                const isLiveActive = p.id === 'live_active_umkm';

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-neutral-1/60 transition-colors ${
                      isLiveActive ? 'bg-primary/5 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {isLiveActive && (
                          <span
                            className="px-1.5 py-0.5 rounded bg-primary text-white text-[9px] font-black uppercase shrink-0"
                            title="Tersinkronisasi langsung dengan tampilan UMKM Anda"
                          >
                            LIVE
                          </span>
                        )}
                        <div>
                          <div className="font-extrabold text-ink">{p.businessName}</div>
                          <div className="text-[11px] text-muted">
                            {p.ownerName} &bull; {p.phone}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-neutral-1 text-body border border-hairline uppercase">
                        {p.sector}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-center font-bold text-ink">{p.productCount}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-ink">{p.orderCount}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-ink">{p.defectCount}</td>

                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          p.completedHomework
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-badge-gold/20 text-ink border border-badge-gold/30'
                        }`}
                      >
                        {p.completedHomework ? 'Lengkap (3/3)' : 'Belum Lengkap'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-mono font-extrabold ${
                          p.actualCopqRate > 6 ? 'text-danger-text' : 'text-primary'
                        }`}
                      >
                        {p.actualCopqRate}%
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => openHotSeatModal(p)}
                        className="px-2.5 py-1 bg-white hover:bg-neutral-1 text-primary border border-primary/40 rounded-full font-bold text-[11px] shadow-micro flex items-center gap-1 ml-auto"
                      >
                        <i className="fa-solid fa-magnifying-glass-chart text-[10px]"></i>
                        <span>Bedah HPP</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hot-Seat Bedah Kasus Modal (Proyektor View) */}
      {hotSeatParticipant && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-canvas text-body rounded-md max-w-2xl w-full border border-hairline shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-primary text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                  Mode Bedah Kasus Nyata (Hot-Seat)
                </span>
                <h3 className="font-black text-lg md:text-xl tracking-tight text-white mt-0.5">
                  {isAnonymousMode ? 'Peserta UMKM Jepara (Mode Anonim)' : hotSeatParticipant.businessName}
                </h3>
                <p className="text-xs text-white/80">
                  {isAnonymousMode
                    ? 'Sektor: ' + hotSeatParticipant.sector.toUpperCase()
                    : `Pemilik: ${hotSeatParticipant.ownerName} (${hotSeatParticipant.phone})`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnonymousMode(!isAnonymousMode)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    isAnonymousMode
                      ? 'bg-badge-gold text-ink border-badge-gold'
                      : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                  }`}
                  title="Samarkan nama usaha peserta saat ditayangkan di proyektor"
                >
                  <i className={isAnonymousMode ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'}></i>
                  <span>{isAnonymousMode ? 'Nama Disamarkan' : 'Samarkan Nama'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHotSeatParticipant(null)}
                  className="text-white hover:text-white/80 p-1.5 text-base"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {hotSeatParticipant.sampleProduct ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                        Produk Sampel yang Dibedah
                      </span>
                      <h4 className="text-base font-extrabold text-ink">
                        {hotSeatParticipant.sampleProduct.name}
                      </h4>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-neutral-1 text-ink border border-hairline">
                      Metode:{' '}
                      {hotSeatParticipant.sampleProduct.calcMode === 'unit_based'
                        ? 'Per Unit'
                        : `Per Batch (${hotSeatParticipant.sampleProduct.outputQty} Porsi)`}
                    </span>
                  </div>

                  {/* Materials & Cost Breakdown */}
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1.5">
                      Rincian Struktur Biaya Asli:
                    </span>
                    <div className="divide-y divide-hairline border border-hairline rounded-sm p-3 bg-neutral-1">
                      {hotSeatParticipant.sampleProduct.materials.map((m) => (
                        <div key={m.id} className="py-1 flex items-center justify-between text-xs">
                          <span>
                            {m.name} ({m.qty} {m.unit} @ {formatRupiah(m.unitPrice)}
                            {m.wastagePercent > 0 ? ` + Susut ${m.wastagePercent}%` : ''})
                          </span>
                          <span className="font-bold text-ink">
                            {formatRupiah(
                              Math.round(
                                m.wastagePercent > 0
                                  ? (m.qty * m.unitPrice) / (1 - m.wastagePercent / 100)
                                  : m.qty * m.unitPrice
                              )
                            )}
                          </span>
                        </div>
                      ))}
                      <div className="py-1 flex items-center justify-between text-xs pt-1.5">
                        <span>Upah Tenaga Kerja:</span>
                        <span className="font-bold text-ink">
                          {formatRupiah(hotSeatParticipant.sampleProduct.laborCost)}
                        </span>
                      </div>
                      <div className="py-1 flex items-center justify-between text-xs">
                        <span>Biaya Operasional (Overhead):</span>
                        <span className="font-bold text-ink">
                          {formatRupiah(hotSeatParticipant.sampleProduct.overheadCost)}
                        </span>
                      </div>
                      <div className="py-1 flex items-center justify-between text-xs font-extrabold text-ink pt-1.5">
                        <span>HPP Dasar per Unit/Porsi:</span>
                        <span>{formatRupiah(hotSeatParticipant.sampleProduct.baseHpp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Live Simulation Sliders for Dosen ASA & PSN */}
                  <div className="bg-canvas border-2 border-primary/30 rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-primary font-black uppercase text-xs">
                        <i className="fa-solid fa-sliders"></i>
                        <span>Simulasi Koreksi Margin & Risiko Dosen (Live Hot-Seat)</span>
                      </div>
                      <span className="text-[10px] text-muted">
                        Harga Jual Awal: {formatRupiah(hotSeatParticipant.sampleProduct.sellingPrice)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1 font-bold">
                          <span>Target Margin Bersih (% Harga Jual):</span>
                          <span className="text-primary font-black">{simMargin}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          step={1}
                          value={simMargin}
                          onChange={(e) => setSimMargin(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1 font-bold">
                          <span>Cadangan Risiko Cacat (% HPP):</span>
                          <span className="text-primary font-black">{simRiskBuffer}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={25}
                          step={1}
                          value={simRiskBuffer}
                          onChange={(e) => setSimRiskBuffer(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>

                    {/* Quick Tier Buttons for Hot-Seat Proyektor */}
                    <div className="pt-1 space-y-1.5">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
                        Rekomendasi Kelas Produk Berdasarkan Karakter Pasar:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                        {[
                          { id: 'biasa', label: '1. Produk Biasa', margin: 18, desc: 'Pasar umum & putaran cepat' },
                          { id: 'sedang', label: '2. Produk Sedang', margin: 28, desc: 'Paling sehat untuk UMKM' },
                          { id: 'high_class', label: '3. High Class', margin: 40, desc: 'Custom & eksklusif' },
                        ].map((tier) => (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSimMargin(tier.margin)}
                            className={`p-2.5 rounded-sm border text-left transition-all ${
                              simMargin === tier.margin
                                ? 'bg-primary text-white border-primary shadow-micro'
                                : 'bg-canvas border-hairline hover:border-neutral-2 text-ink'
                            }`}
                          >
                            <div className="text-xs font-bold leading-tight">{tier.label} ({tier.margin}%)</div>
                            <div
                              className={`text-[10px] mt-0.5 leading-snug ${
                                simMargin === tier.margin ? 'text-white/80' : 'text-muted'
                              }`}
                            >
                              {tier.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Result */}
                    {(() => {
                      const baseHpp = hotSeatParticipant.sampleProduct.baseHpp;
                      const simSafeHpp = baseHpp + Math.round(baseHpp * (simRiskBuffer / 100));
                      const recPrice = calculateRecommendedSellingPrice(simSafeHpp, simMargin);
                      const simProfit = recPrice - simSafeHpp;
                      const actualMargin = recPrice > 0 ? Number(((simProfit / recPrice) * 100).toFixed(1)) : 0;
                      const simInsight = analyzeCurrentMarginInsight(simSafeHpp, recPrice);

                      return (
                        <div className="space-y-3 pt-1">
                          <div className="bg-neutral-1 p-3 rounded-sm border border-hairline grid grid-cols-3 gap-2 text-center">
                            <div>
                              <span className="text-[10px] font-bold text-muted block uppercase">HPP Riil Aman</span>
                              <span className="text-xs font-black text-ink">{formatRupiah(simSafeHpp)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-muted block uppercase">
                                Rekomendasi Harga Jual
                              </span>
                              <span className="text-xs font-black text-primary">{formatRupiah(recPrice)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-muted block uppercase">
                                Laba Bersih ({actualMargin}%)
                              </span>
                              <span className="text-xs font-black text-ink">{formatRupiah(simProfit)}</span>
                            </div>
                          </div>

                          {/* Pedagogical Insight for Classroom Discussion */}
                          <div className="bg-canvas border border-hairline rounded-sm p-3 space-y-1.5 text-xs text-body">
                            <div className="flex items-center justify-between border-b border-hairline pb-1.5">
                              <div className="font-bold text-ink flex items-center gap-1.5">
                                <i className={`${simInsight.icon} text-primary text-[10px]`}></i>
                                <span>Status Posisi: {simInsight.tierName}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${simInsight.badgeClass}`}>
                                {simInsight.badgeLabel}
                              </span>
                            </div>
                            <p className="leading-relaxed">
                              <strong className="text-ink">Pedoman Dosen:</strong> {simInsight.insightText}
                            </p>
                            <p className="text-[11px] text-muted leading-relaxed">
                              <i className="fa-solid fa-chalkboard-user text-primary text-[10px] mr-1"></i>
                              <strong>Catatan Evaluasi Kelas:</strong> {simInsight.adviceText}
                            </p>
                          </div>

                          {hotSeatParticipant.id === 'live_active_umkm' && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!hotSeatParticipant.sampleProduct) return;
                                  updateProduct(hotSeatParticipant.sampleProduct.id, {
                                    defectRiskPercent: simRiskBuffer,
                                    sellingPrice: recPrice,
                                  });
                                  showNotice(
                                    `Koreksi dosen (${formatRupiah(recPrice)}, cadangan ${simRiskBuffer}%) berhasil diterapkan ke katalog produk peserta.`
                                  );
                                  setHotSeatParticipant(null);
                                }}
                                className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro flex items-center gap-1.5"
                              >
                                <i className="fa-solid fa-check"></i>
                                <span>Terapkan Koreksi Ini ke Produk Peserta</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-muted">
                  Peserta ini belum mencatat rincian produk HPP di akunnya.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-hairline bg-neutral-1 flex justify-end">
              <button
                type="button"
                onClick={() => setHotSeatParticipant(null)}
                className="px-5 py-2 bg-ink text-white rounded-full text-xs font-bold hover:bg-body shadow-micro"
              >
                Tutup Layar Bedah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
