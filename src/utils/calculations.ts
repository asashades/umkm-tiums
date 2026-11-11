import { Product, MaterialItem, Order, DefectLog, FishboneCategory } from '../types/titan';

/**
 * 1. KALKULASI HPP PRODUK (MENU 1)
 * Menjamin pemisahan bersih antara mode 'unit_based' (dengan susut bahan utama)
 * dan 'batch_based' (tanpa susut per bahan untuk menghindari double-counting).
 */
export function calculateProductHpp(
  calcMode: 'unit_based' | 'batch_based',
  outputQty: number,
  materials: MaterialItem[],
  laborCost: number,
  overheadCost: number,
  defectRiskPercent: number,
  sellingPrice: number
) {
  const validOutputQty = calcMode === 'unit_based' ? 1 : Math.max(1, outputQty);

  const totalMaterialCost = materials.reduce((sum, item) => {
    const rawCost = item.qty * item.unitPrice;

    // Susut bahan mentah HANYA berlaku pada mode unit_based dan kategori bahan utama ('main')
    if (calcMode === 'unit_based' && item.category === 'main' && item.wastagePercent > 0) {
      const safeWastage = Math.min(95, Math.max(0, item.wastagePercent)); // Cegah division by zero
      const effectiveCost = rawCost / (1 - safeWastage / 100);
      return sum + effectiveCost;
    }

    return sum + rawCost;
  }, 0);

  const totalProductionCost = totalMaterialCost + laborCost + overheadCost;
  const baseHpp = Math.round(totalProductionCost / validOutputQty);
  const copqBufferAmount = Math.round(baseHpp * (Math.max(0, defectRiskPercent) / 100));
  const safeHpp = baseHpp + copqBufferAmount;
  const netProfitPerUnit = sellingPrice - safeHpp;
  const netMarginPercent =
    sellingPrice > 0 ? Number(((netProfitPerUnit / sellingPrice) * 100).toFixed(1)) : 0;

  return {
    totalMaterialCost: Math.round(totalMaterialCost),
    totalProductionCost: Math.round(totalProductionCost),
    baseHpp,
    copqBufferAmount,
    safeHpp,
    netProfitPerUnit,
    netMarginPercent,
  };
}

/**
 * Menghitung rekomendasi harga jual berdasarkan target margin bersih (%) terhadap harga jual.
 * Rumus: Harga Jual = SafeHPP / (1 - TargetMargin/100), dibulatkan ke 500 terdekat.
 */
export function calculateRecommendedSellingPrice(safeHpp: number, targetMarginPercent: number): number {
  const clampedMargin = Math.min(85, Math.max(1, targetMarginPercent));
  const rawPrice = safeHpp / (1 - clampedMargin / 100);
  return Math.ceil(rawPrice / 500) * 500;
}

export interface MarginTierRecommendation {
  id: 'biasa' | 'sedang' | 'high_class';
  name: string;
  tagline: string;
  targetMargin: number;
  price: number;
  profit: number;
  insight: string;
  icon: string;
  highlight?: boolean;
}

/**
 * Rekomendasi 3 Kelas Produk User-Friendly:
 * 1. Produk Biasa / Reguler (Standar Pasar, persaingan ketat, putaran cepat) ~ 18%
 * 2. Produk Sedang / Unggulan (Paling sehat & ideal untuk ketahanan UMKM) ~ 28%
 * 3. Produk High Class / Eksklusif (Custom khusus, bahan grade A, karya seni) ~ 40%
 */
