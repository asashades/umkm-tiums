import { Product } from '../types/titan';

/**
 * Normalisasi kunci bahan baku (Nama + Satuan) agar sinkronisasi harga akurat
 * Contoh: "Kayu Jati " + "M3" -> "kayu_jati__m3"
 */
export function createMaterialKey(name: string, unit: string): string {
  const cleanName = name.trim().toLowerCase().replace(/\s+/g, '_');
  const cleanUnit = unit.trim().toLowerCase();
  return `${cleanName}__${cleanUnit}`;
}

/**
 * Memperbarui harga bahan baku yang sama di seluruh katalog produk (Menu 1.D)
 * dan otomatis menghitung ulang HPP masing-masing produk yang terdampak.
 */
export function syncMaterialPriceAcrossProducts(
  products: Product[],
  targetMaterialKey: string,
  newUnitPrice: number,
  recalculateFn: (p: Product) => Product
): { updatedProducts: Product[]; affectedCount: number } {
  let affectedCount = 0;

  const updatedProducts = products.map((product) => {
    let isModified = false;
    const updatedMaterials = product.materials.map((mat) => {
      if (mat.normalizedKey === targetMaterialKey && mat.unitPrice !== newUnitPrice) {
        isModified = true;
        return { ...mat, unitPrice: newUnitPrice };
      }
      return mat;
    });

    if (isModified) {
      affectedCount++;
      return recalculateFn({ ...product, materials: updatedMaterials });
    }
    return product;
  });

  return { updatedProducts, affectedCount };
}

/**
 * LIVE DUAL-SYNC ENGINE (Tahap 1: Mock Prototype Lintas Tab Browser)
 * Memastikan saat UMKM/Penguji mengubah data di Tab Utama (/),
 * Portal Monitoring Dosen (/monitoring) di Tab Proyektor langsung terbarui secara real-time.
 */
const SYNC_CHANNEL_NAME = 'titan_umkm_dual_sync_v1';
const STORAGE_KEY = 'titan_umkm_active_state';

export function broadcastStateUpdate(payload: unknown) {
  // 1. Simpan ke localStorage (memicu 'storage' event di tab lain)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Gagal menyimpan state ke localStorage:', err);
  }

  // 2. Broadcast instan via BroadcastChannel API
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage({ type: 'STATE_UPDATED', payload, timestamp: Date.now() });
      channel.close();
    } catch (err) {
      console.warn('BroadcastChannel error:', err);
    }
  }
}

export function subscribeToDualSync(onUpdate: (data: any) => void): () => void {
  // Listener 1: BroadcastChannel API (Modern & Cepat)
  let channel: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'STATE_UPDATED') {
          onUpdate(event.data.payload);
        }
      };
    } catch (err) {
      console.warn('BroadcastChannel init error:', err);
    }
  }

  // Listener 2: Fallback window 'storage' event
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        onUpdate(JSON.parse(e.newValue));
      } catch (err) {
        console.error('Gagal memproses sinkronisasi state TITAN:', err);
      }
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  // Cleanup function untuk React useEffect
  return () => {
    if (channel) channel.close();
    window.removeEventListener('storage', handleStorageEvent);
  };
}
