import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  BusinessProfile,
  Product,
  Order,
  OrderItem,
  DefectLog,
  ChecklistItem,
  SectorId,
  OrderStage,
} from '../types/titan';
import {
  PaymentRecord,
  PaymentPlanTemplate,
  Quotation,
  Craftsman,
  LaborContract,
  LaborPayment,
} from '../types/furniture';
import {
  calculateProductHpp,
  calculateOrderFinancials,
} from '../utils/calculations';
import { summarizeLaborContract } from '../utils/furnitureCalculations';
import {
  syncMaterialPriceAcrossProducts,
  broadcastStateUpdate,
  subscribeToDualSync,
} from '../utils/syncEngine';
import {
  PROFILE_MEBEL,
  PRODUCTS_MEBEL,
  ORDERS_MEBEL,
  DEFECTS_MEBEL,
  CHECKLIST_MEBEL,
  QUOTATIONS_MEBEL,
  CRAFTSMEN_MEBEL,
  LABOR_CONTRACTS_MEBEL,
  LABOR_PAYMENTS_MEBEL,
  PROFILE_FNB,
  PRODUCTS_FNB,
  ORDERS_FNB,
  DEFECTS_FNB,
  CHECKLIST_FNB,
} from '../config/mockSeedData';
import { SECTOR_PRESETS, DEFAULT_FURNITURE_PAYMENT_PLAN } from '../config/sectorPresets';
import { auth } from '../config/firebase';
import {
  saveUserWorkspace,
  loadUserWorkspace,
  syncClassroomParticipant,
} from '../services/workspaceService';
import { calculateBusinessCopqRate } from '../utils/calculations';

export type ActiveTab = 'hpp' | 'orders' | 'quality' | 'reports' | 'profile' | 'monitoring' | 'admin';
export type MockPersona = 'mebel' | 'fnb' | 'custom' | 'empty';

export interface PendingDefectDraft {
  orderId: string;
  productId: string;
}

