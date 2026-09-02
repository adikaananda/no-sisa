// ============================================================
// Integrasi Sistem Penjualan (POS) — menghubungkan data
// transaksi penjualan ke engine analisis kerugian No Sisa.
//
// Prototype ini tidak punya backend, jadi "koneksi" ke POS
// disimulasikan di client:
//   - Provider POS umum (Moka/Pawoon/Olsera/dll) -> mock sync
//     (menghasilkan data transaksi realistis untuk demo)
//   - "API Kustom" -> benar-benar fetch ke endpoint yang diisi
//     user (kalau ada), fallback ke mock kalau gagal/kosong
//   - "Import CSV" -> parse file CSV yang diunggah user
//
// Untuk implementasi produksi: ganti generateMockSyncBatch()
// dengan pemanggilan API asli (REST/webhook) dari provider POS,
// dan simpan sales record ke database, bukan localStorage.
// ============================================================

export const POS_PROVIDERS = [
  { id: "moka", label: "Moka POS" },
  { id: "pawoon", label: "Pawoon" },
  { id: "olsera", label: "Olsera" },
  { id: "esb", label: "ESB Kasir" },
  { id: "custom", label: "API Kustom (REST)" },
  { id: "csv", label: "Import CSV Manual" },
];

// Food cost ratio dipakai untuk estimasi kerugian bahan baku
// dari selisih porsi (asumsi umum industri F&B: 30-40%)
export const FOOD_COST_RATIO = 0.35;

// Resep / Bill of Material (BOM) — memetakan menu ke bahan baku
// dari Inventory, dipakai untuk konversi "porsi terjual" <-> "bahan terpakai"
export const recipeBook = {
  "Sup Sayur Ayam": [
    { ingredient: "Ayam Fillet", qtyPerPortion: 0.08, unit: "kg" },
    { ingredient: "Wortel", qtyPerPortion: 0.06, unit: "kg" },
    { ingredient: "Sayur Hijau", qtyPerPortion: 0.05, unit: "kg" },
  ],
  "Nasi Goreng Ayam": [
    { ingredient: "Ayam Fillet", qtyPerPortion: 0.1, unit: "kg" },
    { ingredient: "Wortel", qtyPerPortion: 0.03, unit: "kg" },
  ],
  "Salad Sayur Segar": [
    { ingredient: "Tomat", qtyPerPortion: 0.07, unit: "kg" },
    { ingredient: "Sayur Hijau", qtyPerPortion: 0.08, unit: "kg" },
  ],
  "Roti Bakar Susu": [
    { ingredient: "Roti Tawar", qtyPerPortion: 2, unit: "pcs" },
    { ingredient: "Susu Segar", qtyPerPortion: 0.1, unit: "L" },
  ],
  "Sandwich Ayam": [
    { ingredient: "Roti Tawar", qtyPerPortion: 2, unit: "pcs" },
    { ingredient: "Ayam Fillet", qtyPerPortion: 0.06, unit: "kg" },
    { ingredient: "Tomat", qtyPerPortion: 0.04, unit: "kg" },
  ],
};

export const menuPrices = {
  "Sup Sayur Ayam": 18000,
  "Nasi Goreng Ayam": 22000,
  "Salad Sayur Segar": 15000,
  "Roti Bakar Susu": 12000,
  "Sandwich Ayam": 17000,
};

