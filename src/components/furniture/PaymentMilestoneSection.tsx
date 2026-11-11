import React, { useState } from 'react';
import { Order } from '../../types/titan';
import { PaymentRecord } from '../../types/furniture';
import {
  evaluateMilestones,
  getOverpaidAmount,
} from '../../utils/furnitureCalculations';
import { formatRupiah } from '../../utils/calculations';

interface PaymentMilestoneSectionProps {
  order: Order;
  onOpenEditPlan: () => void;
  onOpenPaymentModal: () => void;
  onDeletePayment: (paymentId: string) => void;
}

export const PaymentMilestoneSection: React.FC<PaymentMilestoneSectionProps> = ({
  order,
  onOpenEditPlan,
  onOpenPaymentModal,
  onDeletePayment,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<string | null>(null);

  const milestones = evaluateMilestones(order);
  const overpaid = getOverpaidAmount(order);
  const payments = order.payments || [];

  if (milestones.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5 pt-2 border-t border-hairline/80">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <i className="fa-solid fa-money-bill-transfer text-primary text-xs"></i>
          <span className="text-[10px] font-extrabold text-ink uppercase tracking-wider">
            Termin Pembayaran Bertahap
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenEditPlan}
          className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
        >
          <i className="fa-solid fa-pen text-[9px]"></i>
          <span>Ubah Termin</span>
        </button>
      </div>

      {/* Overpaid Warning if any */}
      {overpaid > 0 && (
        <div className="bg-badge-gold/15 border border-badge-gold/40 rounded-xs p-2 text-xs text-ink flex items-start gap-1.5">
          <i className="fa-solid fa-circle-exclamation text-amber-600 text-xs mt-0.5 shrink-0"></i>
          <span>
            Kelebihan bayar <strong>{formatRupiah(overpaid)}</strong> — kembalikan ke pembeli atau tambahkan item baru ke pesanan.
          </span>
        </div>
      )}

      {/* Milestone List */}
      <div className="space-y-1.5">
        {milestones.map((m) => {
          let badgeClass = 'bg-neutral-1 text-muted border-hairline';
          let badgeText = 'Belum Waktunya';

          if (m.status === 'Lunas') {
            badgeClass = 'bg-primary/10 text-primary border-primary/30';
            badgeText = 'Lunas';
          } else if (m.status === 'Kurang Bayar') {
            badgeClass = 'bg-danger-subtle text-danger-text border-danger-text/30';
            badgeText = `Kurang: ${formatRupiah(m.outstanding)}`;
          } else if (m.status === 'Perlu Ditagih') {
            badgeClass = 'bg-danger-subtle text-danger-text border-danger-text/30';
            badgeText = 'Perlu Ditagih';
          }

          return (
            <div
              key={m.index}
              className={`p-2 rounded-sm border flex items-center justify-between text-xs transition-colors ${
                m.isDue && m.outstanding > 0
                  ? 'bg-danger-subtle/30 border-danger-text/20'
                  : 'bg-neutral-1/70 border-hairline'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-ink">
                    {m.index + 1}. {m.label} ({m.percent}%)
                  </span>
                  {m.includesCustomFee && order.customFee > 0 && (
                    <span className="text-[10px] text-muted font-medium">(+ Ongkir)</span>
                  )}
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  Jatuh tempo saat tahap: <strong>{m.triggerStage}</strong>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-extrabold text-ink">{formatRupiah(m.amount)}</div>
                <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                  {badgeText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History Toggle & List */}
      {payments.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="text-muted hover:text-ink font-semibold flex items-center gap-1.5"
            >
              <i className={`fa-solid fa-chevron-${showHistory ? 'up' : 'down'} text-[9px]`}></i>
              <span>Riwayat Pembayaran Masuk ({payments.length} transaksi)</span>
            </button>
            <span className="text-primary font-bold">
              Total Masuk: {formatRupiah(order.dpAmount)}
            </span>
          </div>

          {showHistory && (
            <div className="mt-2 space-y-1.5 bg-neutral-1 p-2 rounded-sm border border-hairline text-xs">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="bg-canvas p-2 rounded-xs border border-hairline flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-ink font-bold">
                      <span>{formatRupiah(p.amount)}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-1 text-muted border border-hairline uppercase font-mono">
                        {p.method}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      <span>{p.date}</span>
                      {p.note && <span> &bull; {p.note}</span>}
                    </div>
                  </div>

                  {confirmDeletePaymentId === p.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePayment(p.id);
                          setConfirmDeletePaymentId(null);
                        }}
                        className="px-2 py-0.5 bg-danger-text text-white rounded-xs text-[10px] font-bold"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePaymentId(null)}
                        className="px-1.5 py-0.5 bg-neutral-1 text-body rounded-xs text-[10px]"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePaymentId(p.id)}
                      className="text-muted hover:text-danger-text p-1 text-xs"
                      title="Hapus pembayaran ini"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
