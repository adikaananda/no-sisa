// ============================================================
// Circular Recovery — modul tambahan untuk menangani food waste
// yang TETAP terjadi setelah pencegahan (AI Menu Planner,
// Stock Predictor). Alur: Record -> Analyze -> Match -> Collect
// -> Verify -> Measure.
//
// Prototype tanpa backend: catatan limbah & transaksi pickup
// disimpan di localStorage (lihat useCircularData). Data mitra di
// bawah adalah DATA DEMO (simulasi) — belum ada integrasi dengan
// mitra sungguhan, jadi aksi mitra (terima/tolak/konfirmasi
// penerimaan) dijalankan dari UI.
//
// File ini sengaja murni (tanpa import browser/React) supaya bisa
// dicek dengan `npm run check:circular`.
// ============================================================

export const WASTE_CATEGORIES = [
  { id: "sayur_buah", label: "Sisa sayuran & buah" },
  { id: "nasi_pati", label: "Sisa nasi & makanan berpati" },
  { id: "campuran", label: "Limbah organik campuran" },
];

export const WASTE_SOURCES = [
  { id: "persiapan", label: "Sisa persiapan dapur (trimming/kupasan)" },
  { id: "overproduksi", label: "Over-production / tidak terjual" },
  { id: "piring", label: "Sisa piring pelanggan" },
  { id: "kedaluwarsa", label: "Bahan kedaluwarsa / rusak" },
  { id: "lainnya", label: "Lainnya" },
];

export const WEIGHT_METHODS = [
  { id: "timbangan", label: "Timbangan" },
  { id: "manual", label: "Input manual staf" },
];

export const CONTAMINATION = [
  { id: "bersih", label: "Sudah dipilah — bebas plastik/kemasan" },
  { id: "ada_kemasan", label: "Masih tercampur plastik/kemasan/tisu" },
  { id: "belum_dicek", label: "Belum dicek" },
];

// Karakteristik material yang memengaruhi kecocokan jalur pengolahan
export const WASTE_FLAGS = [
  { id: "daging_ikan", label: "Mengandung daging / ikan / tulang" },
  { id: "susu", label: "Mengandung susu / olahan susu" },
  { id: "minyak_santan", label: "Berminyak / bersantan" },
  { id: "asin_pedas", label: "Kadar garam / bumbu tinggi" },
  { id: "cair", label: "Banyak kuah / cairan" },
];

export const PATHWAYS = {
  bsf: { label: "Maggot BSF", color: "var(--color-forest-900)" },
  biogas: { label: "Biogas", color: "var(--color-amber-500)" },
  kompos: { label: "Pengomposan", color: "var(--color-leaf-500)" },
};

// Urutan hierarki pemulihan pangan: pakan (BSF) > energi (biogas) > kompos
export const PATHWAY_ORDER = ["bsf", "biogas", "kompos"];

export const SUITABILITY = {
  sesuai: { label: "Sesuai", tone: "leaf", rank: 0 },
  bersyarat: { label: "Bersyarat", tone: "amber", rank: 1 },
  "tidak disarankan": { label: "Tidak disarankan", tone: "danger", rank: 2 },
};

export const PICKUP_STATUSES = {
  menunggu: { label: "Menunggu Konfirmasi", tone: "gold" },
  disetujui: { label: "Disetujui", tone: "leaf" },
  terjadwal: { label: "Terjadwal", tone: "leaf" },
  dalam_pengambilan: { label: "Dalam Pengambilan", tone: "amber" },
  diterima: { label: "Diterima", tone: "forest" },
  dibatalkan: { label: "Dibatalkan", tone: "danger" },
};

const CLOSED_STATUSES = ["diterima", "dibatalkan"];

export function isPickupActive(pickup) {
  return !CLOSED_STATUSES.includes(pickup.status);
}

