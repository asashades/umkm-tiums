import React, { useState } from 'react';
import { Quotation, QuotationItem } from '../../types/furniture';
import { Product } from '../../types/titan';
import { formatRupiah } from '../../utils/calculations';
import { PaymentPlanEditor } from './PaymentPlanEditor';
import { DEFAULT_FURNITURE_PAYMENT_PLAN } from '../../config/sectorPresets';

interface QuotationFormModalProps {
  initialQuotation?: Quotation | null;
  products: Product[];
  onSave: (quoteData: Omit<Quotation, 'id' | 'quoteNumber' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  initialQuotation,
  products,
  onSave,
  onCancel,
}) => {
  const [customerName, setCustomerName] = useState(initialQuotation?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialQuotation?.customerPhone || '628');
  const [leadTimeWeeks, setLeadTimeWeeks] = useState(initialQuotation?.leadTimeWeeks || 3);
  const [validUntil, setValidUntil] = useState(
    initialQuotation?.validUntil ||
      new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [customFee, setCustomFee] = useState(initialQuotation?.customFee || 0);
  const [customFeeNote, setCustomFeeNote] = useState(initialQuotation?.customFeeNote || '');
  const [notes, setNotes] = useState(
    initialQuotation?.notes || 'Penawaran berlaku 14 hari. Termasuk paking standart aman ekspedisi.'
  );
  const [paymentPlan, setPaymentPlan] = useState(
    initialQuotation?.paymentPlan || DEFAULT_FURNITURE_PAYMENT_PLAN
  );
  const [showPlanEditor, setShowPlanEditor] = useState(false);

  // Items State
  const [items, setItems] = useState<QuotationItem[]>(() => {
    if (initialQuotation && initialQuotation.items.length > 0) {
      return initialQuotation.items;
    }
    if (products.length > 0) {
      const p = products[0];
      return [
        {
          id: `qit_${Date.now()}`,
          productId: p.id,
          productNameSnapshot: p.name,
          qty: 1,
          unitPrice: p.sellingPrice,
          baseHppAtQuote: p.baseHpp,
          safeHppAtQuote: p.safeHpp,
          spec: {
            woodType: 'Kayu Jati Grade A',
            finishing: 'Melamin Doff Natural',
            notes: '',
          },
        },
      ];
    }
    return [];
  });

  const handleAddItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    const newItem: QuotationItem = {
      id: `qit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: p.id,
      productNameSnapshot: p.name,
      qty: 1,
      unitPrice: p.sellingPrice,
      baseHppAtQuote: p.baseHpp,
      safeHppAtQuote: p.safeHpp,
      spec: {
        woodType: 'Kayu Jati Grade A',
        finishing: 'Melamin Doff Natural',
        notes: '',
      },
    };
    setItems([...items, newItem]);
  };

  const handleProductChange = (index: number, productId: string) => {
    const selectedProd = products.find((p) => p.id === productId);
    if (!selectedProd) return;
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: selectedProd.id,
      productNameSnapshot: selectedProd.name,
      unitPrice: selectedProd.sellingPrice,
      baseHppAtQuote: selectedProd.baseHpp,
      safeHppAtQuote: selectedProd.safeHpp,
    };
    setItems(updated);
  };

  const handleItemFieldChange = <K extends keyof QuotationItem>(
    index: number,
    field: K,
    val: QuotationItem[K]
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleSpecChange = (index: number, specField: keyof QuotationItem['spec'], val: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      spec: {
        ...updated[index].spec,
        [specField]: val,
      },
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const grandTotal = subtotal + (Number(customFee) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || items.length === 0) return;

    let cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    onSave({
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      items,
      customFee: Number(customFee) || 0,
      customFeeNote: customFeeNote.trim(),
      leadTimeWeeks: Number(leadTimeWeeks) || 3,
      validUntil,
      paymentPlan,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-canvas rounded-md max-w-2xl w-full border border-hairline shadow-lg overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-ink">
            <i className="fa-solid fa-file-invoice-dollar text-primary text-sm"></i>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">
              {initialQuotation ? `Edit Surat Penawaran (${initialQuotation.quoteNumber})` : 'Buat Surat Penawaran Harga Baru'}
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Customer & Validity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                Nama Calon Pembeli / Proyek *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Bpk. Hendra Gunawan / Resto Bale Sambal"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                Nomor WhatsApp (Format: 628...) *
              </label>
              <input
                type="tel"
                required
                placeholder="Contoh: 6281234567890"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                Masa Berlaku Penawaran (Price Lock) *
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold bg-canvas"
              />
              <span className="text-[10px] text-muted mt-0.5 block">
                Standar Jepara: 14 hari garansi harga tetap.
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                Estimasi Waktu Pengerjaan (Lead Time) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={52}
                  required
                  value={leadTimeWeeks}
                  onChange={(e) => setLeadTimeWeeks(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold text-center"
                />
                <span className="text-xs font-semibold text-body">Minggu sejak DP diterima</span>
              </div>
            </div>
          </div>

          {/* Quotation Items */}
          <div className="border-t border-hairline pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                Item & Spesifikasi Produk yang Ditawarkan *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                <span>Tambah Produk</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => {
                const margin =
                  it.unitPrice > 0
                    ? (((it.unitPrice - it.safeHppAtQuote) / it.unitPrice) * 100).toFixed(1)
                    : '0';

                return (
                  <div
                    key={it.id}
                    className="bg-neutral-1 p-3 rounded-md border border-hairline space-y-2 shadow-micro"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-6">
                        <select
                          value={it.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-neutral-2 rounded-sm text-xs font-bold text-ink bg-canvas"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (HPP Riil: {formatRupiah(p.safeHpp)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          min={1}
                          required
                          placeholder="Qty"
                          value={it.qty}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'qty', Math.max(1, Number(e.target.value)))
                          }
                          className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs text-right font-bold text-ink bg-canvas"
                        />
                      </div>

                      <div className="col-span-7 sm:col-span-3">
                        <input
                          type="number"
                          min={0}
                          required
                          placeholder="Harga Penawaran"
                          value={it.unitPrice}
                          onChange={(e) =>
                            handleItemFieldChange(idx, 'unitPrice', Number(e.target.value))
                          }
                          className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs text-right font-bold text-ink bg-canvas"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-muted hover:text-danger-text p-1 text-sm"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Margin & Subtotal Indicator */}
                    <div className="flex items-center justify-between text-[11px] px-1 text-muted">
                      <span>
                        HPP Riil Terkunci: <strong>{formatRupiah(it.safeHppAtQuote)}</strong> &bull; Margin:{' '}
                        <strong
                          className={Number(margin) >= 20 ? 'text-emerald-700' : 'text-amber-700'}
                        >
                          {margin}%
                        </strong>
                      </span>
                      <span className="font-extrabold text-ink">
                        Subtotal: {formatRupiah(it.qty * it.unitPrice)}
                      </span>
                    </div>

                    {/* Specification Note Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-hairline/80">
                      <div>
                        <input
                          type="text"
                          placeholder="Bahan Kayu (misal: Jati Grade A)"
                          value={it.spec?.woodType || ''}
                          onChange={(e) => handleSpecChange(idx, 'woodType', e.target.value)}
                          className="w-full px-2 py-1 border border-neutral-2 rounded text-[11px] bg-canvas text-ink"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Finishing (misal: Melamin Doff)"
                          value={it.spec?.finishing || ''}
                          onChange={(e) => handleSpecChange(idx, 'finishing', e.target.value)}
                          className="w-full px-2 py-1 border border-neutral-2 rounded text-[11px] bg-canvas text-ink"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Catatan Khusus (misal: Purus tembus)"
                          value={it.spec?.notes || ''}
                          onChange={(e) => handleSpecChange(idx, 'notes', e.target.value)}
                          className="w-full px-2 py-1 border border-neutral-2 rounded text-[11px] bg-canvas text-ink"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ongkir & Payment Plan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-hairline pt-3">
            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                Estimasi Ongkir / Paking Ekspor (Rp)
              </label>
              <input
                type="number"
                min={0}
                value={customFee}
                onChange={(e) => setCustomFee(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold text-right"
              />
              <input
                type="text"
                placeholder="Keterangan Ongkir (misal: Truk Kargo Jakarta)"
                value={customFeeNote}
                onChange={(e) => setCustomFeeNote(e.target.value)}
                className="w-full px-2.5 py-1 mt-1 border border-neutral-2 rounded text-[11px] text-body"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-ink uppercase tracking-wider">
                  Skema Termin Pembayaran
                </label>
                <button
                  type="button"
                  onClick={() => setShowPlanEditor(!showPlanEditor)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {showPlanEditor ? 'Tutup' : 'Ubah Termin'}
                </button>
              </div>

              {!showPlanEditor ? (
                <div className="p-2.5 rounded-sm bg-neutral-1 border border-hairline flex flex-wrap gap-1 text-[11px]">
                  {paymentPlan.map((tp, i) => (
                    <span key={i} className="bg-canvas px-2 py-0.5 rounded border border-hairline font-semibold">
                      {tp.label}: <strong className="text-primary">{tp.percent}%</strong>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="bg-neutral-1 p-2 rounded border border-hairline">
                  <PaymentPlanEditor
                    initialPlan={paymentPlan}
                    onSave={(newPlan) => {
                      setPaymentPlan(newPlan);
                      setShowPlanEditor(false);
                    }}
                    onCancel={() => setShowPlanEditor(false)}
                  />
                </div>
              )}

              <div className="mt-2 text-right text-xs">
                <span className="text-muted">Total Nilai Penawaran: </span>
                <strong className="text-ink text-sm font-extrabold">{formatRupiah(grandTotal)}</strong>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-hairline pt-3">
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Syarat & Ketentuan Tambahan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-xs text-ink"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 border-t border-hairline pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro flex items-center gap-1.5"
            >
              <i className="fa-solid fa-floppy-disk text-xs"></i>
              <span>{initialQuotation ? 'Simpan Perubahan' : 'Buat Surat Penawaran'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
