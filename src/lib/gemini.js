// ============================================================
// Gemini API client — dipanggil langsung dari browser (client-side).
// API key diambil dari environment variable (VITE_GEMINI_API_KEY),
// dengan fallback manual (misal dari localStorage/Pengaturan) kalau
// env tidak diset.
//
// Catatan produksi: untuk deploy publik sebaiknya API key disimpan
// di server/proxy, bukan di client, supaya key tidak terekspos.
// Untuk kebutuhan prototype/demo lomba, pendekatan client-side ini
// paling cepat untuk dijalankan tanpa backend tambahan.
// ============================================================

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_MODELS = [
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (disarankan)" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (lebih hemat)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (lebih hemat, lebih tua)" },
];

export class GeminiError extends Error {}

/**
 * Ambil API key: prioritaskan yang dikasih manual (misal dari state/localStorage),
 * fallback ke env var VITE_GEMINI_API_KEY.
 */
function resolveApiKey(apiKey) {
  return apiKey || import.meta.env.VITE_GEMINI_API_KEY || "";
}

/**
 * Memanggil Gemini generateContent dengan output terstruktur (JSON schema)
 * supaya hasilnya bisa langsung dipetakan ke UI kartu menu.
 */
export async function generateMenuPlan({ apiKey, model, ingredients, portions, notes }) {
  const key = resolveApiKey(apiKey);

  if (!key) {
    throw new GeminiError(
      "Gemini API key belum diisi. Set VITE_GEMINI_API_KEY di file .env, atau isi lewat halaman Pengaturan."
    );
  }

  const schema = {
    type: "OBJECT",
    properties: {
      menus: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            description: { type: "STRING" },
            main_ingredients: { type: "ARRAY", items: { type: "STRING" } },
            uses_expiring_stock: { type: "BOOLEAN" },
            portions: { type: "NUMBER" },
            nutrition: {
              type: "OBJECT",
              properties: {
                calories_kcal: { type: "NUMBER" },
                protein_g: { type: "NUMBER" },
                carbs_g: { type: "NUMBER" },
                fat_g: { type: "NUMBER" },
              },
              required: ["calories_kcal", "protein_g", "carbs_g", "fat_g"],
            },
            waste_reduction_note: { type: "STRING" },
          },
          required: ["name", "description", "main_ingredients", "portions", "nutrition"],
        },
      },
      procurement_tip: { type: "STRING" },
    },
    required: ["menus"],
  };

  const prompt = `Kamu adalah AI Menu & Nutrition Planner untuk platform "No Sisa" — aplikasi manajemen dapur komersial (restoran/catering) yang berfokus mencegah food waste.

Bahan yang tersedia di dapur saat ini (termasuk yang hampir kedaluwarsa, prioritaskan pemakaiannya):
${ingredients}

Target jumlah porsi: ${portions}
Catatan tambahan dari pengguna: ${notes || "(tidak ada)"}

Tugas kamu:
1. Susun 3 rekomendasi menu yang HANYA menggunakan (atau mayoritas menggunakan) bahan-bahan di atas, diprioritaskan pada bahan yang hampir kedaluwarsa.
2. Untuk tiap menu, berikan estimasi kandungan gizi per porsi (kalori, protein, karbohidrat, lemak) yang masuk akal secara kuliner.
3. Tandai uses_expiring_stock = true jika menu ini secara aktif menghabiskan bahan yang berisiko terbuang.
4. Tulis waste_reduction_note singkat (1 kalimat) yang menjelaskan bagaimana menu ini membantu mengurangi sisa bahan.
5. Berikan satu procurement_tip singkat: bahan apa yang sebaiknya TIDAK usah dibeli lagi minggu ini karena masih ada stok.

Gunakan Bahasa Indonesia. Jawab HANYA dalam format JSON sesuai schema, tanpa teks tambahan.`;

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini API error (${res.status}). Cek API key & nama model di Pengaturan.\n${errBody.slice(0, 300)}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new GeminiError(
      blockReason
        ? `Permintaan diblokir Gemini (${blockReason}). Coba ubah input.`
        : "Gemini tidak mengembalikan hasil. Coba lagi."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("Gagal membaca hasil AI (format tidak sesuai). Coba lagi.");
  }
}

/**
 * Prediksi ketahanan stok terhadap menu yang sedang berjalan,
 * plus rekomendasi belanja untuk menghindari food waste / kehabisan stok.
 */
