import React, { useState } from 'react';
import { useUmkm } from '../../context/UmkmContext';
import { Order, OrderItem, OrderStage } from '../../types/titan';
import { calculateOrderFinancials, formatRupiah } from '../../utils/calculations';
import { PaymentMilestoneSection } from '../furniture/PaymentMilestoneSection';
import { PaymentPlanEditor } from '../furniture/PaymentPlanEditor';
import { StageGateConfirm } from '../furniture/StageGateConfirm';
import { QuotationList } from '../furniture/QuotationList';
import { QuotationFormModal } from '../furniture/QuotationFormModal';
import { QuotationConvertModal } from '../furniture/QuotationConvertModal';
import { LaborContractList } from '../furniture/LaborContractList';
import { LaborPaymentModal } from '../furniture/LaborPaymentModal';
import { LaborContractFormModal } from '../furniture/LaborContractFormModal';
import {
  getStageTransitionWarning,
  getSuggestedPaymentAmount,
  evaluateMilestones,
  calculateOrderLaborVariance,
} from '../../utils/furnitureCalculations';
import {
  PaymentMethod,
  PaymentPlanTemplate,
  Quotation,
  LaborContract,
  LaborPayment,
} from '../../types/furniture';
import { SECTOR_PRESETS, DEFAULT_FURNITURE_PAYMENT_PLAN } from '../../config/sectorPresets';

const ORDER_STAGES: OrderStage[] = ['Persiapan', 'Pengerjaan', 'Finishing', 'Siap Kirim', 'Selesai'];