export function getMarginTierRecommendations(safeHpp: number): MarginTierRecommendation[] {
  const safeBase = Math.max(0, safeHpp);

  const tiers: {
    id: 'biasa' | 'sedang' | 'high_class';
    name: string;
    tagline: string;
    margin: number;
    insight: string;
    icon: string;
    highlight?: boolean;
  }[] = [
    {
      id: 'biasa',
      name: 'Produk Biasa (Standar Pasar)',
      tagline: 'Model umum, persaingan ketat, perputaran cepat',
      margin: 18,
      insight: 'Cocok untuk barang standar harian. Kejar volume penjualan stabil agar cukup menutup biaya tetap.',
      icon: 'fa-solid fa-cart-shopping',
    },
    {
      id: 'sedang',
      name: 'Produk Sedang (Pilihan Ideal)',
      tagline: 'Paling sehat & aman untuk pertumbuhan UMKM',
      margin: 28,
      insight: 'Sangat direkomendasikan! Memberi ruang aman untuk negosiasi pembeli, biaya tak terduga, dan cadangan kas.',
      icon: 'fa-solid fa-star',
      highlight: true,
    },
    {
      id: 'high_class',
      name: 'Produk High Class (Eksklusif)',
      tagline: 'Pesanan khusus, bahan grade A, karya seni',
      margin: 40,
      insight: 'Cocok untuk pesanan kustom & finishing halus. Pembeli membayar nilai seni & prestise, bukan sekadar harga murah.',
      icon: 'fa-solid fa-crown',
    },
  ];

  return tiers.map((t) => {
    const price = calculateRecommendedSellingPrice(safeBase, t.margin);
    const profit = Math.max(0, price - safeBase);
    return {
      id: t.id,
      name: t.name,
      tagline: t.tagline,
      targetMargin: t.margin,
      price,
      profit,
      insight: t.insight,
      icon: t.icon,
      highlight: t.highlight,
    };
  });
}

/**
 * Analisis & Kalimat Insight Real-time berdasarkan harga jual yang sedang diinput user
 */
export function analyzeCurrentMarginInsight(safeHpp: number, sellingPrice: number) {
  if (sellingPrice <= 0 || safeHpp <= 0) {
    return {
      tierId: 'kosong' as const,
      tierName: 'Belum Ditentukan',
      badgeLabel: 'Tentukan Harga Jual',
      badgeClass: 'bg-neutral-1 text-muted border border-hairline',
      insightText: 'Masukkan harga jual atau pilih salah satu rekomendasi kelas produk di atas untuk melihat analisis keuntungan.',
      adviceText: 'Pastikan harga jual berada di atas HPP Riil Aman agar setiap unit yang terjual menghasilkan laba nyata.',
      icon: 'fa-solid fa-calculator',
    };
  }

  const netProfit = sellingPrice - safeHpp;
  const marginPct = Number(((netProfit / sellingPrice) * 100).toFixed(1));

  if (marginPct < 10) {
    return {
      tierId: 'bahaya' as const,
      tierName: 'Zona Bahaya',
      badgeLabel: `Margin Kritis (${marginPct}%)`,
      badgeClass: 'bg-danger-subtle text-danger-text border border-danger-text/30 font-bold',
      insightText: `Margin Anda hanya ${marginPct}%. Satu saja insiden cacat atau kenaikan bahan baku akan langsung membuat pesanan ini tekor.`,
      adviceText: 'Segera naikkan harga jual setidaknya ke level Produk Biasa (18%) atau evaluasi pemborosan biaya bahan/upah.',
      icon: 'fa-solid fa-triangle-exclamation',
    };
  }

  if (marginPct < 22) {
    return {
      tierId: 'biasa' as const,
      tierName: 'Produk Biasa / Standar',
      badgeLabel: `Kelas Biasa (${marginPct}%)`,
      badgeClass: 'bg-badge-gold/20 text-ink border border-badge-gold/40 font-bold',
      insightText: `Margin Anda ${marginPct}%, masuk kategori Produk Biasa. Cocok untuk barang pasar dengan perputaran cepat, namun ruang negosiasi sangat tipis.`,
      adviceText: 'Hindari memberi potongan diskon tambahan saat pembeli menawar agar modal dasar Anda tidak tergerus.',
      icon: 'fa-solid fa-cart-shopping',
    };
  }

  if (marginPct < 35) {
    return {
      tierId: 'sedang' as const,
      tierName: 'Produk Sedang (Paling Ideal)',
      badgeLabel: `Kelas Sedang (${marginPct}% Ideal)`,
      badgeClass: 'bg-primary/10 text-primary border border-primary/30 font-bold',
      insightText: `Margin Anda ${marginPct}%, posisi paling ideal dan sehat untuk UMKM! Anda terlindungi dari risiko cacat dan memiliki cadangan laba yang kokoh.`,
      adviceText: 'Pertahankan kualitas kerja dan tepati janji waktu pengerjaan untuk menjaga kepercayaan pelanggan.',
      icon: 'fa-solid fa-circle-check',
    };
  }

  return {
    tierId: 'high_class' as const,
    tierName: 'Produk High Class (Eksklusif)',
    badgeLabel: `Kelas High Class (${marginPct}%)`,
    badgeClass: 'bg-primary text-white border border-primary font-bold',
    insightText: `Margin Anda ${marginPct}%, masuk kategori High Class (Eksklusif). Nilai tambah produk sangat tinggi dengan laba per unit yang maksimal.`,
    adviceText: 'Pastikan kesempurnaan finishing, kerapian packaging, dan layanan purna jual sebanding dengan harga premium yang dibayar pembeli.',
    icon: 'fa-solid fa-crown',
  };
}

