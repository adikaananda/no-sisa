import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import {
  PackageCheck, PackageX, AlertCircle, AlertTriangle, Sparkles, Loader2,
  KeyRound, Plus, X, Trash2,
} from "lucide-react";
import { Card, Badge, SectionHeading } from "../components/Card";
import { predictedNeeds, inventorySnapshot } from "../lib/sampleData";
import { predictStockOutlook } from "../lib/gemini";
import { getSetting, setJSON, getJSON, KEYS } from "../lib/storage";

const STATUS_MAP = {
  aman: { tone: "leaf", icon: PackageCheck, label: "Aman" },
  "hampir habis": { tone: "amber", icon: AlertCircle, label: "Hampir Habis" },
  "hampir kedaluwarsa": { tone: "danger", icon: PackageX, label: "Hampir Kedaluwarsa" },
};

const OUTLOOK_STATUS_MAP = {
  aman: "leaf",
  "hampir habis": "amber",
  kritis: "danger",
};

const URGENCY_MAP = {
  segera: "danger",
  "minggu ini": "amber",
  "belum perlu": "leaf",
};

const STATUS_OPTIONS = [
  { value: "aman", label: "Aman" },
  { value: "hampir habis", label: "Hampir Habis" },
  { value: "hampir kedaluwarsa", label: "Hampir Kedaluwarsa" },
];

