import React from 'react';
import { useUmkm } from '../../context/UmkmContext';

export const HomeworkBanner: React.FC = () => {
  const { profile, products, orders, defects, setActiveTab, toggleTrainingMode } = useUmkm();

  if (!profile.trainingModeEnabled) {
    return null;
  }

  const prodCount = products.length;
  const orderCount = orders.length;
  const defectCount = defects.length;

  const task1Done = prodCount >= 2;
  const task2Done = orderCount >= 1;
  const task3Done = defectCount >= 1;

  const allCompleted = task1Done && task2Done && task3Done;
  const completedCount = (task1Done ? 1 : 0) + (task2Done ? 1 : 0) + (task3Done ? 1 : 0);

  return (
    <div className="bg-canvas border-b border-hairline px-3 sm:px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Top Row: Badge + Title + Hide Button on Mobile */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="bg-badge-gold text-ink text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-xs shrink-0">
              Mode Pelatihan
            </span>
            <div className="text-[11px] sm:text-xs text-ink font-bold truncate">
              {allCompleted ? (
                <span className="text-primary flex items-center gap-1 truncate">
                  <i className="fa-solid fa-circle-check text-xs shrink-0"></i>
                  <span className="truncate">
                    Tugas Selesai (3/3) <span className="hidden sm:inline">&bull; Siap Dibedah Sesi 5</span>
                  </span>
                </span>
              ) : (
                <span>Target Pelatihan: {completedCount}/3 Selesai</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTrainingMode}
            className="text-[11px] text-muted hover:text-ink font-semibold flex items-center gap-1 shrink-0 sm:hidden"
          >
            <i className="fa-solid fa-eye-slash text-[10px]"></i>
            <span>Tutup</span>
          </button>
        </div>

        {/* Bottom Row: 3 Equal Target Pills + Desktop Hide Button */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('hpp')}
              className={`flex items-center justify-center gap-1 px-2 py-1 rounded-sm border whitespace-nowrap ${
                task1Done ? 'bg-primary/5 text-primary border-primary/30 font-bold' : 'text-muted border-hairline'
              }`}
            >
              <i className={task1Done ? 'fa-solid fa-check text-[9px]' : 'fa-regular fa-circle text-[9px]'}></i>
              <span>Produk ({prodCount}/2)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center justify-center gap-1 px-2 py-1 rounded-sm border whitespace-nowrap ${
                task2Done ? 'bg-primary/5 text-primary border-primary/30 font-bold' : 'text-muted border-hairline'
              }`}
            >
              <i className={task2Done ? 'fa-solid fa-check text-[9px]' : 'fa-regular fa-circle text-[9px]'}></i>
              <span>Order ({orderCount}/1)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quality')}
              className={`flex items-center justify-center gap-1 px-2 py-1 rounded-sm border whitespace-nowrap ${
                task3Done ? 'bg-primary/5 text-primary border-primary/30 font-bold' : 'text-muted border-hairline'
              }`}
            >
              <i className={task3Done ? 'fa-solid fa-check text-[9px]' : 'fa-regular fa-circle text-[9px]'}></i>
              <span>Cacat ({defectCount}/1)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTrainingMode}
            className="hidden sm:flex text-[11px] text-muted hover:text-ink font-semibold items-center gap-1 pl-2 border-l border-hairline shrink-0"
          >
            <i className="fa-solid fa-eye-slash text-[10px]"></i>
            <span className="hidden md:inline">Sembunyikan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