/**
 * 2. CLOSED-LOOP FEEDBACK WARNING (MENU 1.C)
 * Membandingkan Total Kerugian COPQ Produk terhadap Eksposur Biaya Produksi (HPP Dasar)
 * agar satuannya apel-ke-apel dengan defectRiskPercent (yang berbasis HPP Dasar).
 */
export function evaluateProductCopqWarning(
  product: Product,
  orders: Order[],
  defects: DefectLog[]
) {
  const productDefects = defects.filter((d) => d.productId === product.id);
  const totalProductCopqLoss = productDefects.reduce((sum, d) => sum + d.totalCopqLoss, 0);

  if (totalProductCopqLoss === 0) {
    return {
      isWarning: false,
      actualDefectRatio: 0,
      totalProductCopqLoss: 0,
      configuredBuffer: product.defectRiskPercent,
      recommendedBuffer: product.defectRiskPercent,
    };
  }

  // Hitung total unit produk ini yang pernah dipesan (non-batal)
  let totalOrderedUnits = 0;
  let totalHistoricalHppExposure = 0;

  orders
    .filter((o) => o.stage !== 'Dibatalkan')
    .forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId === product.id) {
          totalOrderedUnits += item.qty;
          totalHistoricalHppExposure += item.qty * item.baseHppSnapshot;
        }
      });
    });

  // Fallback baseline: Jika produk baru dicatat cacatnya sebelum ada order masuk,
  // gunakan baseline minimal 10 unit/porsi produksi agar rasio tetap rasional.
  const baselineHppExposure = Math.max(
    totalHistoricalHppExposure,
    product.baseHpp * Math.max(10, product.outputQty)
  );

  const actualDefectRatio =
    baselineHppExposure > 0
      ? Number(((totalProductCopqLoss / baselineHppExposure) * 100).toFixed(1))
      : 0;

  const recommendedBuffer = Math.ceil(actualDefectRatio + 0.5);

  return {
    isWarning: actualDefectRatio > product.defectRiskPercent,
    actualDefectRatio,
    configuredBuffer: product.defectRiskPercent,
    recommendedBuffer,
    totalProductCopqLoss,
  };
}

/**
 * Menghitung rasio COPQ keseluruhan tingkat usaha (%) terhadap eksposur HPP seluruh order/produk.
 */
