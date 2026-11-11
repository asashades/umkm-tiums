import { Order, OrderStage, Product, DefectLog } from '../types/titan';
import { generateFinancialReport } from './calculations';
import {
  WoodCutPiece,
  PaymentPlanTemplate,
  MilestoneView,
  Quotation,
  QuotationStatus,
  LaborContract,
  LaborPayment,
  LaborContractStatus,
} from '../types/furniture';

// ==========================================
// 1. UTILITAS TAHAP & PEMBAYARAN
// ==========================================
export const STAGE_SEQUENCE: OrderStage[] = [
  'Persiapan',
  'Pengerjaan',
  'Finishing',
  'Siap Kirim',
  'Selesai',
];

export function stageIndex(stage: OrderStage): number {
  return stage === 'Dibatalkan' ? -1 : STAGE_SEQUENCE.indexOf(stage);
}

export function getProductSubtotal(order: Pick<Order, 'items'>): number {
  return order.items.reduce((s, it) => s + it.qty * it.unitPriceSnapshot, 0);
}

export function getTotalPaid(order: Pick<Order, 'payments' | 'dpAmount'>): number {
  if (order.payments && order.payments.length > 0) {
    return order.payments.reduce((s, p) => s + p.amount, 0);
  }
  return order.dpAmount || 0;
}

export function normalizeUnit(unit: string): string {
  const u = (unit || '').trim().toLowerCase().replace(/\s+/g, '');
  if (['m3', 'm³', 'kubik', 'meterkubik'].includes(u)) return 'm3';
  return u;
}

// ==========================================
// 2. M1: KALKULATOR KUBIKASI KAYU
// ==========================================
export function calculatePieceVolumeM3(p: WoodCutPiece): number {
  if (p.thicknessCm <= 0 || p.widthCm <= 0 || p.lengthCm <= 0 || p.qty <= 0) return 0;
  return (p.thicknessCm * p.widthCm * p.lengthCm * p.qty) / 1_000_000;
}

export function calculateCuttingListVolume(pieces: WoodCutPiece[]): number {
  const total = pieces.reduce((s, p) => s + calculatePieceVolumeM3(p), 0);
  return Math.round(total * 1_000_000) / 1_000_000; // presisi 6 desimal
}

export function formatVolumeM3(volume: number): string {
  return `${volume.toLocaleString('id-ID', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })} m3`;
}

// ==========================================
// 3. M2: TERMIN PEMBAYARAN 3 TAHAP
// ==========================================
export function validatePaymentPlan(plan: PaymentPlanTemplate[]): string | null {
  if (plan.length < 1 || plan.length > 4) return 'Jumlah termin harus 1 sampai 4.';
  if (plan.some((t) => t.percent <= 0)) return 'Persen setiap termin harus lebih dari 0.';
  const total = plan.reduce((s, t) => s + t.percent, 0);
  if (total !== 100) return `Total termin ${total}%. Harus 100%.`;
  for (let i = 1; i < plan.length; i++) {
    if (stageIndex(plan[i].triggerStage) < stageIndex(plan[i - 1].triggerStage)) {
      return 'Urutan tahap termin tidak boleh mundur.';
    }
  }
  return null;
}

export function buildMilestoneAmounts(
  productSubtotal: number,
  customFee: number,
  plan: PaymentPlanTemplate[]
): { amount: number; includesCustomFee: boolean }[] {
  const useRounding = productSubtotal >= 100_000;
  let allocated = 0;
  return plan.map((t, i) => {
    const isLast = i === plan.length - 1;
    let base: number;
    if (isLast) {
      base = productSubtotal - allocated;
    } else {
      const raw = (productSubtotal * t.percent) / 100;
      base = useRounding ? Math.round(raw / 1000) * 1000 : Math.round(raw);
    }
    allocated += base;
    return {
      amount: Math.max(0, base) + (isLast ? Math.max(0, customFee) : 0),
      includesCustomFee: isLast,
    };
  });
}

export function evaluateMilestones(order: Order): MilestoneView[] {
  if (!order.paymentPlan || order.paymentPlan.length === 0) return [];
  const amounts = buildMilestoneAmounts(
    getProductSubtotal(order),
    order.customFee,
    order.paymentPlan
  );
  const currentIdx = stageIndex(order.stage);
  let pool = getTotalPaid(order);

  return order.paymentPlan.map((t, i) => {
    const amount = amounts[i].amount;
    const paidAmount = Math.min(amount, Math.max(0, pool));
    pool -= paidAmount;
    const isDue = order.stage !== 'Dibatalkan' && currentIdx >= stageIndex(t.triggerStage);
    const outstanding = amount - paidAmount;
    let status: MilestoneView['status'];
    if (outstanding <= 0) status = 'Lunas';
    else if (!isDue) status = 'Belum Waktunya';
    else status = paidAmount > 0 ? 'Kurang Bayar' : 'Perlu Ditagih';
    return {
      ...t,
      index: i,
      amount,
      includesCustomFee: amounts[i].includesCustomFee,
      paidAmount,
      outstanding,
      isDue,
      status,
    };
  });
}

