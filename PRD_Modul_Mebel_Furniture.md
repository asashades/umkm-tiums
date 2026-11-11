# PRODUCT REQUIREMENTS DOCUMENT (PRD) — EKSTENSI SEKTOR
## Modul Khusus Mebel & Furniture: Kubikasi Kayu, Termin Bayar, Penawaran Harga, Upah Borongan & Kasbon Tukang

| Atribut | Nilai |
| :--- | :--- |
| Versi Dokumen | `v1.0.0-PRD-MEBEL` |
| Dokumen Induk | `PRD_Web_App_UMKM_Jepara.md` (`v1.2.0-PRD`) — seluruh aturan induk tetap berlaku |
| Kode Basis Saat Ini | Prototipe Mock Tahap 1 (React + Vite + TypeScript + Tailwind, `localStorage` + Dual-Sync) |
| Sektor Sasaran | `SectorId = 'mebel'` (Mebel & Kerajinan Kayu) |
| Pembaca Utama | AI Agent / Developer pelaksana. Dokumen ini ditulis agar bisa dikerjakan tanpa menebak. |
| Status | Draf untuk disetujui pemilik produk |

> **Aturan baca untuk AI Agent:** Jika ada konflik antara dokumen ini dan PRD induk, PRD induk menang untuk hal desain (TITAN Design System, Anti-AI Slop, Bottom Bar, Anti-Zoom). Dokumen ini menang untuk hal logika bisnis khusus mebel. Jangan menambah fitur di luar dokumen ini.

---

## Daftar Isi

1. Latar Belakang & Masalah Lapangan
2. Ruang Lingkup, Prioritas & Urutan Pengerjaan
3. Prinsip Desain Modul (Turunan Aturan Induk)
4. Arsitektur Gating Sektor (Fitur Muncul Hanya untuk Mebel)
5. Fitur M1 — Kalkulator Kubikasi Kayu (Daftar Potong)
6. Fitur M2 — Termin Pembayaran 3 Tahap
7. Fitur M3 — Surat Penawaran Harga (Quotation)
8. Fitur M4 — Upah Borongan & Kasbon Tukang
9. Dampak ke Rapor Usaha (Laba Rugi & Arus Kas)
10. Skema Data TypeScript (Tambahan & Perubahan)
11. Mesin Kalkulasi (`src/utils/furnitureCalculations.ts`)
12. Perubahan State, Penyimpanan & Migrasi Data
13. Template Pesan WhatsApp
14. Data Contoh (Seed) untuk Mock
15. Rencana File & Komponen
16. Kriteria Penerimaan & Kasus Uji Angka
17. Kasus Tepi (Edge Cases) Wajib Ditangani
18. Di Luar Ruang Lingkup
19. Keputusan Default yang Perlu Dikonfirmasi

---

## 1. Latar Belakang & Masalah Lapangan

Bengkel mebel di Jepara (skala rumahan hingga menengah) umumnya bocor uang di empat titik yang belum ditangani aplikasi saat ini:

| No | Titik Bocor | Kondisi Lapangan | Akibat Finansial |
| :--- | :--- | :--- | :--- |
| 1 | **Salah hitung kubikasi kayu** | Kayu dibeli per kubik (m3), tapi komponen dipotong per sentimeter. Konversi cm ke m3 sering dikira-kira. | HPP bahan kayu salah, harga jual terlalu murah tanpa disadari. |
| 2 | **Pembayaran tidak bertahap** | Pesanan bernilai jutaan hanya dicatat "DP" lalu "lunas". Barang sudah dikerjakan sampai finishing padahal pembeli belum bayar lagi. | Modal kerja macet; risiko barang tidak diambil pembeli. |
| 3 | **Penawaran harga tidak tercatat** | Pembeli kustom (kafe, hotel, rumah tangga) minta rincian harga dan spesifikasi lewat chat. Harga diketik manual tanpa cek HPP. | Harga penawaran di bawah modal; lupa follow-up; harga kayu naik sebelum pembeli setuju. |
| 4 | **Kasbon tukang borongan tidak terkontrol** | Tukang rakit, ukir, dan finishing dibayar borongan per pesanan dan sering kasbon mingguan. | Kasbon melebihi nilai borongan; upah lunas padahal barang belum lolos QC; laba pesanan tidak diketahui. |

Empat fitur dalam dokumen ini menjawab keempat titik tersebut secara berurutan.

---

## 2. Ruang Lingkup, Prioritas & Urutan Pengerjaan

| Kode | Fitur | Prioritas | Ketergantungan | Perkiraan Ukuran |
| :--- | :--- | :--- | :--- | :--- |
| **M1** | Kalkulator Kubikasi Kayu (Daftar Potong) | P0 | Tidak ada | Kecil |
| **M2** | Termin Pembayaran 3 Tahap | P0 | Migrasi `payments[]` pada `Order` | Sedang |
| **M3** | Surat Penawaran Harga (Quotation) | P1 | M2 (template termin dibawa ke pesanan) | Sedang |
| **M4** | Upah Borongan & Kasbon Tukang | P1 | `laborCostSnapshot` pada `OrderItem` | Besar |

**Urutan wajib:** M1 → M2 → M3 → M4. Setiap fase harus lolos `npm run build` tanpa error dan lolos kasus uji pada Bagian 16 sebelum lanjut ke fase berikutnya.

---

## 3. Prinsip Desain Modul (Turunan Aturan Induk)

1. **Tidak menambah tab Bottom Bar.** Bottom Bar tetap 5 tab (`Produk & HPP`, `Pesanan`, `Mutu & Halal`, `Rapor`, `Profil`). Fitur baru masuk ke tab yang sudah ada.
2. **Tidak ada kartu di dalam kartu.** Bagian baru di dalam kartu pesanan dipisah dengan garis `border-t border-hairline` dan judul kecil, bukan kartu bersarang berbayang.
3. **Tidak ada aksen garis warna di sisi kiri kartu, tidak ada gradasi ungu, tidak ada emoji.** Semua ikon memakai Font Awesome 6.
4. **Tidak ada `window.alert`, `window.confirm`, `window.prompt`.** Semua konfirmasi memakai pola konfirmasi 2 langkah inline (`Yakin?` → `Ya` / `Batal`) atau modal milik aplikasi.
5. **Teks bantuan hanya jika berisi angka atau aturan konkret.** Contoh yang benar: `Sisa upah Rp 500.000 baru bisa dilunasi setelah lolos QC.` Contoh yang dilarang: `Fitur ini membantu Anda mengelola keuangan dengan lebih baik.`
6. **Mobile-first 375px.** Semua form baru wajib dicek di bingkai simulasi 375px (`.hp-viewport`). Input angka tetap `16px` (aturan Anti-Zoom).
7. **Bahasa:** Bahasa Indonesia sehari-hari pengrajin. Pakai istilah lapangan: *kubikasi*, *daftar potong*, *barang mentah*, *borongan*, *kasbon*, *termin*.

### 3.1 Ikon Resmi Modul

| Fitur | Ikon Font Awesome |
| :--- | :--- |
| Kubikasi / Daftar Potong | `fa-solid fa-ruler-combined` |
| Termin Pembayaran | `fa-solid fa-money-bill-transfer` |
| Penawaran Harga | `fa-solid fa-file-signature` |
| Tukang / Borongan | `fa-solid fa-helmet-safety` |
| Kasbon | `fa-solid fa-hand-holding-dollar` |
| Lolos QC | `fa-solid fa-circle-check` |
| Peringatan | `fa-solid fa-triangle-exclamation` |

---

## 4. Arsitektur Gating Sektor (Fitur Muncul Hanya untuk Mebel)

Fitur tidak boleh di-hardcode dengan `if (profile.sector === 'mebel')` yang tersebar. Tambahkan flag fitur pada `SectorDefinition` agar sektor lain (misal Fashion/Konveksi yang juga memakai borongan) bisa mengaktifkannya nanti tanpa refactor.

```ts
// src/config/sectorPresets.ts (tambahan pada interface SectorDefinition)
export interface SectorFeatureFlags {
  cubicCalculator: boolean;     // M1
  milestonePayments: boolean;   // M2
  quotations: boolean;          // M3
  laborContracts: boolean;      // M4
}

export interface SectorDefinition {
  // ...field lama tetap
  features: SectorFeatureFlags;
  defaultPaymentPlan?: PaymentPlanTemplate[]; // hanya jika milestonePayments = true
}
```