// Transisi status yang diizinkan, per aktor. "mitra" = aksi pihak pengolah
// (di prototype ini disimulasikan dari UI karena belum ada integrasi mitra).
export const TRANSITIONS = {
  menunggu: [
    { to: "disetujui", actor: "mitra", label: "Terima permintaan" },
    { to: "dibatalkan", actor: "mitra", label: "Tolak permintaan", needsNote: true },
    { to: "dibatalkan", actor: "restoran", label: "Batalkan permintaan" },
  ],
  disetujui: [
    { to: "terjadwal", actor: "mitra", label: "Konfirmasi jadwal & armada" },
    { to: "dibatalkan", actor: "restoran", label: "Batalkan permintaan" },
  ],
  terjadwal: [
    { to: "dalam_pengambilan", actor: "mitra", label: "Mulai pengambilan" },
    { to: "dibatalkan", actor: "restoran", label: "Batalkan permintaan" },
  ],
  dalam_pengambilan: [
    { to: "diterima", actor: "mitra", label: "Konfirmasi penerimaan", needsVerification: true },
  ],
};

// Selisih berat (awal vs diterima) di atas ambang ini ditandai perlu ditinjau
export const DISCREPANCY_THRESHOLD_PCT = 10;

export const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export const DEMO_KITCHEN_LOCATION = {
  lat: -8.6705,
  lng: 115.2126,
  label: "Denpasar (lokasi default)",
};

// DATA DEMO — nama, lokasi, kapasitas, tarif, dan harga beli di bawah adalah simulasi,
// bukan mitra sungguhan / harga pasar. Ganti dengan data mitra nyata (dari
// backend) saat tersedia.
// pricePerKg: harga yang dibayar mitra ke restoran per kg (berat aktual
// diterima), per kategori — seperti bank sampah. Kategori tanpa harga = gratis.
export const DEMO_PARTNERS = [
  {
    id: "demo-bsf-sanur",
    name: "Budidaya Maggot BSF Sanur",
    type: "bsf",
    area: "Sanur, Denpasar",
    lat: -8.6913,
    lng: 115.2627,
    accepts: ["sayur_buah", "nasi_pati", "campuran"],
    rejectFlags: [],
    requirements: [
      "Bebas plastik, kemasan, tisu, dan tusuk sate",
      "Daging/minyak maksimal ±10% dari total berat",
      "Diambil maksimal 48 jam setelah dicatat",
    ],
    capacityKgPerWeek: 350,
    minPickupKg: 5,
    serviceRadiusKm: 20,
    pickupDays: [1, 3, 5],
    timeSlots: ["07.00–09.00", "15.00–17.00"],
    transportFeeFlat: 0,
    transportFeePerKg: 0,
    pricePerKg: { sayur_buah: 400, nasi_pati: 300, campuran: 150 },
  },
  {
    id: "demo-bsf-tabanan",
    name: "Peternakan Maggot Tabanan",
    type: "bsf",
    area: "Kediri, Tabanan",
    lat: -8.5409,
    lng: 115.125,
    accepts: ["sayur_buah", "nasi_pati"],
    rejectFlags: ["daging_ikan", "susu", "asin_pedas"],
    requirements: [
      "Hanya sisa nabati (sayur, buah, nasi)",
      "Tidak menerima makanan asin/berbumbu tinggi",
      "Ditiriskan dari kuah sebelum diangkut",
    ],
    capacityKgPerWeek: 600,
    minPickupKg: 15,
    serviceRadiusKm: 35,
    pickupDays: [2, 4, 6],
    timeSlots: ["08.00–10.00"],
    transportFeeFlat: 0,
    transportFeePerKg: 0,
    pricePerKg: { sayur_buah: 500, nasi_pati: 400 },
  },
  {
    id: "demo-kompos-gianyar",
    name: "Rumah Kompos Gianyar",
    type: "kompos",
    area: "Gianyar",
    lat: -8.5442,
    lng: 115.3253,
    accepts: ["sayur_buah", "nasi_pati"],
    rejectFlags: ["daging_ikan", "susu", "minyak_santan"],
    requirements: [
      "Bebas plastik & kemasan",
      "Tidak menerima daging, susu, dan makanan berminyak",
      "Nasi dibatasi maksimal 30% dari total berat",
    ],
    capacityKgPerWeek: 500,
    minPickupKg: 10,
    serviceRadiusKm: 30,
    pickupDays: [1, 4],
    timeSlots: ["09.00–12.00"],
    transportFeeFlat: 15000,
    transportFeePerKg: 0,
    pricePerKg: { sayur_buah: 200, nasi_pati: 100 },
  },
  {
    id: "demo-kompos-jimbaran",
    name: "Kompos Komunal Jimbaran",
    type: "kompos",
    area: "Jimbaran, Badung",
    lat: -8.7906,
    lng: 115.1612,
    accepts: ["sayur_buah"],
    rejectFlags: ["daging_ikan", "susu", "minyak_santan", "asin_pedas"],
    requirements: ["Hanya sisa sayur & buah mentah", "Bebas plastik & kemasan"],
    capacityKgPerWeek: 150,
    minPickupKg: 3,
    serviceRadiusKm: 15,
    pickupDays: [2, 5],
    timeSlots: ["07.00–09.00", "13.00–15.00"],
    transportFeeFlat: 0,
    transportFeePerKg: 0,
    pricePerKg: { sayur_buah: 250 },
  },
  {
    id: "demo-biogas-mengwi",
    name: "Unit Biogas Mengwi",
    type: "biogas",
    area: "Mengwi, Badung",
    lat: -8.5644,
    lng: 115.17,
    accepts: ["sayur_buah", "nasi_pati", "campuran"],
    rejectFlags: [],
    requirements: [
      "Bebas plastik, tulang besar, dan logam",
      "Minyak jelantah tidak dicampurkan",
      "Konfirmasi jadwal pengisian digester",
    ],
    capacityKgPerWeek: 800,
    minPickupKg: 20,
    serviceRadiusKm: 40,
    pickupDays: [1, 2, 3, 4, 5],
    timeSlots: ["10.00–12.00", "14.00–16.00"],
    transportFeeFlat: 20000,
    transportFeePerKg: 0,
    pricePerKg: { sayur_buah: 150, nasi_pati: 250, campuran: 150 },
  },
  {
    id: "demo-biogas-kesiman",
    name: "Biogas Komunitas Kesiman",
    type: "biogas",
    area: "Kesiman, Denpasar",
    lat: -8.6467,
    lng: 115.2563,
    accepts: ["sayur_buah", "nasi_pati", "campuran"],
    rejectFlags: ["minyak_santan"],
    requirements: ["Bebas plastik & kemasan", "Tidak menerima makanan berminyak/bersantan"],
    capacityKgPerWeek: 200,
    minPickupKg: 5,
    serviceRadiusKm: 12,
    pickupDays: [3, 6],
    timeSlots: ["08.00–10.00"],
    transportFeeFlat: 0,
    transportFeePerKg: 0,
    pricePerKg: {},
  },
];