export function getOverpaidAmount(order: Order): number {
  const total = getProductSubtotal(order) + (order.customFee || 0);
  return Math.max(0, getTotalPaid(order) - total);
}

/** Nominal default untuk form "+ Catat Bayar". */
export function getSuggestedPaymentAmount(order: Order): number {
  const ms = evaluateMilestones(order);
  if (ms.length === 0) {
    const total = getProductSubtotal(order) + (order.customFee || 0);
    return Math.max(0, total - getTotalPaid(order));
  }
  const firstDue = ms.find((m) => m.isDue && m.outstanding > 0);
  if (firstDue) return firstDue.outstanding;
  const next = ms.find((m) => m.outstanding > 0);
  return next ? next.outstanding : 0;
}

/** Peringatan soft-gate saat tahap pesanan diubah. null = aman, langsung ubah. */
export function getStageTransitionWarning(order: Order, target: OrderStage): string | null {
  if (!order.paymentPlan || target === 'Dibatalkan') return null;
  const simulated = evaluateMilestones({ ...order, stage: target });
  const dueOutstanding = simulated.filter((m) => m.isDue).reduce((s, m) => s + m.outstanding, 0);
  if (dueOutstanding <= 0) return null;
  const rp = dueOutstanding.toLocaleString('id-ID');
  if (target === 'Finishing') {
    return `Termin barang mentah belum dibayar (kurang Rp ${rp}). Lanjut ke finishing?`;
  }
  if (target === 'Siap Kirim' || target === 'Selesai') {
    return `Barang akan dikirim dengan sisa tagihan Rp ${rp}. Lanjutkan?`;
  }
  return null;
}

// ==========================================
// 4. M3: SURAT PENAWARAN HARGA (QUOTATION)
// ==========================================
export function getQuotationStatus(q: Quotation, todayISO: string): QuotationStatus {
  if (q.convertedOrderId) return 'Disetujui';
  if (q.rejectedAt) return 'Ditolak';
  if (todayISO > q.validUntil) return 'Kedaluwarsa';
  return q.sentAt ? 'Terkirim' : 'Draft';
}