export const OrderModule: React.FC = () => {
  const {
    profile,
    orders,
    products,
    quotations,
    craftsmen,
    laborContracts,
    laborPayments,
    addOrder,
    updateOrder,
    updateOrderStage,
    updateOrderPayment,
    addOrderPayment,
    deleteOrderPayment,
    updateOrderPaymentPlan,
    deleteOrder,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    convertQuotationToOrder,
    addCraftsman,
    addLaborContract,
    updateLaborContract,
    deleteLaborContract,
    markLaborContractQcPassed,
    addLaborPayment,
    deleteLaborPayment,
    toggleOrderLaborFullyTracked,
    setActiveTab,
    triggerDefectFromOrder,
  } = useUmkm();

  // Sector Features Check
  const sectorPreset = SECTOR_PRESETS[profile.sector] || SECTOR_PRESETS.mebel;
  const hasMilestoneFeature = sectorPreset.features.milestonePayments;
  const hasQuotationFeature = sectorPreset.features.quotations;
  const hasLaborFeature = sectorPreset.features.laborContracts;

  // Sub-Module Segment Switcher: 'orders' | 'quotations' | 'labor'
  const [activeOrderSection, setActiveOrderSection] = useState<'orders' | 'quotations' | 'labor'>('orders');

  // Quotation Modals State
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quotation | null>(null);

  // Labor Modals State (M4)
  const [isLaborContractModalOpen, setIsLaborContractModalOpen] = useState(false);
  const [selectedContractForPayment, setSelectedContractForPayment] = useState<LaborContract | null>(null);

  // Filter & Search
  const [filterStage, setFilterStage] = useState<'all' | 'active' | 'unpaid' | 'completed'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [whatsAppModalOrder, setWhatsAppModalOrder] = useState<Order | null>(null);
  const [waTemplateType, setWaTemplateType] = useState<'dp' | 'progress' | 'invoice' | 'milestone'>('dp');

  // Milestone Soft-Gate & Plan Editor State
  const [pendingStageGate, setPendingStageGate] = useState<{
    orderId: string;
    orderNumber: string;
    targetStage: OrderStage;
    warningMessage: string;
  } | null>(null);
  const [planEditorOrder, setPlanEditorOrder] = useState<Order | null>(null);

  // Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [additionalPaymentInput, setAdditionalPaymentInput] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState<string>('');

  // New / Edit Order Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [customFee, setCustomFee] = useState(0);
  const [customFeeNote, setCustomFeeNote] = useState('');
  const [dpAmount, setDpAmount] = useState(0);
  const [stage, setStage] = useState<OrderStage>('Persiapan');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderPaymentPlan, setOrderPaymentPlan] = useState<PaymentPlanTemplate[]>(DEFAULT_FURNITURE_PAYMENT_PLAN);
  const [showPlanEditorInForm, setShowPlanEditorInForm] = useState(false);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const openAddModal = () => {
    setEditingOrderId(null);
    setCustomerName('');
    setCustomerPhone('628');
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setCustomFee(0);
    setCustomFeeNote('');
    setDpAmount(0);
    setStage('Persiapan');
    setOrderPaymentPlan(DEFAULT_FURNITURE_PAYMENT_PLAN);
    setShowPlanEditorInForm(false);

    if (products.length > 0) {
      const p = products[0];
      setOrderItems([
        {
          id: `item_${Date.now()}`,
          productId: p.id,
          productNameSnapshot: p.name,
          qty: 1,
          unitPriceSnapshot: p.sellingPrice,
          baseHppSnapshot: p.baseHpp,
        },
      ]);
    } else {
      setOrderItems([]);
    }

    setIsAddModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrderId(order.id);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone);
    setDueDate(order.dueDate);
    setCustomFee(order.customFee || 0);
    setCustomFeeNote(order.customFeeNote || '');
    setDpAmount(order.dpAmount);
    setStage(order.stage);
    setOrderItems([...order.items]);
    setOrderPaymentPlan(order.paymentPlan || DEFAULT_FURNITURE_PAYMENT_PLAN);
    setShowPlanEditorInForm(false);
    setIsAddModalOpen(true);
  };

  const openPaymentModal = (order: Order) => {
    const suggested = getSuggestedPaymentAmount(order);
    const fin = calculateOrderFinancials(order);
    setPaymentModalOrder(order);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Transfer');
    setPaymentNote('');
    setAdditionalPaymentInput(suggested > 0 ? suggested : fin.remainingReceivable);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder || additionalPaymentInput <= 0) return;
    addOrderPayment(paymentModalOrder.id, {
      date: paymentDate,
      amount: Number(additionalPaymentInput),
      method: paymentMethod,
      note: paymentNote.trim() || undefined,
    });
    showNotice(
      `Pembayaran sebesar ${formatRupiah(Number(additionalPaymentInput))} via ${paymentMethod} berhasil dicatat untuk ${paymentModalOrder.orderNumber}.`
    );
    setPaymentModalOrder(null);
  };

  const handleStageClick = (order: Order, targetStage: OrderStage) => {
    const warning = getStageTransitionWarning(order, targetStage);
    if (warning) {
      setPendingStageGate({
        orderId: order.id,
        orderNumber: order.orderNumber,
        targetStage,
        warningMessage: warning,
      });
    } else {
      updateOrderStage(order.id, targetStage);
      showNotice(`Status ${order.orderNumber} diubah menjadi "${targetStage}".`);
    }
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    const p = products[0];
    const newItem: OrderItem = {
      id: `item_${Date.now()}`,
      productId: p.id,
      productNameSnapshot: p.name,
      qty: 1,
      unitPriceSnapshot: p.sellingPrice,
      baseHppSnapshot: p.baseHpp,
    };
    setOrderItems([...orderItems, newItem]);
  };

  const handleItemProductChange = (index: number, productId: string) => {
    const selectedProd = products.find((p) => p.id === productId);
    if (!selectedProd) return;

    const updated = [...orderItems];
    updated[index] = {
      ...updated[index],
      productId: selectedProd.id,
      productNameSnapshot: selectedProd.name,
      unitPriceSnapshot: selectedProd.sellingPrice,
      baseHppSnapshot: selectedProd.baseHpp,
    };
    setOrderItems(updated);
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], qty: Math.max(1, qty) };
    setOrderItems(updated);
  };

  const handleItemPriceChange = (index: number, price: number) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], unitPriceSnapshot: price };
    setOrderItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || orderItems.length === 0) return;

    let cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const payload = {
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      items: orderItems,
      customFee: Number(customFee) || 0,
      customFeeNote: customFeeNote.trim(),
      dpAmount: Number(dpAmount) || 0,
      stage,
      paymentStatus: 'Belum DP' as const,
      dueDate,
      paymentPlan: hasMilestoneFeature ? orderPaymentPlan : undefined,
    };

    if (editingOrderId) {
      updateOrder(editingOrderId, payload);
      showNotice(`Pesanan atas nama "${payload.customerName}" berhasil diperbarui.`);
    } else {
      addOrder(payload);
      showNotice(`Pesanan baru atas nama "${payload.customerName}" berhasil dicatat.`);
    }

    setIsAddModalOpen(false);
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filterStage === 'active') return o.stage !== 'Selesai' && o.stage !== 'Dibatalkan';
    if (filterStage === 'unpaid') return o.paymentStatus !== 'Lunas' && o.stage !== 'Dibatalkan';
    if (filterStage === 'completed') return o.stage === 'Selesai';
    return true;
  });

  // Helper WhatsApp text generator
  const generateWhatsAppMessage = (order: Order, template: 'dp' | 'progress' | 'invoice' | 'milestone') => {
    const fin = calculateOrderFinancials(order);
    const itemsListText = order.items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.productNameSnapshot} (${item.qty}x) - ${formatRupiah(item.qty * item.unitPriceSnapshot)}`
      )
      .join('\n');

    let text = '';
    if (template === 'dp') {
      text = `*NOTA PEMESANAN & TANDA TERIMA DP*\n*${profile.name}*\n\nYth. Bpk/Ibu ${order.customerName},\nTerima kasih atas pesanan Anda dengan rincian berikut:\n\n${itemsListText}\n\n`;
      if (order.customFee > 0) {
        text += `Biaya Tambahan (${order.customFeeNote || 'Ongkir/Paking'}): ${formatRupiah(order.customFee)}\n`;
      }
      text += `*Total Tagihan:* ${formatRupiah(fin.totalInvoiceAmount)}\n`;
      text += `*DP Diterima:* ${formatRupiah(order.dpAmount)}\n`;
      text += `*Sisa Pembayaran:* ${formatRupiah(fin.remainingReceivable)}\n`;
      text += `*Status:* ${order.stage}\n*Target Selesai:* ${order.dueDate}\n\nPesanan sedang kami jadwalkan untuk diproses. Terima kasih!`;
    } else if (template === 'progress') {
      text = `*UPDATE PROGRES PENGERJAAN PESANAN*\n*${profile.name}*\n\nYth. Bpk/Ibu ${order.customerName},\nNomor Pesanan: ${order.orderNumber}\n\nPesanan Anda saat ini telah mencapai tahapan: *${order.stage.toUpperCase()}*.\n\nRincian Item:\n${itemsListText}\n\nEstimasi target selesai: ${order.dueDate}. Kami menjaga setiap detail kualitas produksi pesanan Anda. Terima kasih!`;
    } else if (template === 'milestone') {
      const msList = evaluateMilestones(order);
      const activeMs = msList.find((m) => m.isDue && m.outstanding > 0) || msList.find((m) => m.outstanding > 0) || msList[0];
      const msLabel = activeMs ? `${activeMs.label} (${activeMs.percent}%)` : 'Termin';
      const msAmount = activeMs ? formatRupiah(activeMs.outstanding) : formatRupiah(fin.remainingReceivable);

      text = `*TAGIHAN TERMIN PEMBAYARAN*\n*${profile.name}*\n\nYth. Bpk/Ibu ${order.customerName},\nNomor Pesanan: *${order.orderNumber}*\n\nPesanan Anda saat ini telah mencapai tahapan: *${order.stage.toUpperCase()}*.\n\nSesuai jadwal pembayaran, kami menginfokan tagihan untuk *${msLabel}* sebesar *${msAmount}*.\n\nTotal Tagihan Pesanan: ${formatRupiah(fin.totalInvoiceAmount)}\nTotal Telah Dibayar: ${formatRupiah(order.dpAmount)}\nSisa Total Tagihan: ${formatRupiah(fin.remainingReceivable)}\n\nPembayaran dapat ditransfer ke rekening kami. Mohon konfirmasi bukti transfer jika sudah melakukan pembayaran. Terima kasih banyak!`;
    } else {
      text = `*PEMBERITAHUAN PESANAN SELESAI & PELUNASAN*\n*${profile.name}*\n\nYth. Bpk/Ibu ${order.customerName},\nKabar baik! Pesanan *${order.orderNumber}* telah *SELESAI* dan lolos uji kendali mutu.\n\n${itemsListText}\n\n`;
      if (order.customFee > 0) {
        text += `Biaya Tambahan (${order.customFeeNote || 'Ongkir/Paking'}): ${formatRupiah(order.customFee)}\n`;
      }
      text += `*Total Pesanan:* ${formatRupiah(fin.totalInvoiceAmount)}\n`;
      text += `*Telah Dibayar:* ${formatRupiah(order.dpAmount)}\n`;
      text += `*Sisa Pelunasan:* *${formatRupiah(fin.remainingReceivable)}*\n\nMohon lakukan pelunasan sebelum pengiriman/pengambilan barang. Terima kasih banyak atas kepercayaan Anda!`;
    }

    return text;
  };

  const handleOpenWhatsApp = (order: Order, template: 'dp' | 'progress' | 'invoice' | 'milestone') => {
    const msg = generateWhatsAppMessage(order, template);
    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setWhatsAppModalOrder(null);
  };

  // Quotation Handlers (Fase M3)
  const handleOpenAddQuote = () => {
    setEditingQuote(null);
    setIsQuoteFormOpen(true);
  };

  const handleOpenEditQuote = (q: Quotation) => {
    setEditingQuote(q);
    setIsQuoteFormOpen(true);
  };

  const handleSaveQuote = (quoteData: Omit<Quotation, 'id' | 'quoteNumber' | 'createdAt'>) => {
    if (editingQuote) {
      updateQuotation(editingQuote.id, quoteData);
      showNotice(`Surat Penawaran ${editingQuote.quoteNumber} berhasil diperbarui.`);
    } else {
      const newNum = addQuotation(quoteData);
      showNotice(`Surat Penawaran baru ${newNum} berhasil dibuat.`);
    }
    setIsQuoteFormOpen(false);
    setEditingQuote(null);
  };

  const handleConfirmConvert = () => {
    if (!convertingQuote) return;
    const newOrderNum = convertQuotationToOrder(convertingQuote.id);
    showNotice(
      `Penawaran ${convertingQuote.quoteNumber} berhasil dikonversi menjadi Pesanan Aktif (${newOrderNum})!`
    );
    setConvertingQuote(null);
    setActiveOrderSection('orders');
  };

  const handleSendQuotationWhatsApp = (q: Quotation) => {
    const subtotal = q.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
    const grandTotal = subtotal + (q.customFee || 0);
    const itemsText = q.items
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.productNameSnapshot}* (${it.qty}x) - ${formatRupiah(it.qty * it.unitPrice)}\n   Spesifikasi: ${it.spec?.woodType || 'Jati'} • Finishing: ${it.spec?.finishing || 'Natural'}`
      )
      .join('\n\n');

    let msg = `*SURAT PENAWARAN HARGA (QUOTATION)*\n*${profile.name}*\nNomor: *${q.quoteNumber}*\n\nYth. Bpk/Ibu ${q.customerName},\nBerikut rincian penawaran harga pembuatan mebel:\n\n${itemsText}\n\n`;
    if (q.customFee > 0) {
      msg += `Estimasi Biaya Tambahan (${q.customFeeNote || 'Ongkir/Paking'}): ${formatRupiah(q.customFee)}\n`;
    }
    msg += `*Total Penawaran:* *${formatRupiah(grandTotal)}*\n`;
    msg += `*Estimasi Waktu:* ${q.leadTimeWeeks} Minggu sejak DP\n`;
    msg += `*Skema Pembayaran:* ${q.paymentPlan.map((p) => `${p.percent}%`).join(' / ')}\n`;
    msg += `*Masa Berlaku Harga:* s/d ${q.validUntil} (14 Hari)\n\n`;
    if (q.notes) {
      msg += `Catatan: ${q.notes}\n\n`;
    }
    msg += `Terima kasih atas kepercayaannya. Kami menunggu konfirmasi dari Anda!`;

    const cleanPhone = q.customerPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    if (!q.sentAt) {
      updateQuotation(q.id, { sentAt: new Date().toISOString() });
    }
  };

  // Preview total in Add/Edit Modal
  const formSubtotal = orderItems.reduce((s, it) => s + it.qty * it.unitPriceSnapshot, 0);
  const formGrandTotal = formSubtotal + (Number(customFee) || 0);

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


      {/* Sub-Module Segment Switcher (Mebel Sektor Khusus) */}
      {(hasQuotationFeature || hasLaborFeature) && (
        <div className="flex items-center gap-2 border-b border-hairline pb-2.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveOrderSection('orders')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeOrderSection === 'orders'
                ? 'bg-primary text-white shadow-micro'
                : 'bg-canvas text-body hover:text-ink border border-hairline'
            }`}
          >
            <i className="fa-solid fa-clipboard-list text-[11px]"></i>
            <span>Pesanan Aktif ({orders.length})</span>
          </button>

          {hasQuotationFeature && (
            <button
              type="button"
              onClick={() => setActiveOrderSection('quotations')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeOrderSection === 'quotations'
                  ? 'bg-primary text-white shadow-micro'
                  : 'bg-canvas text-body hover:text-ink border border-hairline'
              }`}
            >
              <i className="fa-solid fa-file-contract text-[11px]"></i>
              <span>Surat Penawaran / Quotation ({quotations.length})</span>
            </button>
          )}

          {hasLaborFeature && (
            <button
              type="button"
              onClick={() => setActiveOrderSection('labor')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeOrderSection === 'labor'
                  ? 'bg-primary text-white shadow-micro'
                  : 'bg-canvas text-body hover:text-ink border border-hairline'
              }`}
            >
              <i className="fa-solid fa-person-digging text-[11px]"></i>
              <span>Upah Borongan & Kasbon ({laborContracts.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Section Content: Quotations vs Labor vs Orders */}
      {activeOrderSection === 'quotations' ? (
        <QuotationList
          quotations={quotations}
          products={products}
          onAddQuote={handleOpenAddQuote}
          onEditQuote={handleOpenEditQuote}
          onDeleteQuote={(id) => {
            deleteQuotation(id);
            showNotice('Surat Penawaran berhasil dihapus.');
          }}
          onConvertQuote={(q) => setConvertingQuote(q)}
          onSendWhatsApp={handleSendQuotationWhatsApp}
        />
      ) : activeOrderSection === 'labor' ? (
        <LaborContractList
          contracts={laborContracts}
          payments={laborPayments}
          craftsmen={craftsmen}
          orders={orders}
          onAddContract={() => setIsLaborContractModalOpen(true)}
          onOpenPaymentModal={(contract) => setSelectedContractForPayment(contract)}
          onToggleQc={(contractId) => {
            markLaborContractQcPassed(contractId);
            showNotice('Status QC borongan berhasil diperbarui.');
          }}
          onDeletePayment={(paymentId) => {
            deleteLaborPayment(paymentId);
            showNotice('Catatan pembayaran kasbon/pelunasan berhasil dihapus.');
          }}
          onDeleteContract={(contractId) => {
            deleteLaborContract(contractId);
            showNotice('Kontrak borongan kerja berhasil dihapus.');
          }}
        />
      ) : (
        <>
          {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-extrabold text-ink tracking-tight">Manajemen Pesanan & Nota WA</h2>
          <p className="text-xs text-muted mt-0.5">
            Lacak tahapan pesanan multi-item, uang muka (DP), piutang, dan kirim nota WhatsApp 1-klik.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          disabled={products.length === 0}
          className={`w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-full shadow-micro flex items-center justify-center gap-2 shrink-0 transition-colors ${
            products.length === 0
              ? 'bg-neutral-2 text-muted cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
          title={products.length === 0 ? 'Input minimal 1 produk di menu HPP terlebih dahulu' : 'Catat pesanan baru'}
        >
          <i className="fa-solid fa-plus text-xs"></i>
          <span>Catat Pesanan Baru</span>
        </button>
      </div>

      {products.length === 0 && (
        <div className="bg-badge-gold/15 border border-badge-gold/40 rounded-md p-3 text-xs text-ink flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-info text-primary"></i>
            <span>
              Belum ada produk di katalog HPP. Tambahkan produk terlebih dahulu agar harga dan HPP terkunci otomatis saat order dicatat.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('hpp')}
            className="px-3 py-1.5 bg-primary text-white font-bold rounded-full text-[11px] shrink-0"
          >
            Buka Menu HPP
          </button>
        </div>
      )}


      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: `Semua (${orders.length})` },
          {
            id: 'active',
            label: `Diproses (${orders.filter((o) => o.stage !== 'Selesai' && o.stage !== 'Dibatalkan').length})`,
          },
          {
            id: 'unpaid',
            label: `Belum Lunas (${orders.filter((o) => o.paymentStatus !== 'Lunas' && o.stage !== 'Dibatalkan').length})`,
          },
          { id: 'completed', label: `Selesai (${orders.filter((o) => o.stage === 'Selesai').length})` },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setFilterStage(tab.id as any)}
            className={`px-3 py-1.5 rounded-full font-bold transition-colors whitespace-nowrap ${
              filterStage === tab.id
                ? 'bg-primary text-white shadow-micro'
                : 'bg-canvas text-body hover:text-ink border border-hairline'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-canvas border border-hairline rounded-md p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-1 text-muted flex items-center justify-center mx-auto text-xl">
            <i className="fa-solid fa-clipboard-list"></i>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink">Tidak Ada Pesanan pada Kategori Ini</h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Semua order yang tercatat akan memantau uang muka, tahapan produksi, dan sisa piutang secara otomatis.
            </p>
          </div>
          {products.length > 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-primary-hover"
            >
              Catat Pesanan Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const fin = calculateOrderFinancials(order);

            return (
              <div
                key={order.id}
                className="bg-canvas border border-hairline rounded-md p-4 space-y-3 shadow-micro hover:border-neutral-2 transition-colors"
              >
                {/* Top Bar: Order Number, Customer, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2.5">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-mono text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded-xs border border-primary/20">
                      {order.orderNumber}
                    </span>
                    <h3 className="font-extrabold text-sm text-ink">{order.customerName}</h3>
                    <span className="text-xs text-muted">({order.customerPhone})</span>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        fin.paymentStatus === 'Lunas'
                          ? 'bg-primary/10 text-primary border border-primary/30'
                          : fin.paymentStatus === 'DP Sebagian'
                          ? 'bg-badge-gold/20 text-ink border border-badge-gold/40'
                          : 'bg-neutral-1 text-muted border border-hairline'
                      }`}
                    >
                      {fin.paymentStatus}
                    </span>

                    <button
                      type="button"
                      onClick={() => openEditModal(order)}
                      className="px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/5 rounded-sm border border-primary/20 flex items-center gap-1"
                      title="Edit Pesanan"
                    >
                      <i className="fa-solid fa-pen-to-square text-[10px]"></i>
                      <span>Edit</span>
                    </button>

                    {confirmDeleteId === order.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteOrder(order.id);
                            setConfirmDeleteId(null);
                            showNotice(`Pesanan ${order.orderNumber} telah dihapus.`);
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
                        onClick={() => setConfirmDeleteId(order.id)}
                        className="text-muted hover:text-danger-text p-1 text-xs"
                        title="Hapus Pesanan"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items List in Order */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-wider">
                    <span>Item Dipesan</span>
                    <span>Estimasi Laba Kotor: {formatRupiah(fin.estimatedOrderGrossProfit)}</span>
                  </div>
                  <div className="divide-y divide-hairline">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-1.5 flex items-start justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-ink leading-snug">{item.productNameSnapshot}</div>
                          <div className="text-muted text-[11px] font-medium">
                            {item.qty} unit &times; {formatRupiah(item.unitPriceSnapshot)}
                          </div>
                        </div>
                        <span className="font-bold text-ink shrink-0">{formatRupiah(item.qty * item.unitPriceSnapshot)}</span>
                      </div>
                    ))}
                  </div>

                  {order.customFee > 0 && (
                    <div className="py-1 flex items-center justify-between text-xs text-muted border-t border-hairline/60">
                      <span>Biaya Tambahan ({order.customFeeNote || 'Ongkir/Paking'}):</span>
                      <span className="font-semibold text-ink">+{formatRupiah(order.customFee)}</span>
                    </div>
                  )}
                </div>

                {/* Interactive Stage Stepper Pills */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-ink uppercase tracking-wider">
                    <span>Tahapan Produksi (Klik untuk Ubah):</span>
                    {order.stage !== 'Dibatalkan' ? (
                      <button
                        type="button"
                        onClick={() => updateOrderStage(order.id, 'Dibatalkan')}
                        className="text-muted hover:text-danger-text font-semibold normal-case"
                      >
                        Batalkan Pesanan
                      </button>
                    ) : (
                      <span className="text-danger-text font-extrabold">PESANAN DIBATALKAN</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ORDER_STAGES.map((st, idx) => {
                      const isCurrent = order.stage === st;
                      const currentIdx = ORDER_STAGES.indexOf(order.stage);
                      const isPassed = currentIdx > idx && order.stage !== 'Dibatalkan';
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStageClick(order, st)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-primary text-white border-primary shadow-micro'
                              : isPassed
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-neutral-1 text-body border-hairline hover:border-neutral-2'
                          }`}
                        >
                          {isPassed ? (
                            <i className="fa-solid fa-check text-[9px]"></i>
                          ) : (
                            <span className="text-[10px] opacity-75">{idx + 1}.</span>
                          )}
                          <span>{st}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Soft-Gate Warning Confirmation */}
                  {pendingStageGate && pendingStageGate.orderId === order.id && (
                    <StageGateConfirm
                      orderNumber={pendingStageGate.orderNumber}
                      targetStage={pendingStageGate.targetStage}
                      warningMessage={pendingStageGate.warningMessage}
                      onConfirm={() => {
                        updateOrderStage(order.id, pendingStageGate.targetStage);
                        showNotice(`Status ${order.orderNumber} tetap diubah menjadi "${pendingStageGate.targetStage}".`);
                        setPendingStageGate(null);
                      }}
                      onCancel={() => setPendingStageGate(null)}
                    />
                  )}
                </div>

                {/* Financial Summary Box */}
                <div className="bg-neutral-1 p-3 rounded-sm border border-hairline grid grid-cols-3 gap-3 text-left">
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Total Tagihan</span>
                    <span className="text-xs font-extrabold text-ink">{formatRupiah(fin.totalInvoiceAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">DP / Terbayar</span>
                    <span className="text-xs font-bold text-primary">{formatRupiah(order.dpAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Sisa Piutang</span>
                    <span
                      className={`text-xs font-extrabold ${
                        fin.remainingReceivable > 0 ? 'text-danger-text' : 'text-primary'
                      }`}
                    >
                      {formatRupiah(fin.remainingReceivable)}
                    </span>
                  </div>
                </div>

                {/* M2: Payment Milestone Section */}
                {hasMilestoneFeature && order.paymentPlan && order.paymentPlan.length > 0 && (
                  <PaymentMilestoneSection
                    order={order}
                    onOpenEditPlan={() => setPlanEditorOrder(order)}
                    onOpenPaymentModal={() => openPaymentModal(order)}
                    onDeletePayment={(payId) => {
                      deleteOrderPayment(order.id, payId);
                      showNotice('Catatan pembayaran berhasil dihapus.');
                    }}
                  />
                )}

                {/* M4: Labor Contract Variance Indicator */}
                {hasLaborFeature && (() => {
                  const varianceInfo = calculateOrderLaborVariance(order, laborContracts, laborPayments);
                  const orderContracts = laborContracts.filter((c) => c.orderId === order.id && !c.cancelledAt);
                  if (orderContracts.length === 0) return null;

                  return (
                    <div className="bg-neutral-1/90 p-2.5 rounded-sm border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center flex-wrap gap-2">
                        <i className="fa-solid fa-person-digging text-primary text-xs"></i>
                        <span className="font-bold text-ink">Borongan Tukang:</span>
                        <span className="text-muted">
                          Riil: <strong className="text-ink">{formatRupiah(varianceInfo.actualLabor)}</strong> vs Standar:{' '}
                          <strong className="text-ink">{formatRupiah(varianceInfo.standardLabor)}</strong>
                        </span>
                        <span
                          className={`font-black px-1.5 py-0.5 rounded text-[10px] ${
                            varianceInfo.actualLabor <= varianceInfo.standardLabor
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {varianceInfo.actualLabor <= varianceInfo.standardLabor
                            ? `Hemat +${formatRupiah(varianceInfo.standardLabor - varianceInfo.actualLabor)}`
                            : `Bengkak -${formatRupiah(varianceInfo.actualLabor - varianceInfo.standardLabor)}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          toggleOrderLaborFullyTracked(order.id);
                          showNotice(
                            !order.laborFullyTracked
                              ? `Selisih upah borongan riil diaktifkan untuk menghitung Laba Bersih Pesanan ${order.orderNumber}.`
                              : `Perhitungan upah pesanan ${order.orderNumber} kembali ke standar HPP.`
                          );
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 shrink-0 ${
                          order.laborFullyTracked
                            ? 'bg-primary text-white border-primary shadow-micro'
                            : 'bg-canvas text-body border-hairline hover:border-neutral-2'
                        }`}
                        title="Jika aktif, selisih borongan riil vs HPP langsung menambah/mengurangi laba riil pesanan"
                      >
                        <i className={order.laborFullyTracked ? 'fa-solid fa-check text-[10px]' : 'fa-regular fa-square text-[10px]'}></i>
                        <span>Hitung Selisih ke Laba Bersih</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Bottom Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-hairline text-xs">
                  <div className="text-[11px] text-muted">
                    <i className="fa-solid fa-calendar-day text-[10px] mr-1"></i>
                    Deadline: <strong className="text-ink">{order.dueDate}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Button: Catat Bayar / Pelunasan */}
                    {fin.remainingReceivable > 0 ? (
                      <button
                        type="button"
                        onClick={() => openPaymentModal(order)}
                        className="px-2.5 py-1 text-[11px] font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-sm border border-primary/30 flex items-center gap-1"
                      >
                        <i className="fa-solid fa-money-bill-wave text-[10px]"></i>
                        <span>+ Catat Bayar / Lunas</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-primary flex items-center gap-1 px-2 py-0.5">
                        <i className="fa-solid fa-circle-check text-xs"></i>
                        <span>Lunas Penuh</span>
                      </span>
                    )}

                    {/* Quick Button: Catat Cacat dari Order Ini */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerDefectFromOrder(order.id, order.items[0]?.productId || '');
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-danger-text hover:bg-danger-subtle rounded-sm border border-danger-text/30 flex items-center gap-1"
                      title="Catat jika terjadi pengerjaan ulang / cacat pada pesanan ini"
                    >
                      <i className="fa-solid fa-bug text-[10px]"></i>
                      <span>Catat Cacat</span>
                    </button>

                    {/* WhatsApp Invoice Button */}
                    <button
                      type="button"
                      onClick={() => setWhatsAppModalOrder(order)}
                      className="px-3 py-1 text-[11px] font-bold text-white bg-primary hover:bg-primary-hover rounded-full shadow-micro flex items-center gap-1.5"
                    >
                      <i className="fa-brands fa-whatsapp text-xs"></i>
                      <span>Kirim WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
      {/* Payment Modal (Replaces window.prompt) */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-canvas text-body rounded-md max-w-md w-full border border-hairline shadow-lg overflow-hidden my-auto">
            <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink">
                <i className="fa-solid fa-money-bill-wave text-primary text-sm"></i>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Catat Pembayaran Masuk</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOrder(null)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-4 space-y-3.5 text-xs">
              {(() => {
                const fin = calculateOrderFinancials(paymentModalOrder);
                const suggested = getSuggestedPaymentAmount(paymentModalOrder);
                return (
                  <>
                    <div className="bg-neutral-1 p-3 rounded-sm border border-hairline space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted">Pelanggan:</span>
                        <span className="font-bold text-ink">{paymentModalOrder.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Total Nota:</span>
                        <span className="font-bold text-ink">{formatRupiah(fin.totalInvoiceAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Sudah Dibayar (DP):</span>
                        <span className="font-bold text-primary">{formatRupiah(paymentModalOrder.dpAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t border-hairline pt-1">
                        <span className="font-bold text-ink">Sisa Tagihan:</span>
                        <span className="font-extrabold text-danger-text">{formatRupiah(fin.remainingReceivable)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                          Tanggal Bayar *
                        </label>
                        <input
                          type="date"
                          required
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-neutral-2 rounded-sm text-xs font-semibold text-ink bg-canvas"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                          Metode Bayar *
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['Transfer', 'Tunai', 'QRIS'] as PaymentMethod[]).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPaymentMethod(m)}
                              className={`py-1 text-[11px] font-bold rounded-xs border text-center transition-all ${
                                paymentMethod === m
                                  ? 'bg-primary text-white border-primary shadow-micro'
                                  : 'bg-canvas text-body border-hairline hover:border-neutral-2'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <label className="text-[10px] font-bold text-ink uppercase tracking-wider">
                          Nominal Pembayaran (Rp) *
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {suggested > 0 && suggested !== fin.remainingReceivable && (
                            <button
                              type="button"
                              onClick={() => setAdditionalPaymentInput(suggested)}
                              className="font-bold text-primary hover:underline bg-primary/5 px-1.5 py-0.5 rounded-xs border border-primary/20"
                            >
                              Termin ({formatRupiah(suggested)})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setAdditionalPaymentInput(fin.remainingReceivable)}
                            className="font-bold text-ink hover:underline bg-neutral-1 px-1.5 py-0.5 rounded-xs border border-hairline"
                          >
                            Lunas ({formatRupiah(fin.remainingReceivable)})
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min={1}
                        required
                        value={additionalPaymentInput}
                        onChange={(e) => setAdditionalPaymentInput(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-black text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                        Catatan / Referensi Rekening (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Transfer BCA Bambang / DP Kayu Mentah"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-medium text-xs"
                      />
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOrder(null)}
                  className="px-4 py-2 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                  <span>Simpan Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Payment Plan Editor Modal */}
      {planEditorOrder && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-canvas rounded-md max-w-lg w-full border border-hairline shadow-lg overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <PaymentPlanEditor
              initialPlan={planEditorOrder.paymentPlan}
              onSave={(newPlan) => {
                updateOrderPaymentPlan(planEditorOrder.id, newPlan);
                setPlanEditorOrder(null);
                showNotice(`Skema termin pembayaran untuk pesanan ${planEditorOrder.orderNumber} berhasil diperbarui.`);
              }}
              onCancel={() => setPlanEditorOrder(null)}
            />
          </div>
        </div>
      )}


      {/* WhatsApp Message Chooser Modal */}
      {whatsAppModalOrder && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-canvas text-body rounded-md max-w-md w-full border border-hairline shadow-lg overflow-hidden">
            <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink">
                <i className="fa-brands fa-whatsapp text-primary text-base"></i>
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Kirim Nota ke WhatsApp Pelanggan</h3>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppModalOrder(null)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1.5">
                  Pilih Format Pesan WhatsApp
                </label>
                <div className="space-y-1.5">
                  {[
                    {
                      id: 'dp' as const,
                      title: '1. Nota Konfirmasi & Tanda Terima DP',
                      desc: 'Kirim saat pesanan pertama kali dicatat dan DP diterima.',
                    },
                    {
                      id: 'progress' as const,
                      title: '2. Laporan Kemajuan Tahapan Kerja',
                      desc: `Menginfokan bahwa pesanan telah mencapai tahap ${whatsAppModalOrder.stage}.`,
                    },
                    {
                      id: 'milestone' as const,
                      title: '3. Tagihan Termin Pembayaran (Jatuh Tempo)',
                      desc: 'Kirim saat pesanan mencapai tahap kerja tertentu untuk menagih termin berjalan.',
                    },
                    {
                      id: 'invoice' as const,
                      title: '4. Pesanan Siap & Tagihan Pelunasan',
                      desc: 'Kirim saat barang selesai untuk penagihan sisa pembayaran.',
                    },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setWaTemplateType(tpl.id)}
                      className={`w-full p-2.5 rounded-sm border text-left transition-all ${
                        waTemplateType === tpl.id
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-hairline hover:border-neutral-2 text-body'
                      }`}
                    >
                      <div className="text-xs font-bold text-ink">{tpl.title}</div>
                      <div className="text-[11px] text-muted mt-0.5">{tpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Box */}
              <div>
                <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                  Preview Teks Pesan:
                </label>
                <div className="bg-neutral-1 p-3 rounded-sm border border-hairline text-[11px] text-body whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                  {generateWhatsAppMessage(whatsAppModalOrder, waTemplateType)}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => setWhatsAppModalOrder(null)}
                  className="px-4 py-2 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(whatsAppModalOrder, waTemplateType)}
                  className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro flex items-center gap-1.5"
                >
                  <i className="fa-brands fa-whatsapp text-sm"></i>
                  <span>Buka Aplikasi WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Add / Edit Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-canvas text-body rounded-md max-w-xl w-full border border-hairline shadow-lg overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="bg-neutral-1 px-4 py-3 border-b border-hairline flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-file-invoice text-primary text-sm"></i>
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-ink">
                  {editingOrderId ? 'Edit Pesanan Pelanggan' : 'Catat Pesanan Pelanggan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Nama Pelanggan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: H. Ridwan / Toko Kartini"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Nomor WhatsApp (Format: 628...) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 628123456789"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-medium"
                  />
                </div>
              </div>

              {/* Order Items Section */}
              <div className="space-y-2 border-t border-hairline pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                    Daftar Produk yang Dipesan *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                    <span>Tambah Item Produk</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-neutral-1 p-2.5 rounded-sm border border-hairline grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(index, e.target.value)}
                          className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs text-ink font-bold bg-canvas"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {formatRupiah(p.sellingPrice)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min={1}
                          required
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => handleItemQtyChange(index, Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs text-right font-bold text-ink bg-canvas"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <input
                          type="number"
                          min={0}
                          required
                          placeholder="Harga Satuan"
                          value={item.unitPriceSnapshot}
                          onChange={(e) => handleItemPriceChange(index, Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-neutral-2 rounded-sm text-xs text-right font-bold text-ink bg-canvas"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-muted hover:text-danger-text p-1 text-sm"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Cost & DP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-hairline pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Biaya Tambahan / Ongkir / Paking Ekspor (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={customFee}
                    onChange={(e) => setCustomFee(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold text-right"
                  />
                  <input
                    type="text"
                    placeholder="Keterangan (misal: Ongkir Truk ke Surabaya)"
                    value={customFeeNote}
                    onChange={(e) => setCustomFeeNote(e.target.value)}
                    className="w-full px-2.5 py-1 mt-1 border border-neutral-2 rounded text-[11px] text-body"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-ink uppercase tracking-wider">
                      Total DP / Pembayaran Masuk (Rp) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setDpAmount(formGrandTotal)}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Set Lunas ({formatRupiah(formGrandTotal)})
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    required
                    value={dpAmount}
                    onChange={(e) => setDpAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-primary font-black text-right"
                  />
                  <span className="text-[10px] text-muted">
                    Total Nota: <strong>{formatRupiah(formGrandTotal)}</strong> &bull; Sisa:{' '}
                    <strong>{formatRupiah(Math.max(0, formGrandTotal - dpAmount))}</strong>
                  </span>
                </div>
              </div>

              {/* Milestone Plan Setting in Order Form */}
              {hasMilestoneFeature && (
                <div className="border-t border-hairline pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-ink uppercase tracking-wider">
                        Skema Termin Pembayaran
                      </label>
                      <p className="text-[11px] text-muted">
                        Bagi pembayaran pesanan ke dalam beberapa tahap (DP, Mentah, Pelunasan).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPlanEditorInForm(!showPlanEditorInForm)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-sm border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 flex items-center gap-1"
                    >
                      <i className="fa-solid fa-sliders text-[10px]"></i>
                      <span>{showPlanEditorInForm ? 'Tutup Pengaturan' : 'Ubah Termin'}</span>
                    </button>
                  </div>

                  {!showPlanEditorInForm ? (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      {orderPaymentPlan.map((tp, idx) => (
                        <span
                          key={idx}
                          className="bg-neutral-1 px-2.5 py-1 rounded-sm border border-hairline font-medium text-ink text-[11px]"
                        >
                          {tp.label}: <strong className="text-primary">{tp.percent}%</strong> ({tp.triggerStage})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-neutral-1 p-3 rounded-md border border-hairline">
                      <PaymentPlanEditor
                        initialPlan={orderPaymentPlan}
                        onSave={(newPlan) => {
                          setOrderPaymentPlan(newPlan);
                          setShowPlanEditorInForm(false);
                          showNotice('Skema termin pesanan berhasil disesuaikan.');
                        }}
                        onCancel={() => setShowPlanEditorInForm(false)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Stage & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-hairline pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Tahapan Pengerjaan
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as OrderStage)}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold bg-canvas"
                  >
                    <option value="Persiapan">Persiapan</option>
                    <option value="Pengerjaan">Pengerjaan</option>
                    <option value="Finishing">Finishing</option>
                    <option value="Siap Kirim">Siap Kirim</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Dibatalkan">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink uppercase tracking-wider mb-1">
                    Target Tanggal Selesai (Deadline) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-2 rounded-md focus:border-primary text-ink font-bold bg-canvas"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-sm border border-neutral-2 text-xs font-semibold text-body hover:bg-neutral-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-micro"
                >
                  {editingOrderId ? 'Simpan Perubahan' : 'Simpan Pesanan & Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation Form Modal */}
      {isQuoteFormOpen && (
        <QuotationFormModal
          initialQuotation={editingQuote}
          products={products}
          onSave={handleSaveQuote}
          onCancel={() => {
            setIsQuoteFormOpen(false);
            setEditingQuote(null);
          }}
        />
      )}

      {/* Quotation Convert Modal */}
      {convertingQuote && (
        <QuotationConvertModal
          quotation={convertingQuote}
          products={products}
          onConfirm={handleConfirmConvert}
          onCancel={() => setConvertingQuote(null)}
          onEditQuote={() => {
            const q = convertingQuote;
            setConvertingQuote(null);
            handleOpenEditQuote(q);
          }}
        />
      )}

      {/* Labor Contract Form Modal */}
      {isLaborContractModalOpen && (
        <LaborContractFormModal
          orders={orders}
          craftsmen={craftsmen}
          onSave={(contractData) => {
            addLaborContract({ ...contractData, deductionAmount: 0 });
            setIsLaborContractModalOpen(false);
            showNotice('Kontrak borongan kerja berhasil dibuat.');
          }}
          onAddCraftsman={(name, specialty, phone) => {
            return addCraftsman(name, specialty, phone);
          }}
          onCancel={() => setIsLaborContractModalOpen(false)}
        />
      )}

      {/* Labor Payment Modal (Kasbon & Pelunasan) */}
      {selectedContractForPayment && (
        <LaborPaymentModal
          contract={selectedContractForPayment}
          payments={laborPayments.filter((p) => p.contractId === selectedContractForPayment.id)}
          onSave={(paymentData) => {
            addLaborPayment({
              contractId: selectedContractForPayment.id,
              craftsmanId: selectedContractForPayment.craftsmanId,
              ...paymentData,
            });
            setSelectedContractForPayment(null);
            showNotice(
              paymentData.type === 'kasbon'
                ? 'Kasbon tukang berhasil dicatat.'
                : 'Pelunasan borongan berhasil dicatat.'
            );
          }}
          onCancel={() => setSelectedContractForPayment(null)}
        />
      )}
    </div>
  );
};