export function calculateBusinessCopqRate(
  products: Product[],
  orders: Order[],
  defects: DefectLog[]
): number {
  const totalCopqLoss = defects.reduce((sum, d) => sum + d.totalCopqLoss, 0);
  if (totalCopqLoss === 0) return 0;

  const activeOrders = orders.filter((o) => o.stage !== 'Dibatalkan');
  const orderHppExposure = activeOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.qty * it.baseHppSnapshot, 0),
    0
  );
  const catalogBaseline = products.reduce(
    (sum, p) => sum + p.baseHpp * Math.max(10, p.outputQty),
    0
  );

  const exposure = Math.max(orderHppExposure, catalogBaseline);
  return exposure > 0 ? Number(((totalCopqLoss / exposure) * 100).toFixed(1)) : 0;
}

/**
 * 3. KALKULASI NOTA PESANAN MULTI-ITEM (MENU 2)
 * Memisahkan subtotal produk dari customFee (ongkir/paking) agar laba tidak terdistorsi.
 */
export function calculateOrderFinancials(order: Order) {
  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + item.qty * item.unitPriceSnapshot,
    0
  );
  const totalOrderHpp = order.items.reduce(
    (sum, item) => sum + item.qty * item.baseHppSnapshot,
    0
  );
  const totalInvoiceAmount = itemsSubtotal + (order.customFee || 0);
  const remainingReceivable = Math.max(0, totalInvoiceAmount - order.dpAmount);

  // Otomatisasi status pembayaran
  let paymentStatus: 'Belum DP' | 'DP Sebagian' | 'Lunas' = 'Belum DP';
  if (order.dpAmount >= totalInvoiceAmount && totalInvoiceAmount > 0) {
    paymentStatus = 'Lunas';
  } else if (order.dpAmount > 0) {
    paymentStatus = 'DP Sebagian';
  }

  return {
    itemsSubtotal,        // Nilai murni penjualan produk (acuan Laba Kotor)
    customFee: order.customFee || 0,
    totalInvoiceAmount,   // Total tagihan di nota WA (Produk + Ongkir)
    totalOrderHpp,        // Total HPP Dasar yang terkunci pada nota ini
    estimatedOrderGrossProfit: itemsSubtotal - totalOrderHpp,
    remainingReceivable,  // Sisa piutang pelanggan
    paymentStatus,
  };
}

/**
 * 4. RAPOR USAHA & PARETO 80/20 (MENU 4)
 * Menandingkan Pendapatan, HPP, dan COPQ secara konsisten (Matching Principle)
 * serta memisahkan Arus Kas (DP/Lunas vs Piutang) dan Pesanan Selesai vs Diproses.
 */
