import React, { useState } from 'react';
import { Quotation, QuotationStatus } from '../../types/furniture';
import { Product } from '../../types/titan';
import { getQuotationStatus } from '../../utils/furnitureCalculations';
import { formatRupiah } from '../../utils/calculations';

interface QuotationListProps {
  quotations: Quotation[];
  products: Product[];
  onAddQuote: () => void;
  onEditQuote: (q: Quotation) => void;
  onDeleteQuote: (id: string) => void;
  onConvertQuote: (q: Quotation) => void;
  onSendWhatsApp: (q: Quotation) => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({
  quotations,
  products,
  onAddQuote,
  onEditQuote,
  onDeleteQuote,
  onConvertQuote,
  onSendWhatsApp,
}) => {
  const [filter, setFilter] = useState<'all' | 'Draft' | 'Terkirim' | 'Disetujui' | 'Kedaluwarsa'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const todayISO = new Date().toISOString().split('T')[0];

  const filteredQuotes = quotations.filter((q) => {
    const status = getQuotationStatus(q, todayISO);
    if (filter === 'all') return true;
    return status === filter;
  });

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'Disetujui':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Terkirim':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'Kedaluwarsa':
        return 'bg-neutral-2 text-muted border-hairline';
      case 'Ditolak':
        return 'bg-danger-subtle text-danger-text border-danger-text/30';
      case 'Draft':
      default:
        return 'bg-neutral-1 text-body border-hairline';
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
            Surat Penawaran Harga (Quotation) & Price Lock 14 Hari
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Kunci modal HPP & margin sebelum negosiasi dengan calon pembeli, serta cegah rugi akibat kenaikan bahan baku mendadak.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddQuote}
          disabled={products.length === 0}
          className={`w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-full shadow-micro flex items-center justify-center gap-2 shrink-0 transition-colors ${
            products.length === 0
              ? 'bg-neutral-2 text-muted cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Buat Surat Penawaran</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: `Semua (${quotations.length})` },
          {
            id: 'Draft',
            label: `Draft (${quotations.filter((q) => getQuotationStatus(q, todayISO) === 'Draft').length})`,
          },
          {
            id: 'Terkirim',
            label: `Terkirim (${quotations.filter((q) => getQuotationStatus(q, todayISO) === 'Terkirim').length})`,
          },
          {
            id: 'Disetujui',
            label: `Disetujui (${quotations.filter((q) => getQuotationStatus(q, todayISO) === 'Disetujui').length})`,
          },
          {
            id: 'Kedaluwarsa',
            label: `Kedaluwarsa (${quotations.filter((q) => getQuotationStatus(q, todayISO) === 'Kedaluwarsa').length})`,
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

      {/* Quotation Cards */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-canvas border border-hairline rounded-md p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-1 text-muted flex items-center justify-center mx-auto text-xl">
            <i className="fa-solid fa-file-contract"></i>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink">Tidak Ada Surat Penawaran</h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Surat penawaran harga melindungi laba pesanan Anda dari fluktuasi harga kayu selama negosiasi.
            </p>
          </div>
          {products.length > 0 && (
            <button
              type="button"
              onClick={onAddQuote}
              className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-hover"
            >
              Buat Penawaran Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((q) => {
            const status = getQuotationStatus(q, todayISO);
            const subtotal = q.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
            const grandTotal = subtotal + (q.customFee || 0);

            const isExpired = status === 'Kedaluwarsa';
            const isConverted = status === 'Disetujui';

            return (
              <div
                key={q.id}
                className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro hover:border-neutral-2 transition-colors"
              >
                {/* Top Row: Quote Number, Customer, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2.5">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-mono text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded-xs border border-primary/20">
                      {q.quoteNumber}
                    </span>
                    <h4 className="font-extrabold text-sm text-ink">{q.customerName}</h4>
                    <span className="text-xs text-muted">({q.customerPhone})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${getStatusBadge(
                        status
                      )}`}
                    >
                      {status}
                    </span>

                    {/* Actions: Edit & Delete */}
                    {!isConverted && (
                      <button
                        type="button"
                        onClick={() => onEditQuote(q)}
                        className="text-muted hover:text-ink p-1 text-xs"
                        title="Edit Penawaran"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    )}

                    {confirmDeleteId === q.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteQuote(q.id);
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
                        onClick={() => setConfirmDeleteId(q.id)}
                        className="text-muted hover:text-danger-text p-1 text-xs"
                        title="Hapus Penawaran"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Summary */}
                <div className="space-y-1.5">
                  <div className="divide-y divide-hairline">
                    {q.items.map((it) => (
                      <div key={it.id} className="py-1.5 flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-ink leading-snug">{it.productNameSnapshot}</div>
                          {it.spec && (it.spec.woodType || it.spec.finishing) && (
                            <div className="text-[11px] text-muted">
                              {it.spec.woodType && <span>Kayu: {it.spec.woodType}</span>}
                              {it.spec.finishing && <span> &bull; Fin: {it.spec.finishing}</span>}
                              {it.spec.notes && <span> ({it.spec.notes})</span>}
                            </div>
                          )}
                          <div className="text-[11px] text-muted font-medium">
                            {it.qty} unit &times; {formatRupiah(it.unitPrice)}
                          </div>
                        </div>
                        <span className="font-bold text-ink shrink-0">{formatRupiah(it.qty * it.unitPrice)}</span>
                      </div>
                    ))}
                  </div>

                  {q.customFee > 0 && (
                    <div className="py-1 flex items-center justify-between text-xs text-muted border-t border-hairline/60">
                      <span>Estimasi Ongkir ({q.customFeeNote || 'Ekspedisi'}):</span>
                      <span className="font-semibold text-ink">+{formatRupiah(q.customFee)}</span>
                    </div>
                  )}
                </div>

                {/* Financial & Validity Banner */}
                <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Total Nilai Penawaran
                    </span>
                    <span className="text-sm font-extrabold text-ink">{formatRupiah(grandTotal)}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-bold">Waktu Produksi</span>
                      <span className="font-semibold text-ink">{q.leadTimeWeeks} Minggu</span>
                    </div>

                    <div>
                      <span className="text-muted block text-[10px] uppercase font-bold">Price Lock 14 Hari</span>
                      <span
                        className={`font-semibold ${
                          isExpired ? 'text-danger-text font-bold' : 'text-primary'
                        }`}
                      >
                        {isExpired ? 'Kedaluwarsa' : `s/d ${q.validUntil}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-hairline text-xs">
                  <div className="text-[11px] text-muted">
                    Skema: <strong>{q.paymentPlan.map((p) => `${p.percent}%`).join(' / ')}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() => onSendWhatsApp(q)}
                      className="px-3 py-1.5 text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-full border border-primary/30 flex items-center gap-1.5"
                    >
                      <i className="fa-brands fa-whatsapp text-xs"></i>
                      <span>Kirim Penawaran WA</span>
                    </button>

                    {/* Convert to Order Button */}
                    {!isConverted ? (
                      <button
                        type="button"
                        onClick={() => onConvertQuote(q)}
                        className="px-3.5 py-1.5 text-[11px] font-bold text-white bg-primary hover:bg-primary-hover rounded-full shadow-micro flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-arrow-right-to-bracket text-xs"></i>
                        <span>Konversi ke Pesanan</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <i className="fa-solid fa-circle-check text-xs"></i>
                        <span>Sudah Dikonversi ke Pesanan</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
