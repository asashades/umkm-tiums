import React, { useState, useMemo } from 'react';
import { useUmkm } from '../../context/UmkmContext';
import { generateFinancialReport, formatRupiah } from '../../utils/calculations';
import { generateFurnitureFinancialReport } from '../../utils/furnitureCalculations';
import { SECTOR_PRESETS } from '../../config/sectorPresets';

export const ReportModule: React.FC = () => {
  const { orders, defects, profile, laborContracts, laborPayments } = useUmkm();

  const currentSector = SECTOR_PRESETS[profile.sector] || SECTOR_PRESETS.mebel;
  const hasLaborContracts = Boolean(currentSector.features?.laborContracts);

  // Period Filter: 'this_month' | 'last_month' | 'all'
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'all'>('all');

  const periodDates = useMemo(() => {
    const now = new Date();
    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (period === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { start, end };
    }
    return {};
  }, [period]);

  const filteredOrders = orders.filter((o) => {
    if (period === 'all') return true;
    const orderDate = new Date(o.createdAt);
    const now = new Date();
    if (period === 'this_month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastYear;
  });

  const filteredDefects = defects.filter((d) => {
    if (period === 'all') return true;
    const defDate = new Date(d.date);
    const now = new Date();
    if (period === 'this_month') {
      return defDate.getMonth() === now.getMonth() && defDate.getFullYear() === now.getFullYear();
    }
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return defDate.getMonth() === lastMonth && defDate.getFullYear() === lastYear;
  });

  const report = hasLaborContracts
    ? generateFurnitureFinancialReport(
        filteredOrders,
        filteredDefects,
        laborContracts,
        laborPayments,
        periodDates
      )
    : {
        ...generateFinancialReport(filteredOrders, filteredDefects),
        totalLaborVariance: 0,
        trackedLaborOrderCount: 0,
        laborLiabilities: undefined,
      };

  const topPareto = report.paretoItems.length > 0 ? report.paretoItems[0] : null;

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-ink tracking-tight">Rapor Usaha & Analisis Pareto</h2>
          <p className="text-xs text-muted mt-0.5">
            Evaluasi omzet, arus kas vs piutang, potongan rugi cacat (COPQ), dan prioritas perbaikan 80/20.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-canvas p-1 rounded-full border border-hairline shrink-0 text-xs shadow-micro">
          {[
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'last_month', label: 'Bulan Lalu' },
            { id: 'all', label: 'Semua Waktu' },
          ].map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setPeriod(p.id as any)}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${
                period === p.id ? 'bg-primary text-white' : 'text-body hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Metric Cards Grid (2x2 flat blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Omzet Pesanan (Selesai + Diproses) */}
        <div className="bg-canvas border border-hairline rounded-md p-4 space-y-1 shadow-micro">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Total Omzet Produk
          </span>
          <div className="text-lg md:text-xl font-extrabold text-ink">
            {formatRupiah(report.totalProductRevenue)}
          </div>
          <div className="text-[11px] text-muted pt-1 border-t border-hairline flex items-center justify-between">
            <span>Selesai: <strong className="text-ink">{formatRupiah(report.completedProductRevenue)}</strong></span>
            <span>Proses: <strong className="text-ink">{formatRupiah(report.pipelineProductRevenue)}</strong></span>
          </div>
        </div>

        {/* Metric 2: Kas Masuk & Piutang Nyangkut */}
        <div className="bg-canvas border border-hairline rounded-md p-4 space-y-1 shadow-micro">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Kas Masuk Terkumpul (DP+Lunas)
          </span>
          <div className="text-lg md:text-xl font-extrabold text-primary">
            {formatRupiah(report.cashCollected)}
          </div>
          <div className="text-[11px] text-muted pt-1 border-t border-hairline flex items-center justify-between">
            <span>Sisa Piutang Pelanggan:</span>
            <span className={`font-bold ${report.totalReceivables > 0 ? 'text-danger-text' : 'text-primary'}`}>
              {formatRupiah(report.totalReceivables)}
            </span>
          </div>
        </div>

        {/* Metric 3: Kebocoran Biaya Cacat (COPQ) */}
        <div className="bg-canvas border border-hairline rounded-md p-4 space-y-1 shadow-micro">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Uang Bocor Akibat Cacat (COPQ)
            </span>
            <span className="bg-danger-subtle text-danger-text text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
              Rugi Mutu
            </span>
          </div>
          <div className="text-lg md:text-xl font-extrabold text-danger-text">
            {formatRupiah(report.totalActualCopq)}
          </div>
          <div className="text-[11px] text-muted pt-1 border-t border-hairline flex items-center justify-between">
            <span>Menggerus Laba Kotor:</span>
            <span className="font-bold text-danger-text">
              {report.baseGrossProfit > 0
                ? `${((report.totalActualCopq / report.baseGrossProfit) * 100).toFixed(1)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Metric 4: Laba Bersih Riil */}
        <div className="bg-canvas border border-hairline rounded-md p-4 space-y-1 shadow-micro">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Laba Bersih Riil Usaha
          </span>
          <div className="text-lg md:text-xl font-black text-ink flex items-baseline gap-1.5">
            <span>{formatRupiah(report.realNetProfit)}</span>
            <span
              className={`text-xs font-bold ${
                report.realNetMarginPercent >= 12 ? 'text-primary' : 'text-danger-text'
              }`}
            >
              ({report.realNetMarginPercent}%)
            </span>
          </div>
          <div className="text-[11px] text-muted pt-1 border-t border-hairline flex items-center justify-between">
            <span>Laba Kotor Sebelum Cacat:</span>
            <span className="font-bold text-ink">{formatRupiah(report.baseGrossProfit)}</span>
          </div>
        </div>
      </div>

      {/* Kartu Kewajiban Upah Tukang (Khusus Sektor Mebel - PRD Bagian 9.2) */}
      {hasLaborContracts && report.laborLiabilities && (
        <div className="bg-canvas border border-hairline rounded-md p-4 shadow-micro space-y-3">
          <div className="text-xs font-extrabold text-ink uppercase tracking-wide border-b border-hairline pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-people-carry-box text-primary"></i>
              <span>Kewajiban & Pengeluaran Upah Tukang</span>
            </div>
            <span className="text-[10px] text-muted font-normal lowercase">
              {period === 'all' ? 'semua waktu' : period === 'this_month' ? 'filter: bulan ini' : 'filter: bulan lalu'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Sisa Utang Upah */}
            <div className="bg-neutral-1 p-3 rounded-sm border border-hairline space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Sisa Utang Upah Borongan
              </span>
              <div className="text-base sm:text-lg font-black text-ink">
                {formatRupiah(report.laborLiabilities.outstandingWages)}
              </div>
              <p className="text-[10px] text-muted leading-tight">
                Kewajiban belum dibayar untuk seluruh borongan pengerjaan aktif & siap dilunasi.
              </p>
            </div>

            {/* 2. Kasbon Belum Lolos QC */}
            <div className="bg-neutral-1 p-3 rounded-sm border border-hairline space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Kasbon Belum Lolos QC
                </span>
                {report.laborLiabilities.kasbonBeforeQc > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-badge-gold/20 text-ink">
                    Risiko Kas
                  </span>
                )}
              </div>
              <div className={`text-base sm:text-lg font-black ${
                report.laborLiabilities.kasbonBeforeQc > 0 ? 'text-ink' : 'text-primary'
              }`}>
                {formatRupiah(report.laborLiabilities.kasbonBeforeQc)}
              </div>
              <p className="text-[10px] text-muted leading-tight">
                Uang kas yang sudah keluar tapi hasil kerja belum diverifikasi mandor.
              </p>
            </div>

            {/* 3. Kas Keluar Upah Periode Ini */}
            <div className="bg-neutral-1 p-3 rounded-sm border border-hairline space-y-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Kas Keluar Upah ({period === 'all' ? 'Total' : 'Periode'})
              </span>
              <div className="text-base sm:text-lg font-black text-primary">
                {formatRupiah(report.laborLiabilities.cashOutInPeriod)}
              </div>
              <p className="text-[10px] text-muted leading-tight">
                Total kasbon dan pelunasan yang dicairkan dalam filter periode ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ringkasan Perhitungan Laba Rugi (Transparansi Rumus) */}
      <div className="bg-canvas border border-hairline rounded-md p-4 shadow-micro">
        <div className="text-xs font-extrabold text-ink uppercase tracking-wide border-b border-hairline pb-2 mb-2.5 flex items-center gap-2">
          <i className="fa-solid fa-scale-balanced text-primary"></i>
          <span>Rincian Perhitungan Laba Rugi Produksi</span>
        </div>
        <div className="divide-y divide-hairline text-xs">
          <div className="py-1.5 flex items-center justify-between">
            <span className="text-body">1. Total Nilai Penjualan Produk (di luar ongkir/biaya titipan)</span>
            <span className="font-bold text-ink">{formatRupiah(report.totalProductRevenue)}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between">
            <span className="text-body">2. Dikurangi: Total Modal HPP Dasar Produksi</span>
            <span className="font-semibold text-muted">-{formatRupiah(report.totalActiveHpp)}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between bg-neutral-1/60 px-2 rounded-xs">
            <span className="font-bold text-ink">= Estimasi Laba Kotor (Jika Produksi 0% Cacat)</span>
            <span className="font-extrabold text-ink">{formatRupiah(report.baseGrossProfit)}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between">
            <span className="text-danger-text font-medium">
              3. Dikurangi: Total Kebocoran Biaya Cacat / Rework / Komplain (Actual COPQ)
            </span>
            <span className="font-bold text-danger-text">-{formatRupiah(report.totalActualCopq)}</span>
          </div>

          {/* Baris 4: Selisih Upah Borongan vs Standar HPP (Hanya tampil jika hasLaborContracts - PRD Bagian 9.1) */}
          {hasLaborContracts && (
            <div className="py-2 flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-body font-medium flex items-center gap-1.5">
                  <span>4. Dikurangi/Ditambah: Selisih Upah Borongan Riil vs Standar HPP</span>
                  {report.trackedLaborOrderCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-xs bg-neutral-1 border border-hairline font-bold text-ink">
                      {report.trackedLaborOrderCount} Pesanan Dicatat Penuh
                    </span>
                  )}
                </span>
                <span
                  className={`font-bold ${
                    report.totalLaborVariance > 0
                      ? 'text-danger-text'
                      : report.totalLaborVariance < 0
                      ? 'text-primary'
                      : 'text-muted'
                  }`}
                >
                  {report.totalLaborVariance > 0
                    ? `-${formatRupiah(report.totalLaborVariance)}`
                    : report.totalLaborVariance < 0
                    ? `+${formatRupiah(Math.abs(report.totalLaborVariance))}`
                    : 'Rp 0'}
                </span>
              </div>
              <div className="text-[10px] text-muted pl-3">
                {report.trackedLaborOrderCount > 0
                  ? report.totalLaborVariance > 0
                    ? `* Biaya borongan riil bengkak ${formatRupiah(report.totalLaborVariance)} di atas standar HPP, langsung mengurangi laba bersih riil.`
                    : report.totalLaborVariance < 0
                    ? `* Biaya borongan riil hemat ${formatRupiah(Math.abs(report.totalLaborVariance))} dibanding standar HPP, langsung menambah laba bersih riil.`
                    : `* Biaya borongan riil tepat sesuai standar upah HPP (tidak ada selisih).`
                  : `* Selisih upah tidak dihitung karena belum ada pesanan yang diaktifkan "Hitung Selisih ke Laba Bersih".`}
              </div>
            </div>
          )}

          <div className="py-2 flex items-center justify-between bg-primary/5 px-2 rounded-xs">
            <span className="font-extrabold text-primary">= Laba Bersih Riil Usaha ({report.realNetMarginPercent}% Margin)</span>
            <span className="font-black text-sm text-primary">{formatRupiah(report.realNetProfit)}</span>
          </div>
        </div>
      </div>

      {/* Section: Diagram Pareto 80/20 Masalah Kualitas */}
      <div className="bg-canvas border border-hairline rounded-md p-4 sm:p-5 space-y-4 shadow-micro">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-chart-pie text-primary text-sm"></i>
              <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
                Diagram Pareto Masalah Kualitas (Aturan 80/20)
              </h3>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Mengurutkan jenis masalah cacat dari yang paling banyak menguras modal usaha Anda.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0 font-bold">
            <span className="flex items-center gap-1.5 text-ink">
              <span className="w-3 h-3 rounded-xs bg-primary inline-block"></span>
              <span>Vital Few (80% Utama)</span>
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="w-3 h-3 rounded-xs bg-[#94A3B8] inline-block"></span>
              <span>Trivial Many (20% Sisanya)</span>
            </span>
          </div>
        </div>

        {/* Priority Action Recommendation Callout */}
        {topPareto && report.totalActualCopq > 0 && (
          <div className="bg-neutral-1 border border-hairline rounded-sm p-3.5 text-xs text-body flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-badge-gold text-ink flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
              <i className="fa-solid fa-crosshairs"></i>
            </div>
            <div className="space-y-1">
              <div className="font-extrabold text-ink uppercase tracking-wide text-[11px]">
                Fokus Perbaikan Kualitas Terbesar Minggu Ini
              </div>
              <div className="leading-relaxed">
                Masalah <strong className="text-ink">"{topPareto.defectType}"</strong> menyumbang{' '}
                <strong className="text-danger-text">{topPareto.sharePercent}%</strong> dari total seluruh kebocoran uang usaha Anda ({formatRupiah(topPareto.amount)}). Segera perbaiki akar masalah pada faktor{' '}
                <strong className="text-primary underline">{topPareto.topFactor}</strong> untuk menyelamatkan keuntungan!
              </div>
            </div>
          </div>
        )}

        {/* Pareto Horizontal Bars */}
        {report.paretoItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted">
            <i className="fa-solid fa-circle-check text-primary text-xl mb-2 block"></i>
            Tidak ada kerugian cacat yang tercatat pada periode ini.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {report.paretoItems.map((item, idx) => (
              <div key={item.defectType} className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-1 text-ink text-[10px] font-black flex items-center justify-center border border-hairline">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-ink">{item.defectType}</span>
                    <span className="text-[10px] text-muted">
                      ({item.count}x kejadian &bull; Faktor: {item.topFactor})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold text-ink">{formatRupiah(item.amount)}</span>
                    <span className="text-muted">({item.sharePercent}%)</span>
                    <span className="text-[10px] font-extrabold text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20">
                      Kumulatif: {item.cumulativePercent}%
                    </span>
                  </div>
                </div>

                {/* Single Bar Visual */}
                <div className="w-full bg-neutral-1 h-3 rounded-full overflow-hidden border border-hairline flex">
                  <div
                    className={`h-full transition-all duration-500 ${
                      item.isVitalFew ? 'bg-primary' : 'bg-[#94A3B8]'
                    }`}
                    style={{ width: `${Math.max(4, item.sharePercent)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
