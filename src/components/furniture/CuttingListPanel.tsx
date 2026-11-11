import React, { useState } from 'react';
import { WoodCutPiece } from '../../types/furniture';
import {
  calculatePieceVolumeM3,
  calculateCuttingListVolume,
  formatVolumeM3,
} from '../../utils/furnitureCalculations';
import { formatRupiah } from '../../utils/calculations';

interface CuttingListPanelProps {
  initialPieces?: WoodCutPiece[];
  unitPrice: number; // Harga per m3
  wastagePercent: number; // Susut % bahan
  materialName: string;
  onApply: (pieces: WoodCutPiece[], totalVolume: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const CuttingListPanel: React.FC<CuttingListPanelProps> = ({
  initialPieces = [],
  unitPrice,
  wastagePercent,
  materialName,
  onApply,
  onRemove,
  onClose,
}) => {
  const [pieces, setPieces] = useState<WoodCutPiece[]>(() => {
    if (initialPieces && initialPieces.length > 0) {
      return initialPieces;
    }
    return [
      { id: 'cut_1', label: 'Komponen 1', thicknessCm: 3, widthCm: 15, lengthCm: 100, qty: 1 },
    ];
  });

  const [confirmRemove, setConfirmRemove] = useState(false);

  const handlePieceChange = (
    index: number,
    field: keyof WoodCutPiece,
    val: string | number
  ) => {
    const updated = [...pieces];
    updated[index] = { ...updated[index], [field]: val };
    setPieces(updated);
  };

  const handleAddPiece = () => {
    const nextIdx = pieces.length + 1;
    setPieces([
      ...pieces,
      {
        id: `cut_${Date.now()}_${nextIdx}`,
        label: `Komponen ${nextIdx}`,
        thicknessCm: 2.5,
        widthCm: 10,
        lengthCm: 50,
        qty: 1,
      },
    ]);
  };

  const handleRemovePiece = (index: number) => {
    if (pieces.length <= 1) {
      setPieces([
        { id: `cut_${Date.now()}`, label: 'Komponen 1', thicknessCm: 0, widthCm: 0, lengthCm: 0, qty: 1 },
      ]);
      return;
    }
    setPieces(pieces.filter((_, i) => i !== index));
  };

  const validPieces = pieces.filter(
    (p) => p.thicknessCm > 0 && p.widthCm > 0 && p.lengthCm > 0 && p.qty > 0
  );
  const totalVolume = calculateCuttingListVolume(validPieces);
  const rawCost = Math.round(totalVolume * unitPrice);
  const safeWastage = Math.min(95, Math.max(0, wastagePercent));
  const costAfterWastage =
    safeWastage > 0 ? Math.round(rawCost / (1 - safeWastage / 100)) : rawCost;

  return (
    <div className="bg-canvas border border-primary/30 rounded-md p-3.5 space-y-3 shadow-micro mt-2">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            <i className="fa-solid fa-ruler-combined"></i>
          </span>
          <div>
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wide">
              Kalkulator Kubikasi Kayu (Daftar Potong)
            </h4>
            <p className="text-[10px] text-muted">
              Input dimensi per komponen ({materialName}) &bull; Rumus: T &times; L &times; P &times; Jml / 1.000.000
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-ink text-xs p-1 rounded-sm"
          title="Tutup Panel"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Tabel Potongan */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-hairline text-[10px] font-bold text-muted uppercase tracking-wider">
              <th className="py-1 px-1">Nama Bagian</th>
              <th className="py-1 px-1 text-right">T (cm)</th>
              <th className="py-1 px-1 text-right">L (cm)</th>
              <th className="py-1 px-1 text-right">P (cm)</th>
              <th className="py-1 px-1 text-right">Batang</th>
              <th className="py-1 px-1 text-right">Volume (m3)</th>
              <th className="py-1 px-1 text-center w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {pieces.map((piece, idx) => {
              const pieceVol = calculatePieceVolumeM3(piece);
              const isInvalid =
                piece.thicknessCm <= 0 ||
                piece.widthCm <= 0 ||
                piece.lengthCm <= 0 ||
                piece.qty <= 0;

              return (
                <tr
                  key={piece.id || idx}
                  className={isInvalid ? 'bg-danger-subtle/40' : 'hover:bg-neutral-1/50'}
                >
                  <td className="py-1 px-1">
                    <input
                      type="text"
                      value={piece.label || ''}
                      placeholder="Contoh: Kaki depan"
                      onChange={(e) => handlePieceChange(idx, 'label', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary text-ink bg-white font-medium"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={piece.thicknessCm || ''}
                      onChange={(e) =>
                        handlePieceChange(idx, 'thicknessCm', parseFloat(e.target.value) || 0)
                      }
                      className="w-14 px-1.5 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary text-ink text-right bg-white font-semibold"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={piece.widthCm || ''}
                      onChange={(e) =>
                        handlePieceChange(idx, 'widthCm', parseFloat(e.target.value) || 0)
                      }
                      className="w-14 px-1.5 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary text-ink text-right bg-white font-semibold"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={piece.lengthCm || ''}
                      onChange={(e) =>
                        handlePieceChange(idx, 'lengthCm', parseFloat(e.target.value) || 0)
                      }
                      className="w-16 px-1.5 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary text-ink text-right bg-white font-semibold"
                    />
                  </td>
                  <td className="py-1 px-1 text-right">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={piece.qty || ''}
                      onChange={(e) =>
                        handlePieceChange(idx, 'qty', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-12 px-1.5 py-1 text-xs border border-neutral-2 rounded-xs focus:border-primary text-ink text-right bg-white font-semibold"
                    />
                  </td>
                  <td className="py-1 px-1 text-right font-mono text-[11px] font-bold text-ink whitespace-nowrap">
                    {formatVolumeM3(pieceVol)}
                  </td>
                  <td className="py-1 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePiece(idx)}
                      className="text-muted hover:text-danger-text p-1 text-xs"
                      title="Hapus baris"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tombol Tambah Baris */}
      <button
        type="button"
        onClick={handleAddPiece}
        className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5 pt-1"
      >
        <i className="fa-solid fa-plus text-[10px]"></i>
        <span>Tambah Komponen Potongan</span>
      </button>

      {/* Warning Susut Rendah */}
      {wastagePercent < 15 && totalVolume > 0 && (
        <div className="bg-badge-gold/15 border border-badge-gold/40 rounded-xs p-2 text-[11px] text-ink flex items-start gap-1.5">
          <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xs mt-0.5 shrink-0"></i>
          <span>
            Susut potong kayu solid umumnya 25–40%. Susut {wastagePercent}% berisiko membuat HPP terlalu rendah.
          </span>
        </div>
      )}

      {/* Ringkasan Kubikasi & Biaya */}
      <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-[10px] font-bold text-muted uppercase block">Total Kubikasi</span>
          <span className="font-black text-primary font-mono text-sm">
            {formatVolumeM3(totalVolume)}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-muted uppercase block">Biaya Kayu Bersih</span>
          <span className="font-bold text-ink">{formatRupiah(rawCost)}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-muted uppercase block">
            Setelah Susut ({wastagePercent}%)
          </span>
          <span className="font-black text-ink">{formatRupiah(costAfterWastage)}</span>
        </div>
      </div>

      {/* Aksi Selesai / Terapkan */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-hairline">
        {confirmRemove ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-danger-text">Hapus daftar potong?</span>
            <button
              type="button"
              onClick={() => {
                onRemove();
                setConfirmRemove(false);
              }}
              className="px-2 py-0.5 bg-danger-text text-white rounded-xs text-[10px] font-bold"
            >
              Ya, Hapus
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              className="px-2 py-0.5 bg-white border border-neutral-2 text-body rounded-xs text-[10px] font-semibold"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="text-[11px] text-muted hover:text-danger-text font-semibold flex items-center gap-1"
          >
            <i className="fa-solid fa-rotate-left text-[10px]"></i>
            <span>Kembali ke Input Manual</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={totalVolume <= 0}
            onClick={() => onApply(validPieces, totalVolume)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-micro flex items-center gap-1.5 transition-colors ${
              totalVolume <= 0
                ? 'bg-neutral-2 text-muted cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            <i className="fa-solid fa-check text-[10px]"></i>
            <span>Pakai Hasil Ini ({formatVolumeM3(totalVolume)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
