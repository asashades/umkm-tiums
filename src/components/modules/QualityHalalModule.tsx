import React, { useState, useEffect } from 'react';
import { useUmkm } from '../../context/UmkmContext';
import { FishboneCategory } from '../../types/titan';
import { formatRupiah } from '../../utils/calculations';
import { SECTOR_PRESETS } from '../../config/sectorPresets';

export const QualityHalalModule: React.FC = () => {
  const {
    profile,
    defects,
    products,
    orders,
    checklists,
    pendingDefectDraft,
    setPendingDefectDraft,
    addDefect,
    deleteDefect,
    toggleChecklist,
    addChecklistItem,
    deleteChecklistItem,
  } = useUmkm();

  const currentSector = SECTOR_PRESETS[profile.sector] || SECTOR_PRESETS.mebel;

  // Active Sub-Tab: 'defects' vs 'checklist'
  const [activeSubTab, setActiveSubTab] = useState<'defects' | 'checklist'>('defects');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Modal State for Catat Cacat
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [defectType, setDefectType] = useState('');
  const [customDefectType, setCustomDefectType] = useState('');
  const [fishboneFactor, setFishboneFactor] = useState<FishboneCategory>('Bahan Baku');
  const [actionPlan, setActionPlan] = useState('');
  const [scrappedUnits, setScrappedUnits] = useState(0);
  const [reworkCost, setReworkCost] = useState(0);
  const [complaintDiscount, setComplaintDiscount] = useState(0);

  // Custom Checklist Input State
  const [newChecklistLevel, setNewChecklistLevel] = useState<'halal_facility' | 'daily_qc'>('daily_qc');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Handle incoming shortcut from Order Card ("Catat Cacat")
  useEffect(() => {
    if (pendingDefectDraft) {
      setActiveSubTab('defects');
      setSelectedOrderId(pendingDefectDraft.orderId);
      setSelectedProductId(pendingDefectDraft.productId || products[0]?.id || '');
      setDefectType(currentSector.defectTypes[0] || '');
      setCustomDefectType('');
      setFishboneFactor('Bahan Baku');
      setActionPlan('');
      setScrappedUnits(0);
      setReworkCost(25000);
      setComplaintDiscount(0);
      setIsDefectModalOpen(true);
      setPendingDefectDraft(null);
    }
  }, [pendingDefectDraft, products, currentSector.defectTypes, setPendingDefectDraft]);

  const openAddDefectModal = () => {
    if (products.length > 0) {
      setSelectedProductId(products[0].id);
    } else {
      setSelectedProductId('');
    }
    setSelectedOrderId('');
    setDefectType(currentSector.defectTypes[0] || '');
    setCustomDefectType('');
    setFishboneFactor('Bahan Baku');
    setActionPlan('');
    setScrappedUnits(0);
    setReworkCost(25000);
    setComplaintDiscount(0);
    setIsDefectModalOpen(true);
  };

  const handleSaveDefect = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const ord = orders.find((o) => o.id === selectedOrderId);
    const finalType = defectType === 'custom' ? customDefectType.trim() : defectType;

    addDefect({
      productId: prod.id,
      productNameSnapshot: prod.name,
      orderId: ord ? ord.id : undefined,
      orderNumberSnapshot: ord ? ord.orderNumber : undefined,
      date: new Date().toISOString().split('T')[0],
      defectType: finalType || 'Cacat Produksi',
      fishboneFactor,
      actionPlan: actionPlan.trim() || 'Perbaikan standar kerja & inspeksi bahan',
      scrappedUnits: Number(scrappedUnits) || 0,
      baseHppSnapshot: prod.baseHpp,
      reworkCost: Number(reworkCost) || 0,
      complaintDiscount: Number(complaintDiscount) || 0,
    });

    setIsDefectModalOpen(false);
    showNotice(`Catatan cacat pada "${prod.name}" berhasil disimpan.`);
  };

  const handleAddCustomChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    addChecklistItem(newChecklistLevel, newChecklistTitle);
    setNewChecklistTitle('');
    showNotice('Butir pemeriksaan baru berhasil ditambahkan ke daftar.');
  };

  // Checklist Breakdown
  const levelAChecklists = checklists.filter((c) => c.level === 'halal_facility');
  const levelBChecklists = checklists.filter((c) => c.level === 'daily_qc');

  const levelACheckedCount = levelAChecklists.filter((c) => c.isChecked).length;
  const levelAPercent =
    levelAChecklists.length > 0 ? Math.round((levelACheckedCount / levelAChecklists.length) * 100) : 100;

  const levelBCheckedCount = levelBChecklists.filter((c) => c.isChecked).length;
  const levelBPercent =
    levelBChecklists.length > 0 ? Math.round((levelBCheckedCount / levelBChecklists.length) * 100) : 100;

  const totalCopqLoss = defects.reduce((sum, d) => sum + d.totalCopqLoss, 0);

  // Preview in modal
  const selectedProdObj = products.find((p) => p.id === selectedProductId);
  const previewCopqLoss =
    (Number(scrappedUnits) || 0) * (selectedProdObj?.baseHpp || 0) +
    (Number(reworkCost) || 0) +
    (Number(complaintDiscount) || 0);

  return (
    <div className="space-y-4 pb-20">
      {/* Feedback Banner */}
      {notice && (
        <div className="bg-primary text-white px-4 py-2.5 rounded-md text-xs font-bold flex items-center justify-between shadow-micro">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-check"></i>
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} className="text-white/80 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-ink tracking-tight">
            Kendali Mutu, Cacat & Halal
          </h2>
        </div>

        {activeSubTab === 'defects' && (
          <button
            type="button"
            onClick={openAddDefectModal}
            disabled={products.length === 0}
            className={`w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-full shadow-micro flex items-center justify-center gap-2 shrink-0 transition-colors ${
              products.length === 0
                ? 'bg-neutral-2 text-muted cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-hover'
            }`}
          >
            <i className="fa-solid fa-plus text-xs"></i>
            <span>Catat Cacat / Rework Baru</span>
          </button>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center border-b border-hairline">
        <button
          type="button"
          onClick={() => setActiveSubTab('defects')}
          className={`flex-1 sm:flex-initial justify-center pb-2.5 px-2 sm:px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'defects'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <i className="fa-solid fa-bug text-xs"></i>
          <span>Riwayat Cacat ({defects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('checklist')}
          className={`flex-1 sm:flex-initial justify-center pb-2.5 px-2 sm:px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === 'checklist'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <i className="fa-solid fa-list-check text-xs"></i>
          <span>Checklist Mutu & Halal</span>
        </button>
      </div>

      {/* SUB-TAB 1: DEFECT & COPQ LOG */}
      {activeSubTab === 'defects' && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="bg-canvas border border-hairline rounded-md p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 shadow-micro">
            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Total Kejadian
              </span>
              <span className="text-base font-extrabold text-ink">{defects.length} Insiden</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Total Biaya Rugi (COPQ)
              </span>
              <span className="text-base font-extrabold text-danger-text">{formatRupiah(totalCopqLoss)}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Rata-rata Kerugian
              </span>
              <span className="text-base font-extrabold text-ink">
                {formatRupiah(defects.length ? Math.round(totalCopqLoss / defects.length) : 0)}
              </span>
            </div>
          </div>

          {defects.length === 0 ? (
            <div className="bg-canvas border border-hairline rounded-md p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-1 text-muted flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ink">Belum Ada Catatan Cacat Produksi</h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Setiap kali terjadi amplas ulang, cat ulang, adonan bantat, atau komplain retur, catat di sini agar kebocoran modal terlacak.
                </p>
              </div>
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={openAddDefectModal}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-hover"
                >
                  Catat Insiden Cacat
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {defects.map((defect) => {
                const scrapLoss = defect.scrappedUnits * defect.baseHppSnapshot;

                return (
                  <div
                    key={defect.id}
                    className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro hover:border-neutral-2 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-xs text-muted font-mono">{defect.date}</span>
                        <h3 className="font-extrabold text-sm text-ink">{defect.productNameSnapshot}</h3>
                        {defect.orderNumberSnapshot && (
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/20">
                            {defect.orderNumberSnapshot}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-neutral-1 text-body border border-hairline uppercase tracking-wide">
                          Faktor: {defect.fishboneFactor}
                        </span>

                        {confirmDeleteId === defect.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deleteDefect(defect.id);
                                setConfirmDeleteId(null);
                                showNotice('Catatan cacat telah dihapus.');
                              }}
                              className="px-2 py-0.5 bg-danger-text text-white rounded-sm text-[10px] font-bold"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 bg-neutral-1 text-body rounded-sm text-[10px] font-semibold"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(defect.id)}
                            className="text-muted hover:text-danger-text p-1 text-xs"
                            title="Hapus Catatan"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-ink">{defect.defectType}</div>
                      <div className="text-xs text-body mt-1 bg-neutral-1 p-2 rounded-sm border border-hairline flex items-start gap-2">
                        <i className="fa-solid fa-lightbulb text-primary text-xs mt-0.5 shrink-0"></i>
                        <span>
                          <strong className="text-ink">Aksi Perbaikan:</strong> {defect.actionPlan}
                        </span>
                      </div>
                    </div>

                    <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted block">Unit Rusak Total:</span>
                        <span className="font-bold text-ink">
                          {defect.scrappedUnits} pcs ({formatRupiah(scrapLoss)})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">Biaya Rework:</span>
                        <span className="font-bold text-ink">{formatRupiah(defect.reworkCost)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">Potongan Komplain:</span>
                        <span className="font-bold text-ink">{formatRupiah(defect.complaintDiscount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted block">Total Rugi (COPQ):</span>
                        <span className="font-extrabold text-danger-text">{formatRupiah(defect.totalCopqLoss)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: TWO-LEVEL CHECKLIST */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-5">
          {/* LEVEL A: AUDIT KESIAPAN TEMPAT USAHA & TITIK KRITIS HALAL */}
          <div className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                    A
                  </span>
                  <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
                    Level A: Kesiapan Fasilitas & Titik Kritis Halal
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-24 bg-neutral-1 h-2 rounded-full overflow-hidden border border-hairline">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${levelAPercent}%` }}
                  ></div>
                </div>
                <span className="text-xs font-black text-primary">{levelAPercent}% Siap</span>
              </div>
            </div>

            <div className="divide-y divide-hairline">
              {levelAChecklists.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-1/50 px-1 rounded transition-colors"
                >
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.isChecked}
                      onChange={() => toggleChecklist(item.id)}
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary"
                    />
                    <span className={`text-xs leading-snug ${item.isChecked ? 'text-ink font-semibold' : 'text-body font-medium'}`}>
                      {item.title}
                    </span>
                  </label>
                  {item.id.startsWith('chk_custom_') && (
                    <button
                      type="button"
                      onClick={() => deleteChecklistItem(item.id)}
                      className="text-muted hover:text-danger-text text-xs p-1"
                      title="Hapus butir kustom"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LEVEL B: STANDAR OPERASIONAL PROSEDUR (SOP) QC HARIAN */}
          <div className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-body text-white text-[10px] font-black flex items-center justify-center">
                    B
                  </span>
                  <h3 className="font-extrabold text-sm text-ink uppercase tracking-wide">
                    Level B: Standar Pemeriksaan Mutu Rutin (SOP QC)
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="w-24 bg-neutral-1 h-2 rounded-full overflow-hidden border border-hairline">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${levelBPercent}%` }}
                  ></div>
                </div>
                <span className="text-xs font-black text-primary">{levelBPercent}% Lolos</span>
              </div>
            </div>

            <div className="divide-y divide-hairline">
              {levelBChecklists.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-1/50 px-1 rounded transition-colors"
                >
                  <label className="flex items-start gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.isChecked}
                      onChange={() => toggleChecklist(item.id)}
                      className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary"
                    />
                    <span className={`text-xs leading-snug ${item.isChecked ? 'text-ink font-semibold' : 'text-body font-medium'}`}>
                      {item.title}
                    </span>
                  </label>
                  {item.id.startsWith('chk_custom_') && (
                    <button
                      type="button"
                      onClick={() => deleteChecklistItem(item.id)}
                      className="text-muted hover:text-danger-text text-xs p-1"
                      title="Hapus butir kustom"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Checklist Item Form */}
          <form
            onSubmit={handleAddCustomChecklist}
            className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro"
          >
            <div className="text-xs font-extrabold text-ink uppercase tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-plus text-primary"></i>
              <span>Tambah Standar SOP / Checklist Spesifik Usaha Anda</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={newChecklistLevel}
                onChange={(e) => setNewChecklistLevel(e.target.value as any)}
                className="px-3 py-2 border border-neutral-2 rounded-md text-xs font-bold text-ink bg-canvas"
              >
                <option value="daily_qc">Level B: SOP QC Harian</option>
                <option value="halal_facility">Level A: Audit Halal & 5R</option>
              </select>
              <input
                type="text"
                placeholder="Contoh: Pastikan sekrup engsel dikencangkan penuh sebelum kemas..."
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                className="sm:col-span-2 px-3 py-2 border border-neutral-2 rounded-md text-xs text-ink font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro"
              >
                Tambah Checklist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Defect Modal */}
      {isDefectModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-canvas text-body rounded-md max-w-lg w-full border border-hairline shadow-lg overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bug text-danger-text text-sm"></i>
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-ink">
                  Catat Kejadian Cacat / Pengerjaan Ulang
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDefectModalOpen(false)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveDefect} className="p-4 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Produk Terkait *
                  </label>
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-2 rounded-md text-xs font-bold text-ink bg-canvas outline-none focus:border-primary"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (HPP: {formatRupiah(p.baseHpp)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Pesanan Terkait (Opsional)
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-2 rounded-md text-xs font-medium text-ink bg-canvas outline-none focus:border-primary"
                  >
                    <option value="">-- Bukan dari pesanan khusus --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} - {o.customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Defect Type & Fishbone Factor */}
              <div className="space-y-3 border-t border-hairline pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Jenis Masalah / Cacat *
                  </label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value)}
                    className="w-full px-2.5 py-2 border border-neutral-2 rounded-md text-xs font-bold text-ink bg-canvas outline-none focus:border-primary mb-2"
                  >
                    {currentSector.defectTypes.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                    <option value="custom">-- Ketik Masalah Kustom Lainnya --</option>
                  </select>

                  {defectType === 'custom' && (
                    <input
                      type="text"
                      required
                      placeholder="Tuliskan jenis cacat yang terjadi..."
                      value={customDefectType}
                      onChange={(e) => setCustomDefectType(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-2 rounded-md text-xs text-ink font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Akar Penyebab Dominan (Fishbone 4M+1E) *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(['Bahan Baku', 'Alat/Mesin', 'Metode Kerja', 'Tenaga Kerja', 'Lingkungan'] as FishboneCategory[]).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFishboneFactor(cat)}
                          className={`p-2 rounded-sm border text-xs text-left transition-all font-semibold ${
                            fishboneFactor === cat
                              ? 'border-primary bg-primary text-white'
                              : 'border-hairline bg-neutral-1 text-body hover:border-neutral-2'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Rencana Tindakan Korektif (1 Baris Action Plan) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kalibrasi suhu kompor / Wajib cek MC kayu sebelum rakit"
                    value={actionPlan}
                    onChange={(e) => setActionPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md text-xs text-ink font-medium"
                  />
                </div>
              </div>

              {/* Loss Breakdown */}
              <div className="bg-neutral-1 p-3 rounded-md border border-hairline space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink uppercase tracking-wider">
                    Rincian Kerugian Riil (Actual COPQ)
                  </span>
                  <span className="text-xs font-extrabold text-danger-text">
                    Total Rugi: {formatRupiah(previewCopqLoss)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-muted mb-0.5">Unit Rusak Total (Pcs)</label>
                    <input
                      type="number"
                      min={0}
                      value={scrappedUnits}
                      onChange={(e) => setScrappedUnits(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-neutral-2 rounded bg-canvas font-bold text-right text-xs"
                    />
                    <span className="text-[9px] text-muted block mt-0.5">
                      x HPP {formatRupiah(selectedProdObj?.baseHpp || 0)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted mb-0.5">Biaya Rework / Cat Ulang (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      value={reworkCost}
                      onChange={(e) => setReworkCost(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-neutral-2 rounded bg-canvas font-bold text-right text-xs"
                    />
                    <span className="text-[9px] text-muted block mt-0.5">Bahan + upah tambahan</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted mb-0.5">Potongan Komplain (Rp)</label>
                    <input
                      type="number"
                      min={0}
                      value={complaintDiscount}
                      onChange={(e) => setComplaintDiscount(Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-neutral-2 rounded bg-canvas font-bold text-right text-xs"
                    />
                    <span className="text-[9px] text-muted block mt-0.5">Ganti rugi ke pelanggan</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => setIsDefectModalOpen(false)}
                  className="px-4 py-2 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro"
                >
                  Simpan Catatan Cacat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