interface UmkmContextType {
  profile: BusinessProfile;
  products: Product[];
  orders: Order[];
  defects: DefectLog[];
  checklists: ChecklistItem[];
  activeTab: ActiveTab;
  isHpViewport: boolean;
  mockPersona: MockPersona;
  pendingDefectDraft: PendingDefectDraft | null;
  setActiveTab: (tab: ActiveTab) => void;
  setIsHpViewport: (val: boolean) => void;
  setPendingDefectDraft: (draft: PendingDefectDraft | null) => void;
  triggerDefectFromOrder: (orderId: string, productId: string) => void;
  switchPersona: (persona: MockPersona) => void;
  toggleTrainingMode: () => void;
  resetToInitialSeed: () => void;
  // Product Actions
  addProduct: (p: Omit<Product, 'id' | 'baseHpp' | 'copqBufferAmount' | 'safeHpp' | 'netProfitPerUnit' | 'netMarginPercent' | 'updatedAt'>) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  syncMaterialPrice: (normalizedKey: string, newUnitPrice: number) => number;
  // Order Actions
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => void;
  updateOrder: (id: string, orderData: Partial<Order>) => void;
  updateOrderStage: (id: string, stage: OrderStage) => void;
  updateOrderPayment: (id: string, dpAmount: number) => void;
  addOrderPayment: (orderId: string, payment: Omit<PaymentRecord, 'id'>) => void;
  deleteOrderPayment: (orderId: string, paymentId: string) => void;
  updateOrderPaymentPlan: (orderId: string, plan: PaymentPlanTemplate[]) => void;
  deleteOrder: (id: string) => void;
  // Quotation Actions (M3)
  quotations: Quotation[];
  addQuotation: (q: Omit<Quotation, 'id' | 'quoteNumber' | 'createdAt'>) => string;
  updateQuotation: (id: string, data: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  convertQuotationToOrder: (quotationId: string) => string;
  // Labor Borongan Actions (M4)
  craftsmen: Craftsman[];
  laborContracts: LaborContract[];
  laborPayments: LaborPayment[];
  addCraftsman: (name: string, specialty: Craftsman['specialty'], phone?: string) => string;
  addLaborContract: (data: Omit<LaborContract, 'id' | 'createdAt'>) => string;
  updateLaborContract: (id: string, data: Partial<LaborContract>) => void;
  deleteLaborContract: (id: string) => void;
  markLaborContractQcPassed: (contractId: string) => void;
  addLaborPayment: (data: Omit<LaborPayment, 'id'>) => void;
  deleteLaborPayment: (id: string) => void;
  toggleOrderLaborFullyTracked: (orderId: string) => void;
  // Defect Actions
  addDefect: (defect: Omit<DefectLog, 'id' | 'totalCopqLoss'>) => void;
  deleteDefect: (id: string) => void;
  // Checklist Actions
  toggleChecklist: (id: string) => void;
  addChecklistItem: (level: 'halal_facility' | 'daily_qc', title: string) => void;
  deleteChecklistItem: (id: string) => void;
  // Profile Actions
  updateProfile: (profile: Partial<BusinessProfile>) => void;
  changeSector: (sector: SectorId) => void;
}

const STORAGE_KEY = 'titan_umkm_workspace_state_v3';
const LEGACY_STORAGE_KEY_V2 = 'titan_umkm_workspace_state_v2';

const UmkmContext = createContext<UmkmContextType | undefined>(undefined);

export const UmkmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      // Migration from v2
      const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY_V2);
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        if (parsed.orders && Array.isArray(parsed.orders)) {
          parsed.orders = parsed.orders.map((o: any) => {
            const payments = o.payments || (o.dpAmount > 0 ? [
              {
                id: `pay_mig_${o.id}`,
                amount: o.dpAmount,
                date: (o.createdAt || new Date().toISOString()).split('T')[0],
                method: 'Transfer' as const,
                note: 'DP Awal Pesanan',
              }
            ] : []);
            const paymentPlan = o.paymentPlan || DEFAULT_FURNITURE_PAYMENT_PLAN;
            return {
              ...o,
              payments,
              paymentPlan,
            };
          });
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved state:', e);
    }
    return {
      profile: PROFILE_MEBEL,
      products: PRODUCTS_MEBEL,
      orders: ORDERS_MEBEL,
      defects: DEFECTS_MEBEL,
      checklists: CHECKLIST_MEBEL,
      quotations: QUOTATIONS_MEBEL,
      craftsmen: CRAFTSMEN_MEBEL,
      laborContracts: LABOR_CONTRACTS_MEBEL,
      laborPayments: LABOR_PAYMENTS_MEBEL,
      mockPersona: 'mebel' as MockPersona,
      trainingModeEnabled: true,
    };
  };

  const initial = useMemo(loadSavedState, []);

  const [profile, setProfile] = useState<BusinessProfile>(initial.profile);
  const [products, setProducts] = useState<Product[]>(initial.products);
  const [orders, setOrders] = useState<Order[]>(initial.orders);
  const [defects, setDefects] = useState<DefectLog[]>(initial.defects);
  const [checklists, setChecklists] = useState<ChecklistItem[]>(initial.checklists);
  const [quotations, setQuotations] = useState<Quotation[]>(initial.quotations || QUOTATIONS_MEBEL);
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>(initial.craftsmen || CRAFTSMEN_MEBEL);
  const [laborContracts, setLaborContracts] = useState<LaborContract[]>(initial.laborContracts || LABOR_CONTRACTS_MEBEL);
  const [laborPayments, setLaborPayments] = useState<LaborPayment[]>(initial.laborPayments || LABOR_PAYMENTS_MEBEL);
  const [mockPersona, setMockPersona] = useState<MockPersona>(initial.mockPersona || 'mebel');
  const [activeTab, setActiveTab] = useState<ActiveTab>('hpp');
  const [isHpViewport, setIsHpViewport] = useState<boolean>(false);
  const [pendingDefectDraft, setPendingDefectDraft] = useState<PendingDefectDraft | null>(null);

  // Sync state changes to localStorage and broadcast to other tabs (Dual-Sync)
  useEffect(() => {
    const statePayload = {
      profile,
      products,
      orders,
      defects,
      checklists,
      quotations,
      craftsmen,
      laborContracts,
      laborPayments,
      mockPersona,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statePayload));
      broadcastStateUpdate(statePayload);
    } catch (err) {
      console.warn('Sync error:', err);
    }

    // Cloud Firestore Sync (Debounced for authenticated users)
    const currentUser = auth.currentUser;
    if (currentUser) {
      const timer = setTimeout(() => {
        saveUserWorkspace(currentUser.uid, {
          ...statePayload,
          updatedAt: new Date().toISOString(),
        });

        // Mirror training progress to Classroom live board
        const totalRev = orders
          .filter((o) => o.stage !== 'Dibatalkan')
          .reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.qty * it.unitPriceSnapshot, 0), 0);
        
        syncClassroomParticipant(currentUser.uid, {
          id: currentUser.uid,
          businessName: profile.name,
          ownerName: profile.ownerName,
          phone: profile.phone,
          sector: profile.sector,
          productCount: products.length,
          orderCount: orders.length,
          defectCount: defects.length,
          completedHomework: products.length >= 2 && orders.length >= 1 && defects.length >= 1,
          actualCopqRate: calculateBusinessCopqRate(products, orders, defects),
          totalRevenue: totalRev,
          sampleProduct: products[0],
          sampleDefects: defects,
        });
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [profile, products, orders, defects, checklists, quotations, craftsmen, laborContracts, laborPayments, mockPersona]);

  // Load cloud workspace on authentication if available
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      loadUserWorkspace(currentUser.uid).then((cloudData) => {
        if (cloudData && cloudData.profile) {
          setProfile(cloudData.profile);
          if (cloudData.products) setProducts(cloudData.products);
          if (cloudData.orders) setOrders(cloudData.orders);
          if (cloudData.defects) setDefects(cloudData.defects);
          if (cloudData.checklists) setChecklists(cloudData.checklists);
          if (cloudData.quotations) setQuotations(cloudData.quotations);
          if (cloudData.craftsmen) setCraftsmen(cloudData.craftsmen);
          if (cloudData.laborContracts) setLaborContracts(cloudData.laborContracts);
          if (cloudData.laborPayments) setLaborPayments(cloudData.laborPayments);
        }
      });
    }
  }, [auth.currentUser?.uid]);

  // Subscribe to updates from other browser tabs
  useEffect(() => {
    const unsubscribe = subscribeToDualSync((incoming) => {
      if (incoming && incoming.profile) {
        setProfile(incoming.profile);
        if (incoming.products) setProducts(incoming.products);
        if (incoming.orders) setOrders(incoming.orders);
        if (incoming.defects) setDefects(incoming.defects);
        if (incoming.checklists) setChecklists(incoming.checklists);
        if (incoming.quotations) setQuotations(incoming.quotations);
        if (incoming.craftsmen) setCraftsmen(incoming.craftsmen);
        if (incoming.laborContracts) setLaborContracts(incoming.laborContracts);
        if (incoming.laborPayments) setLaborPayments(incoming.laborPayments);
        if (incoming.mockPersona) setMockPersona(incoming.mockPersona);
      }
    });
    return unsubscribe;
  }, []);

  const triggerDefectFromOrder = (orderId: string, productId: string) => {
    setPendingDefectDraft({ orderId, productId });
    setActiveTab('quality');
  };

  const switchPersona = (persona: MockPersona) => {
    setMockPersona(persona);
    if (persona === 'mebel') {
      setProfile(PROFILE_MEBEL);
      setProducts(PRODUCTS_MEBEL);
      setOrders(ORDERS_MEBEL);
      setDefects(DEFECTS_MEBEL);
      setChecklists(CHECKLIST_MEBEL);
      setQuotations(QUOTATIONS_MEBEL);
      setCraftsmen(CRAFTSMEN_MEBEL);
      setLaborContracts(LABOR_CONTRACTS_MEBEL);
      setLaborPayments(LABOR_PAYMENTS_MEBEL);
    } else if (persona === 'fnb') {
      setProfile(PROFILE_FNB);
      setProducts(PRODUCTS_FNB);
      setOrders(ORDERS_FNB);
      setDefects(DEFECTS_FNB);
      setChecklists(CHECKLIST_FNB);
      setQuotations([]);
      setCraftsmen([]);
      setLaborContracts([]);
      setLaborPayments([]);
    } else if (persona === 'custom') {
      const customProfile: BusinessProfile = {
        id: 'prof_custom_01',
        name: 'Berkah Tenun & Kriya Jepara',
        ownerName: 'Farid Hidayat',
        phone: '628778899001',
        sector: 'fashion',
        trainingModeEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile(customProfile);
      setProducts([]);
      setOrders([]);
      setDefects([]);
      setQuotations([]);
      setCraftsmen([]);
      setLaborContracts([]);
      setLaborPayments([]);
      setChecklists(
        SECTOR_PRESETS.fashion.defaultChecklists.map((c, i) => ({
          ...c,
          id: `chk_c_${i + 1}`,
          updatedAt: new Date().toISOString(),
        }))
      );
    } else {
      const emptyProfile: BusinessProfile = {
        id: `prof_${Date.now()}`,
        name: 'Usaha Baru Jepara',
        ownerName: 'Pemilik Usaha',
        phone: '628120000000',
        sector: 'mebel',
        trainingModeEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile(emptyProfile);
      setProducts([]);
      setOrders([]);
      setDefects([]);
      setQuotations([]);
      setCraftsmen([]);
      setLaborContracts([]);
      setLaborPayments([]);
      setChecklists(
        SECTOR_PRESETS.mebel.defaultChecklists.map((c, i) => ({
          ...c,
          id: `chk_new_${i + 1}`,
          updatedAt: new Date().toISOString(),
        }))
      );
    }
  };

  const toggleTrainingMode = () => {
    setProfile((prev) => ({
      ...prev,
      trainingModeEnabled: !prev.trainingModeEnabled,
      updatedAt: new Date().toISOString(),
    }));
  };

  const resetToInitialSeed = () => {
    localStorage.removeItem(STORAGE_KEY);
    switchPersona('mebel');
  };

  const addProduct = (
    pData: Omit<Product, 'id' | 'baseHpp' | 'copqBufferAmount' | 'safeHpp' | 'netProfitPerUnit' | 'netMarginPercent' | 'updatedAt'>
  ) => {
    const calc = calculateProductHpp(
      pData.calcMode,
      pData.outputQty,
      pData.materials,
      pData.laborCost,
      pData.overheadCost,
      pData.defectRiskPercent,
      pData.sellingPrice
    );

    const newProd: Product = {
      ...pData,
      id: `prod_${Date.now()}`,
      baseHpp: calc.baseHpp,
      copqBufferAmount: calc.copqBufferAmount,
      safeHpp: calc.safeHpp,
      netProfitPerUnit: calc.netProfitPerUnit,
      netMarginPercent: calc.netMarginPercent,
      updatedAt: new Date().toISOString(),
    };

    setProducts((prev) => [newProd, ...prev]);
  };

  const updateProduct = (id: string, pData: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== id) return prod;
        const merged = { ...prod, ...pData };
        const calc = calculateProductHpp(
          merged.calcMode,
          merged.outputQty,
          merged.materials,
          merged.laborCost,
          merged.overheadCost,
          merged.defectRiskPercent,
          merged.sellingPrice
        );
        return {
          ...merged,
          baseHpp: calc.baseHpp,
          copqBufferAmount: calc.copqBufferAmount,
          safeHpp: calc.safeHpp,
          netProfitPerUnit: calc.netProfitPerUnit,
          netMarginPercent: calc.netMarginPercent,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const syncMaterialPrice = (normalizedKey: string, newUnitPrice: number) => {
    const result = syncMaterialPriceAcrossProducts(
      products,
      normalizedKey,
      newUnitPrice,
      (p) => {
        const calc = calculateProductHpp(
          p.calcMode,
          p.outputQty,
          p.materials,
          p.laborCost,
          p.overheadCost,
          p.defectRiskPercent,
          p.sellingPrice
        );
        return {
          ...p,
          baseHpp: calc.baseHpp,
          copqBufferAmount: calc.copqBufferAmount,
          safeHpp: calc.safeHpp,
          netProfitPerUnit: calc.netProfitPerUnit,
          netMarginPercent: calc.netMarginPercent,
          updatedAt: new Date().toISOString(),
        };
      }
    );
    setProducts(result.updatedProducts);
    return result.affectedCount;
  };

  const addOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => {
    const count = orders.length + 1;
    const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const sectorPreset = SECTOR_PRESETS[profile.sector] || SECTOR_PRESETS.mebel;
    const defaultPlan = sectorPreset.features.milestonePayments
      ? (sectorPreset.defaultPaymentPlan || DEFAULT_FURNITURE_PAYMENT_PLAN)
      : undefined;

    const paymentPlan = orderData.paymentPlan || defaultPlan;

    // If payments array not provided but dpAmount > 0, generate initial payment record
    let payments = orderData.payments || [];
    if (payments.length === 0 && (orderData.dpAmount || 0) > 0) {
      payments = [
        {
          id: `pay_${Date.now()}`,
          amount: orderData.dpAmount,
          date: now.split('T')[0],
          method: 'Transfer',
          note: 'DP Awal Pesanan',
        },
      ];
    }

    const tempOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}`,
      orderNumber,
      createdAt: now,
      paymentPlan,
      payments,
    };

    const fin = calculateOrderFinancials(tempOrder);
    const newOrder: Order = {
      ...tempOrder,
      paymentStatus: fin.paymentStatus,
    };

    setOrders((prev) => [newOrder, ...prev]);
  };

  const updateOrder = (id: string, orderData: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const merged = { ...o, ...orderData };
        const fin = calculateOrderFinancials(merged);
        return {
          ...merged,
          paymentStatus: fin.paymentStatus,
          completedAt: merged.stage === 'Selesai' ? merged.completedAt || new Date().toISOString() : merged.completedAt,
        };
      })
    );
  };

  const updateOrderStage = (id: string, stage: OrderStage) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        return {
          ...o,
          stage,
          completedAt: stage === 'Selesai' ? new Date().toISOString() : o.completedAt,
        };
      })
    );
  };

  const updateOrderPayment = (id: string, dpAmount: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const temp = { ...o, dpAmount: Math.max(0, dpAmount) };
        const fin = calculateOrderFinancials(temp);
        return {
          ...temp,
          paymentStatus: fin.paymentStatus,
        };
      })
    );
  };

  const addOrderPayment = (orderId: string, paymentData: Omit<PaymentRecord, 'id'>) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const newPayment: PaymentRecord = {
          ...paymentData,
          id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        };
        const payments = [...(o.payments || []), newPayment];
        const dpAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const updatedOrder: Order = { ...o, payments, dpAmount };
        const fin = calculateOrderFinancials(updatedOrder);
        return {
          ...updatedOrder,
          paymentStatus: fin.paymentStatus,
        };
      })
    );
  };

  const deleteOrderPayment = (orderId: string, paymentId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const payments = (o.payments || []).filter((p) => p.id !== paymentId);
        const dpAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const updatedOrder: Order = { ...o, payments, dpAmount };
        const fin = calculateOrderFinancials(updatedOrder);
        return {
          ...updatedOrder,
          paymentStatus: fin.paymentStatus,
        };
      })
    );
  };

  const updateOrderPaymentPlan = (orderId: string, plan: PaymentPlanTemplate[]) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          paymentPlan: plan,
        };
      })
    );
  };

  const deleteOrder = (id: string) => {
    // PRD Bagian 12.1: Ditolak jika pesanan memiliki LaborContract yang belum Lunas / Dibatalkan
    const activeContracts = laborContracts.filter((c) => {
      if (c.orderId !== id || c.cancelledAt) return false;
      const s = summarizeLaborContract(c, laborPayments);
      return s.status !== 'Lunas';
    });

    if (activeContracts.length > 0) {
      alert(
        `Tidak dapat menghapus pesanan ini karena masih ada ${activeContracts.length} borongan kerja tukang yang belum Lunas atau Dibatalkan. Selesaikan atau batalkan borongan terlebih dahulu.`
      );
      return;
    }

    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const addQuotation = (quoteData: Omit<Quotation, 'id' | 'quoteNumber' | 'createdAt'>): string => {
    const count = quotations.length + 1;
    const quoteNumber = `QUO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
    const newQuotation: Quotation = {
      ...quoteData,
      id: `quo_${Date.now()}`,
      quoteNumber,
      createdAt: new Date().toISOString(),
    };
    setQuotations((prev) => [newQuotation, ...prev]);
    return quoteNumber;
  };

  const updateQuotation = (id: string, data: Partial<Quotation>) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...data } : q))
    );
  };

  const deleteQuotation = (id: string) => {
    setQuotations((prev) => prev.filter((q) => q.id !== id));
  };

  const convertQuotationToOrder = (quotationId: string): string => {
    const q = quotations.find((x) => x.id === quotationId);
    if (!q) throw new Error('Quotation not found');

    const count = orders.length + 1;
    const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = q.items.map((it, idx) => ({
      id: `item_ord_${Date.now()}_${idx}`,
      productId: it.productId,
      productNameSnapshot: it.productNameSnapshot,
      qty: it.qty,
      unitPriceSnapshot: it.unitPrice,
      baseHppSnapshot: it.baseHppAtQuote,
      laborCostSnapshot: products.find((p) => p.id === it.productId)?.laborCost || 0,
      specNote: it.spec ? `${it.spec.woodType || ''} ${it.spec.finishing || ''} ${it.spec.notes || ''}`.trim() : undefined,
    }));

    const dueDateMs = Date.now() + q.leadTimeWeeks * 7 * 86400000;
    const dueDate = new Date(dueDateMs).toISOString().split('T')[0];

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      customerName: q.customerName,
      customerPhone: q.customerPhone,
      items: orderItems,
      customFee: q.customFee || 0,
      customFeeNote: q.customFeeNote,
      dpAmount: 0,
      stage: 'Persiapan',
      paymentStatus: 'Belum DP',
      createdAt: now,
      dueDate,
      paymentPlan: q.paymentPlan,
      payments: [],
      sourceQuotationId: q.id,
    };

    setOrders((prev) => [newOrder, ...prev]);

    setQuotations((prev) =>
      prev.map((item) =>
        item.id === quotationId
          ? { ...item, convertedOrderId: newOrder.id }
          : item
      )
    );

    return newOrder.orderNumber;
  };

  // Labor Actions (M4)
  const addCraftsman = (name: string, specialty: Craftsman['specialty'], phone?: string): string => {
    const newCraftsman: Craftsman = {
      id: `crf_${Date.now()}`,
      name,
      specialty,
      phone,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setCraftsmen((prev) => [newCraftsman, ...prev]);
    return newCraftsman.id;
  };

  const addLaborContract = (data: Omit<LaborContract, 'id' | 'createdAt'>): string => {
    const newContract: LaborContract = {
      ...data,
      id: `lcon_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setLaborContracts((prev) => [newContract, ...prev]);
    return newContract.id;
  };

  const updateLaborContract = (id: string, data: Partial<LaborContract>) => {
    setLaborContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  };

  const deleteLaborContract = (id: string) => {
    setLaborContracts((prev) => prev.filter((c) => c.id !== id));
    setLaborPayments((prev) => prev.filter((p) => p.contractId !== id));
  };

  const markLaborContractQcPassed = (contractId: string) => {
    setLaborContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              qcPassedAt: c.qcPassedAt ? undefined : new Date().toISOString(),
            }
          : c
      )
    );
  };

  const addLaborPayment = (data: Omit<LaborPayment, 'id'>) => {
    const newPayment: LaborPayment = {
      ...data,
      id: `lpay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setLaborPayments((prev) => [newPayment, ...prev]);
  };

  const deleteLaborPayment = (id: string) => {
    setLaborPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleOrderLaborFullyTracked = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, laborFullyTracked: !o.laborFullyTracked }
          : o
      )
    );
  };

  const addDefect = (defectData: Omit<DefectLog, 'id' | 'totalCopqLoss'>) => {
    const totalCopqLoss =
      defectData.scrappedUnits * defectData.baseHppSnapshot +
      defectData.reworkCost +
      defectData.complaintDiscount;

    const newDefect: DefectLog = {
      ...defectData,
      id: `def_${Date.now()}`,
      totalCopqLoss,
    };

    setDefects((prev) => [newDefect, ...prev]);
  };

  const deleteDefect = (id: string) => {
    setDefects((prev) => prev.filter((d) => d.id !== id));
  };

  const toggleChecklist = (id: string) => {
    setChecklists((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isChecked: !c.isChecked, updatedAt: new Date().toISOString() } : c))
    );
  };

  const addChecklistItem = (level: 'halal_facility' | 'daily_qc', title: string) => {
    const newItem: ChecklistItem = {
      id: `chk_custom_${Date.now()}`,
      level,
      sector: profile.sector,
      title: title.trim(),
      isChecked: false,
      updatedAt: new Date().toISOString(),
    };
    setChecklists((prev) => [...prev, newItem]);
  };

  const deleteChecklistItem = (id: string) => {
    setChecklists((prev) => prev.filter((c) => c.id !== id));
  };

  const updateProfile = (profileData: Partial<BusinessProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...profileData,
      updatedAt: new Date().toISOString(),
    }));
  };

  const changeSector = (newSector: SectorId) => {
    setProfile((prev) => ({
      ...prev,
      sector: newSector,
      updatedAt: new Date().toISOString(),
    }));
    const preset = SECTOR_PRESETS[newSector];
    if (preset) {
      const newItems: ChecklistItem[] = preset.defaultChecklists.map((c, i) => ({
        ...c,
        id: `chk_${newSector}_${Date.now()}_${i}`,
        updatedAt: new Date().toISOString(),
      }));
      setChecklists(newItems);
    }
  };

  return (
    <UmkmContext.Provider
      value={{
        profile,
        products,
        orders,
        defects,
        checklists,
        activeTab,
        isHpViewport,
        mockPersona,
        pendingDefectDraft,
        setActiveTab,
        setIsHpViewport,
        setPendingDefectDraft,
        triggerDefectFromOrder,
        switchPersona,
        toggleTrainingMode,
        resetToInitialSeed,
        addProduct,
        updateProduct,
        deleteProduct,
        syncMaterialPrice,
        addOrder,
        updateOrder,
        updateOrderStage,
        updateOrderPayment,
        addOrderPayment,
        deleteOrderPayment,
        updateOrderPaymentPlan,
        deleteOrder,
        quotations,
        addQuotation,
        updateQuotation,
        deleteQuotation,
        convertQuotationToOrder,
        craftsmen,
        laborContracts,
        laborPayments,
        addCraftsman,
        addLaborContract,
        updateLaborContract,
        deleteLaborContract,
        markLaborContractQcPassed,
        addLaborPayment,
        deleteLaborPayment,
        toggleOrderLaborFullyTracked,
        addDefect,
        deleteDefect,
        toggleChecklist,
        addChecklistItem,
        deleteChecklistItem,
        updateProfile,
        changeSector,
      }}
    >
      {children}
    </UmkmContext.Provider>
  );
};

export const useUmkm = () => {
  const context = useContext(UmkmContext);
  if (!context) {
    throw new Error('useUmkm must be used within an UmkmProvider');
  }
  return context;
};