| Sektor | `cubicCalculator` | `milestonePayments` | `quotations` | `laborContracts` |
| :--- | :---: | :---: | :---: | :---: |
| `mebel` | true | true | true | true |
| `fnb` | false | false | false | false |
| `fashion` | false | false | false | false |
| `custom` | false | false | false | false |

Helper wajib:

```ts
// src/config/sectorPresets.ts
export function getSectorFeatures(sector: SectorId): SectorFeatureFlags {
  return (SECTOR_PRESETS[sector] || SECTOR_PRESETS.custom).features;
}
```

**Aturan pindah sektor:** Jika pengguna pindah dari `mebel` ke sektor lain, data penawaran, borongan, dan termin **tidak dihapus**, hanya disembunyikan. Pesanan yang sudah punya `paymentPlan` tetap menghitung termin dengan benar jika pengguna kembali ke `mebel`.

---

## 5. Fitur M1 — Kalkulator Kubikasi Kayu (Daftar Potong)

### 5.1 Tujuan

Pengrajin cukup mengetik ukuran potongan kayu dalam sentimeter. Aplikasi menghitung volume kubik (m3) dan mengisinya ke jumlah bahan kayu pada form HPP.

### 5.2 Lokasi & Pemicu UI

- Lokasi: Modal **Tambah / Edit Produk HPP**, pada baris bahan dengan `category === 'main'`.
- Tombol `Hitung Kubikasi` (`fa-solid fa-ruler-combined`) muncul hanya jika:
  1. `features.cubicCalculator === true`, dan
  2. `normalizeUnit(material.unit) === 'm3'`.
- Klik tombol membuka **panel lipat (accordion) tepat di bawah baris bahan tersebut**. Dilarang membuka modal di atas modal.
- Pada sektor mebel, bahan utama baru diisi satuan default `m3`.

### 5.3 Normalisasi Satuan

```ts
export function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/\s+/g, '');
  if (['m3', 'm³', 'kubik', 'meterkubik'].includes(u)) return 'm3';
  return u;
}
```

### 5.4 Isi Panel Daftar Potong

Tabel baris potongan. Setiap baris:

| Kolom | Tipe | Validasi |
| :--- | :--- | :--- |
| Nama komponen | teks, opsional | Maks 40 karakter. Contoh: `Kaki belakang` |
| Tebal (cm) | angka | > 0, maks 100, kelipatan 0,1 |
| Lebar (cm) | angka | > 0, maks 300 |
| Panjang (cm) | angka | > 0, maks 600 |
| Jumlah batang | bilangan bulat | ≥ 1, maks 999 |
| Volume baris | tampilan | `x,xxxx m3` (4 desimal) |

Di bawah tabel:
- Tombol `+ Tambah Potongan`.
- Baris ringkasan: `Total kubikasi: 0,0144 m3` · `Biaya kayu sebelum susut: Rp 122.400` · `Setelah susut 30%: Rp 174.857`.
- Tombol `Pakai Hasil Ini` → menyimpan daftar potong ke `material.cuttingList` dan mengisi `material.qty` dengan total volume.

### 5.5 Aturan Data

1. Jika `material.cuttingList` berisi minimal 1 baris valid, input `qty` bahan **menjadi read-only** dan menampilkan tautan `Ubah daftar potong`.
2. Tombol `Hapus daftar potong` (konfirmasi inline) mengembalikan `qty` menjadi input manual dengan nilai terakhir.
3. Persentase susut (`wastagePercent`) tetap diterapkan oleh mesin HPP yang sudah ada (`rawCost / (1 - wastage/100)`). Kalkulator kubikasi **tidak** menerapkan susut sendiri agar tidak terjadi hitung ganda.
4. Volume disimpan dengan presisi 6 desimal, ditampilkan 4 desimal.
5. Sinkronisasi harga bahan lintas produk (`normalizedKey`) tidak berubah; daftar potong hanya memengaruhi `qty`, bukan `unitPrice`.

### 5.6 Rumus

```text
Volume baris (m3) = Tebal(cm) x Lebar(cm) x Panjang(cm) x Jumlah / 1.000.000
Total kubikasi    = jumlah seluruh volume baris (dibulatkan 6 desimal)
Biaya kayu mentah = Total kubikasi x Harga per m3
Biaya setelah susut (dihitung oleh calculateProductHpp) = Biaya mentah / (1 - Susut% / 100)
```

### 5.7 Insight Kontekstual (Opsional P1, tetap ringkas)

Jika `wastagePercent < 15` untuk bahan kayu dengan daftar potong, tampilkan satu baris teks muted:
`Susut potong kayu solid umumnya 25–40%. Susut 10% berisiko membuat HPP terlalu rendah.`

---

## 6. Fitur M2 — Termin Pembayaran 3 Tahap

### 6.1 Tujuan

Mengganti pola "DP lalu lunas" menjadi tagihan bertahap yang terkait dengan tahap produksi, agar pengrajin tidak mengerjakan finishing atau mengirim barang sebelum dibayar sesuai kesepakatan.

### 6.2 Template Termin Default Mebel

| Urutan | Label | Persen dari Subtotal Produk | Jatuh Tempo Saat Tahap Pesanan Mencapai | Termasuk Ongkir |
| :---: | :--- | :---: | :--- | :---: |
| 1 | DP Awal | 50% | `Persiapan` (saat pesanan dibuat) | Tidak |
| 2 | Termin Barang Mentah | 30% | `Finishing` (konstruksi selesai, sebelum amplas & finishing) | Tidak |
| 3 | Pelunasan Sebelum Kirim | 20% | `Siap Kirim` | **Ya** |

Catatan pemetaan tahap: `OrderStage` internal tetap `Persiapan | Pengerjaan | Finishing | Siap Kirim | Selesai | Dibatalkan`. Label tampilan sektor mebel tetap memakai `SECTOR_PRESETS.mebel.orderStages` (`Persiapan Kayu`, `Konstruksi & Rakit`, `Amplas & Finishing`, `Siap Kirim`, `Selesai`).

### 6.3 Aturan Bisnis

1. **Yang disimpan di pesanan hanya template termin** (`order.paymentPlan`: label, persen, tahap pemicu). Nominal setiap termin **selalu dihitung ulang** dari subtotal produk dan ongkir terkini. Tujuannya agar mengedit item pesanan tidak membuat nominal termin basi.
2. Total persen wajib tepat 100. Form edit termin menolak simpan jika tidak 100 dan menampilkan `Total termin 90%. Harus 100%.`
3. Jumlah termin 1 sampai 4. Default 3.
4. **Pembulatan:** Jika subtotal produk ≥ Rp 100.000, setiap termin selain termin terakhir dibulatkan ke Rp 1.000 terdekat. Termin terakhir menyerap sisa agar total tepat sama dengan subtotal. Ongkir/biaya kustom (`customFee`) selalu ditambahkan utuh ke termin terakhir.
5. **Alokasi pembayaran (FIFO):** Semua uang masuk dialokasikan berurutan ke termin 1, lalu termin 2, dan seterusnya. Pengguna tidak memilih termin secara manual.
6. **Status termin** (dihitung, tidak disimpan):

   | Status | Syarat |
   | :--- | :--- |
   | `Lunas` | Alokasi pembayaran ≥ nominal termin |
   | `Kurang Bayar` | Sudah jatuh tempo, alokasi > 0 tetapi < nominal |
   | `Perlu Ditagih` | Sudah jatuh tempo, alokasi = 0 |
   | `Belum Waktunya` | Tahap pesanan belum mencapai tahap pemicu |

7. **Jatuh tempo:** termin jatuh tempo jika `stageIndex(order.stage) >= stageIndex(termin.triggerStage)` dan pesanan tidak `Dibatalkan`.
8. **Kelebihan bayar:** Form pembayaran menolak nominal yang melebihi sisa tagihan total: `Melebihi sisa tagihan (Rp 4.050.000).` Jika terjadi kelebihan karena item pesanan dikurangi setelah dibayar, tampilkan baris `Kelebihan bayar Rp X — kembalikan ke pembeli atau tambah item.`
9. **Peringatan gerbang tahap (soft gate, bukan blokir):**
   - Saat tahap diubah ke `Finishing` dan termin yang sudah jatuh tempo belum lunas → konfirmasi inline: `Termin barang mentah belum dibayar (kurang Rp 3.800.000). Lanjut ke finishing?`
   - Saat tahap diubah ke `Siap Kirim` atau `Selesai` dan ada sisa tagihan pada termin yang jatuh tempo pada tahap tujuan → konfirmasi inline: `Barang akan dikirim dengan sisa tagihan Rp 7.850.000. Lanjutkan?`
   - Pilihan `Ya, lanjutkan` tetap mengubah tahap. Pilihan `Batal` tidak mengubah apa pun.
