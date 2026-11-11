import React, { useState } from 'react';
import { LaborContract, LaborPayment, LaborPaymentType } from '../../types/furniture';
import { summarizeLaborContract, validateLaborPayment } from '../../utils/furnitureCalculations';
import { formatRupiah } from '../../utils/calculations';

interface LaborPaymentModalProps {
  contract: LaborContract;
  payments: LaborPayment[];
  onSave: (paymentData: { amount: number; type: LaborPaymentType; date: string; note?: string }) => void;
  onCancel: () => void;
}

export const LaborPaymentModal: React.FC<LaborPaymentModalProps> = ({
  contract,
  payments,
  onSave,
  onCancel,
}) => {
  const summary = summarizeLaborContract(contract, payments);

  const [type, setType] = useState<LaborPaymentType>(contract.qcPassedAt ? 'pelunasan' : 'kasbon');
  const [amount, setAmount] = useState<number>(() => {
    if (contract.qcPassedAt && summary.remaining > 0) {
      return summary.remaining;
    }
    return Math.min(summary.remaining > 0 ? summary.remaining : 100000, 250000);
  });
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [confirmedOverKasbon, setConfirmedOverKasbon] = useState(false);

  const validation = validateLaborPayment(contract, payments, type, amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    if (validation.error) return;

    if (validation.warning && !confirmedOverKasbon) {
      setConfirmedOverKasbon(true);
      return;
    }

    onSave({
      amount: Number(amount),
      type,
      date,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-canvas text-body rounded-md max-w-md w-full border border-hairline shadow-lg overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink">
            <i className="fa-solid fa-hand-holding-dollar text-primary text-sm"></i>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">
              Catat Upah / Kasbon Tukang
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

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Contract Overview Box */}
          <div className="bg-neutral-1 p-3 rounded-sm border border-hairline space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-mono font-bold text-primary">{contract.orderNumberSnapshot}</span>
              <span
                className={`font-extrabold uppercase px-2 py-0.5 rounded-full text-[9px] ${
                  contract.qcPassedAt
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-badge-gold/20 text-ink'
                }`}
              >
                {contract.qcPassedAt ? 'Lolos QC' : 'Proses Pengerjaan'}
              </span>
            </div>

            <div className="font-bold text-ink text-sm">{contract.craftsmanNameSnapshot}</div>
            <div className="text-muted text-[11px]">{contract.scope}</div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-hairline/80 text-[11px]">
              <div>
                <span className="text-muted block text-[10px]">Nilai Borongan</span>
                <strong className="text-ink">{formatRupiah(summary.payable)}</strong>
              </div>
              <div>
                <span className="text-muted block text-[10px]">Total Kasbon</span>
                <strong className="text-amber-800">{formatRupiah(summary.kasbon)}</strong>
              </div>
              <div>
                <span className="text-muted block text-[10px]">Sisa Upah</span>
                <strong className={summary.remaining > 0 ? 'text-primary' : 'text-emerald-700'}>
                  {formatRupiah(summary.remaining)}
                </strong>
              </div>
            </div>
          </div>

          {/* Payment Type Selection */}
          <div>
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Jenis Pembayaran *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('kasbon');
                  setConfirmedOverKasbon(false);
                }}
                className={`py-2 px-3 rounded-sm border text-left transition-all ${
                  type === 'kasbon'
                    ? 'border-primary bg-primary/5 text-primary font-bold'
                    : 'border-hairline hover:border-neutral-2 text-body'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-coins text-xs"></i>
                  <span>1. Kasbon Bertahap</span>
                </div>
                <p className="text-[10px] text-muted font-normal mt-0.5">
                  Uang saku mingguan / modal belanja alat tukang.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('pelunasan');
                  setConfirmedOverKasbon(false);
                  if (summary.remaining > 0) setAmount(summary.remaining);
                }}
                disabled={!contract.qcPassedAt}
                className={`py-2 px-3 rounded-sm border text-left transition-all ${
                  !contract.qcPassedAt
                    ? 'opacity-50 cursor-not-allowed bg-neutral-1 border-hairline'
                    : type === 'pelunasan'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                    : 'border-hairline hover:border-neutral-2 text-body'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-check text-xs"></i>
                  <span>2. Pelunasan Borongan</span>
                </div>
                <p className="text-[10px] text-muted font-normal mt-0.5">
                  {contract.qcPassedAt ? 'Lunas setelah lolos QC.' : 'Terkunci: Wajib lolos QC dulu.'}
                </p>
              </button>
            </div>
          </div>

          {/* Amount & Date Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                Tanggal Pembayaran *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-neutral-2 rounded-sm text-xs text-ink font-semibold bg-canvas"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-ink uppercase tracking-wider">
                  Nominal (Rp) *
                </label>
                {summary.remaining > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(summary.remaining);
                      setConfirmedOverKasbon(false);
                    }}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    Sisa ({formatRupiah(summary.remaining)})
                  </button>
                )}
              </div>
              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(e) => {
                  setAmount(Number(e.target.value));
                  setConfirmedOverKasbon(false);
                }}
                className="w-full px-2.5 py-1.5 border border-neutral-2 rounded-sm text-xs font-bold text-right text-ink bg-canvas"
              />
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Catatan / Keperluan Kasbon (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Kasbon Sabtu sore / Tambahan beli amplas"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-2 rounded-sm text-xs text-ink"
            />
          </div>

          {/* Error Message */}
          {validation.error && (
            <div className="bg-danger-subtle border border-danger-text/30 p-2.5 rounded-sm text-[11px] text-danger-text font-semibold flex items-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{validation.error}</span>
            </div>
          )}

          {/* Warning Message (Kasbon Over Remaining - User Decision: Boleh dengan Peringatan) */}
          {validation.warning && (
            <div className="bg-badge-gold/15 border border-badge-gold/50 p-2.5 rounded-sm text-[11px] text-ink space-y-1.5">
              <div className="flex items-start gap-1.5 text-amber-800 font-bold">
                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <span>Peringatan Kasbon Melebihi Sisa Borongan</span>
              </div>
              <div className="text-[11px] text-body">{validation.warning}</div>
              <label className="flex items-center gap-2 pt-1 border-t border-hairline/80 cursor-pointer font-bold text-primary">
                <input
                  type="checkbox"
                  checked={confirmedOverKasbon}
                  onChange={(e) => setConfirmedOverKasbon(e.target.checked)}
                  className="rounded border-neutral-3 text-primary"
                />
                <span>Saya mengerti dan tetap ingin mencairkan kasbon ini</span>
              </label>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 border-t border-hairline pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={Boolean(validation.error) || (Boolean(validation.warning) && !confirmedOverKasbon)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-micro flex items-center gap-1.5 ${
                validation.error || (validation.warning && !confirmedOverKasbon)
                  ? 'bg-neutral-2 text-muted cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              <i className="fa-solid fa-check text-xs"></i>
              <span>Simpan Pembayaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