export default function StockPredictor({ onNavigate }) {
  const [menuInput, setMenuInput] = useState("");
  const [dailyPortions, setDailyPortions] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(() => getJSON(KEYS.STOCK_OUTLOOK_HISTORY, null));

  // Bahan tambahan yang diinput manual lewat tombol "Tambah Stok"
  const [customItems, setCustomItems] = useState(() => getJSON(KEYS.CUSTOM_STOCK_ITEMS, []));
  const [showAddModal, setShowAddModal] = useState(false);

  const storedApiKey = getSetting(KEYS.GEMINI_API_KEY);
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const apiKey = storedApiKey || envApiKey;

  const model = getSetting(KEYS.GEMINI_MODEL, "gemini-3.5-flash-lite");

  // Gabungan inventori bawaan + bahan yang ditambahkan manual
  const fullInventory = [...inventorySnapshot, ...customItems];

  function handleAddStock(newItem) {
    const updated = [...customItems, { ...newItem, id: `custom-${Date.now()}` }];
    setCustomItems(updated);
    setJSON(KEYS.CUSTOM_STOCK_ITEMS, updated);
    setShowAddModal(false);
  }

  function handleRemoveCustomItem(id) {
    const updated = customItems.filter((i) => i.id !== id);
    setCustomItems(updated);
    setJSON(KEYS.CUSTOM_STOCK_ITEMS, updated);
  }

  async function handleAnalyze() {
    setError("");
    if (!apiKey) {
      setError("Gemini API key belum diisi.");
      return;
    }
    if (!menuInput.trim()) {
      setError("Isi minimal satu nama menu dulu.");
      return;
    }
    setLoading(true);
    try {
      const data = await predictStockOutlook({
        apiKey,
        model,
        menus: menuInput,
        inventory: fullInventory,
        dailyPortions,
        notes,
      });
      setResult(data);
      setJSON(KEYS.STOCK_OUTLOOK_HISTORY, data);
    } catch (e) {
      setError(e.message || "Terjadi kesalahan saat memanggil Gemini API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-rise relative">
      {/* Tombol fixed pojok kanan atas */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed top-5 right-5 z-40 inline-flex items-center gap-2 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-colors"
      >
        <Plus size={16} />
        Tambah Stok
      </button>

      {showAddModal && (
        <AddStockModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddStock}
        />
      )}

      <Card className="p-6">
        <SectionHeading
          eyebrow="Stock Predictor"
          title="Prediksi Kebutuhan Bahan Baku"
          subtitle="Berdasarkan histori penjualan, jumlah porsi, dan tren permintaan mingguan"
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={predictedNeeds.weekly} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--color-leaf-100)" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-ink-400)", fontSize: 12 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-ink-400)", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "var(--color-leaf-50)" }}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--color-leaf-100)", fontSize: 13 }}
                formatter={(v) => [`${v} porsi`, "Prediksi kebutuhan"]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-leaf-500)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <SectionHeading
          eyebrow="AI Advisor"
          title="Cek Menu vs Stok (AI)"
          subtitle="Masukkan menu yang sedang jalan — AI hitung sisa porsi & rekomendasi belanja supaya nggak kehabisan atau mubazir."
        />

        {!apiKey && (
          <div className="flex items-start gap-3 bg-[#fff8e6] border border-[var(--color-gold-400)]/60 text-[#8a6300] rounded-xl px-4 py-3 mb-5 text-sm">
            <KeyRound size={18} className="shrink-0 mt-0.5" />
            <div>
              Gemini API key belum diatur.{" "}
              <button
                className="font-semibold underline underline-offset-2"
                onClick={() => onNavigate?.("settings")}
              >
                Tambahkan di halaman Pengaturan
              </button>{" "}
              supaya fitur ini bisa dipakai.
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Nama menu (satu per baris)
            </label>
            <textarea
              value={menuInput}
              onChange={(e) => setMenuInput(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none resize-none"
              placeholder={"Nasi Goreng Kampung\nAyam Bakar Madu\nSop Buntut"}
            />
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
                Rata-rata porsi terjual / hari (opsional)
              </label>
              <input
                value={dailyPortions}
                onChange={(e) => setDailyPortions(e.target.value)}
                placeholder="mis. 40 porsi/hari total"
                className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
                Catatan tambahan (opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none resize-none"
                placeholder="mis. weekend biasanya naik 30%"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#fdecec] rounded-xl px-4 py-2.5 mt-4">
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] disabled:opacity-60 text-white text-sm font-semibold px-5 py-3 rounded-xl mt-5 transition-colors"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
          {loading ? "AI sedang menganalisis..." : "Analisis dengan AI"}
        </button>

        {result && (
          <div className="mt-6 space-y-5">
            {result.summary && (
              <p className="rounded-xl bg-leaf-50 p-3 text-sm text-[var(--color-forest-900)]">
                {result.summary}
              </p>
            )}

            {result.menu_outlook?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">
                  Estimasi Ketahanan Stok per Menu
                </h4>
                <div className="space-y-2">
                  {result.menu_outlook.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-leaf-100 p-3"
                    >
                      <div>
                        <p className="font-semibold text-[var(--color-forest-900)]">{m.menu_name}</p>
                        <p className="text-xs text-[var(--color-ink-500)]">
                          ~{m.estimated_portions_left} porsi lagi
                          {m.days_until_stockout ? ` · ${m.days_until_stockout} hari lagi` : ""} · bottleneck:{" "}
                          {m.bottleneck_ingredient}
                        </p>
                        <p className="text-xs text-[var(--color-ink-400)] mt-0.5">{m.note}</p>
                      </div>
                      <Badge tone={OUTLOOK_STATUS_MAP[m.status] || "leaf"}>{m.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.restock_recommendations?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">
                  Rekomendasi Belanja
                </h4>
                <div className="space-y-2">
                  {result.restock_recommendations.map((r, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-leaf-100 p-3"
                    >
                      <div>
                        <p className="font-semibold text-[var(--color-forest-900)]">
                          {r.ingredient}{" "}
                          <span className="font-normal text-[var(--color-ink-500)]">— {r.suggested_qty}</span>
                        </p>
                        <p className="text-xs text-[var(--color-ink-400)]">{r.reason}</p>
                      </div>
                      <Badge tone={URGENCY_MAP[r.urgency] || "leaf"}>{r.urgency}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.waste_risk_alerts?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">
                  Risiko Bahan Terbuang
                </h4>
                <div className="space-y-2">
                  {result.waste_risk_alerts.map((w, idx) => (
                    <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="font-semibold text-[var(--color-forest-900)]">{w.ingredient}</p>
                      <p className="text-xs text-[var(--color-ink-500)]">{w.reason}</p>
                      <p className="text-xs text-[var(--color-ink-400)] mt-1">Saran: {w.suggested_action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <SectionHeading
          eyebrow="Inventori Saat Ini"
          title="Status Stok per Bahan"
          subtitle="Rekomendasi jumlah pembelian akan mengikuti status di bawah ini"
        />
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-ink-400)]">
                <th className="px-2 py-2 font-semibold">Bahan</th>
                <th className="px-2 py-2 font-semibold">Stok saat ini</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {fullInventory.map((item) => {
                const s = STATUS_MAP[item.status];
                const Icon = s.icon;
                const isCustom = item.id?.toString().startsWith("custom-");
                return (
                  <tr key={item.id} className="border-t border-leaf-100/70">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        {item.img ? (
                          <img src={item.img} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-leaf-50 flex items-center justify-center text-[var(--color-leaf-500)] text-xs font-bold">
                            {item.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-[var(--color-forest-900)]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-[var(--color-ink-600)]">{item.stock}</td>
                    <td className="px-2 py-3">
                      <Badge tone={s.tone}>
                        <Icon size={12} />
                        {s.label}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-right">
                      {isCustom && (
                        <button
                          onClick={() => handleRemoveCustomItem(item.id)}
                          className="text-[var(--color-ink-400)] hover:text-red-600 transition-colors"
                          title="Hapus bahan ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AddStockModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [status, setStatus] = useState("aman");
  const [formError, setFormError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !stock.trim()) {
      setFormError("Nama bahan dan jumlah stok wajib diisi.");
      return;
    }
    onSave({ name: name.trim(), stock: stock.trim(), status });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--color-forest-900)]">Tambah Stok Bahan</h3>
          <button onClick={onClose} className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Nama bahan
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Wortel"
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Jumlah stok
            </label>
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="mis. 5 kg / 20 pcs"
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#fdecec] rounded-xl px-3.5 py-2">
              <AlertTriangle size={14} className="shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-leaf-100 text-sm font-semibold px-4 py-2.5 text-[var(--color-forest-900)] hover:bg-leaf-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] text-white text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}