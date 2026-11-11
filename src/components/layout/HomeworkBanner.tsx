import React from 'react';
import { useUmkm } from '../../context/UmkmContext';
import { useAuth } from '../../context/AuthContext';

export const HomeworkBanner: React.FC = () => {
  const { profile, products, orders, defects, setActiveTab, toggleTrainingMode } = useUmkm();
  const { isGuest, logout } = useAuth();

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
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Header Row: Title, Progress, and Hide Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-badge-gold text-ink text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-xs shrink-0">
              Tugas Pelatihan
            </span>
            <span className="text-xs font-bold text-ink">
              {allCompleted ? (
                <span className="text-primary flex items-center gap-1">
                  <i className="fa-solid fa-circle-check text-xs"></i>
                  <span>Lengkap (3/3)</span>
                </span>
              ) : (
                <span>Progres: {completedCount} dari 3 Selesai</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isGuest && (
              <button
                type="button"
                onClick={logout}
                className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                title="Keluar dari sesi pelatihan dan kembali ke login Google"
              >
                <i className="fa-solid fa-arrow-right-to-bracket text-[10px]"></i>
                <span className="hidden sm:inline">Halaman</span>
                <span>Login</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleTrainingMode}
              className="text-[11px] text-muted hover:text-ink font-semibold flex items-center gap-1"
              title="Sembunyikan panel tugas"
            >
              <i className="fa-solid fa-eye-slash text-[10px]"></i>
              <span className="hidden sm:inline">Sembunyikan</span>
            </button>
          </div>
        </div>

        {/* 3 Clean Simplified Cards */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Card 1: Produk */}
          <button
            type="button"
            onClick={() => setActiveTab('hpp')}
            className={`p-2 rounded-sm border text-left transition-all ${
              task1Done
                ? 'bg-primary/5 border-primary/30 text-ink'
                : 'bg-neutral-1/60 border-hairline hover:border-neutral-2 text-body'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Tugas 1</span>
              {task1Done ? (
                <i className="fa-solid fa-circle-check text-primary text-xs"></i>
              ) : (
                <span className="text-[10px] font-bold text-muted">{prodCount}/2</span>
              )}
            </div>
            <div className="font-bold text-xs text-ink truncate mt-0.5">2 Produk HPP</div>
            <div className="text-[10px] text-muted truncate">
              {task1Done ? 'Selesai' : `${prodCount} produk tersimpan`}
            </div>
          </button>

          {/* Card 2: Pesanan */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`p-2 rounded-sm border text-left transition-all ${
              task2Done
                ? 'bg-primary/5 border-primary/30 text-ink'
                : 'bg-neutral-1/60 border-hairline hover:border-neutral-2 text-body'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Tugas 2</span>
              {task2Done ? (
                <i className="fa-solid fa-circle-check text-primary text-xs"></i>
              ) : (
                <span className="text-[10px] font-bold text-muted">{orderCount}/1</span>
              )}
            </div>
            <div className="font-bold text-xs text-ink truncate mt-0.5">1 Pesanan Masuk</div>
            <div className="text-[10px] text-muted truncate">
              {task2Done ? 'Selesai' : `${orderCount} pesanan tercatat`}
            </div>
          </button>

          {/* Card 3: Cacat / QC */}
          <button
            type="button"
            onClick={() => setActiveTab('quality')}
            className={`p-2 rounded-sm border text-left transition-all ${
              task3Done
                ? 'bg-primary/5 border-primary/30 text-ink'
                : 'bg-neutral-1/60 border-hairline hover:border-neutral-2 text-body'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Tugas 3</span>
              {task3Done ? (
                <i className="fa-solid fa-circle-check text-primary text-xs"></i>
              ) : (
                <span className="text-[10px] font-bold text-muted">{defectCount}/1</span>
              )}
            </div>
            <div className="font-bold text-xs text-ink truncate mt-0.5">1 Kasus Mutu/QC</div>
            <div className="text-[10px] text-muted truncate">
              {task3Done ? 'Selesai' : `${defectCount} cacat tercatat`}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