10. **Riwayat pembayaran:** Setiap uang masuk dicatat sebagai `PaymentRecord` (tanggal, nominal, metode `Tunai | Transfer | QRIS`, catatan). Field lama `order.dpAmount` **tetap ada sebagai cache** = jumlah seluruh `payments[].amount`, diperbarui setiap kali `payments` berubah. Seluruh kalkulasi lama (`calculateOrderFinancials`, `generateFinancialReport`) tidak perlu diubah.
11. Pembayaran yang salah input dapat dihapus (konfirmasi inline). Penghapusan memicu hitung ulang `dpAmount` dan status termin.
12. Sektor tanpa `milestonePayments`: `order.paymentPlan` bernilai `undefined`, panel termin tidak tampil, perilaku pembayaran sama seperti sekarang.

### 6.4 UI pada Kartu Pesanan

Bagian baru `Termin Pembayaran` di bawah kotak ringkasan keuangan (dipisah `border-t`):

```text
TERMIN PEMBAYARAN                                   [Ubah Termin]
1. DP Awal (50%)                  Rp 8.000.000     [Lunas]
2. Termin Barang Mentah (30%)     Rp 4.800.000     [Kurang Bayar: Rp 3.800.000]
3. Pelunasan + Ongkir (20%)       Rp 4.050.000     [Belum Waktunya]
```

- Badge status memakai token: `Lunas` = `bg-primary/10 text-primary`, `Kurang Bayar` dan `Perlu Ditagih` = `bg-danger-subtle text-danger-text`, `Belum Waktunya` = `bg-neutral-1 text-muted`.
- Tombol `+ Catat Bayar` yang sudah ada: nominal default diisi otomatis dengan sisa termin jatuh tempo pertama yang belum lunas. Jika tidak ada termin jatuh tempo, default = sisa termin berikutnya.
- Tombol WhatsApp menambah template `Tagih Termin` (lihat Bagian 13).
- Daftar riwayat pembayaran dapat dibuka/tutup (`Lihat riwayat bayar (3)`).

### 6.5 Form Ubah Termin

- Muncul sebagai bagian di dalam Modal Edit Pesanan (bukan modal baru).
- Preset cepat: `50-30-20` (default), `40-30-30`, `50-50` (2 termin: DP & pelunasan sebelum kirim), `100% di muka`.
- Setiap baris: label (teks), persen (angka), tahap pemicu (select dari `Persiapan`, `Pengerjaan`, `Finishing`, `Siap Kirim`). Tahap pemicu harus berurutan tidak menurun; jika tidak, tolak simpan: `Urutan tahap termin tidak boleh mundur.`

---

## 7. Fitur M3 — Surat Penawaran Harga (Quotation)

### 7.1 Tujuan

Mencatat penawaran harga resmi kepada calon pembeli sebelum menjadi pesanan, dengan harga yang sudah dicek terhadap HPP, masa berlaku yang jelas, dan konversi 1 klik menjadi pesanan aktif.

### 7.2 Keputusan Arsitektur (Wajib Diikuti)

Penawaran adalah **entitas terpisah** (`Quotation`), **bukan** tahap baru di `OrderStage`. Alasan: jika penawaran dijadikan tahap pesanan, setiap perhitungan omzet, piutang, eksposur COPQ, peringatan closed-loop, target pelatihan, dan Portal Dosen harus difilter ulang. Entitas terpisah menjamin penawaran tidak pernah masuk laporan keuangan.

### 7.3 Lokasi UI

Tab `Pesanan` mendapat kontrol segmen di bawah judul (hanya jika `features.quotations` atau `features.laborContracts` aktif):

```text
[ Penawaran (2) ]  [ Pesanan (3) ]  [ Upah Tukang ]
```

Default terbuka: `Pesanan`. Segmen `Upah Tukang` milik fitur M4.

### 7.4 Isi Penawaran

| Field | Aturan |
| :--- | :--- |
| Nomor | Otomatis `QUO-YYYYMM-NNN`, urut per bulan |
| Nama & WA calon pembeli | Wajib nama; WA dinormalisasi ke format `62...` seperti pesanan |
| Item | Minimal 1. **Setiap item wajib merujuk produk di katalog HPP** (lihat 7.5) |
| Spesifikasi per item | Jenis kayu (teks), dimensi P x L x T (cm), warna/jenis finishing (teks), catatan |
| Jumlah & harga satuan | Harga default = harga jual katalog; boleh diubah |
| Biaya kustom/ongkir | Sama seperti pesanan |
| Estimasi pengerjaan | Minggu, bilangan bulat 1–52, default 4 |
| Berlaku sampai | Default hari ini + 14 hari |
| Template termin | Default `SECTOR_PRESETS.mebel.defaultPaymentPlan`, bisa diubah |

### 7.5 Aturan Item Kustom

Mebel sering dipesan dengan desain kustom. Aturannya: **tidak boleh ada item penawaran tanpa HPP**. Form penawaran menyediakan tombol `+ Buat Produk Kustom di Katalog` yang menyimpan draf penawaran, membuka Modal HPP, lalu kembali ke form penawaran dengan produk baru terpilih. Ini menjaga prinsip pelatihan: hitung HPP dulu, baru tentukan harga.

### 7.6 Pengecekan Harga Saat Menyusun Penawaran

- Setiap item menampilkan margin terhadap `safeHpp` produk saat ini dan badge dari `analyzeCurrentMarginInsight` (kelas Biasa / Sedang / High Class / Zona Bahaya).
- Jika harga satuan < `safeHpp`, tampilkan baris merah: `Harga di bawah HPP Riil Aman (Rp 738.300). Setiap unit rugi Rp 38.300.` Penawaran tetap boleh disimpan.
- Saat item disimpan, sistem mengunci `safeHppAtQuote` dan `baseHppAtQuote` per item sebagai pembanding saat konversi.

### 7.7 Status Penawaran (Dihitung dari Field, Tidak Disimpan sebagai String)

```text
Disetujui   jika convertedOrderId terisi
Ditolak     jika rejectedAt terisi
Kedaluwarsa jika hari ini > validUntil (dan belum disetujui/ditolak)
Terkirim    jika sentAt terisi
Draft       selain itu
```

`sentAt` terisi otomatis saat pengguna menekan `Kirim via WhatsApp`.

### 7.8 Aksi per Penawaran

| Aksi | Tersedia pada Status | Efek |
| :--- | :--- | :--- |
| `Kirim via WhatsApp` | Draft, Terkirim | Buka `wa.me` dengan template penawaran; set `sentAt` |
| `Edit` | Draft, Terkirim | Ubah isi; `safeHppAtQuote` dikunci ulang untuk item yang harganya berubah |
| `Jadikan Pesanan` | Draft, Terkirim | Konversi (7.9) |
| `Tandai Ditolak` | Draft, Terkirim | Isi alasan singkat opsional; set `rejectedAt` |
| `Perbarui Penawaran` | Kedaluwarsa, Ditolak | Duplikat dengan nomor baru, status Draft, `validUntil` = hari ini + 14, harga sama, `safeHppAtQuote` diambil ulang dari katalog |
| `Hapus` | Semua kecuali Disetujui | Konfirmasi inline |

### 7.9 Konversi Penawaran → Pesanan

1. Validasi: status harus `Draft` atau `Terkirim`; seluruh `productId` masih ada di katalog. Jika ada produk terhapus: `Produk "Meja Resin Trembesi" sudah dihapus dari katalog. Tambahkan lagi atau hapus item ini dari penawaran.`
2. Item pesanan:
   - `unitPriceSnapshot` = harga di penawaran (harga yang sudah disepakati pembeli).
   - `baseHppSnapshot` = `product.baseHpp` **saat konversi** (biaya produksi riil terjadi sekarang, bukan saat penawaran).
   - `laborCostSnapshot` = upah per unit produk saat konversi (lihat 10.2).
   - `specNote` = gabungan spesifikasi item penawaran.
3. **Peringatan penurunan margin:** Jika margin saat konversi turun ≥ 3 poin persen dibanding margin saat penawaran, tampilkan di layar konfirmasi konversi:
   `HPP Kursi Makan naik sejak penawaran. Margin turun dari 28,0% ke 23,9%. Harga yang disepakati tetap Rp 1.025.500.`
