import React from 'react';
import { OrderStage } from '../../types/titan';

interface StageGateConfirmProps {
  orderNumber: string;
  targetStage: OrderStage;
  warningMessage: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const StageGateConfirm: React.FC<StageGateConfirmProps> = ({
  orderNumber,
  targetStage,
  warningMessage,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="bg-danger-subtle border border-danger-text/30 rounded-md p-3 text-xs text-danger-text space-y-2 mt-2 shadow-micro">
      <div className="flex items-start gap-2">
        <i className="fa-solid fa-triangle-exclamation text-base shrink-0 mt-0.5 text-danger-text"></i>
        <div className="leading-relaxed">
          <div className="font-extrabold text-ink uppercase tracking-wide text-[11px] mb-0.5">
            Peringatan Alur Pembayaran ({orderNumber})
          </div>
          <div className="font-medium text-body">{warningMessage}</div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-danger-text/20">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 bg-white border border-neutral-2 text-body rounded-xs text-[11px] font-semibold hover:bg-neutral-1"
        >
          Batal (Tahan di Tahap Ini)
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-3 py-1 bg-danger-text text-white rounded-xs text-[11px] font-bold hover:bg-red-800 shadow-micro flex items-center gap-1"
        >
          <i className="fa-solid fa-forward text-[10px]"></i>
          <span>Ya, Tetap Lanjutkan ke {targetStage}</span>
        </button>
      </div>
    </div>
  );
};
