import React, { useState } from 'react';
import { useUmkm } from '../../context/UmkmContext';
import { Product, MaterialItem, CalcMode } from '../../types/titan';
import {
  calculateProductHpp,
  calculateRecommendedSellingPrice,
  evaluateProductCopqWarning,
  getMarginTierRecommendations,
  analyzeCurrentMarginInsight,
  formatRupiah,
} from '../../utils/calculations';
import { createMaterialKey } from '../../utils/syncEngine';
import { SECTOR_PRESETS, getSectorFeatures } from '../../config/sectorPresets';
import { normalizeUnit, formatVolumeM3 } from '../../utils/furnitureCalculations';
import { CuttingListPanel } from '../furniture/CuttingListPanel';

export const HppModule: React.FC = () => {
  const { profile, products, orders, defects, addProduct, updateProduct, deleteProduct, syncMaterialPrice } = useUmkm();
  const currentSector = SECTOR_PRESETS[profile.sector] || SECTOR_PRESETS.mebel;
  const sectorFeatures = getSectorFeatures(profile.sector);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeCuttingListIndex, setActiveCuttingListIndex] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [calcMode, setCalcMode] = useState<CalcMode>(currentSector.defaultCalcMode);
  const [outputQty, setOutputQty] = useState(1);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [laborCost, setLaborCost] = useState(0);
  const [overheadCost, setOverheadCost] = useState(0);
  const [defectRiskPercent, setDefectRiskPercent] = useState(5);
  const [sellingPrice, setSellingPrice] = useState(0);

  // Sync / Feedback Alert
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setSyncNotice(msg);
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setCalcMode(currentSector.defaultCalcMode);
    setOutputQty(currentSector.defaultCalcMode === 'batch_based' ? 50 : 1);
    const defaultMatName =
      currentSector.id === 'mebel'
        ? 'Kayu Jati Perhutani Grade A'
        : currentSector.id === 'fnb'
        ? 'Minyak Goreng Sawit Kemasan'
        : 'Bahan Baku Utama';
    const defaultMatUnit = currentSector.id === 'mebel' ? 'm3' : currentSector.id === 'fnb' ? 'liter' : 'kg';
    const defaultMatPrice = currentSector.id === 'mebel' ? 8500000 : currentSector.id === 'fnb' ? 18000 : 100000;
    const defaultMatQty = currentSector.id === 'mebel' ? 0.05 : 2;

    setMaterials([
      {
        id: `mat_${Date.now()}_1`,
        name: defaultMatName,
        normalizedKey: createMaterialKey(defaultMatName, defaultMatUnit),
        category: 'main',
        qty: defaultMatQty,
        unit: defaultMatUnit,
        unitPrice: defaultMatPrice,
        wastagePercent: currentSector.id === 'mebel' ? 10 : 0,
      },
    ]);
    setLaborCost(currentSector.id === 'mebel' ? 150000 : 60000);
    setOverheadCost(25000);
    setDefectRiskPercent(5);
    setSellingPrice(currentSector.id === 'mebel' ? 800000 : 20000);
    setActiveCuttingListIndex(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setCalcMode(p.calcMode);
    setOutputQty(p.outputQty);
    setMaterials([...p.materials]);
    setLaborCost(p.laborCost);
    setOverheadCost(p.overheadCost);
    setDefectRiskPercent(p.defectRiskPercent);
    setSellingPrice(p.sellingPrice);
    setActiveCuttingListIndex(null);
    setIsModalOpen(true);
  };

  const handleAddMaterialRow = () => {
    const newMat: MaterialItem = {
      id: `mat_${Date.now()}`,
      name: '',
      normalizedKey: '',
      category: 'auxiliary',
      qty: 1,
      unit: 'pcs',
      unitPrice: 10000,
      wastagePercent: 0,
    };
    setMaterials([...materials, newMat]);
  };

  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: any) => {
    const updated = [...materials];
    const item = { ...updated[index], [field]: value };
    if (field === 'name' || field === 'unit') {
      item.normalizedKey = createMaterialKey(item.name, item.unit);
    }
    updated[index] = item;
    setMaterials(updated);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      calcMode,
      outputQty: calcMode === 'unit_based' ? 1 : Math.max(1, outputQty),
      materials: materials.map((m) => ({
        ...m,
        normalizedKey: createMaterialKey(m.name, m.unit),
      })),
      laborCost: Number(laborCost) || 0,
      overheadCost: Number(overheadCost) || 0,
      defectRiskPercent: Number(defectRiskPercent) || 0,
      sellingPrice: Number(sellingPrice) || 0,
    };

    if (editingId) {
      updateProduct(editingId, payload);
      showNotice(`Perubahan HPP produk "${payload.name}" berhasil disimpan.`);
    } else {
      addProduct(payload);
      showNotice(`Produk baru "${payload.name}" berhasil ditambahkan ke katalog.`);
    }

    setIsModalOpen(false);
  };

  const handleTriggerSync = (normalizedKey: string, price: number, materialName: string) => {
    const affected = syncMaterialPrice(normalizedKey, price);
    if (affected > 0) {
      showNotice(`Harga "${materialName}" (${formatRupiah(price)}) berhasil disinkronkan ke ${affected} produk di katalog.`);
    } else {
      showNotice(`Harga "${materialName}" telah dicatat (belum ada produk lain yang memakai bahan & satuan yang sama).`);
    }
  };

  // Preview Calculation for current form
  const previewCalc = calculateProductHpp(
    calcMode,
    outputQty,
    materials,
    laborCost,
    overheadCost,
    defectRiskPercent,
    sellingPrice
  );

  const marginTiers = getMarginTierRecommendations(previewCalc.safeHpp);
  const currentMarginInsight = analyzeCurrentMarginInsight(previewCalc.safeHpp, sellingPrice);

  const handleApplyTargetMargin = (targetMarginPct: number) => {
    const recommended = calculateRecommendedSellingPrice(previewCalc.safeHpp, targetMarginPct);
    setSellingPrice(recommended);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Sync Notification Banner */}
      {syncNotice && (
        <div className="bg-primary text-white px-4 py-2.5 rounded-md text-xs font-bold flex items-center justify-between shadow-micro">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-sm"></i>
            <span>{syncNotice}</span>
          </div>
          <button type="button" onClick={() => setSyncNotice(null)} className="text-white/80 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-extrabold text-ink tracking-tight">Katalog Produk & Kalkulasi HPP</h2>
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase">
              {currentSector.name}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Struktur modal akurat dengan cadangan risiko cacat (COPQ Buffer) bebas bocor biaya.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="w-full sm:w-auto bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-micro hover:bg-primary-hover flex items-center justify-center gap-2 shrink-0 transition-colors"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Product List */}
      {products.length === 0 ? (
        <div className="bg-canvas border border-hairline rounded-md p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-1 text-muted flex items-center justify-center mx-auto text-xl">
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink">Belum Ada Produk Terdaftar</h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Mulai dengan mencatat 1 produk unggulan usaha Anda untuk menghitung modal HPP dan margin yang aman.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-hover"
          >
            Input Produk Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {products.map((product) => {
            const warningInfo = evaluateProductCopqWarning(product, orders, defects);
            const isWarning = warningInfo.isWarning;
            const cardInsight = analyzeCurrentMarginInsight(product.safeHpp, product.sellingPrice);

            return (
              <div
                key={product.id}
                className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro hover:border-neutral-2 transition-colors"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h3 className="font-extrabold text-sm md:text-base text-ink tracking-tight">
                        {product.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs bg-neutral-1 text-body border border-hairline">
                        {product.calcMode === 'unit_based' ? 'Per Unit' : `Per Batch (${product.outputQty} Porsi)`}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {product.materials.length} komponen bahan &bull; Cadangan Risiko: {product.defectRiskPercent}%
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(product)}
                      className="px-2.5 py-1 text-primary hover:bg-primary/5 rounded-sm border border-primary/20 text-[11px] font-bold flex items-center gap-1"
                      title="Edit HPP Produk"
                    >
                      <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                      <span>Edit</span>
                    </button>

                    {confirmDeleteId === product.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteProduct(product.id);
                            setConfirmDeleteId(null);
                            showNotice(`Produk "${product.name}" telah dihapus.`);
                          }}
                          className="px-2 py-1 bg-danger-text text-white rounded-sm text-[10px] font-bold"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-neutral-1 text-body rounded-sm text-[10px] font-semibold"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(product.id)}
                        className="p-1.5 text-muted hover:text-danger-text rounded-sm hover:bg-neutral-1 text-xs"
                        title="Hapus Produk"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Closed-Loop Warning (If Actual COPQ Loss > Configured Defect Risk Buffer) */}
                {isWarning && (
                  <div className="bg-danger-subtle border border-danger-text/20 rounded-sm p-2.5 text-xs text-danger-text space-y-2">
                    <div className="flex items-start gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-sm shrink-0 mt-0.5"></i>
                      <div className="leading-snug">
                        <span className="font-bold">
                          Realisasi Cacat ({warningInfo.actualDefectRatio}%) &gt; Cadangan ({warningInfo.configuredBuffer}%).
                        </span>{' '}
                        Total rugi cacat: {formatRupiah(warningInfo.totalProductCopqLoss)}. Margin berisiko tekor.
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          updateProduct(product.id, { defectRiskPercent: warningInfo.recommendedBuffer });
                          showNotice(
                            `Cadangan risiko "${product.name}" disesuaikan menjadi ${warningInfo.recommendedBuffer}% untuk mengamankan HPP.`
                          );
                        }}
                        className="px-2.5 py-1 bg-canvas text-danger-text border border-danger-text/30 hover:bg-danger-text hover:text-white rounded-full text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <i className="fa-solid fa-shield-halved text-[10px]"></i>
                        <span>Sesuaikan Cadangan ke {warningInfo.recommendedBuffer}%</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Price & Cost Comparison Matrix (2x2 Grid for clear legibility on both mobile and desktop cards) */}
                <div className="bg-neutral-1 rounded-sm p-3 border border-hairline grid grid-cols-2 gap-2.5 text-left">
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">HPP Dasar</span>
                    <span className="text-xs font-bold text-ink">{formatRupiah(product.baseHpp)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">HPP Riil Aman</span>
                    <span className="text-xs font-bold text-primary">{formatRupiah(product.safeHpp)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-hairline/70">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Harga Jual</span>
                    <span className="text-xs font-extrabold text-ink">{formatRupiah(product.sellingPrice)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-hairline/70">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Laba Bersih</span>
                    <div className="flex items-center flex-wrap gap-1">
                      <span className="text-xs font-bold text-ink">{formatRupiah(product.netProfitPerUnit)}</span>
                      <span
                        className={`text-[10px] font-extrabold ${
                          product.netMarginPercent >= 15 ? 'text-primary' : 'text-danger-text'
                        }`}
                      >
                        ({product.netMarginPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Insight Kelas Produk & Rekomendasi Bisnis */}
                <div className="bg-canvas p-2.5 rounded-sm border border-hairline text-xs space-y-1">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-extrabold text-ink flex items-center gap-1.5 truncate">
                      <i className={`${cardInsight.icon} text-[10px] text-primary shrink-0`}></i>
                      <span className="truncate">{cardInsight.tierName}</span>
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 ${cardInsight.badgeClass}`}>
                      {cardInsight.badgeLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    {cardInsight.insightText}
                  </p>
                </div>

                {/* Component Breakdown List */}
                <div className="text-[11px] text-body pt-1 flex flex-wrap gap-x-4 gap-y-1 border-t border-hairline">
                  <span>
                    <strong className="text-ink">Upah Kerja:</strong> {formatRupiah(product.laborCost)}
                  </span>
                  <span>
                    <strong className="text-ink">Overhead:</strong> {formatRupiah(product.overheadCost)}
                  </span>
                  <span>
                    <strong className="text-ink">Cadangan Cacat:</strong> +{formatRupiah(product.copqBufferAmount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-canvas text-body rounded-md max-w-2xl w-full border border-hairline shadow-lg overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-calculator text-primary text-sm"></i>
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-ink">
                  {editingId ? 'Edit Struktur HPP Produk' : 'Kalkulasi HPP Produk Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveProduct} className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Product Info & Calc Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    {currentSector.productLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kursi Makan Minimalis / Kerupuk Tengiri 200g"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-ink font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Metode Perhitungan
                  </label>
                  <select
                    value={calcMode}
                    onChange={(e) => setCalcMode(e.target.value as CalcMode)}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-ink font-medium bg-canvas"
                  >
                    <option value="unit_based">Per Unit / Satuan (Mebel/Kriya)</option>
                    <option value="batch_based">Per Batch / Resep (Kuliner/FnB)</option>
                  </select>
                </div>
              </div>

              {calcMode === 'batch_based' && (
                <div className="bg-neutral-1 p-3 rounded-md border border-hairline flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-ink">Jumlah Porsi Layak Jual per Batch</div>
                    <div className="text-[11px] text-muted leading-tight">
                      Total biaya 1 kali masak/adonan dibagi jumlah porsi matang layak jual ini.
                    </div>
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      min={1}
                      required
                      value={outputQty}
                      onChange={(e) => setOutputQty(Math.max(1, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 border border-neutral-2 rounded-md text-right font-bold text-ink bg-canvas"
                    />
                  </div>
                </div>
              )}

              {/* Materials Table */}
              <div className="space-y-2 border-t border-hairline pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                      Komponen Bahan Baku & Penolong
                    </label>
                    <span className="text-[11px] text-muted">
                      {calcMode === 'unit_based'
                        ? 'Bahan mentah utama dapat diisi persentase sisa potong/serut.'
                        : 'Bahan resep dan kemasan untuk 1 kali masak/adonan.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                    <span>Tambah Komponen</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {materials.map((mat, index) => {
                    const rowCost =
                      calcMode === 'unit_based' && mat.category === 'main' && mat.wastagePercent > 0
                        ? (mat.qty * mat.unitPrice) / (1 - Math.min(95, mat.wastagePercent) / 100)
                        : mat.qty * mat.unitPrice;

                    const isCubicWood =
                      sectorFeatures.cubicCalculator &&
                      mat.category === 'main' &&
                      normalizeUnit(mat.unit) === 'm3';
                    const hasCuttingList = !!(mat.cuttingList && mat.cuttingList.length > 0);

                    return (
                      <div key={mat.id} className="space-y-1">
                        <div className="bg-neutral-1 p-2.5 rounded-sm border border-hairline grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 sm:col-span-4">
                            <input
                              type="text"
                              required
                              placeholder="Nama Bahan (contoh: Kayu Jati / Tepung)"
                              value={mat.name}
                              onChange={(e) => handleMaterialChange(index, 'name', e.target.value)}
                              className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs font-medium text-ink bg-canvas"
                            />
                          </div>

                          <div className="col-span-4 sm:col-span-2">
                            <select
                              value={mat.category}
                              onChange={(e) => handleMaterialChange(index, 'category', e.target.value)}
                              className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs text-ink bg-canvas font-medium"
                            >
                              <option value="main">Utama</option>
                              <option value="auxiliary">Penolong</option>
                            </select>
                          </div>

                          <div className="col-span-4 sm:col-span-2 flex gap-1">
                            <input
                              type="number"
                              step="any"
                              min={0.0001}
                              placeholder="Qty"
                              value={mat.qty}
                              readOnly={hasCuttingList}
                              onChange={(e) => handleMaterialChange(index, 'qty', Number(e.target.value))}
                              className={`w-1/2 px-1.5 py-1.5 border border-neutral-2 rounded-sm text-xs text-right font-medium text-ink ${
                                hasCuttingList ? 'bg-primary/5 text-primary font-bold cursor-not-allowed' : 'bg-canvas'
                              }`}
                              title={hasCuttingList ? 'Volume otomatis dari daftar potong kayu' : undefined}
                            />
                            <input
                              type="text"
                              placeholder="Satuan"
                              value={mat.unit}
                              onChange={(e) => handleMaterialChange(index, 'unit', e.target.value)}
                              className="w-1/2 px-1.5 py-1.5 border border-neutral-2 rounded-sm text-xs font-medium text-ink bg-canvas"
                            />
                          </div>

                          <div className="col-span-4 sm:col-span-3">
                            <input
                              type="number"
                              min={0}
                              placeholder="Harga Satuan (Rp)"
                              value={mat.unitPrice}
                              onChange={(e) => handleMaterialChange(index, 'unitPrice', Number(e.target.value))}
                              className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs text-right font-bold text-ink bg-canvas"
                            />
                          </div>

                          <div className="col-span-12 sm:col-span-1 flex justify-end">
                            {materials.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMaterial(index)}
                                className="text-muted hover:text-danger-text p-1 text-sm"
                                title="Hapus Baris"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            )}
                          </div>

                          {/* Extra controls row for Wastage %, Cutting List Button, and Price Sync */}
                          <div className="col-span-12 flex flex-wrap items-center justify-between text-[11px] pt-1 text-muted border-t border-hairline/60 gap-1.5">
                            <div className="flex flex-wrap items-center gap-3">
                              {calcMode === 'unit_based' && mat.category === 'main' && (
                                <label className="flex items-center gap-1 text-ink font-medium">
                                  <span>Susut/Sisa Potong:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={80}
                                    value={mat.wastagePercent}
                                    onChange={(e) =>
                                      handleMaterialChange(index, 'wastagePercent', Number(e.target.value))
                                    }
                                    className="w-12 px-1 py-0.5 border border-neutral-2 rounded text-center text-xs bg-canvas"
                                  />
                                  <span>%</span>
                                </label>
                              )}

                              {isCubicWood && (
                                <div className="flex items-center gap-1.5">
                                  {hasCuttingList ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-primary font-bold flex items-center gap-1 text-[11px]">
                                        <i className="fa-solid fa-ruler-combined text-[10px]"></i>
                                        <span>Daftar Potong ({mat.cuttingList?.length} bagian)</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveCuttingListIndex(
                                            activeCuttingListIndex === index ? null : index
                                          )
                                        }
                                        className="text-[11px] text-primary underline font-bold hover:text-primary-hover"
                                      >
                                        {activeCuttingListIndex === index ? 'Tutup Rincian' : 'Ubah Rincian'}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveCuttingListIndex(
                                          activeCuttingListIndex === index ? null : index
                                        )
                                      }
                                      className="px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] flex items-center gap-1"
                                      title="Hitung kubikasi dari ukuran per komponen (cm)"
                                    >
                                      <i className="fa-solid fa-ruler-combined text-[10px]"></i>
                                      <span>Hitung Kubikasi (cm)</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {mat.name.trim() && mat.unitPrice > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTriggerSync(
                                      createMaterialKey(mat.name, mat.unit),
                                      mat.unitPrice,
                                      mat.name
                                    )
                                  }
                                  className="text-primary hover:underline font-semibold flex items-center gap-1"
                                  title="Sinkronkan harga bahan ini ke semua produk lain"
                                >
                                  <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                                  <span>Sinkron harga</span>
                                </button>
                              )}
                            </div>

                            <div className="font-bold text-ink">
                              Subtotal: {formatRupiah(Math.round(rowCost))}
                            </div>
                          </div>
                        </div>

                        {/* Inline Cutting List Accordion Panel */}
                        {isCubicWood && activeCuttingListIndex === index && (
                          <CuttingListPanel
                            initialPieces={mat.cuttingList}
                            unitPrice={mat.unitPrice}
                            wastagePercent={mat.wastagePercent}
                            materialName={mat.name || 'Bahan Kayu'}
                            onApply={(pieces, totalVol) => {
                              const updated = [...materials];
                              updated[index] = { ...updated[index], cuttingList: pieces, qty: totalVol };
                              setMaterials(updated);
                              setActiveCuttingListIndex(null);
                            }}
                            onRemove={() => {
                              const updated = [...materials];
                              updated[index] = { ...updated[index], cuttingList: undefined };
                              setMaterials(updated);
                              setActiveCuttingListIndex(null);
                            }}
                            onClose={() => setActiveCuttingListIndex(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Labor & Overhead */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-hairline pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    {currentSector.laborLabel} (Rp) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold text-right"
                  />
                  <span className="text-[10px] text-muted">
                    {calcMode === 'unit_based' ? 'Upah borongan/harian per 1 unit.' : 'Upah masak/kemas untuk 1 batch penuh.'}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    {currentSector.overheadLabel} (Rp) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={overheadCost}
                    onChange={(e) => setOverheadCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold text-right"
                  />
                  <span className="text-[10px] text-muted">Listrik, gas LPG, dan penyusutan alat kerja.</span>
                </div>
              </div>

              {/* Risk Buffer & Selling Price */}
              <div className="bg-neutral-1 p-3.5 rounded-md border border-hairline space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-ink text-xs uppercase tracking-wide">
                      Cadangan Risiko Cacat (COPQ Buffer): +{formatRupiah(previewCalc.copqBufferAmount)}/unit
                    </div>
                    <div className="text-[11px] text-muted leading-tight">
                      HPP Dasar {formatRupiah(previewCalc.baseHpp)} &rarr; HPP Riil Aman:{' '}
                      <strong className="text-primary">{formatRupiah(previewCalc.safeHpp)}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={25}
                      step={1}
                      value={defectRiskPercent}
                      onChange={(e) => setDefectRiskPercent(Number(e.target.value))}
                      className="w-28 accent-primary"
                    />
                    <span className="font-extrabold text-sm text-primary w-10 text-right">
                      {defectRiskPercent}%
                    </span>
                  </div>
                </div>

                {/* Rekomendasi Kelas Produk User-Friendly */}
                <div className="border-t border-hairline/80 pt-3 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <i className="fa-solid fa-calculator text-primary text-xs"></i>
                      <span className="text-xs font-extrabold text-ink uppercase tracking-wide">
                        Pilih Rekomendasi Kelas Produk (Hitung Harga Otomatis):
                      </span>
                    </div>
                    <span className="text-[11px] text-muted">
                      Klik salah satu untuk pasang harga rekomendasi
                    </span>
                  </div>

                  {/* 3 User-Friendly Recommendation Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {marginTiers.map((tier) => {
                      const isCurrent = sellingPrice === tier.price;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSellingPrice(tier.price)}
                          className={`p-3 rounded-md border text-left transition-all flex flex-col justify-between ${
                            isCurrent
                              ? 'bg-primary/5 border-primary shadow-micro'
                              : 'bg-canvas border-hairline hover:border-neutral-2'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-extrabold text-xs text-ink flex items-center gap-1.5">
                                <i className={`${tier.icon} text-xs ${tier.highlight ? 'text-primary' : 'text-muted'}`}></i>
                                <span>{tier.name}</span>
                              </span>
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-xs ${
                                  tier.highlight ? 'bg-primary text-white' : 'bg-neutral-1 text-body border border-hairline'
                                }`}
                              >
                                {tier.targetMargin}%
                              </span>
                            </div>
                            <p className="text-[11px] text-muted leading-tight mb-2.5">{tier.tagline}</p>
                          </div>

                          <div className="pt-2 border-t border-hairline/80">
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="text-[10px] text-muted uppercase font-bold">Harga Jual:</span>
                              <span className="text-xs font-black text-ink">{formatRupiah(tier.price)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted">
                                Laba: <strong className="text-primary font-bold">{formatRupiah(tier.profit)}</strong>
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                                  isCurrent
                                    ? 'bg-primary text-white'
                                    : 'bg-neutral-1 text-primary hover:bg-primary/10'
                                }`}
                              >
                                {isCurrent ? 'Terpilih' : 'Pasang'}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Preset Buttons for Custom Percentages */}
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1">
                      Pilihan Margin Cepat Lainnya:
                    </span>
                    {[15, 20, 25, 30, 35].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyTargetMargin(pct)}
                        className="px-2.5 py-0.5 rounded-full bg-canvas border border-neutral-2 hover:border-primary hover:text-primary text-[11px] font-semibold text-body transition-colors"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Harga & Simulasi Hasil */}
                <div className="border-t border-hairline/80 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                        Harga Jual Satuan Ditetapkan (Rp) *
                      </label>
                      <span className="text-[10px] text-muted">Bisa diketik manual / nego</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-black text-sm text-right bg-canvas"
                    />
                  </div>

                  <div className="bg-canvas p-3 rounded-md border border-hairline">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Hasil Simulasi Laba per Unit</div>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-xs font-bold text-ink">Laba Bersih Aman:</span>
                      <span
                        className={`text-xs font-extrabold ${
                          previewCalc.netProfitPerUnit >= 0 ? 'text-primary' : 'text-danger-text'
                        }`}
                      >
                        {formatRupiah(previewCalc.netProfitPerUnit)} ({previewCalc.netMarginPercent}%)
                      </span>
                    </div>
                    <div className="text-[10px] text-muted flex items-center justify-between mt-1 pt-1 border-t border-hairline/70">
                      <span>Laba Semu (tanpa cadangan cacat):</span>
                      <span className="font-semibold text-ink">{formatRupiah(sellingPrice - previewCalc.baseHpp)}</span>
                    </div>
                  </div>
                </div>

                {/* Live Real-time Business Insight Card */}
                <div className="bg-canvas border border-hairline rounded-md p-3.5 space-y-2">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                        <i className={currentMarginInsight.icon}></i>
                      </span>
                      <span className="text-xs font-extrabold text-ink">
                        Analisis Posisi: <strong className="text-primary">{currentMarginInsight.tierName}</strong>
                      </span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full ${currentMarginInsight.badgeClass}`}>
                      {currentMarginInsight.badgeLabel}
                    </span>
                  </div>

                  <div className="text-xs text-body space-y-1.5">
                    <p className="leading-relaxed">
                      <strong className="text-ink">Insight Bisnis:</strong> {currentMarginInsight.insightText}
                    </p>
                    <p className="text-[11px] text-muted leading-relaxed">
                      <i className="fa-solid fa-lightbulb text-badge-gold text-[10px] mr-1"></i>
                      <strong>Saran Tindakan:</strong> {currentMarginInsight.adviceText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro"
                >
                  Simpan Produk & HPP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