export function generateFinancialReport(orders: Order[], defects: DefectLog[]) {
  const activeOrders = orders.filter((o) => o.stage !== 'Dibatalkan');
  const completedOrders = activeOrders.filter((o) => o.stage === 'Selesai');
  const pipelineOrders = activeOrders.filter((o) => o.stage !== 'Selesai');

  // 1. Omzet Produk (Murni penjualan produk tanpa ongkir pass-through)
  const totalProductRevenue = activeOrders.reduce((sum, o) => {
    const { itemsSubtotal } = calculateOrderFinancials(o);
    return sum + itemsSubtotal;
  }, 0);

  const completedProductRevenue = completedOrders.reduce((sum, o) => {
    const { itemsSubtotal } = calculateOrderFinancials(o);
    return sum + itemsSubtotal;
  }, 0);

  const pipelineProductRevenue = pipelineOrders.reduce((sum, o) => {
    const { itemsSubtotal } = calculateOrderFinancials(o);
    return sum + itemsSubtotal;
  }, 0);

  // 2. Nilai Tagihan Nota (Termasuk Ongkir / Custom Fee)
  const completedGrossInvoice = completedOrders.reduce((sum, o) => {
    const { totalInvoiceAmount } = calculateOrderFinancials(o);
    return sum + totalInvoiceAmount;
  }, 0);

  const pipelineValue = pipelineOrders.reduce((sum, o) => {
    const { totalInvoiceAmount } = calculateOrderFinancials(o);
    return sum + totalInvoiceAmount;
  }, 0);

  // 3. Kas Masuk Terkumpul & Sisa Piutang (Dari seluruh pesanan aktif non-batal)
  const cashCollected = activeOrders.reduce((sum, o) => sum + o.dpAmount, 0);
  const totalReceivables = activeOrders.reduce((sum, o) => {
    const { remainingReceivable } = calculateOrderFinancials(o);
    return sum + remainingReceivable;
  }, 0);

  // 4. HPP Dasar & Laba Kotor (Ditandingkan dengan seluruh pesanan aktif & selesai agar relevan dengan COPQ berjalan)
  const totalActiveHpp = activeOrders.reduce((sum, o) => {
    const { totalOrderHpp } = calculateOrderFinancials(o);
    return sum + totalOrderHpp;
  }, 0);

  const completedHppTotal = completedOrders.reduce((sum, o) => {
    const { totalOrderHpp } = calculateOrderFinancials(o);
    return sum + totalOrderHpp;
  }, 0);

  const baseGrossProfit = totalProductRevenue - totalActiveHpp;
  const completedGrossProfit = completedProductRevenue - completedHppTotal;

  // 5. Total Kebocoran Biaya Cacat (Actual COPQ) & Laba Bersih Riil
  const totalActualCopq = defects.reduce((sum, d) => sum + d.totalCopqLoss, 0);
  const realNetProfit = baseGrossProfit - totalActualCopq;
  const realNetMarginPercent =
    totalProductRevenue > 0
      ? Number(((realNetProfit / totalProductRevenue) * 100).toFixed(1))
      : 0;

  // 6. Analisis Diagram Pareto 80/20 Berdasarkan Jenis Cacat
  const defectMap = new Map<string, { amount: number; count: number; topFactor: FishboneCategory }>();
  defects.forEach((d) => {
    const current = defectMap.get(d.defectType) || { amount: 0, count: 0, topFactor: d.fishboneFactor };
    defectMap.set(d.defectType, {
      amount: current.amount + d.totalCopqLoss,
      count: current.count + 1,
      topFactor: d.fishboneFactor,
    });
  });

  const sortedDefects = Array.from(defectMap.entries())
    .map(([defectType, data]) => ({ defectType, ...data }))
    .sort((a, b) => b.amount - a.amount);

  let cumulativeAmount = 0;
  const paretoItems = sortedDefects.map((item, index) => {
    const previousCumulativePercent =
      totalActualCopq > 0 ? (cumulativeAmount / totalActualCopq) * 100 : 0;
    cumulativeAmount += item.amount;
    const cumulativePercent =
      totalActualCopq > 0 ? Number(((cumulativeAmount / totalActualCopq) * 100).toFixed(1)) : 0;
    const sharePercent =
      totalActualCopq > 0 ? Number(((item.amount / totalActualCopq) * 100).toFixed(1)) : 0;

    // Masuk zona Vital Few (80% pertama) jika item pertama ATAU akumulasi sebelumnya masih < 80%
    const isVitalFew = index === 0 || previousCumulativePercent < 80;

    return {
      ...item,
      sharePercent,
      cumulativePercent,
      isVitalFew, // true = #2F3185 (Primary Indigo), false = #94A3B8 (Slate Light)
    };
  });

  return {
    totalProductRevenue,
    completedProductRevenue,
    pipelineProductRevenue,
    completedGrossInvoice,
    pipelineValue,
    cashCollected,
    totalReceivables,
    totalActiveHpp,
    completedHppTotal,
    baseGrossProfit,
    completedGrossProfit,
    totalActualCopq,
    realNetProfit,
    realNetMarginPercent,
    paretoItems,
  };
}

/**
 * Format helper angka ke mata uang Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