4. `dueDate` = hari ini + `leadTimeWeeks x 7` hari (dapat diubah di layar konfirmasi).
5. `paymentPlan` = template termin dari penawaran.
6. Layar konfirmasi konversi berisi input opsional `DP diterima sekarang (Rp)`. Jika diisi > 0, langsung dibuat `PaymentRecord` pertama.
7. Penawaran mendapat `convertedOrderId`; pesanan mendapat `sourceQuotationId`. Pesanan baru tampil di segmen `Pesanan` dan aplikasi berpindah ke segmen tersebut.

### 7.10 Hubungan dengan Fitur Lain

- Penawaran **tidak** dihitung pada target Mode Pelatihan, Rapor, eksposur COPQ, atau Portal Dosen.
- Rapor (P2, opsional): `Tingkat jadi penawaran = Disetujui / (Disetujui + Ditolak + Kedaluwarsa)` pada periode terpilih.

---

## 8. Fitur M4 — Upah Borongan & Kasbon Tukang

### 8.1 Tujuan

Mencatat nilai borongan tiap tukang per pesanan, kasbon yang sudah diambil, dan sisa upah yang baru boleh dilunasi setelah pekerjaan lolos QC, serta mengetahui apakah upah riil sebuah pesanan melebihi upah standar yang dipakai di HPP.

### 8.2 Prinsip Akuntansi (Wajib Dipahami Sebelum Coding)

1. **Upah tukang sudah termasuk di HPP** melalui `product.laborCost`. Maka nilai borongan **tidak boleh ditambahkan lagi** sebagai biaya baru di laba rugi. Itu hitung ganda.
2. Yang dicatat di laba rugi hanya **selisih** antara upah borongan riil dan upah standar di HPP (`Selisih Upah`). Positif = upah riil lebih mahal (laba berkurang). Negatif = lebih hemat (laba bertambah).
3. **Selisih hanya dihitung jika pemilik menyatakan seluruh upah pesanan tersebut sudah dicatat** (`order.laborFullyTracked === true`). Tanpa flag ini, pesanan yang hanya mencatat tukang ukir (sementara tukang rakit digaji bulanan) akan terlihat "hemat" secara palsu.
4. **Kasbon adalah uang muka upah**, bukan biaya tambahan. Kasbon mengurangi kas dan mengurangi sisa utang upah.

### 8.3 Data Tukang (Master)

- Daftar tukang: nama (wajib), WA (opsional), keahlian (`Rakit/Konstruksi | Ukir | Amplas/Finishing | Lainnya`), status aktif.
- Dikelola dari segmen `Upah Tukang` → tombol `Kelola Daftar Tukang`.
- Tukang tidak bisa dihapus jika masih punya borongan yang belum `Lunas`. Bisa dinonaktifkan.

### 8.4 Borongan per Pesanan

Dibuat dari kartu pesanan (bagian baru `Upah Borongan`, dipisah `border-t`) atau dari segmen `Upah Tukang`.

| Field | Aturan |
| :--- | :--- |
| Pesanan | Wajib, pesanan non-`Dibatalkan` |
| Tukang | Wajib, dari daftar tukang aktif |
| Lingkup kerja | Teks wajib, maks 60 karakter. Contoh: `Rakit 6 kursi makan` |
| Nilai borongan (Rp) | Wajib > 0 |
| Potongan (Rp) | Opsional, default 0. Untuk potongan karena kesalahan kerja. Wajib catatan jika > 0 |

### 8.5 Status Borongan (Dihitung)

| Status | Syarat |
| :--- | :--- |
| `Dibatalkan` | `cancelledAt` terisi |
| `Lunas` | `qcPassedAt` terisi dan sisa upah = 0 |
| `Siap Dilunasi` | `qcPassedAt` terisi dan sisa upah > 0 |
| `Berjalan` | `qcPassedAt` kosong |

### 8.6 Aturan Kasbon & Pelunasan

1. **Kasbon** boleh dicatat kapan saja selama status `Berjalan` atau `Siap Dilunasi`.
2. **Kasbon melebihi sisa upah diperbolehkan dengan peringatan & konfirmasi:** Jika kasbon yang diinput melebihi sisa upah (`nilai borongan - potongan`), sistem menampilkan peringatan: `Kasbon (Rp X) melebihi sisa upah borongan (sisa Rp Y). Ini akan menyebabkan status kasbon lebih bayar / utang tukang. Lanjutkan?` Pengguna dapat memilih `Ya, Lanjutkan` atau `Batal`.
3. **Peringatan kasbon tinggi:** Jika total kasbon > 70% nilai borongan dan belum lolos QC, tampilkan badge `Kasbon 75% — pekerjaan belum lolos QC` di baris borongan.
4. **Tombol `Tandai Lolos QC`** mengisi `qcPassedAt`. Tersedia kapan saja; pemilik yang memutuskan. Jika pesanan memiliki `DefectLog` terbuka dengan faktor `Tenaga Kerja` setelah borongan dibuat, tampilkan satu baris pengingat di atas tombol: `Ada 1 catatan cacat faktor Tenaga Kerja pada pesanan ini.`
5. **Pelunasan** hanya bisa setelah `qcPassedAt` terisi. Sebelum itu tombol `Lunasi` nonaktif dengan teks `Tandai lolos QC dulu`. Nominal pelunasan default = sisa upah dan tidak boleh melebihinya.
6. **Pembatalan:** Jika belum ada pembayaran (kasbon/pelunasan), borongan bisa dibatalkan (konfirmasi inline). Jika sudah ada pembayaran, tombol `Batalkan` diganti `Tutup Borongan Sebagian`: nilai borongan diubah menjadi total yang sudah dibayar, `qcPassedAt` diisi, catatan wajib → status menjadi `Lunas`. Ini mencegah kasbon hilang dari catatan.
7. Pesanan yang dibatalkan **tidak** membatalkan borongan secara otomatis. Kartu pesanan batal menampilkan `2 borongan masih aktif. Selesaikan atau tutup sebagian.`

### 8.7 Flag "Seluruh Upah Dicatat"

- Pada bagian `Upah Borongan` di kartu pesanan, ada toggle: `Semua upah pesanan ini dicatat di sini` (default mati).
- Jika aktif, tampilkan perbandingan:

```text
Upah standar di HPP (6 x Rp 160.000)   Rp   960.000
Upah borongan riil                      Rp 1.050.000
Selisih upah                            +Rp   90.000  (laba pesanan berkurang)
```

- Jika mati, tampilkan satu baris muted: `Selisih upah tidak dihitung karena belum semua upah dicatat.`

### 8.8 Segmen "Upah Tukang" (Rekap)

- Ringkasan atas (3 angka dalam 1 baris grid, bukan kartu bersarang): `Sisa Utang Upah`, `Kasbon Belum Lolos QC`, `Dibayar Bulan Ini`.
- Daftar dikelompokkan per tukang: nama, jumlah borongan aktif, total sisa upah. Klik tukang → daftar borongannya beserta tombol `+ Kasbon`, `Tandai Lolos QC`, `Lunasi`.
- Tombol WA per tukang (opsional, jika ada nomor): template rekap upah (Bagian 13).

---

## 9. Dampak ke Rapor Usaha (Laba Rugi & Arus Kas)

Hanya tampil jika `features.laborContracts === true`. Fitur M1–M3 tidak mengubah struktur Rapor (M2 hanya mengubah sumber `dpAmount`, nilainya tetap sama).

### 9.1 Tabel Rekonsiliasi Laba Rugi (Tambahan Baris)

```text
1. Total Nilai Penjualan Produk
2. Dikurangi: Total Modal HPP Dasar Produksi
= Estimasi Laba Kotor
3. Dikurangi: Total Kebocoran Biaya Cacat (COPQ Aktual)
4. Dikurangi/Ditambah: Selisih Upah Borongan vs Standar HPP   <-- BARU
= Laba Bersih Riil Usaha
```

- `Selisih Upah` = jumlah `calculateOrderLaborVariance(order).variance` untuk pesanan dalam set laporan yang `laborFullyTracked === true` dan tidak `Dibatalkan`.
- Tampilan: jika positif `-Rp 90.000` (merah, laba berkurang); jika negatif `+Rp 40.000` (primary).
- Di bawah baris tampilkan teks muted: `Dihitung dari 2 pesanan yang seluruh upahnya dicatat.`

