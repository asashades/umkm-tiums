import React from 'react';
import { Quotation } from '../../types/furniture';
import { Product } from '../../types/titan';
import { evaluateQuoteConversion } from '../../utils/furnitureCalculations';
import { formatRupiah } from '../../utils/calculations';

interface QuotationConvertModalProps {
  quotation: Quotation;
  products: Product[];
  onConfirm: () => void;
  onCancel: () => void;
  onEditQuote: () => void;
}

export const QuotationConvertModal: React.FC<QuotationConvertModalProps> = ({
  quotation,
  products,
  onConfirm,
  onCancel,
  onEditQuote,
}) => {
  const check = evaluateQuoteConversion(quotation, products);

  const subtotal = quotation.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const grandTotal = subtotal + (quotation.customFee || 0);

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-canvas rounded-md max-w-lg w-full border border-hairline shadow-lg overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-ink">
            <i className="fa-solid fa-arrow-right-to-bracket text-primary text-sm"></i>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">
              Konversi Surat Penawaran ke Pesanan Aktif
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted hover:text-ink text-sm p-1"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Quote Overview */}
          <div className="bg-neutral-1 p-3 rounded-sm border border-hairline space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="font-mono text-[11px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-xs border border-primary/20">
                {quotation.quoteNumber}
              </span>
              <span className="text-[11px] text-muted">
                Dibuat: <strong>{new Date(quotation.createdAt).toLocaleDateString('id-ID')}</strong>
              </span>
            </div>

            <div className="text-ink font-bold text-sm">{quotation.customerName}</div>
            <div className="text-muted text-[11px]">
              {quotation.items.length} item produk &bull; Estimasi Total:{' '}
              <strong className="text-ink font-bold">{formatRupiah(grandTotal)}</strong>
            </div>
          </div>

          {/* Missing Product Errors */}
          {!check.canConvert && check.errors.length > 0 && (
            <div className="bg-danger-subtle border border-danger-text/30 rounded-md p-3 text-xs text-danger-text space-y-1.5 shadow-micro">
              <div className="font-extrabold flex items-center gap-1.5">
                <i className="fa-solid fa-circle-xmark"></i>
                <span>Tidak Dapat Mengonversi Penawaran</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                {check.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Margin Shift Warnings (Price Lock Protection Check) */}
          {check.canConvert && check.shifts.length > 0 && (
            <div className="bg-badge-gold/15 border border-badge-gold/50 rounded-md p-3 text-xs text-ink space-y-2 shadow-micro">
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation text-base shrink-0 text-amber-600 mt-0.5"></i>
                <div>
                  <div className="font-extrabold text-ink uppercase tracking-wide text-[11px]">
                    Peringatan Kenaikan Biaya Bahan Baku (Erosi Margin)
                  </div>
                  <div className="text-[11px] text-body mt-0.5">
                    Sejak surat penawaran ini dibuat, terjadi kenaikan harga bahan baku pada katalog HPP sehingga margin laba mengalami penurunan:
                  </div>
                </div>
              </div>

              <div className="bg-canvas rounded-sm border border-hairline p-2 space-y-1.5 divide-y divide-hairline">
                {check.shifts.map((s, idx) => (
                  <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-ink">{s.productName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted">
                        Margin Awal: <strong>{s.marginAtQuote}%</strong>
                      </span>
                      <i className="fa-solid fa-arrow-right text-[9px] text-muted"></i>
                      <span className="font-extrabold text-danger-text">
                        Sekarang: {s.marginNow}% (-{s.dropPoints}% pt)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-muted italic">
                Pelanggan memiliki hak harga tetap selama masa berlaku 14 hari. Anda dapat tetap mengonversi dengan harga lama, atau membuat penawaran revisi.
              </div>
            </div>
          )}

          {/* Items Summary */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Daftar Item yang Akan Masuk ke Antrean Pesanan:
            </span>
            <div className="divide-y divide-hairline border border-hairline rounded-sm overflow-hidden bg-canvas">
              {quotation.items.map((it) => (
                <div key={it.id} className="p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-ink text-xs">{it.productNameSnapshot}</div>
                    {it.spec && (it.spec.woodType || it.spec.finishing) && (
                      <div className="text-[11px] text-muted mt-0.5">
                        {it.spec.woodType && <span>Kayu: {it.spec.woodType}</span>}
                        {it.spec.finishing && <span> &bull; Finishing: {it.spec.finishing}</span>}
                      </div>
                    )}
                    <div className="text-[11px] text-muted">
                      {it.qty} unit &times; {formatRupiah(it.unitPrice)}
                    </div>
                  </div>
                  <span className="font-bold text-ink text-xs shrink-0">
                    {formatRupiah(it.qty * it.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Plan Info */}
          <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline flex items-center justify-between text-xs">
            <span className="text-muted">Skema Pembayaran yang Disepakati:</span>
            <span className="font-bold text-ink">
              {quotation.paymentPlan.map((p) => `${p.percent}%`).join(' / ')}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-neutral-1 px-4 py-3 border-t border-hairline flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-2/50"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            {check.shifts.length > 0 && (
              <button
                type="button"
                onClick={onEditQuote}
                className="px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/5 text-xs font-bold flex items-center gap-1.5"
              >
                <i className="fa-solid fa-pen-to-square text-[11px]"></i>
                <span>Revisi Harga Penawaran</span>
              </button>
            )}

            <button
              type="button"
              disabled={!check.canConvert}
              onClick={onConfirm}
              className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-micro flex items-center gap-1.5 ${
                check.canConvert
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-neutral-2 text-muted cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-check text-xs"></i>
              <span>Konfirmasi Buat Pesanan Baru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