export function labelOf(list, id) {
  return list.find((x) => x.id === id)?.label ?? id;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function newId(prefix, now) {
  return `${prefix}-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- Waste Recording ----------

export function validateWasteRecord(input, now = new Date()) {
  const errors = {};
  if (!WASTE_CATEGORIES.some((c) => c.id === input.category)) errors.category = "Pilih kategori limbah.";
  const w = Number(input.weightKg);
  if (!(w > 0)) errors.weightKg = "Berat harus lebih dari 0 kg.";
  else if (w > 2000) errors.weightKg = "Berat di atas 2.000 kg per catatan — periksa lagi angkanya.";
  if (!WEIGHT_METHODS.some((m) => m.id === input.weightMethod)) errors.weightMethod = "Pilih sumber data berat.";
  const at = input.recordedAt ? new Date(input.recordedAt) : null;
  if (!at || Number.isNaN(at.getTime())) errors.recordedAt = "Isi waktu pencatatan.";
  else if (at.getTime() > now.getTime() + 5 * 60 * 1000) errors.recordedAt = "Waktu pencatatan tidak boleh di masa depan.";
  if (!WASTE_SOURCES.some((s) => s.id === input.source)) errors.source = "Pilih sumber limbah.";
  if (!CONTAMINATION.some((c) => c.id === input.contamination)) errors.contamination = "Pilih status pemilahan.";
  return errors;
}

export function createWasteRecord(input, now = new Date()) {
  return {
    id: newId("wr", now),
    category: input.category,
    weightKg: round2(Number(input.weightKg)),
    weightMethod: input.weightMethod,
    recordedAt: new Date(input.recordedAt).toISOString(),
    source: input.source,
    sourceRef: input.sourceRef || "",
    contamination: input.contamination,
    flags: input.flags || [],
    noSpecialFlags: !!input.noSpecialFlags,
    notes: (input.notes || "").trim(),
    photo: input.photo || null,
    aiAnalysis: null,
    createdAt: now.toISOString(),
  };
}

// ---------- AI Waste Analysis (berbasis aturan) ----------
// Aturan umum pengolahan limbah organik. Hasilnya rekomendasi awal —
// keputusan akhir tetap mengikuti persyaratan tiap mitra pengolah.

const BASE_RULES = {
  sayur_buah: {
    bsf: ["sesuai", "Material lunak berkadar air tinggi, mudah dikonsumsi larva BSF."],
    biogas: ["sesuai", "Mudah terurai secara anaerob di digester."],
    kompos: ["sesuai", "Bahan hijau (kaya nitrogen) yang umum untuk kompos."],
  },
  nasi_pati: {
    bsf: ["sesuai", "Karbohidrat tinggi menjadi sumber energi pakan larva."],
    biogas: ["sesuai", "Kandungan pati tinggi berpotensi menghasilkan gas yang baik."],
    kompos: ["bersyarat", "Nasi cepat berjamur dan menarik hama; perlu dicampur bahan cokelat kering."],
  },
  campuran: {
    bsf: ["bersyarat", "Komposisi bervariasi — perlu dicocokkan dengan batas bahan yang diterima mitra."],
    biogas: ["bersyarat", "Umumnya dapat diolah, tetapi komposisi perlu dicek agar digester stabil."],
    kompos: ["bersyarat", "Komposisi bervariasi — kompos terbuka sensitif terhadap protein & lemak."],
  },
};

// "syarat" = turunkan maksimal ke bersyarat; "hindari" = tidak disarankan
const FLAG_RULES = {
  daging_ikan: {
    bsf: ["syarat", "Daging/ikan memicu bau dan lalat lain; banyak budidaya BSF membatasi porsinya."],
    biogas: ["syarat", "Protein dapat diolah, tetapi tulang besar harus dipisahkan."],
    kompos: ["hindari", "Daging/ikan tidak disarankan untuk kompos terbuka (bau, hama, patogen) kecuali sistem tertutup/termofilik."],
  },
  susu: {
    bsf: ["syarat", "Olahan susu perlu dibatasi agar media larva tidak terlalu asam/berbau."],
    kompos: ["hindari", "Olahan susu tidak disarankan untuk kompos terbuka (bau & hama)."],
  },
  minyak_santan: {
    bsf: ["syarat", "Minyak/santan berlebih dapat menurunkan kualitas media larva."],
    biogas: ["syarat", "Lemak dalam porsi besar dapat mengganggu stabilitas digester."],
    kompos: ["syarat", "Lemak memperlambat dekomposisi dan menarik hama."],
  },
  asin_pedas: {
    bsf: ["syarat", "Kadar garam tinggi dapat menghambat pertumbuhan larva."],
    kompos: ["syarat", "Garam tinggi menurunkan kualitas kompos."],
  },
  cair: {
    bsf: ["syarat", "Kuah/cairan perlu ditiriskan agar media tidak terlalu basah."],
    kompos: ["syarat", "Terlalu basah — perlu ditiriskan dan dicampur bahan kering."],
  },
};

const PATHWAY_REQUIREMENTS = {
  bsf: [
    "Bebas plastik, kemasan, tisu, dan tusuk sate",
    "Belum busuk berat atau berjamur parah",
    "Konfirmasi batas daging/minyak/garam ke mitra",
  ],
  biogas: [
    "Bebas plastik, tulang besar, dan logam",
    "Konfirmasi kapasitas & jadwal pengisian digester mitra",
    "Konfirmasi apakah perlu dicacah sebelum diserahkan",
  ],
  kompos: [
    "Bebas plastik & kemasan",
    "Mitra punya bahan cokelat (daun kering/serbuk gergaji) untuk menyeimbangkan",
    "Konfirmasi apakah mitra menerima makanan matang",
  ],
};

export function analyzeWasteRules(record) {
  const gaps = [];
  if (!(record.weightKg > 0)) gaps.push("Isi berat limbah (kg) dari timbangan atau input staf.");
  if (record.contamination === "belum_dicek") {
    gaps.push("Cek apakah limbah masih tercampur plastik, kemasan, atau tisu.");
  }
  if (record.category === "campuran" && !record.flags?.length && !record.noSpecialFlags) {
    gaps.push(
      "Untuk limbah campuran, konfirmasi komposisinya: ada daging/ikan, susu, minyak/santan, garam tinggi, atau kuah? Jika tidak ada, centang \"tidak ada karakteristik khusus\"."
    );
  }

  const preventionTip =
    record.source === "kedaluwarsa" || record.source === "overproduksi"
      ? "Jika sebagian bahan masih layak konsumsi, olah dulu lewat AI Menu Planner — pencegahan selalu lebih baik daripada penyaluran."
      : null;

  if (gaps.length) return { method: "aturan", sufficient: false, gaps, recommendations: [], preventionTip };

  const recommendations = PATHWAY_ORDER.map((pathway) => {
    const [baseSuit, baseReason] = BASE_RULES[record.category][pathway];
    let suitability = baseSuit;
    const reasons = [baseReason];
    const requirements = [...PATHWAY_REQUIREMENTS[pathway]];

    for (const flag of record.flags || []) {
      const rule = FLAG_RULES[flag]?.[pathway];
      if (!rule) continue;
      const [effect, note] = rule;
      reasons.push(note);
      if (effect === "hindari") suitability = "tidak disarankan";
      else if (suitability === "sesuai") suitability = "bersyarat";
    }

    if (record.contamination === "ada_kemasan") {
      if (suitability === "sesuai") suitability = "bersyarat";
      reasons.push("Masih tercampur plastik/kemasan — wajib dipilah sebelum diserahkan ke mitra mana pun.");
      requirements.unshift("Pilah plastik/kemasan/tisu terlebih dahulu");
    }

    return { pathway, suitability, reasons, requirements };
  }).sort((a, b) => SUITABILITY[a.suitability].rank - SUITABILITY[b.suitability].rank);

  return { method: "aturan", sufficient: true, gaps: [], recommendations, preventionTip };
}

// ---------- Smart Partner Matching ----------

export function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISODate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isPickupDateAllowed(partner, isoDate, today = new Date()) {
  const d = parseISODate(isoDate);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  return d >= tomorrow && partner.pickupDays.includes(d.getDay());
}

export function nextPickupDate(partner, today = new Date()) {
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    if (partner.pickupDays.includes(d.getDay())) return toISODate(d);
  }
  return null;
}

export function pickupDaysLabel(partner) {
  return partner.pickupDays.map((d) => DAY_LABELS[d]).join(", ");
}

export const PAYMENT_METHODS = [
  { id: "transfer", label: "Transfer bank" },
  { id: "ewallet", label: "E-wallet" },
  { id: "tunai", label: "Tunai saat pengambilan" },
];

export function partnerBuys(partner) {
  return Object.values(partner.pricePerKg || {}).some((v) => v > 0);
}

/** Estimasi pendapatan (dibayar mitra), biaya angkut, dan hasil bersih untuk catatan terpilih. */
export function estimateTariff(partner, records) {
  const kg = round2(records.reduce((s, r) => s + r.weightKg, 0));
  const income = Math.round(records.reduce((s, r) => s + (partner.pricePerKg?.[r.category] ?? 0) * r.weightKg, 0));
  const cost = Math.round(partner.transportFeeFlat + partner.transportFeePerKg * kg);
  return { income, cost, net: income - cost, pricePerKg: kg ? round2(income / kg) : 0 };
}

export function partnerUsedCapacity(partnerId, pickups) {
  return round2(
    pickups.filter((p) => p.partnerId === partnerId && isPickupActive(p)).reduce((s, p) => s + p.plannedKg, 0)
  );
}

/**
 * Nilai kecocokan satu mitra terhadap catatan limbah terpilih.
 * `issues` kosong = mitra bisa diajukan pengambilan.
 */
export function evaluatePartner(partner, { records = [], pickups = [], origin }) {
  const issues = [];
  const totalKg = round2(records.reduce((s, r) => s + r.weightKg, 0));

  const distance = origin ? distanceKm(origin, partner) : null;
  if (distance != null && distance > partner.serviceRadiusKm) {
    issues.push(`Di luar radius layanan (${partner.serviceRadiusKm} km).`);
  }

  const used = partnerUsedCapacity(partner.id, pickups);
  const remainingKg = round2(Math.max(0, partner.capacityKgPerWeek - used));

  let worstSuitability = null;
  if (records.length) {
    const rejectedCats = [...new Set(records.map((r) => r.category))].filter((c) => !partner.accepts.includes(c));
    if (rejectedCats.length) {
      issues.push(`Tidak menerima: ${rejectedCats.map((c) => labelOf(WASTE_CATEGORIES, c).toLowerCase()).join(", ")}.`);
    }
    const flags = new Set(records.flatMap((r) => r.flags || []));
    const rejectedFlags = partner.rejectFlags.filter((f) => flags.has(f));
    if (rejectedFlags.length) {
      issues.push(`Tidak menerima limbah: ${rejectedFlags.map((f) => labelOf(WASTE_FLAGS, f).toLowerCase()).join(", ")}.`);
    }
    if (records.some((r) => r.contamination === "ada_kemasan")) issues.push("Limbah harus dipilah dulu (bebas plastik/kemasan).");
    if (records.some((r) => r.contamination === "belum_dicek")) issues.push("Status pemilahan limbah belum dicek.");

    for (const r of records) {
      const analysis = analyzeWasteRules(r);
      if (!analysis.sufficient) {
        issues.push("Ada catatan limbah yang datanya belum lengkap — lengkapi di AI Waste Analysis.");
        break;
      }
      const rec = analysis.recommendations.find((x) => x.pathway === partner.type);
      if (!worstSuitability || SUITABILITY[rec.suitability].rank > SUITABILITY[worstSuitability].rank) {
        worstSuitability = rec.suitability;
      }
    }
    if (worstSuitability === "tidak disarankan") {
      issues.push(`Jalur ${PATHWAYS[partner.type].label} tidak disarankan untuk karakteristik limbah ini.`);
    }

    if (totalKg > remainingKg) issues.push(`Kapasitas tersisa minggu ini hanya ${remainingKg} kg.`);
    if (totalKg < partner.minPickupKg) {
      issues.push(`Minimal pengambilan ${partner.minPickupKg} kg (terpilih ${totalKg} kg) — gabungkan beberapa catatan.`);
    }
  }

  return {
    partner,
    eligible: issues.length === 0,
    issues,
    distanceKm: distance,
    remainingKg,
    totalKg,
    suitability: worstSuitability,
    tariff: estimateTariff(partner, records),
    nextPickup: nextPickupDate(partner),
  };
}

export function matchPartners(partners, ctx) {
  return partners
    .map((p) => evaluatePartner(p, ctx))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      const ra = a.suitability ? SUITABILITY[a.suitability].rank : 0;
      const rb = b.suitability ? SUITABILITY[b.suitability].rank : 0;
      if (ra !== rb) return ra - rb;
      if (a.tariff.net !== b.tariff.net) return b.tariff.net - a.tariff.net; // hasil bersih terbesar dulu
      return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
    });
}

// ---------- Pickup Scheduling ----------

export function validatePickupRequest({ partner, records, date, slot, pickups = [], origin, today = new Date() }) {
  const errors = [];
  if (!partner) errors.push("Pilih mitra pengolah.");
  if (!records?.length) errors.push("Pilih minimal satu catatan limbah.");
  if (!date) errors.push("Pilih tanggal pengambilan.");
  else if (partner && !isPickupDateAllowed(partner, date, today)) {
    errors.push(`Tanggal harus mulai besok dan jatuh di hari layanan mitra (${pickupDaysLabel(partner)}).`);
  }
  if (!slot) errors.push("Pilih slot waktu pengambilan.");
  else if (partner && !partner.timeSlots.includes(slot)) errors.push("Slot waktu tidak tersedia untuk mitra ini.");
  if (partner && records?.length) errors.push(...evaluatePartner(partner, { records, pickups, origin }).issues);
  return errors;
}

export function createPickup({ partner, records, date, slot, notes = "", now = new Date() }) {
  const estimate = estimateTariff(partner, records);
  const plannedKg = round2(records.reduce((s, r) => s + r.weightKg, 0));
  return {
    id: newId("pk", now),
    partnerId: partner.id,
    partnerName: partner.name,
    pathway: partner.type,
    recordIds: records.map((r) => r.id),
    plannedKg,
    date,
    slot,
    notes: notes.trim(),
    // Snapshot tarif saat pengajuan, supaya riwayat biaya tidak berubah kalau tarif mitra berubah
    tariff: {
      transportFeeFlat: partner.transportFeeFlat,
      transportFeePerKg: partner.transportFeePerKg,
      // Harga rata-rata tertimbang per kg dari kategori limbah yang diangkut
      pricePerKg: estimate.pricePerKg,
    },
    status: "menunggu",
    verification: null,
    payment: null,
    history: [{ status: "menunggu", actor: "restoran", at: now.toISOString(), note: "Permintaan pengambilan diajukan." }],
    createdAt: now.toISOString(),
  };
}

export function transitionPickup(pickup, to, { actor, note = "", verification, now = new Date() } = {}) {
  const rule = (TRANSITIONS[pickup.status] || []).find((t) => t.to === to && t.actor === actor);
  if (!rule) {
    throw new Error(
      `Status "${PICKUP_STATUSES[pickup.status]?.label}" tidak bisa diubah ke "${PICKUP_STATUSES[to]?.label}" oleh ${actor}.`
    );
  }
  if (rule.needsNote && !note.trim()) throw new Error("Alasan penolakan wajib diisi.");

  const next = { ...pickup, status: to };
  if (rule.needsVerification) {
    const actualKg = Number(verification?.actualKg);
    if (!(actualKg > 0)) throw new Error("Berat aktual yang diterima wajib diisi (> 0 kg).");
    if (!verification?.receiverName?.trim()) throw new Error("Nama petugas penerima wajib diisi.");
    const diffKg = round2(actualKg - pickup.plannedKg);
    next.verification = {
      actualKg: round2(actualKg),
      receiverName: verification.receiverName.trim(),
      note: verification.note?.trim() || "",
      photo: verification.photo || null,
      receivedAt: now.toISOString(),
      diffKg,
      diffPct: pickup.plannedKg ? Math.round((diffKg / pickup.plannedKg) * 100) : 0,
    };
  }
  if (to === "diterima" && pickup.tariff.pricePerKg > 0) {
    // Tagihan ke mitra dihitung dari berat AKTUAL yang diterima, bukan berat awal
    next.payment = {
      amount: Math.round(next.verification.actualKg * pickup.tariff.pricePerKg),
      status: "menunggu",
      method: null,
      reference: "",
      paidAt: null,
    };
  }
  next.history = [...pickup.history, { status: to, actor, at: now.toISOString(), note: note.trim() }];
  return next;
}

/** Mitra mengonfirmasi pembayaran ke restoran (disimulasikan di prototype). */
export function confirmPayment(pickup, { method, reference = "", now = new Date() } = {}) {
  if (pickup.status !== "diterima" || pickup.payment?.status !== "menunggu") {
    throw new Error("Pembayaran hanya bisa dikonfirmasi untuk transaksi yang sudah diterima dan belum dibayar.");
  }
  if (!PAYMENT_METHODS.some((m) => m.id === method)) throw new Error("Pilih metode pembayaran.");
  return {
    ...pickup,
    payment: { ...pickup.payment, status: "dibayar", method, reference: reference.trim(), paidAt: now.toISOString() },
    history: [
      ...pickup.history,
      {
        type: "payment",
        status: "diterima",
        actor: "mitra",
        at: now.toISOString(),
        note: `Pembayaran Rp ${pickup.payment.amount.toLocaleString("id-ID")} via ${labelOf(PAYMENT_METHODS, method)}${reference.trim() ? ` (ref. ${reference.trim()})` : ""}.`,
      },
    ],
  };
}

// ---------- Recovery status & Circular Impact ----------

/** Status penyaluran tiap catatan limbah: "belum" | "dalam_proses" | "diterima" */
export function recordStatusMap(records, pickups) {
  const map = Object.fromEntries(records.map((r) => [r.id, "belum"]));
  for (const p of pickups) {
    if (p.status === "dibatalkan") continue;
    for (const id of p.recordIds) {
      if (!(id in map)) continue;
      if (p.status === "diterima") map[id] = "diterima";
      else if (map[id] !== "diterima") map[id] = "dalam_proses";
    }
  }
  return map;
}

export const RECORD_STATUSES = {
  belum: { label: "Belum disalurkan", tone: "outline" },
  dalam_proses: { label: "Dalam proses", tone: "amber" },
  diterima: { label: "Diterima mitra", tone: "forest" },
};

/**
 * Semua angka dampak dihitung dari catatan & transaksi. Limbah hanya
 * dihitung "berhasil disalurkan" kalau transaksi berstatus Diterima
 * (sudah dikonfirmasi mitra dengan berat aktual).
 */
export function computeCircularStats(records, pickups) {
  const status = recordStatusMap(records, pickups);
  const sumWeight = (pred) => round2(records.filter(pred).reduce((s, r) => s + r.weightKg, 0));

  const received = pickups.filter((p) => p.status === "diterima");
  const cancelled = pickups.filter((p) => p.status === "dibatalkan");
  const active = pickups.filter(isPickupActive);

  const receivedKg = round2(received.reduce((s, p) => s + p.verification.actualKg, 0));
  const receivedPlannedKg = round2(received.reduce((s, p) => s + p.plannedKg, 0));

  const receivedByPathway = PATHWAY_ORDER.map((id) => ({
    id,
    name: PATHWAYS[id].label,
    color: PATHWAYS[id].color,
    value: round2(received.filter((p) => p.pathway === id).reduce((s, p) => s + p.verification.actualKg, 0)),
  }));

  const byCategory = WASTE_CATEGORIES.map((c) => {
    const inCat = (st) => (r) => r.category === c.id && status[r.id] === st;
    return {
      id: c.id,
      name: c.label,
      belum: sumWeight(inCat("belum")),
      dalam_proses: sumWeight(inCat("dalam_proses")),
      diterima: sumWeight(inCat("diterima")),
    };
  });

  const closed = received.length + cancelled.length;
  const paymentTotal = (st) => received.filter((p) => p.payment?.status === st).reduce((s, p) => s + p.payment.amount, 0);

  const stats = {
    totalRecordedKg: sumWeight(() => true),
    recordCount: records.length,
    receivedKg,
    receivedPlannedKg,
    weightDiffKg: round2(receivedKg - receivedPlannedKg),
    discrepancyCount: received.filter((p) => Math.abs(p.verification.diffPct) > DISCREPANCY_THRESHOLD_PCT).length,
    unassignedKg: sumWeight((r) => status[r.id] === "belum"),
    inProcessKg: sumWeight((r) => status[r.id] === "dalam_proses"),
    pendingKg: sumWeight((r) => status[r.id] !== "diterima"),
    receivedByPathway,
    byCategory,
    receivedCount: received.length,
    cancelledCount: cancelled.length,
    activeCount: active.length,
    successRate: closed ? Math.round((received.length / closed) * 100) : null,
    managementCost: received.reduce(
      (s, p) => s + p.tariff.transportFeeFlat + p.tariff.transportFeePerKg * p.verification.actualKg,
      0
    ),
    incomePaid: paymentTotal("dibayar"),
    incomePending: paymentTotal("menunggu"),
    pendingPaymentCount: received.filter((p) => p.payment?.status === "menunggu").length,
  };
  stats.netIncome = stats.incomePaid + stats.incomePending - stats.managementCost;
  return stats;
}