### 9.2 Kartu Kewajiban Upah (Baru, 1 kartu datar)

| Angka | Rumus |
| :--- | :--- |
| Sisa Utang Upah Tukang | Jumlah sisa upah seluruh borongan berstatus `Berjalan` atau `Siap Dilunasi` (tidak difilter periode) |
| Kasbon Belum Lolos QC | Jumlah kasbon pada borongan berstatus `Berjalan` (tidak difilter periode) |
| Kas Keluar Upah (Periode) | Jumlah `LaborPayment.amount` dengan tanggal dalam periode terpilih |

### 9.3 Perubahan pada `generateFinancialReport`

Jangan ubah tanda tangan fungsi lama. Buat fungsi pembungkus:

```ts
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
```

`ReportModule` memanggil fungsi ini jika `features.laborContracts`, selain itu tetap memanggil `generateFinancialReport`.

---

## 10. Skema Data TypeScript (Tambahan & Perubahan)

### 10.1 File Baru `src/types/furniture.ts`

```ts
import { OrderStage } from './titan';

// ===== M1: KUBIKASI =====
export interface WoodCutPiece {
  id: string;
  label?: string;        // "Kaki belakang"
  thicknessCm: number;   // Tebal
  widthCm: number;       // Lebar
  lengthCm: number;      // Panjang
  qty: number;           // Jumlah batang
}

// ===== M2: TERMIN =====
export type PaymentMethod = 'Tunai' | 'Transfer' | 'QRIS';

export interface PaymentRecord {
  id: string;
  date: string;          // ISO date (YYYY-MM-DD)
  amount: number;        // > 0
  method: PaymentMethod;
  note?: string;
}

export interface PaymentPlanTemplate {
  label: string;         // "DP Awal"
  percent: number;       // 1..100, total seluruh termin = 100
  triggerStage: Exclude<OrderStage, 'Selesai' | 'Dibatalkan'>;
}

export type MilestoneStatus = 'Lunas' | 'Kurang Bayar' | 'Perlu Ditagih' | 'Belum Waktunya';

export interface MilestoneView extends PaymentPlanTemplate {
  index: number;
  amount: number;           // nominal termin (termin terakhir sudah + customFee)
  includesCustomFee: boolean;
  paidAmount: number;       // hasil alokasi FIFO
  outstanding: number;      // amount - paidAmount
  isDue: boolean;
  status: MilestoneStatus;
}

// ===== M3: PENAWARAN =====
export interface QuotationItemSpec {
  woodType?: string;        // "Jati Perhutani Grade A"
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  finishing?: string;       // "Melamin doff natural"
  notes?: string;
}

export interface QuotationItem {
  id: string;
  productId: string;        // WAJIB merujuk katalog
  productNameSnapshot: string;
  qty: number;
  unitPrice: number;
  baseHppAtQuote: number;   // dikunci saat item disimpan
  safeHppAtQuote: number;   // dikunci saat item disimpan
  spec: QuotationItemSpec;
}

export type QuotationStatus = 'Draft' | 'Terkirim' | 'Disetujui' | 'Ditolak' | 'Kedaluwarsa';

export interface Quotation {
  id: string;
  quoteNumber: string;      // "QUO-202611-001"
  customerName: string;
  customerPhone: string;    // "62812..."
  items: QuotationItem[];
  customFee: number;
  customFeeNote?: string;
  leadTimeWeeks: number;    // 1..52
  validUntil: string;       // YYYY-MM-DD
  paymentPlan: PaymentPlanTemplate[];
  notes?: string;
  createdAt: string;
  sentAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
  convertedOrderId?: string;
}

// ===== M4: BORONGAN & KASBON =====
export type CraftsmanSpecialty = 'Rakit/Konstruksi' | 'Ukir' | 'Amplas/Finishing' | 'Lainnya';

export interface Craftsman {
  id: string;
  name: string;
  phone?: string;
  specialty: CraftsmanSpecialty;
  isActive: boolean;
  createdAt: string;
}

export interface LaborContract {
  id: string;
  orderId: string;
  orderNumberSnapshot: string;
  craftsmanId: string;
  craftsmanNameSnapshot: string;
  scope: string;            // "Rakit 6 kursi makan"
  agreedAmount: number;     // nilai borongan
  deductionAmount: number;  // potongan, default 0
  deductionNote?: string;
  createdAt: string;
  qcPassedAt?: string;
  cancelledAt?: string;
  closeNote?: string;       // wajib saat "Tutup Borongan Sebagian"
}

export type LaborPaymentType = 'kasbon' | 'pelunasan';

export interface LaborPayment {
  id: string;
  contractId: string;
  date: string;             // YYYY-MM-DD
  amount: number;           // > 0
  type: LaborPaymentType;
  note?: string;
}

export type LaborContractStatus = 'Berjalan' | 'Siap Dilunasi' | 'Lunas' | 'Dibatalkan';
```

### 10.2 Perubahan pada `src/types/titan.ts` (Semua Field Baru Opsional)

```ts
export interface MaterialItem {
  // ...field lama tetap
  cuttingList?: WoodCutPiece[];          // M1
}

export interface OrderItem {
  // ...field lama tetap
  laborCostSnapshot?: number;            // M4: upah standar per unit saat order dibuat
  specNote?: string;                     // M3: spesifikasi dari penawaran
}

export interface Order {
  // ...field lama tetap
  // dpAmount TETAP ADA sebagai cache = sum(payments.amount)
  payments?: PaymentRecord[];            // M2
  paymentPlan?: PaymentPlanTemplate[];   // M2 (undefined = tanpa termin)
  sourceQuotationId?: string;            // M3
  laborFullyTracked?: boolean;           // M4, default false
}
```

**Aturan `laborCostSnapshot`:** dihitung saat item dibuat atau produk item diganti.

```ts
export function getLaborCostPerUnit(product: Product): number {
  const divisor = product.calcMode === 'unit_based' ? 1 : Math.max(1, product.outputQty);
  return Math.round(product.laborCost / divisor);
}
```

---

## 11. Mesin Kalkulasi (`src/utils/furnitureCalculations.ts`)

Seluruh fungsi murni (tanpa efek samping), dapat diuji terpisah.

```ts
import { Order, OrderStage, Product, DefectLog } from '../types/titan';
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

// ---------- Utilitas Tahap ----------
export const STAGE_SEQUENCE: OrderStage[] = ['Persiapan', 'Pengerjaan', 'Finishing', 'Siap Kirim', 'Selesai'];

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

// ---------- M1: Kubikasi ----------
export function calculatePieceVolumeM3(p: WoodCutPiece): number {
  if (p.thicknessCm <= 0 || p.widthCm <= 0 || p.lengthCm <= 0 || p.qty <= 0) return 0;
  return (p.thicknessCm * p.widthCm * p.lengthCm * p.qty) / 1_000_000;
}

export function calculateCuttingListVolume(pieces: WoodCutPiece[]): number {
  const total = pieces.reduce((s, p) => s + calculatePieceVolumeM3(p), 0);
  return Math.round(total * 1_000_000) / 1_000_000; // presisi 6 desimal
}

export function formatVolumeM3(volume: number): string {
  return `${volume.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} m3`;
}

// ---------- M2: Termin ----------
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
    return { amount: Math.max(0, base) + (isLast ? Math.max(0, customFee) : 0), includesCustomFee: isLast };
  });
}

export function evaluateMilestones(order: Order): MilestoneView[] {
  if (!order.paymentPlan || order.paymentPlan.length === 0) return [];
  const amounts = buildMilestoneAmounts(getProductSubtotal(order), order.customFee, order.paymentPlan);
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
    return { ...t, index: i, amount, includesCustomFee: amounts[i].includesCustomFee, paidAmount, outstanding, isDue, status };
  });
}

export function getOverpaidAmount(order: Order): number {
  const total = getProductSubtotal(order) + (order.customFee || 0);
  return Math.max(0, getTotalPaid(order) - total);
}

/** Nominal default untuk tombol "+ Catat Bayar". */
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

// ---------- M3: Penawaran ----------
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
      errors.push(`Produk "${it.productNameSnapshot}" sudah dihapus dari katalog. Tambahkan lagi atau hapus item ini dari penawaran.`);
      return;
    }
    if (it.unitPrice <= 0) return;
    const marginAtQuote = Number((((it.unitPrice - it.safeHppAtQuote) / it.unitPrice) * 100).toFixed(1));
    const marginNow = Number((((it.unitPrice - p.safeHpp) / it.unitPrice) * 100).toFixed(1));
    const dropPoints = Number((marginAtQuote - marginNow).toFixed(1));
    if (dropPoints >= 3) shifts.push({ productName: p.name, marginAtQuote, marginNow, dropPoints });
  });

  return { canConvert: errors.length === 0, errors, shifts };
}

// ---------- M4: Borongan & Kasbon ----------
export function summarizeLaborContract(c: LaborContract, payments: LaborPayment[]) {
  const own = payments.filter((p) => p.contractId === c.id);
  const kasbon = own.filter((p) => p.type === 'kasbon').reduce((s, p) => s + p.amount, 0);
  const settlement = own.filter((p) => p.type === 'pelunasan').reduce((s, p) => s + p.amount, 0);
  const paid = kasbon + settlement;
  const payable = Math.max(0, c.agreedAmount - (c.deductionAmount || 0)); // nilai akhir upah
  const remaining = Math.max(0, payable - paid);

  let status: LaborContractStatus;
  if (c.cancelledAt) status = 'Dibatalkan';
  else if (c.qcPassedAt) status = remaining === 0 ? 'Lunas' : 'Siap Dilunasi';
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

export function calculateOrderLaborVariance(order: Order, contracts: LaborContract[], payments: LaborPayment[]) {
  const standardLabor = order.items.reduce((s, it) => s + it.qty * (it.laborCostSnapshot ?? 0), 0);
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
    if (s.status === 'Berjalan' || s.status === 'Siap Dilunasi') outstandingWages += s.remaining;
    if (s.status === 'Berjalan') kasbonBeforeQc += s.kasbon;
  });
  const cashOutInPeriod = payments
    .filter((p) => (!period.start || p.date >= period.start) && (!period.end || p.date <= period.end))
    .reduce((s, p) => s + p.amount, 0);
  return { outstandingWages, kasbonBeforeQc, cashOutInPeriod };
}

export function hasOpenLaborDefect(orderId: string, defects: DefectLog[], sinceISO: string): number {
  return defects.filter((d) => d.orderId === orderId && d.fishboneFactor === 'Tenaga Kerja' && d.date >= sinceISO.slice(0, 10)).length;
}
```

