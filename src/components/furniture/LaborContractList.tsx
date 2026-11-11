import React, { useState } from 'react';
import { LaborContract, LaborPayment, Craftsman, LaborContractStatus } from '../../types/furniture';
import { Order } from '../../types/titan';
import { summarizeLaborContract } from '../../utils/furnitureCalculations';
import { formatRupiah } from '../../utils/calculations';

interface LaborContractListProps {
  contracts: LaborContract[];
  payments: LaborPayment[];
  craftsmen: Craftsman[];
  orders: Order[];
  onAddContract: () => void;
  onOpenPaymentModal: (contract: LaborContract) => void;
  onToggleQc: (contractId: string) => void;
  onDeletePayment: (paymentId: string) => void;
  onDeleteContract: (contractId: string) => void;
}

export const LaborContractList: React.FC<LaborContractListProps> = ({
  contracts,
  payments,
  craftsmen,
  orders,
  onAddContract,
  onOpenPaymentModal,
  onToggleQc,
  onDeletePayment,
  onDeleteContract,
}) => {
  const [filter, setFilter] = useState<'all' | 'Berjalan' | 'Siap Dilunasi' | 'Lunas'>('all');
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredContracts = contracts.filter((c) => {
    const summary = summarizeLaborContract(c, payments);
    if (filter === 'all') return true;
    return summary.status === filter;
  });

  // Top KPI Metrics (PRD Modul Mebel Bagian 8.8)
  const outstandingWages = contracts.reduce((sum, c) => {
    const s = summarizeLaborContract(c, payments);
    return s.status === 'Berjalan' || s.status === 'Siap Dilunasi' ? sum + s.remaining : sum;
  }, 0);

  const kasbonBeforeQc = contracts.reduce((sum, c) => {
    const s = summarizeLaborContract(c, payments);
    return s.status === 'Berjalan' ? sum + s.kasbon : sum;
  }, 0);

  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const paidThisMonth = payments
    .filter((p) => p.date.startsWith(currentMonthStr))
    .reduce((sum, p) => sum + p.amount, 0);

  const handleSendWhatsApp = (contract: LaborContract) => {
    const s = summarizeLaborContract(contract, payments);
    const crf = craftsmen.find((x) => x.id === contract.craftsmanId);

    // Total sisa upah tukang ini dari seluruh borongannya
    const craftsmanTotalRemaining = contracts
      .filter((c) => c.craftsmanId === contract.craftsmanId)
      .reduce((sum, c) => sum + summarizeLaborContract(c, payments).remaining, 0);

    const message = `*REKAP UPAH BORONGAN*
${contract.craftsmanNameSnapshot}

Pesanan: ${contract.orderNumberSnapshot}
Pekerjaan: ${contract.scope}
Borongan: ${formatRupiah(contract.agreedAmount)}${contract.deductionAmount ? ` | Potongan: ${formatRupiah(contract.deductionAmount)}` : ''}
Kasbon: ${formatRupiah(s.kasbon)} | Dilunasi: ${formatRupiah(s.settlement)}
Sisa Upah Pekerjaan Ini: ${formatRupiah(s.remaining)} (${contract.qcPassedAt ? 'Lolos QC' : 'Menunggu QC'})

*Total Sisa Upah Tukang: ${formatRupiah(craftsmanTotalRemaining)}*`;

    const phone = crf?.phone?.replace(/\D/g, '') || '';
    const cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getStatusBadgeClass = (status: LaborContractStatus) => {
    switch (status) {
      case 'Lunas':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Siap Dilunasi':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Berjalan':
        return 'bg-badge-gold/20 text-ink border-badge-gold/40';
      case 'Dibatalkan':
      default:
        return 'bg-neutral-2 text-muted border-hairline';
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
            Upah Borongan & Kasbon Tukang Kayu
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Lacak kasbon berkala, kendalikan risiko over-kasbon sebelum lolos QC, dan pantau selisih upah riil vs HPP.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddContract}
          disabled={orders.length === 0}
          className={`w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-full shadow-micro flex items-center justify-center gap-2 shrink-0 transition-colors ${
            orders.length === 0
              ? 'bg-neutral-2 text-muted cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Buat Borongan Kerja</span>
        </button>
      </div>

      {/* KPI Summary Bar (PRD Modul Mebel Bagian 8.8) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-canvas p-3 rounded-md border border-hairline shadow-micro">
        <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Sisa Utang Upah Borongan
          </span>
          <div className="text-sm sm:text-base font-black text-ink mt-0.5">
            {formatRupiah(outstandingWages)}
          </div>
          <span className="text-[10px] text-muted block">Borongan berjalan & siap lunasi</span>
        </div>

        <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Kasbon Belum Lolos QC
            </span>
            {kasbonBeforeQc > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-badge-gold/20 text-ink">
                Risiko Kas
              </span>
            )}
          </div>
          <div className={`text-sm sm:text-base font-black mt-0.5 ${kasbonBeforeQc > 0 ? 'text-ink' : 'text-primary'}`}>
            {formatRupiah(kasbonBeforeQc)}
          </div>
          <span className="text-[10px] text-muted block">Pekerjaan masih pengerjaan</span>
        </div>

        <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Kas Keluar Upah Bulan Ini
          </span>
          <div className="text-sm sm:text-base font-black text-primary mt-0.5">
            {formatRupiah(paidThisMonth)}
          </div>
          <span className="text-[10px] text-muted block">Total kasbon & pelunasan cair</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: `Semua (${contracts.length})` },
          {
            id: 'Berjalan',
            label: `Pengerjaan (${contracts.filter((c) => summarizeLaborContract(c, payments).status === 'Berjalan').length})`,
          },
          {
            id: 'Siap Dilunasi',
            label: `Lolos QC (${contracts.filter((c) => summarizeLaborContract(c, payments).status === 'Siap Dilunasi').length})`,
          },
          {
            id: 'Lunas',
            label: `Lunas (${contracts.filter((c) => summarizeLaborContract(c, payments).status === 'Lunas').length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-full font-bold transition-colors whitespace-nowrap ${
              filter === tab.id
                ? 'bg-primary text-white shadow-micro'
                : 'bg-canvas text-body hover:text-ink border border-hairline'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <div className="bg-canvas border border-hairline rounded-md p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-1 text-muted flex items-center justify-center mx-auto text-xl">
            <i className="fa-solid fa-person-digging"></i>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink">Belum Ada Borongan Kerja</h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Catat kontrak borongan tukang per pesanan untuk mencegah kebocoran kasbon melebihi sisa hasil kerja.
            </p>
          </div>
          {orders.length > 0 && (
            <button
              type="button"
              onClick={onAddContract}
              className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-hover"
            >
              Catat Borongan Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContracts.map((c) => {
            const summary = summarizeLaborContract(c, payments);
            const contractPayments = payments.filter((p) => p.contractId === c.id);
            const isHistoryOpen = openHistoryId === c.id;

            return (
              <div
                key={c.id}
                className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro hover:border-neutral-2 transition-colors"
              >
                {/* Top Row: Order Number, Craftsman, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2.5">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-mono text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded-xs border border-primary/20">
                      {c.orderNumberSnapshot}
                    </span>
                    <h4 className="font-extrabold text-sm text-ink">{c.craftsmanNameSnapshot}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${getStatusBadgeClass(
                        summary.status
                      )}`}
                    >
                      {summary.status}
                    </span>

                    {confirmDeleteId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteContract(c.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 bg-danger-text text-white rounded-sm text-[10px] font-bold"
                        >
                          Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 bg-neutral-1 text-body rounded-sm text-[10px]"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="text-muted hover:text-danger-text p-1 text-xs"
                        title="Hapus Borongan"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Scope of Work */}
                <div className="text-xs text-ink font-semibold flex items-start gap-1.5">
                  <i className="fa-solid fa-screwdriver-wrench text-muted mt-0.5 text-[11px]"></i>
                  <span>{c.scope}</span>
                </div>

                {/* High Kasbon Warning Alert (>70% before QC) */}
                {summary.isHighKasbonWarning && (
                  <div className="bg-badge-gold/20 border border-badge-gold/60 p-2.5 rounded-sm text-[11px] text-ink flex items-center justify-between gap-2 shadow-micro">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-amber-700"></i>
                      <span>
                        Peringatan Kasbon Tinggi: Tukang telah menarik <strong>{summary.kasbonRatioPercent}%</strong> dari nilai borongan sebelum barang lolos QC.
                      </span>
                    </div>
                  </div>
                )}

                {/* Financial Summary Card */}
                <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted block text-[10px] uppercase font-bold">Nilai Borongan</span>
                    <strong className="text-ink text-xs">{formatRupiah(summary.payable)}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px] uppercase font-bold">
                      Kasbon ({summary.kasbonRatioPercent}%)
                    </span>
                    <strong className="text-amber-800 text-xs">{formatRupiah(summary.kasbon)}</strong>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px] uppercase font-bold">Sisa Upah</span>
                    <strong
                      className={`text-xs ${
                        summary.remaining > 0 ? 'text-primary' : 'text-emerald-700'
                      }`}
                    >
                      {formatRupiah(summary.remaining)}
                    </strong>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-hairline text-xs">
                  <div className="flex items-center gap-2">
                    {/* QC Status Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleQc(c.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition-all flex items-center gap-1.5 ${
                        c.qcPassedAt
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-neutral-1 text-body border-hairline hover:border-neutral-2'
                      }`}
                    >
                      <i
                        className={
                          c.qcPassedAt ? 'fa-solid fa-circle-check text-emerald-600' : 'fa-regular fa-circle'
                        }
                      ></i>
                      <span>{c.qcPassedAt ? 'Lolos QC Mandor' : 'Tandai Lolos QC'}</span>
                    </button>

                    {/* WhatsApp Rekap Button */}
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(c)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1 transition-colors"
                      title="Kirim rincian rekap borongan & kasbon ke WhatsApp tukang"
                    >
                      <i className="fa-brands fa-whatsapp text-xs"></i>
                      <span>Kirim WA</span>
                    </button>

                    {/* History Toggle */}
                    <button
                      type="button"
                      onClick={() => setOpenHistoryId(isHistoryOpen ? null : c.id)}
                      className="text-[11px] text-muted hover:text-ink font-semibold flex items-center gap-1"
                    >
                      <span>Riwayat Bayar ({contractPayments.length})</span>
                      <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                  </div>

                  {/* Payment Button */}
                  {summary.remaining > 0 ? (
                    <button
                      type="button"
                      onClick={() => onOpenPaymentModal(c)}
                      className="px-3.5 py-1.5 text-[11px] font-bold text-white bg-primary hover:bg-primary-hover rounded-full shadow-micro flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-money-bill-wave text-xs"></i>
                      <span>+ Catat Kasbon / Pelunasan</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200">
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>Borongan Lunas Penuh</span>
                    </span>
                  )}
                </div>

                {/* Payment History Accordion */}
                {isHistoryOpen && (
                  <div className="pt-2 border-t border-hairline/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Rincian Pembayaran Kasbon & Pelunasan:
                    </span>
                    {contractPayments.length === 0 ? (
                      <div className="text-[11px] text-muted italic">Belum ada kasbon yang ditarik.</div>
                    ) : (
                      <div className="divide-y divide-hairline border border-hairline rounded-sm overflow-hidden bg-neutral-1/50">
                        {contractPayments.map((p) => (
                          <div key={p.id} className="p-2 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                  p.type === 'pelunasan'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-badge-gold/20 text-ink'
                                }`}
                              >
                                {p.type}
                              </span>
                              <span className="font-bold text-ink">{formatRupiah(p.amount)}</span>
                              <span className="text-muted">({p.date})</span>
                              {p.note && <span className="text-muted italic">&bull; {p.note}</span>}
                            </div>
                            <button
                              type="button"
                              onClick={() => onDeletePayment(p.id)}
                              className="text-muted hover:text-danger-text p-1 text-[11px]"
                              title="Hapus Pembayaran"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
