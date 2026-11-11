import React, { useState } from 'react';
import { Craftsman, LaborContract } from '../../types/furniture';
import { Order } from '../../types/titan';
import { formatRupiah } from '../../utils/calculations';

interface LaborContractFormModalProps {
  orders: Order[];
  craftsmen: Craftsman[];
  onSave: (contractData: {
    orderId: string;
    orderNumberSnapshot: string;
    craftsmanId: string;
    craftsmanNameSnapshot: string;
    scope: string;
    agreedAmount: number;
  }) => void;
  onAddCraftsman: (name: string, specialty: Craftsman['specialty'], phone?: string) => string;
  onCancel: () => void;
}

export const LaborContractFormModal: React.FC<LaborContractFormModalProps> = ({
  orders,
  craftsmen,
  onSave,
  onAddCraftsman,
  onCancel,
}) => {
  const activeOrders = orders.filter((o) => o.stage !== 'Selesai' && o.stage !== 'Dibatalkan');

  const [selectedOrderId, setSelectedOrderId] = useState(activeOrders[0]?.id || orders[0]?.id || '');
  const [selectedCraftsmanId, setSelectedCraftsmanId] = useState(craftsmen[0]?.id || '');
  const [scope, setScope] = useState('');
  const [agreedAmount, setAgreedAmount] = useState<number>(0);

  // Quick Add Craftsman State
  const [isAddingCraftsman, setIsAddingCraftsman] = useState(false);
  const [newCraftsmanName, setNewCraftsmanName] = useState('');
  const [newCraftsmanPhone, setNewCraftsmanPhone] = useState('628');
  const [newCraftsmanSpecialty, setNewCraftsmanSpecialty] = useState<Craftsman['specialty']>('Rakit/Konstruksi');

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const selectedCraftsman = craftsmen.find((c) => c.id === selectedCraftsmanId);

  // Calculate Standard Labor Cost based on order items
  const standardLaborCost = selectedOrder
    ? selectedOrder.items.reduce((sum, it) => sum + it.qty * (it.laborCostSnapshot || 0), 0)
    : 0;

  const variance = standardLaborCost > 0 ? standardLaborCost - agreedAmount : 0;

  const handleCreateCraftsman = () => {
    if (!newCraftsmanName.trim()) return;
    const newId = onAddCraftsman(
      newCraftsmanName.trim(),
      newCraftsmanSpecialty,
      newCraftsmanPhone.trim() || undefined
    );
    setSelectedCraftsmanId(newId);
    setIsAddingCraftsman(false);
    setNewCraftsmanName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedCraftsman || agreedAmount <= 0 || !scope.trim()) return;

    onSave({
      orderId: selectedOrder.id,
      orderNumberSnapshot: selectedOrder.orderNumber,
      craftsmanId: selectedCraftsman.id,
      craftsmanNameSnapshot: selectedCraftsman.name,
      scope: scope.trim(),
      agreedAmount: Number(agreedAmount),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-canvas text-body rounded-md max-w-lg w-full border border-hairline shadow-lg overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-ink">
            <i className="fa-solid fa-person-digging text-primary text-sm"></i>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">
              Buat Kontrak Borongan Tukang Baru
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
          {/* Select Order */}
          <div>
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Hubungkan ke Pesanan Aktif *
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold bg-canvas"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.customerName} ({o.items.map((i) => i.productNameSnapshot).join(', ')})
                </option>
              ))}
            </select>
          </div>

          {/* Select or Add Craftsman */}
          <div className="space-y-1.5 border-t border-hairline pt-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                Nama Tukang Borongan *
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCraftsman(!isAddingCraftsman)}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-user-plus text-[9px]"></i>
                <span>{isAddingCraftsman ? 'Pilih Tukang yang Ada' : '+ Tambah Tukang Baru'}</span>
              </button>
            </div>

            {!isAddingCraftsman ? (
              <select
                value={selectedCraftsmanId}
                onChange={(e) => setSelectedCraftsmanId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold bg-canvas"
              >
                {craftsmen.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Spesialis: {c.specialty}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-neutral-1 p-3 rounded-md border border-hairline space-y-2">
                <div className="font-bold text-ink text-[11px]">Daftarkan Tukang Baru:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nama Tukang (misal: Pak Sukirno)"
                    value={newCraftsmanName}
                    onChange={(e) => setNewCraftsmanName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-2 rounded text-xs text-ink bg-canvas font-medium"
                  />
                  <select
                    value={newCraftsmanSpecialty}
                    onChange={(e) => setNewCraftsmanSpecialty(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-neutral-2 rounded text-xs text-ink bg-canvas font-semibold"
                  >
                    <option value="Rakit/Konstruksi">Rakit / Konstruksi</option>
                    <option value="Ukir">Ukir Jepara</option>
                    <option value="Amplas/Finishing">Amplas & Finishing</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCraftsman(false)}
                    className="px-2.5 py-1 text-[11px] rounded border border-neutral-2 bg-canvas"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCraftsman}
                    className="px-3 py-1 text-[11px] font-bold rounded bg-primary text-white"
                  >
                    Simpan Tukang
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scope of Work */}
          <div className="border-t border-hairline pt-3">
            <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
              Lingkup Kerja Borongan (Scope) *
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Konstruksi & Rakit 6 Kursi Makan Jati sampai amplas halus"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-medium"
            />
          </div>

          {/* Agreed Amount & Comparison with HPP */}
          <div className="border-t border-hairline pt-3 space-y-2">
            <div>
              <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                Nilai Kesepakatan Borongan (Rp) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-black text-right text-sm"
              />
            </div>

            {/* HPP Labor Comparison Card */}
            {standardLaborCost > 0 && agreedAmount > 0 && (
              <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline space-y-1 text-[11px]">
                <div className="flex justify-between text-muted">
                  <span>Alokasi Upah Standar HPP Pesanan:</span>
                  <span className="font-bold text-ink">{formatRupiah(standardLaborCost)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Nilai Borongan Disepakati:</span>
                  <span className="font-bold text-ink">{formatRupiah(agreedAmount)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-hairline font-bold">
                  <span>Dampak terhadap Laba Bersih Riil:</span>
                  <span className={variance >= 0 ? 'text-emerald-700' : 'text-danger-text'}>
                    {variance >= 0
                      ? `Hemat +${formatRupiah(variance)} (Laba naik)`
                      : `Bengkak ${formatRupiah(variance)} (Laba turun)`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 border-t border-hairline pt-3 shrink-0">
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
              <i className="fa-solid fa-check text-xs"></i>
              <span>Simpan Borongan Kerja</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