---

## 12. Perubahan State, Penyimpanan & Migrasi Data

### 12.1 State Baru di `UmkmContext`

```ts
quotations: Quotation[];
craftsmen: Craftsman[];
laborContracts: LaborContract[];
laborPayments: LaborPayment[];
```

Aksi baru (semua memperbarui `localStorage` dan `broadcastStateUpdate` seperti aksi lama):

| Grup | Aksi |
| :--- | :--- |
| Termin | `addOrderPayment(orderId, payment)`, `deleteOrderPayment(orderId, paymentId)`, `updateOrderPaymentPlan(orderId, plan)` |
| Penawaran | `addQuotation`, `updateQuotation`, `deleteQuotation`, `markQuotationSent(id)`, `rejectQuotation(id, reason?)`, `renewQuotation(id)`, `convertQuotationToOrder(id, { dueDate, initialDp? })` |
| Tukang | `addCraftsman`, `updateCraftsman`, `deleteCraftsman` (ditolak jika ada borongan belum Lunas) |
| Borongan | `addLaborContract`, `updateLaborContract`, `markContractQcPassed(id)`, `cancelLaborContract(id)`, `closeContractPartially(id, note)` |
| Pembayaran Upah | `addLaborPayment`, `deleteLaborPayment` |
| Pesanan | `setOrderLaborFullyTracked(orderId, value)` |

**Aturan invarian `dpAmount`:** Setiap aksi yang mengubah `order.payments` wajib menulis ulang `dpAmount = sum(payments.amount)` dan `paymentStatus` via `calculateOrderFinancials`. Aksi lama `updateOrderPayment(id, dpAmount)` dihapus dari UI dan digantikan `addOrderPayment`.

**Aturan `addOrder` / `updateOrder`:** Saat item dibuat atau produk item diganti, isi `laborCostSnapshot = getLaborCostPerUnit(product)`. Saat pesanan baru dibuat pada sektor dengan `milestonePayments`, isi `paymentPlan` dengan `defaultPaymentPlan` sektor jika belum diisi form.

**Aturan `deleteOrder`:** Ditolak jika pesanan memiliki `LaborContract` yang belum `Lunas`/`Dibatalkan` → pesan `Selesaikan 2 borongan tukang pada pesanan ini dulu.`

### 12.2 Kunci Penyimpanan & Migrasi

- Kunci baru: `titan_umkm_workspace_state_v3`.
- Saat muat: jika `v3` ada → pakai. Jika tidak, baca `titan_umkm_workspace_state_v2` → jalankan migrasi → simpan sebagai `v3`. Jangan hapus `v2` (cadangan).

```ts
function migrateV2ToV3(old: any) {
  const products: Product[] = old.products || [];
  const isFurniture = getSectorFeatures(old.profile?.sector || 'custom').milestonePayments;

  return {
    ...old,
    orders: (old.orders || []).map((o: Order) => ({
      ...o,
      payments:
        o.payments ??
        (o.dpAmount > 0
          ? [{ id: `pay_mig_${o.id}`, date: o.createdAt.slice(0, 10), amount: o.dpAmount, method: 'Transfer', note: 'Saldo pembayaran sebelum fitur termin' }]
          : []),
      paymentPlan: o.paymentPlan ?? (isFurniture ? SECTOR_PRESETS.mebel.defaultPaymentPlan : undefined),
      laborFullyTracked: o.laborFullyTracked ?? false,
      items: o.items.map((it) => {
        if (it.laborCostSnapshot !== undefined) return it;
        const p = products.find((x) => x.id === it.productId);
        return { ...it, laborCostSnapshot: p ? getLaborCostPerUnit(p) : 0 };
      }),
    })),
    quotations: old.quotations ?? [],
    craftsmen: old.craftsmen ?? [],
    laborContracts: old.laborContracts ?? [],
    laborPayments: old.laborPayments ?? [],
  };
}
```

Catatan: `laborCostSnapshot` hasil migrasi adalah perkiraan dari upah produk saat ini. Ini dapat diterima karena `laborFullyTracked` default `false`, sehingga selisih upah pesanan lama tidak memengaruhi laba sampai pemilik mengaktifkannya.

### 12.3 Dual-Sync

`statePayload` dan handler `subscribeToDualSync` wajib menyertakan 4 slice baru. Portal Dosen tidak perlu membaca slice baru pada fase ini.

### 12.4 Reset & Ganti Persona

`resetToInitialSeed` dan `switchPersona` wajib mengisi 4 slice baru dari seed persona (Bagian 14). Persona `fnb`, `custom`, `empty` mengisi array kosong.

---

## 13. Template Pesan WhatsApp

Semua template memakai `encodeURIComponent` dan `wa.me/<nomor>` seperti template yang sudah ada.

### 13.1 Penawaran Harga

```text
*SURAT PENAWARAN HARGA*
*{namaUsaha}*
No: {quoteNumber}

Yth. Bpk/Ibu {customerName},
Berikut penawaran harga pesanan mebel:

1. {produk} ({qty} unit) - {subtotal}
   Kayu: {woodType}
   Ukuran: {P} x {L} x {T} cm
   Finishing: {finishing}

Biaya tambahan ({customFeeNote}): {customFee}
*Total Penawaran: {grandTotal}*

Estimasi pengerjaan: {leadTimeWeeks} minggu setelah DP
Skema pembayaran:
- {label1} ({p1}%): {nominal1}
- {label2} ({p2}%): {nominal2}
- {label3} ({p3}%): {nominal3}

Penawaran berlaku sampai {validUntil}. Harga dapat berubah setelah tanggal tersebut karena mengikuti harga kayu.
```

### 13.2 Tagih Termin

```text
*TAGIHAN {labelTermin}*
*{namaUsaha}*
No. Pesanan: {orderNumber}

Yth. Bpk/Ibu {customerName},
Pesanan Anda sudah mencapai tahap *{labelTahapSektor}*.

Tagihan {labelTermin} ({percent}%): {nominal}
Sudah dibayar untuk termin ini: {paidAmount}
*Mohon ditransfer: {outstanding}*

Total pesanan: {grandTotal}
Total sudah dibayar: {totalPaid}
Sisa seluruh tagihan: {remainingTotal}

Terima kasih.
```

