# No Sisa — AI Food Intelligence Platform (Prototype)

Prototype web app untuk **No Sisa**, dibuat dengan React + Vite + Tailwind CSS,
terintegrasi dengan **Gemini API** untuk fitur AI Menu & Nutrition Planner.
Dibuat untuk submission HIPMI Berkaria Challenge 2026.

## Fitur

- **Dasbor** — ringkasan prediksi kebutuhan porsi, food waste mingguan, status stok, bahan yang segera kedaluwarsa
- **AI Menu Planner** — input bahan yang tersedia -> Gemini AI menyusun 3 rekomendasi menu lengkap dengan estimasi gizi per porsi, memprioritaskan bahan yang hampir kedaluwarsa
- **Stock Predictor** — grafik prediksi kebutuhan bahan baku 7 hari + tabel status inventori
- **Analytics** — donut chart waste by category, tren waste vs penghematan, estimasi CO2e & biaya yang diselamatkan
- **Circular Recovery** (modul tambahan) — menangani limbah organik yang tetap terjadi setelah pencegahan:
  Record → Analyze → Match → Collect → Verify → Measure. Lihat bagian [Circular Recovery](#circular-recovery).
- **Pengaturan** — tempat memasukkan Gemini API key (tersimpan lokal di browser, tombol "Tes koneksi" untuk validasi)

## Cara Menjalankan

Butuh Node.js versi 18 atau lebih baru (https://nodejs.org).

```bash
# 1. Masuk ke folder project
cd no-sisa-app

# 2. Install dependency
npm install

# 3. Jalankan development server
npm run dev
```

Buka http://localhost:5173 di browser.

Untuk build versi production (misalnya untuk di-hosting):

```bash
npm run build
npm run preview   # untuk cek hasil build secara lokal
```

Hasil build ada di folder `dist/` — folder ini yang di-upload kalau mau deploy
(misalnya ke Vercel, Netlify, atau GitHub Pages).

## Mengaktifkan Fitur AI (Gemini API)

1. Ambil API key gratis di Google AI Studio: https://aistudio.google.com/apikey
2. Jalankan aplikasinya, buka menu **Pengaturan**
3. Tempel API key, pilih model (default: `gemini-2.5-flash`), klik **Tes koneksi** lalu **Simpan pengaturan**
4. Buka **AI Menu Planner**, isi bahan yang tersedia, klik **Buat rekomendasi menu**

> API key disimpan hanya di `localStorage` browser kamu sendiri — tidak
> dikirim ke server manapun selain endpoint resmi Google Generative Language
> API. Ini cukup aman untuk demo/prototype, tapi kalau nanti di-deploy publik
> untuk production, sebaiknya panggilan Gemini API dipindah ke backend/proxy
> supaya API key tidak terekspos di kode frontend.

## Mengganti Gambar

Semua gambar aplikasi (hero, kartu, bahan makanan, foto profil) dikumpulkan
di satu file supaya gampang diganti:

```
src/lib/images.js
```

Tinggal timpa value URL di file itu dengan link gambar kamu sendiri, atau
taruh file gambar di folder `src/assets/` lalu `import` dan ganti value-nya.
Struktur objeknya (nama key) jangan diubah supaya komponen lain tidak error.

## Mengganti Logo

Logo saat ini direkonstruksi sebagai SVG di `src/components/LogoMark.jsx`
supaya ringan & tajam di semua ukuran layar. Kalau sudah punya file logo
final (SVG/PNG), taruh di folder `public/` (misalnya `public/logo.svg`) lalu
ganti isi komponen `LogoMark` dengan:

```jsx
<img src="/logo.svg" alt="Logo No Sisa" width={size} height={size} />
```

## Struktur Folder

```
src/
├── components/       # Sidebar, Topbar, Card, WasteRing (gauge), LogoMark
├── pages/            # Dashboard, MenuPlanner, StockPredictor, Analytics, Settings
├── lib/
│   ├── gemini.js      # Wrapper panggilan Gemini API
│   ├── images.js      # Semua URL gambar — edit di sini untuk ganti gambar
│   ├── sampleData.js  # Data contoh untuk dashboard/analytics
│   └── storage.js     # Helper localStorage (API key, histori menu)
├── App.jsx           # Routing antar halaman (state-based, tanpa react-router)
└── index.css         # Design tokens (warna, font) sesuai brand No Sisa
```

## Palet Warna & Tipografi (sesuai brand sheet)

| Token | Hex | Kegunaan |
|---|---|---|
| Forest 900 | #1E5E3A | Warna utama (sidebar, teks judul, tombol utama) |
| Leaf 500 | #4CAF50 | Aksen sekunder (chart, ikon) |
| Leaf 100 | #EBF5E9 | Latar permukaan terang |
| Amber 500 | #FF8A00 | Aksen peringatan/highlight |
| Gold 400 | #FFD166 | Aksen sekunder highlight |

Font: **Poppins** (di-load dari Google Fonts di `index.html`).

## Circular Recovery

Modul tambahan untuk menyalurkan makanan berlebih & food waste ke mitra: bank pangan/lembaga donasi
(makanan yang masih layak konsumsi), pengolah pakan, maggot BSF, pengomposan, dan biogas — mengikuti
hierarki pemulihan pangan (manusia > pakan > energi > kompos).
Tidak menggantikan fitur pencegahan — halaman-halamannya selalu mengarahkan ke AI Menu Planner
dulu kalau bahan masih layak.

| Halaman | Fungsi |
|---|---|
| Overview | Alur 6 tahap, ringkasan, daftar langkah berikutnya |
| Waste Recording | Catat kategori, berat (timbangan/input staf), waktu, sumber, pemilahan, karakteristik, foto |
| AI Waste Analysis | Rekomendasi jalur berbasis aturan + opsional Gemini; minta data tambahan kalau belum cukup |
| Partner Network | Pencocokan mitra: jenis limbah, jarak, kapasitas, jadwal, harga beli per kg & ongkos angkut |
| Pickup Scheduling | Ajukan pengambilan & pantau status (Menunggu Konfirmasi → Disetujui → Terjadwal → Dalam Pengambilan → Diterima / Dibatalkan) |
| Recovery History | Riwayat transaksi, berat awal vs berat aktual, selisih, pendapatan |
| Circular Impact | Statistik dampak — hanya transaksi berstatus **Diterima** yang dihitung tersalurkan |

Catatan penting:

- **Data mitra adalah data demo (simulasi)** di `src/lib/circularRecovery.js` (`DEMO_PARTNERS`).
  Aksi mitra (terima/tolak/konfirmasi penerimaan) disimulasikan di UI dan selalu diberi label simulasi.
  Ganti dengan data & API mitra nyata saat tersedia.
- **Restoran dapat uang per kg** (seperti bank sampah): pendapatan = berat aktual diterima mitra ×
  harga beli per kg (dikunci saat pengajuan). Setelah status Diterima, pembayaran berstatus
  "Menunggu pembayaran" sampai mitra mengonfirmasi (metode & no. referensi). Circular Impact
  menampilkan pendapatan diterima, menunggu pembayaran, ongkos angkut, dan hasil bersih.
  Harga di data demo adalah simulasi, bukan harga pasar.
- **Donasi pangan**: kategori "Makanan berlebih layak konsumsi" wajib mengisi kondisi penyimpanan dan
  batas aman konsumsi. Donasi tidak disarankan setelah batas itu lewat, dan tanggal pengambilan tidak
  boleh melewatinya. Mitra donasi bisa mengambil di hari yang sama dan tidak ada pembayaran.
- Integrasi fitur lama: bahan "hampir kedaluwarsa" dari Stock Predictor dan over-production dari
  Analisis Kerugian muncul sebagai referensi sumber limbah; ringkasan dampak juga tampil di Analytics.
- Estimasi dampak lingkungan (CO₂e) sengaja tidak dihitung karena faktor emisi terverifikasi belum tersedia.
- Logika inti bisa dicek tanpa browser: `npm run check:circular`.

## Catatan

Ini prototype front-end — data dashboard/stok/analytics masih data contoh
(`src/lib/sampleData.js`). Untuk versi produksi, data ini perlu disambungkan
ke backend/database asli (misalnya lewat REST API atau Supabase/Firebase).
