import React, { useState } from 'react';
import { PaymentPlanTemplate } from '../../types/furniture';
import { OrderStage } from '../../types/titan';
import { validatePaymentPlan } from '../../utils/furnitureCalculations';

interface PaymentPlanEditorProps {
  initialPlan?: PaymentPlanTemplate[];
  onSave: (plan: PaymentPlanTemplate[]) => void;
  onCancel: () => void;
}

const PRESETS: { label: string; plan: PaymentPlanTemplate[] }[] = [
  {
    label: '50-30-20 (Standar Mebel)',
    plan: [
      { label: 'DP Awal', percent: 50, triggerStage: 'Persiapan' },
      { label: 'Termin Barang Mentah', percent: 30, triggerStage: 'Finishing' },
      { label: 'Pelunasan Sebelum Kirim', percent: 20, triggerStage: 'Siap Kirim' },
    ],
  },
  {
    label: '40-30-30',
    plan: [
      { label: 'DP Awal', percent: 40, triggerStage: 'Persiapan' },
      { label: 'Termin Perakitan', percent: 30, triggerStage: 'Pengerjaan' },
      { label: 'Pelunasan Sebelum Kirim', percent: 30, triggerStage: 'Siap Kirim' },
    ],
  },
  {
    label: '50-50 (2 Tahap)',
    plan: [
      { label: 'DP Awal', percent: 50, triggerStage: 'Persiapan' },
      { label: 'Pelunasan Sebelum Kirim', percent: 50, triggerStage: 'Siap Kirim' },
    ],
  },
  {
    label: '100% di Muka',
    plan: [{ label: 'Pembayaran Lunas di Awal', percent: 100, triggerStage: 'Persiapan' }],
  },
];

const AVAILABLE_STAGES: Exclude<OrderStage, 'Selesai' | 'Dibatalkan'>[] = [
  'Persiapan',
  'Pengerjaan',
  'Finishing',
  'Siap Kirim',
];

export const PaymentPlanEditor: React.FC<PaymentPlanEditorProps> = ({
  initialPlan,
  onSave,
  onCancel,
}) => {
  const [plan, setPlan] = useState<PaymentPlanTemplate[]>(() => {
    if (initialPlan && initialPlan.length > 0) {
      return initialPlan;
    }
    return PRESETS[0].plan;
  });

  const [error, setError] = useState<string | null>(null);

  const totalPercent = plan.reduce((s, t) => s + (Number(t.percent) || 0), 0);

  const handleApplyPreset = (presetPlan: PaymentPlanTemplate[]) => {
    setPlan(presetPlan);
    setError(null);
  };

  const handleRowChange = (
    index: number,
    field: keyof PaymentPlanTemplate,
    val: string | number
  ) => {
    const updated = [...plan];
    updated[index] = { ...updated[index], [field]: val };
    setPlan(updated);
    setError(null);
  };

  const handleAddRow = () => {
    if (plan.length >= 4) {
      setError('Maksimal 4 tahapan termin.');
      return;
    }
    const remainingPct = Math.max(0, 100 - totalPercent);
    setPlan([
      ...plan,
      {
        label: `Termin ${plan.length + 1}`,
        percent: remainingPct,
        triggerStage: 'Siap Kirim',
      },
    ]);
    setError(null);
  };

  const handleRemoveRow = (index: number) => {
    if (plan.length <= 1) {
      setError('Minimal 1 tahapan pembayaran.');
      return;
    }
    setPlan(plan.filter((_, i) => i !== index));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validatePaymentPlan(plan);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(plan);
  };

  return (
    <div className="bg-canvas border border-primary/30 rounded-md p-3.5 space-y-3 shadow-micro mt-2">
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            <i className="fa-solid fa-money-bill-transfer"></i>
          </span>
          <div>
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wide">
              Atur Skema Termin Pembayaran
            </h4>
            <p className="text-[10px] text-muted">Tentukan persentase dan tahap jatuh tempo tagihan</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted hover:text-ink text-xs p-1"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Preset Cepat */}
      <div>
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
          Pilihan Skema Populer:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((pr) => (
            <button
              key={pr.label}
              type="button"
              onClick={() => handleApplyPreset(pr.plan)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-neutral-2 hover:border-primary hover:text-primary bg-neutral-1 text-ink transition-colors"
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Baris Termin */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="space-y-1.5">
          {plan.map((row, idx) => (
            <div
              key={idx}
              className="bg-neutral-1 p-2 rounded-sm border border-hairline grid grid-cols-12 gap-2 items-center text-xs"
            >
              <div className="col-span-5 sm:col-span-5">
                <input
                  type="text"
                  required
                  value={row.label}
                  placeholder="Nama Termin"
                  onChange={(e) => handleRowChange(idx, 'label', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary font-medium text-ink bg-white"
                />
              </div>

              <div className="col-span-3 sm:col-span-3 flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={row.percent || ''}
                  onChange={(e) =>
                    handleRowChange(idx, 'percent', parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full px-2 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary text-right font-bold text-ink bg-white"
                />
                <span className="text-[11px] font-bold text-muted">%</span>
              </div>

              <div className="col-span-3 sm:col-span-3">
                <select
                  value={row.triggerStage}
                  onChange={(e) =>
                    handleRowChange(idx, 'triggerStage', e.target.value as any)
                  }
                  className="w-full px-2 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary text-ink bg-white font-medium"
                >
                  {AVAILABLE_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 flex justify-end">
                {plan.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(idx)}
                    className="text-muted hover:text-danger-text p-1 text-xs"
                    title="Hapus baris termin"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {plan.length < 4 && (
          <button
            type="button"
            onClick={handleAddRow}
            className="text-xs text-primary font-bold hover:underline flex items-center gap-1 pt-1"
          >
            <i className="fa-solid fa-plus text-[10px]"></i>
            <span>Tambah Tahapan Termin</span>
          </button>
        )}

        {/* Total Persen Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-hairline text-xs font-bold">
          <span>Total Persentase:</span>
          <span
            className={
              totalPercent === 100
                ? 'text-primary font-extrabold'
                : 'text-danger-text font-black'
            }
          >
            {totalPercent}% {totalPercent === 100 ? '(Pas 100%)' : '(Wajib Tepat 100%)'}
          </span>
        </div>

        {error && (
          <div className="bg-danger-subtle border border-danger-text/30 text-danger-text rounded-xs p-2 text-xs flex items-start gap-1.5 font-medium">
            <i className="fa-solid fa-triangle-exclamation text-xs mt-0.5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro"
          >
            Simpan Skema Termin
          </button>
        </div>
      </form>
    </div>
  );
};