Pada termin 2 sektor mebel, tambahkan kalimat: `Foto barang mentah (sebelum finishing) kami lampirkan setelah pesan ini.` Aplikasi tidak mengunggah foto; kalimat ini hanya pengingat bagi pemilik untuk mengirim foto manual.

### 13.3 Rekap Upah Tukang

```text
*REKAP UPAH BORONGAN*
{namaUsaha} - {namaTukang}

{orderNumber} - {scope}
Borongan: {agreedAmount} | Potongan: {deduction}
Kasbon: {kasbon} | Dilunasi: {settlement}
Sisa: {remaining} ({status})

Total sisa upah: {totalRemaining}
```

---

## 14. Data Contoh (Seed) untuk Mock

Tambahkan pada `src/config/mockSeedData.ts` untuk persona `mebel`:

1. **M1:** Produk `Kursi Makan Minimalis Jati` diberi `cuttingList` pada bahan kayu utama:

   | Komponen | T | L | P | Jml | Volume (m3) |
   | :--- | ---: | ---: | ---: | ---: | ---: |
   | Kaki belakang | 4 | 6 | 95 | 2 | 0,004560 |
   | Kaki depan | 4 | 6 | 45 | 2 | 0,002160 |
   | Rangka dudukan | 2,5 | 7 | 40 | 4 | 0,002800 |
   | Papan dudukan | 2 | 40 | 42 | 1 | 0,003360 |
   | Bilah sandaran | 2 | 10 | 38 | 2 | 0,001520 |
   | **Total** | | | | | **0,014400** |

   `qty` bahan kayu = `0.0144`, `unitPrice` = 8.500.000, `wastagePercent` = 30. Hitung ulang `baseHpp`, `safeHpp`, dan seluruh nilai turunan produk lewat `calculateProductHpp`. Sesuaikan `sellingPrice` agar margin produk tetap berada di kelas `Produk Biasa` (sekitar 18%) supaya insight tetap bervariasi.

   > **Penting:** Perubahan seed ini mengubah angka Rapor yang sebelumnya diverifikasi (`Laba Bersih Riil Rp 2.123.333`). AI Agent wajib menghitung ulang dan memperbarui angka acuan pada kasus uji Rapor, bukan memaksakan angka lama.

2. **M2:** Semua pesanan seed mebel diberi `paymentPlan` default dan `payments[]` yang konsisten dengan `dpAmount` lama. Satu pesanan berada di tahap `Finishing` dengan termin 2 berstatus `Kurang Bayar`.
3. **M3:** 2 penawaran: 1 `Terkirim` (berlaku 10 hari lagi), 1 `Kedaluwarsa` (`validUntil` 5 hari lalu).
4. **M4:** 3 tukang (`Pak Darto — Rakit/Konstruksi`, `Mas Joko — Ukir`, `Pak Slamet — Amplas/Finishing`). Pada pesanan berstatus `Pengerjaan`: borongan rakit 600.000 dengan kasbon 450.000 (memicu peringatan kasbon 75%), borongan finishing 450.000 tanpa kasbon. Pesanan tersebut `laborFullyTracked = true`.

---

## 15. Rencana File & Komponen

| File | Status | Isi |
| :--- | :--- | :--- |
| `src/types/furniture.ts` | Baru | Seluruh tipe Bagian 10.1 |
| `src/types/titan.ts` | Ubah | Field opsional Bagian 10.2 |
| `src/config/sectorPresets.ts` | Ubah | `features`, `defaultPaymentPlan`, `getSectorFeatures` |
| `src/utils/furnitureCalculations.ts` | Baru | Seluruh fungsi Bagian 11 |
| `src/utils/calculations.ts` | Ubah | Tambah `getLaborCostPerUnit`, `generateFurnitureFinancialReport` |
| `src/context/UmkmContext.tsx` | Ubah | State, aksi, migrasi `v3`, Dual-Sync |
| `src/config/mockSeedData.ts` | Ubah | Seed Bagian 14 |
| `src/components/furniture/CuttingListPanel.tsx` | Baru | Panel lipat kubikasi (M1) |
| `src/components/furniture/PaymentMilestoneSection.tsx` | Baru | Bagian termin di kartu pesanan (M2) |
| `src/components/furniture/PaymentPlanEditor.tsx` | Baru | Editor termin di Modal Edit Pesanan (M2) |
| `src/components/furniture/StageGateConfirm.tsx` | Baru | Konfirmasi inline soft-gate tahap (M2) |
| `src/components/furniture/QuotationList.tsx` | Baru | Segmen Penawaran (M3) |
| `src/components/furniture/QuotationFormModal.tsx` | Baru | Form penawaran (M3) |
| `src/components/furniture/QuotationConvertModal.tsx` | Baru | Konfirmasi konversi + peringatan margin (M3) |
| `src/components/furniture/LaborContractSection.tsx` | Baru | Bagian borongan di kartu pesanan (M4) |
| `src/components/furniture/LaborRecapView.tsx` | Baru | Segmen Upah Tukang (M4) |
| `src/components/furniture/CraftsmanManager.tsx` | Baru | Kelola daftar tukang (M4) |
| `src/components/modules/HppModule.tsx` | Ubah | Sisipkan `CuttingListPanel` |
| `src/components/modules/OrderModule.tsx` | Ubah | Kontrol segmen, sisipkan section termin & borongan, soft-gate tahap, modal bayar memakai `addOrderPayment` |
| `src/components/modules/ReportModule.tsx` | Ubah | Baris selisih upah & kartu kewajiban upah |
| `PRD_Web_App_UMKM_Jepara.md` | Ubah | Tambah rujukan ke dokumen ini pada Bagian 4 |

---

## 16. Kriteria Penerimaan & Kasus Uji Angka

Semua angka di bawah wajib cocok persis. Format Rupiah memakai `formatRupiah` yang sudah ada.

### 16.1 M1 — Kubikasi

| ID | Masukan | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| TC-K1 | Daftar potong 5 baris pada Bagian 14 | Total `0,0144 m3` |
| TC-K2 | TC-K1, harga Rp 8.500.000/m3, susut 30% | Biaya mentah Rp 122.400; biaya bahan di HPP Rp 174.857 (dibulatkan tampilan) |
| TC-K3 | Baris dengan tebal 0 | Volume baris `0,0000 m3`, baris ditandai merah, tidak ikut total |
| TC-K4 | Satuan bahan `lembar` | Tombol `Hitung Kubikasi` tidak tampil |
| TC-K5 | Satuan `M³` atau `kubik` | Tombol tampil (normalisasi `m3`) |
| TC-K6 | Profil sektor `fnb` | Tombol tidak tampil di bahan mana pun |
| TC-K7 | Daftar potong disimpan, lalu dihapus | `qty` kembali bisa diketik, nilai terakhir `0.0144` tetap |

### 16.2 M2 — Termin

| ID | Masukan | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| TC-T1 | Subtotal Rp 16.000.000, ongkir Rp 850.000, plan 50/30/20 | Termin: Rp 8.000.000 / Rp 4.800.000 / Rp 4.050.000 |
| TC-T2 | Subtotal Rp 1.234.500, ongkir 0, plan 50/30/20 | Rp 617.000 / Rp 370.000 / Rp 247.500 (total tepat Rp 1.234.500) |
| TC-T3 | TC-T1, dibayar total Rp 9.000.000, tahap `Finishing` | T1 `Lunas`; T2 dibayar Rp 1.000.000, `Kurang Bayar` sisa Rp 3.800.000; T3 `Belum Waktunya` |
| TC-T4 | TC-T3, ubah tahap ke `Siap Kirim` | Muncul konfirmasi `Barang akan dikirim dengan sisa tagihan Rp 7.850.000. Lanjutkan?` |
| TC-T5 | TC-T3, `+ Catat Bayar` | Nominal default Rp 3.800.000 |
| TC-T6 | TC-T1, input bayar Rp 20.000.000 saat sudah bayar 9.000.000 | Ditolak: `Melebihi sisa tagihan (Rp 7.850.000).` |
| TC-T7 | Plan 50/30/10 | Simpan ditolak: `Total termin 90%. Harus 100%.` |
| TC-T8 | Plan tahap `Finishing` lalu `Pengerjaan` | Simpan ditolak: `Urutan tahap termin tidak boleh mundur.` |
| TC-T9 | Hapus 1 pembayaran Rp 1.000.000 dari TC-T3 | `dpAmount` jadi Rp 8.000.000; T2 berubah `Perlu Ditagih` |
| TC-T10 | Migrasi data `v2` dengan `dpAmount` Rp 2.000.000 | Terbentuk 1 `PaymentRecord` Rp 2.000.000; Rapor `Kas Masuk` tidak berubah |
| TC-T11 | Profil sektor `fnb` | Panel termin tidak tampil; pembayaran berjalan seperti sebelumnya |