export function generateDocNumber(prefix: 'QUO' | 'ORD', existing: string[], date: Date): string {
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const head = `${prefix}-${ym}-`;
  const maxSeq = existing
    .filter((n) => n.startsWith(head))
    .map((n) => parseInt(n.slice(head.length), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `${head}${String(maxSeq + 1).padStart(3, '0')}`;
}

export interface QuoteMarginShift {
  productName: string;
  marginAtQuote: number;   // %
  marginNow: number;       // %
  dropPoints: number;      // marginAtQuote - marginNow
}

export function evaluateQuoteConversion(q: Quotation, products: Product[]) {
  const errors: string[] = [];
  const shifts: QuoteMarginShift[] = [];

  q.items.forEach((it) => {
    const p = products.find((x) => x.id === it.productId);
    if (!p) {
      errors.push(
        `Produk "${it.productNameSnapshot}" sudah dihapus dari katalog. Tambahkan lagi atau hapus item ini dari penawaran.`
      );
      return;
    }
    if (it.unitPrice <= 0) return;
    const marginAtQuote = Number(
      (((it.unitPrice - it.safeHppAtQuote) / it.unitPrice) * 100).toFixed(1)
    );
    const marginNow = Number((((it.unitPrice - p.safeHpp) / it.unitPrice) * 100).toFixed(1));
    const dropPoints = Number((marginAtQuote - marginNow).toFixed(1));
    if (dropPoints >= 3) shifts.push({ productName: p.name, marginAtQuote, marginNow, dropPoints });
  });

  return { canConvert: errors.length === 0, errors, shifts };
}

// ==========================================
// 5. M4: UPAH BORONGAN & KASBON TUKANG
// ==========================================
export function summarizeLaborContract(c: LaborContract, payments: LaborPayment[]) {
  const own = payments.filter((p) => p.contractId === c.id);
  const kasbon = own.filter((p) => p.type === 'kasbon').reduce((s, p) => s + p.amount, 0);
  const settlement = own.filter((p) => p.type === 'pelunasan').reduce((s, p) => s + p.amount, 0);
  const paid = kasbon + settlement;
  const payable = Math.max(0, c.agreedAmount - (c.deductionAmount || 0)); // nilai akhir upah
  const remaining = payable - paid; // bisa negatif jika kasbon melebihi sisa

  let status: LaborContractStatus;
  if (c.cancelledAt) status = 'Dibatalkan';
  else if (c.qcPassedAt) status = remaining <= 0 ? 'Lunas' : 'Siap Dilunasi';
  else status = 'Berjalan';

  const kasbonRatio = c.agreedAmount > 0 ? kasbon / c.agreedAmount : 0;
  return {
    kasbon,
    settlement,
    paid,
    payable,
    remaining,
    status,
    kasbonRatioPercent: Math.round(kasbonRatio * 100),
    isHighKasbonWarning: status === 'Berjalan' && kasbonRatio > 0.7,
  };
}

export function validateLaborPayment(
  c: LaborContract,
  payments: LaborPayment[],
  type: 'kasbon' | 'pelunasan',
  amount: number
): { error?: string; warning?: string } {
  const s = summarizeLaborContract(c, payments);
  if (amount <= 0) return { error: 'Nominal harus lebih dari 0.' };
  if (s.status === 'Dibatalkan' || s.status === 'Lunas') return { error: 'Borongan ini sudah ditutup.' };
  if (type === 'pelunasan' && !c.qcPassedAt) return { error: 'Tandai lolos QC dulu.' };
  if (type === 'pelunasan' && amount > s.remaining) {
    return { error: `Melebihi sisa upah (Rp ${s.remaining.toLocaleString('id-ID')}).` };
  }
  if (type === 'kasbon' && amount > s.remaining) {
    return {
      warning: `Kasbon (Rp ${amount.toLocaleString('id-ID')}) melebihi sisa upah borongan (sisa Rp ${s.remaining.toLocaleString('id-ID')}). Ini akan menyebabkan status kasbon lebih bayar / utang tukang. Lanjutkan?`,
    };
  }
  return {};
}

export function calculateOrderLaborVariance(
  order: Order,
  contracts: LaborContract[],
  payments: LaborPayment[]
) {
  const standardLabor = order.items.reduce(
    (s, it) => s + it.qty * (it.laborCostSnapshot ?? 0),
    0
  );
  const actualLabor = contracts
    .filter((c) => c.orderId === order.id && !c.cancelledAt)
    .reduce((s, c) => s + summarizeLaborContract(c, payments).payable, 0);

  if (!order.laborFullyTracked) {
    return { isTracked: false, standardLabor, actualLabor, variance: 0 };
  }
  return { isTracked: true, standardLabor, actualLabor, variance: actualLabor - standardLabor };
}

export function summarizeLaborLiabilities(
  contracts: LaborContract[],
  payments: LaborPayment[],
  period: { start?: string; end?: string }
) {
  let outstandingWages = 0;
  let kasbonBeforeQc = 0;
  contracts.forEach((c) => {
    const s = summarizeLaborContract(c, payments);
    if (s.status === 'Berjalan' || s.status === 'Siap Dilunasi') {
      if (s.remaining > 0) outstandingWages += s.remaining;
    }
    if (s.status === 'Berjalan') kasbonBeforeQc += s.kasbon;
  });
  const cashOutInPeriod = payments
    .filter(
      (p) => (!period.start || p.date >= period.start) && (!period.end || p.date <= period.end)
    )
    .reduce((s, p) => s + p.amount, 0);
  return { outstandingWages, kasbonBeforeQc, cashOutInPeriod };
}

export function hasOpenLaborDefect(
  orderId: string,
  defects: DefectLog[],
  sinceISO: string
): number {
  return defects.filter(
    (d) =>
      d.orderId === orderId &&
      d.fishboneFactor === 'Tenaga Kerja' &&
      d.date >= sinceISO.slice(0, 10)
  ).length;
}

/**
 * 6. LAPORAN KEUANGAN KHUSUS MEBEL (PRD Modul Mebel Bagian 9)
 * Memperluas generateFinancialReport dengan rekonsiliasi selisih upah borongan riil
 * (untuk order yang laborFullyTracked === true) dan rekapitulasi kewajiban utang/kasbon tukang.
 */
export function generateFurnitureFinancialReport(
  orders: Order[],
  defects: DefectLog[],
  contracts: LaborContract[],
  laborPayments: LaborPayment[],
  period: { start?: string; end?: string }
) {
  const base = generateFinancialReport(orders, defects);
  const activeOrders = orders.filter((o) => o.stage !== 'Dibatalkan');
  const varianceRows = activeOrders.map((o) => calculateOrderLaborVariance(o, contracts, laborPayments));
  const trackedRows = varianceRows.filter((v) => v.isTracked);
  const totalLaborVariance = trackedRows.reduce((s, v) => s + v.variance, 0);
  const realNetProfit = base.realNetProfit - totalLaborVariance;
  const realNetMarginPercent =
    base.totalProductRevenue > 0
      ? Number(((realNetProfit / base.totalProductRevenue) * 100).toFixed(1))
      : 0;

  return {
    ...base,
    totalLaborVariance,
    trackedLaborOrderCount: trackedRows.length,
    realNetProfit,
    realNetMarginPercent,
    laborLiabilities: summarizeLaborLiabilities(contracts, laborPayments, period),
  };
}