export async function predictStockOutlook({ apiKey, model, menus, inventory, dailyPortions, notes }) {
  const key = resolveApiKey(apiKey);

  if (!key) {
    throw new GeminiError(
      "Gemini API key belum diisi. Set VITE_GEMINI_API_KEY di file .env, atau isi lewat halaman Pengaturan."
    );
  }

  const schema = {
    type: "OBJECT",
    properties: {
      menu_outlook: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            menu_name: { type: "STRING" },
            estimated_portions_left: { type: "NUMBER" },
            days_until_stockout: { type: "NUMBER" },
            bottleneck_ingredient: { type: "STRING" },
            status: { type: "STRING", enum: ["aman", "hampir habis", "kritis"] },
            note: { type: "STRING" },
          },
          required: ["menu_name", "estimated_portions_left", "bottleneck_ingredient", "status", "note"],
        },
      },
      restock_recommendations: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            ingredient: { type: "STRING" },
            urgency: { type: "STRING", enum: ["segera", "minggu ini", "belum perlu"] },
            suggested_qty: { type: "STRING" },
            reason: { type: "STRING" },
          },
          required: ["ingredient", "urgency", "suggested_qty", "reason"],
        },
      },
      waste_risk_alerts: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            ingredient: { type: "STRING" },
            reason: { type: "STRING" },
            suggested_action: { type: "STRING" },
          },
          required: ["ingredient", "reason", "suggested_action"],
        },
      },
      summary: { type: "STRING" },
    },
    required: ["menu_outlook", "restock_recommendations", "summary"],
  };

  const inventoryText = inventory
    .map((i) => `- ${i.name}: stok ${i.stock} (status: ${i.status})`)
    .join("\n");

  const prompt = `Kamu adalah AI Stock & Menu Advisor untuk platform "No Sisa" — aplikasi manajemen dapur komersial (restoran/catering) yang berfokus mencegah food waste sekaligus mencegah kehabisan stok.

Stok bahan baku saat ini:
${inventoryText}

Menu yang sedang aktif dijual / ingin dianalisis:
${menus}

Rata-rata porsi terjual per hari (jika ada): ${dailyPortions || "tidak diketahui, gunakan estimasi wajar"}
Catatan tambahan dari pengguna: ${notes || "(tidak ada)"}

Tugas kamu:
1. Untuk setiap menu, perkirakan berapa porsi lagi yang bisa dibuat dari stok saat ini (estimated_portions_left), dan kalau memungkinkan berapa hari lagi sebelum stok habis (days_until_stockout) berdasarkan rata-rata penjualan harian.
2. Identifikasi bahan yang jadi "bottleneck" (paling cepat habis / paling membatasi) untuk tiap menu.
3. Tentukan status tiap menu: "aman" (stok cukup >5 hari), "hampir habis" (2-5 hari), atau "kritis" (<2 hari / bisa habis besok).
4. Buat daftar restock_recommendations: bahan apa saja yang perlu dibeli, seberapa mendesak, dan estimasi jumlah yang wajar dibeli (bukan berlebihan, supaya tidak menimbulkan sisa baru).
5. Buat waste_risk_alerts: bahan yang stoknya berlebih/hampir kedaluwarsa dibanding kecepatan pemakaiannya, dengan saran aksi (misal: buat menu promo, kurangi porsi menu tertentu, dsb).
6. Tulis summary singkat (2-3 kalimat) kesimpulan keseluruhan.

Gunakan Bahasa Indonesia. Jawab HANYA dalam format JSON sesuai schema, tanpa teks tambahan.`;

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini API error (${res.status}). Cek API key & nama model di Pengaturan.\n${errBody.slice(0, 300)}`
    );
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";

  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new GeminiError(
      blockReason
        ? `Permintaan diblokir Gemini (${blockReason}). Coba ubah input.`
        : "Gemini tidak mengembalikan hasil. Coba lagi."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("Gagal membaca hasil AI (format tidak sesuai). Coba lagi.");
  }
}

/**
 * Tes cepat koneksi API key — dipakai di halaman Pengaturan.
 */
export async function testGeminiKey({ apiKey, model = "gemini-3.5-flash-lite" } = {}) {
  const key = resolveApiKey(apiKey);
  if (!key) throw new GeminiError("Isi API key dulu (atau set VITE_GEMINI_API_KEY di .env).");

  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Balas dengan satu kata: siap" }] }],
      generationConfig: { maxOutputTokens: 10 },
    }),
  });

  const bodyText = await res.text();
  console.log("[testGeminiKey] status:", res.status);
  console.log("[testGeminiKey] body:", bodyText);

  if (!res.ok) {
    throw new GeminiError(`Key tidak valid atau model salah (${res.status}). ${bodyText.slice(0, 200)}`);
  }
  return true;
}