### 16.3 M3 — Penawaran

| ID | Masukan | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| TC-Q1 | Item harga Rp 1.025.500, `safeHppAtQuote` Rp 738.300; saat konversi `safeHpp` produk Rp 780.000 | Margin penawaran 28,0%, margin kini 23,9%, turun 4,1 poin → peringatan tampil |
| TC-Q2 | `validUntil` kemarin | Status `Kedaluwarsa`; `Jadikan Pesanan` tidak tersedia; `Perbarui Penawaran` membuat nomor baru, status `Draft`, berlaku 14 hari |
| TC-Q3 | Penawaran dibuat 2x di November 2026 | Nomor `QUO-202611-001` lalu `QUO-202611-002` |
| TC-Q4 | Item harga Rp 700.000 dengan `safeHpp` Rp 738.300 | Baris merah: `Harga di bawah HPP Riil Aman (Rp 738.300). Setiap unit rugi Rp 38.300.` Tetap bisa disimpan |
| TC-Q5 | Konversi dengan DP awal Rp 5.000.000, `leadTimeWeeks` 6 | Pesanan baru tahap `Persiapan`, `payments` berisi 1 record Rp 5.000.000, `dueDate` = hari ini + 42 hari, penawaran berstatus `Disetujui` |
| TC-Q6 | Ada 2 penawaran aktif | Rapor, target Mode Pelatihan, dan Portal Dosen tidak berubah sama sekali |
| TC-Q7 | Produk item dihapus dari katalog, lalu konversi | Konversi ditolak dengan pesan produk terhapus |

### 16.4 M4 — Borongan & Kasbon

| ID | Masukan | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| TC-L1 | Borongan Rp 1.200.000; kasbon Rp 300.000 dan Rp 400.000; lalu kasbon Rp 600.000 | Muncul peringatan inline konfirmasi: kasbon melebihi sisa Rp 500.000. Saat klik "Ya, Lanjutkan", kasbon tersimpan dan sisa upah menjadi negatif (-Rp 100.000 / lebih bayar) |
| TC-L2 | TC-L1 sebelum QC, klik `Lunasi` | Tombol nonaktif, teks `Tandai lolos QC dulu` |
| TC-L3 | TC-L1, `Tandai Lolos QC`, lunasi Rp 500.000 | Status `Lunas`, sisa Rp 0 |
| TC-L4 | Borongan Rp 600.000, kasbon Rp 450.000, belum QC | Badge `Kasbon 75% — pekerjaan belum lolos QC` |
| TC-L5 | Pesanan 6 kursi, `laborCostSnapshot` Rp 160.000; borongan rakit Rp 600.000 + finishing Rp 450.000; `laborFullyTracked = true` | Standar Rp 960.000, riil Rp 1.050.000, selisih +Rp 90.000; Laba Bersih Riil Rapor berkurang Rp 90.000 |
| TC-L6 | TC-L5 dengan `laborFullyTracked = false` | Selisih Rp 0; Laba Bersih Riil sama dengan sebelum fitur M4 |
| TC-L7 | Borongan Rp 800.000, kasbon Rp 300.000, klik `Tutup Borongan Sebagian` dengan catatan | `agreedAmount` jadi Rp 300.000, status `Lunas`, kasbon tetap tercatat di Kas Keluar Upah |
| TC-L8 | Hapus pesanan yang punya borongan `Berjalan` | Ditolak: `Selesaikan 1 borongan tukang pada pesanan ini dulu.` |
| TC-L9 | Hapus tukang yang punya borongan `Siap Dilunasi` | Ditolak; opsi nonaktifkan tersedia |
| TC-L10 | Potongan Rp 100.000 tanpa catatan | Simpan ditolak: `Isi alasan potongan.` |

### 16.5 Kriteria Umum

1. `npm run build` lolos tanpa error TypeScript.
2. Tidak ada `window.alert`, `window.confirm`, `window.prompt` di kode baru (`grep` wajib kosong).
3. Tidak ada emoji di kode UI baru.
4. Semua form baru terbaca dan bisa digulir di bingkai 375px.
5. Mengubah data di satu tab browser tersinkron ke tab lain (Dual-Sync) untuk keempat slice baru.

---

## 17. Kasus Tepi (Edge Cases) Wajib Ditangani

| No | Kasus | Penanganan |
| :--- | :--- | :--- |
| 1 | Item pesanan dikurangi setelah pembeli membayar lebih | Tampilkan `Kelebihan bayar Rp X` di bagian termin; tidak membuat pembayaran negatif |
| 2 | Pesanan dibatalkan setelah DP | Termin tidak jatuh tempo lagi (`isDue = false`); uang masuk tetap tercatat di Kas Masuk sesuai aturan induk |
| 3 | Produk dalam pesanan dihapus dari katalog | Pesanan lama tetap aman karena memakai snapshot; `laborCostSnapshot` tidak berubah |
| 4 | Harga kayu disinkronkan naik setelah penawaran terkirim | Penawaran tidak berubah; peringatan margin muncul saat konversi |
| 5 | Pengguna pindah sektor dari mebel ke fnb | Data modul mebel disembunyikan, tidak dihapus |
| 6 | Batch produk (`batch_based`) dipakai di pesanan mebel | `getLaborCostPerUnit` membagi `laborCost` dengan `outputQty` |
| 7 | Dimensi kubikasi berdesimal (2,5 cm) | Diterima; input memakai `inputMode="decimal"` dan menerima koma maupun titik |
| 8 | Dua tab browser menambah penawaran bersamaan | Nomor dihitung saat simpan dari state terbaru; jika bentrok (nomor sama), tambah sufiks urut berikutnya |
| 9 | Termin 100% di muka | Hanya 1 termin, pemicu `Persiapan`, ongkir ikut di termin tersebut |
| 10 | Pesanan tanpa item (tidak valid) | Sudah dicegah form pesanan; fungsi termin mengembalikan nominal 0 tanpa error |

---

## 18. Di Luar Ruang Lingkup

- Unggah foto barang mentah atau lampiran file.
- Cetak PDF penawaran atau nota (WhatsApp teks saja pada fase ini).
- Penggajian bulanan, absensi harian, atau BPJS tukang.
- Stok gudang kayu (persediaan log/papan) dan pembelian ke supplier.
- Kurs mata uang asing dan dokumen ekspor.
- Perubahan pada Portal Dosen.
- Modul Kasir Cepat / Rekap Tutup Warung untuk FnB (akan dibuat di PRD terpisah).

---

## 19. Keputusan Desain (Telah Dikonfirmasi Pemilik Produk)

Nilai-nilai keputusan berikut telah disetujui oleh pemilik produk pada 10 November 2026:

| No | Parameter | Keputusan Final | Keterangan & Implementasi |
| :--- | :--- | :--- | :--- |
| **D1** | **Persentase termin default mebel** | **50% / 30% / 20%** | DP 50% saat pesanan dibuat, Termin 30% saat barang mentah selesai (`Finishing`), Pelunasan 20% + Ongkir saat `Siap Kirim`. |
| **D2** | **Masa berlaku surat penawaran** | **14 Hari** | Default `validUntil` = tanggal buat + 14 hari. Melebihi tanggal ini status menjadi `Kedaluwarsa` untuk mencegah komitmen harga saat kayu naik. |
| **D3** | **Kasbon melebihi sisa nilai borongan** | **Boleh dengan Peringatan & Konfirmasi** | Tidak diblokir mati. Menampilkan peringatan konfirmasi 2 langkah: *"Kasbon melebihi sisa upah borongan. Akan menyebabkan status lebih bayar / piutang tukang. Lanjutkan?"* Jika disetujui, kasbon tetap tercatat. |
| **D4** | **Selisih upah borongan riil vs HPP** | **Masuk ke Laba Bersih Riil** | Mengurangi/menambah laba kotor di Rapor Usaha, khusus untuk pesanan yang ditandai `laborFullyTracked = true`. |
| **D5** | **Gerbang tahap saat termin belum lunas** | **Peringatan + Konfirmasi (Soft Gate)** | Tidak memblokir pengrajin. Menampilkan peringatan sisa tagihan dengan tombol konfirmasi *"Ya, lanjutkan"* atau *"Batal"*. |