// Prediksi AI Food Planner untuk hari yang sama (dipakai sebagai pembanding realisasi)
export const defaultForecastByMenu = [
  { menu: "Sup Sayur Ayam", qtyForecast: 45 },
  { menu: "Nasi Goreng Ayam", qtyForecast: 60 },
  { menu: "Salad Sayur Segar", qtyForecast: 25 },
  { menu: "Roti Bakar Susu", qtyForecast: 30 },
  { menu: "Sandwich Ayam", qtyForecast: 20 },
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Simulasikan sinkronisasi transaksi dari POS untuk 1 hari operasional.
 * Dipakai untuk provider selain "API Kustom"/"csv", dan sebagai fallback.
 */
export function generateMockSyncBatch({ seed = Date.now() } = {}) {
  const rand = seededRandom(seed % 100000);
  const today = new Date();

  const records = defaultForecastByMenu.map(({ menu, qtyForecast }) => {
    // Realisasi bervariasi -35% s/d +25% dari prediksi, biar ada kasus
    // over-production maupun demand-melebihi-prediksi (lebih realistis buat demo)
    const variance = (rand() - 0.6) * 0.6;
    const qtySold = Math.max(0, Math.round(qtyForecast * (1 + variance)));
    return {
      menu,
      qtySold,
      qtyForecast,
      price: menuPrices[menu] ?? 0,
      date: today.toISOString().slice(0, 10),
    };
  });

  return {
    provider: "mock",
    syncedAt: today.toISOString(),
    records,
  };
}

/**
 * Panggil endpoint REST kustom milik user. Diharapkan mengembalikan
 * JSON array [{ menu, qtySold, price?, date? }, ...].
 * Kalau gagal (network/format), lempar error supaya UI bisa fallback.
 */
export async function fetchCustomPOSSales({ endpoint, apiKey }) {
  if (!endpoint) throw new Error("URL endpoint API belum diisi.");

  const res = await fetch(endpoint, {
    method: "GET",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });

  if (!res.ok) {
    throw new Error(`Endpoint mengembalikan status ${res.status}.`);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : data.records || data.sales || [];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Format respons tidak sesuai atau kosong.");
  }

  return list.map((r) => ({
    menu: r.menu || r.item_name || r.name,
    qtySold: Number(r.qtySold ?? r.qty ?? r.quantity ?? 0),
    qtyForecast:
      Number(r.qtyForecast ?? 0) ||
      defaultForecastByMenu.find((f) => f.menu === (r.menu || r.item_name || r.name))?.qtyForecast ||
      0,
    price: Number(r.price ?? menuPrices[r.menu] ?? 0),
    date: r.date || new Date().toISOString().slice(0, 10),
  }));
}

/**
 * Parse CSV hasil export dari POS.
 * Kolom yang didukung (header case-insensitive): menu, qty/qtySold, price, date, forecast/qtyForecast
 */
export function parseSalesCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("File CSV kosong atau tidak punya baris data.");

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = {
    menu: header.findIndex((h) => ["menu", "item", "item_name", "nama menu"].includes(h)),
    qty: header.findIndex((h) => ["qty", "qtysold", "quantity", "jumlah", "terjual"].includes(h)),
    price: header.findIndex((h) => ["price", "harga"].includes(h)),
    date: header.findIndex((h) => ["date", "tanggal"].includes(h)),
    forecast: header.findIndex((h) => ["forecast", "qtyforecast", "prediksi"].includes(h)),
  };

  if (idx.menu === -1 || idx.qty === -1) {
    throw new Error("CSV wajib punya kolom 'menu' dan 'qty' minimal.");
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const menu = cols[idx.menu];
    return {
      menu,
      qtySold: Number(cols[idx.qty]) || 0,
      price: idx.price !== -1 ? Number(cols[idx.price]) || 0 : menuPrices[menu] ?? 0,
      date: idx.date !== -1 ? cols[idx.date] : new Date().toISOString().slice(0, 10),
      qtyForecast:
        idx.forecast !== -1
          ? Number(cols[idx.forecast]) || 0
          : defaultForecastByMenu.find((f) => f.menu === menu)?.qtyForecast || 0,
    };
  });
}

/**
 * Engine inti: rekonsiliasi data penjualan vs prediksi AI + inventori,
 * lalu hitung estimasi kerugian dan root cause-nya.
 */
export function computeLossAnalysis(records) {
  const perMenu = records.map((r) => {
    const forecast = r.qtyForecast || 0;
    const deviation = forecast > 0 ? ((r.qtySold - forecast) / forecast) * 100 : 0;

    let cause = "Sesuai Prediksi";
    if (deviation <= -15) cause = "Over-production";
    else if (deviation >= 15) cause = "Permintaan Melebihi Prediksi";

    const excessPortions = Math.max(0, forecast - r.qtySold);
    const wastedIngredientCost = Math.round(excessPortions * r.price * FOOD_COST_RATIO);

    const missedPortions = Math.max(0, r.qtySold >= forecast ? 0 : 0); // reserved for stockout tracking
    const lostRevenue = wastedIngredientCost;

    // Estimasi bahan yang terbuang berdasarkan resep (BOM)
    const wastedIngredients = (recipeBook[r.menu] || []).map((ing) => ({
      ingredient: ing.ingredient,
      qty: +(ing.qtyPerPortion * excessPortions).toFixed(2),
      unit: ing.unit,
    })).filter((i) => i.qty > 0);

    return {
      menu: r.menu,
      qtySold: r.qtySold,
      qtyForecast: forecast,
      deviationPct: Math.round(deviation),
      cause,
      excessPortions,
      lostRevenue,
      wastedIngredients,
      price: r.price,
    };
  });

  const totalLostRevenue = perMenu.reduce((sum, m) => sum + m.lostRevenue, 0);
  const avgAbsDeviation =
    perMenu.reduce((sum, m) => sum + Math.abs(m.deviationPct), 0) / (perMenu.length || 1);
  const forecastAccuracy = Math.max(0, Math.round(100 - avgAbsDeviation));

  const causeCounts = perMenu.reduce((acc, m) => {
    acc[m.cause] = (acc[m.cause] || 0) + 1;
    return acc;
  }, {});
  const causeDistribution = Object.entries(causeCounts).map(([name, count]) => ({
    name,
    value: Math.round((count / perMenu.length) * 100),
  }));

  const biggestCause = causeDistribution.slice().sort((a, b) => b.value - a.value)[0]?.name || "-";

  const worstMenu = perMenu.slice().sort((a, b) => b.lostRevenue - a.lostRevenue)[0];

  return {
    perMenu,
    totalLostRevenue,
    forecastAccuracy,
    causeDistribution,
    biggestCause,
    worstMenu,
    totalTransactions: records.reduce((sum, r) => sum + r.qtySold, 0),
  };
}
