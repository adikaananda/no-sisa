import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Wallet,
  Target,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Loader2,
  PlugZap,
  ArrowRight,
} from "lucide-react";
import { Card, Badge, SectionHeading } from "../components/Card";
import { getJSON, getSetting, setJSON, setSetting, KEYS } from "../lib/storage";
import { computeLossAnalysis, generateMockSyncBatch } from "../lib/salesIntegration";

const CAUSE_COLORS = {
  "Over-production": "var(--color-amber-500)",
  "Sesuai Prediksi": "var(--color-leaf-500)",
  "Permintaan Melebihi Prediksi": "var(--color-forest-900)",
};

function fmtRp(n) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function LossAnalysis({ onNavigate }) {
  const [records, setRecords] = useState(() => getJSON(KEYS.SALES_RECORDS, []));
  const [posStatus, setPosStatus] = useState(() => getSetting(KEYS.POS_STATUS, "disconnected"));
  const [syncing, setSyncing] = useState(false);

  const analysis = useMemo(() => (records.length ? computeLossAnalysis(records) : null), [records]);

  async function handleResync() {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 700));
    const { records: fresh } = generateMockSyncBatch({ seed: Date.now() });
    setJSON(KEYS.SALES_RECORDS, fresh);
    setSetting(KEYS.POS_STATUS, "connected");
    setSetting(KEYS.POS_LAST_SYNC, new Date().toISOString());
    setRecords(fresh);
    setPosStatus("connected");
    setSyncing(false);
  }

  if (posStatus !== "connected" || records.length === 0) {
    return (
      <div className="animate-rise max-w-xl">
        <Card className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-leaf-50 grid place-items-center mx-auto mb-4 text-[var(--color-leaf-500)]">
            <PlugZap size={26} />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-forest-900)]">
            Belum ada data penjualan tersinkron
          </h2>
          <p className="text-sm text-[var(--color-ink-600)] mt-2">
            Hubungkan sistem kasir/POS kamu di halaman Pengaturan supaya No Sisa bisa membandingkan
            realisasi penjualan dengan prediksi AI, dan menghitung estimasi kerugian dalam Rupiah.
          </p>
          <button
            onClick={() => onNavigate?.("settings")}
            className="inline-flex items-center gap-2 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl mt-6 transition-colors"
          >
            Buka Pengaturan Integrasi POS <ArrowRight size={15} />
          </button>
        </Card>
      </div>
    );
  }

  const { perMenu, totalLostRevenue, forecastAccuracy, causeDistribution, biggestCause, worstMenu } =
    analysis;

  const chartData = perMenu.map((m) => ({
    menu: m.menu.length > 12 ? m.menu.slice(0, 11) + "…" : m.menu,
    Prediksi: m.qtyForecast,
    Realisasi: m.qtySold,
  }));

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[var(--color-ink-600)] max-w-lg">
          Rekonsiliasi otomatis antara data <b>penjualan (POS)</b>, <b>prediksi AI Food Planner</b>, dan{" "}
          <b>resep (BOM)</b> untuk mengukur kerugian riil — bukan cuma estimasi stok.
        </p>
        <button
          onClick={handleResync}
          disabled={syncing}
          className="inline-flex items-center gap-2 bg-white border border-leaf-100 hover:bg-leaf-50 disabled:opacity-60 text-[var(--color-forest-900)] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Sinkronkan ulang
        </button>
      </div>

      {/* KPI row */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-[#fdecec] grid place-items-center text-[#c0392b] mb-3">
            <Wallet size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Estimasi Kerugian
          </p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">
            {fmtRp(totalLostRevenue)}
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">Dari selisih over-production, hari ini</p>
        </Card>

        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-leaf-50 grid place-items-center text-[var(--color-leaf-500)] mb-3">
            <Target size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Akurasi Prediksi AI
          </p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">
            {forecastAccuracy}%
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">Realisasi vs prediksi Food Planner</p>
        </Card>

        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-[#fff2e0] grid place-items-center text-[var(--color-amber-500)] mb-3">
            <AlertTriangle size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Penyebab Terbesar
          </p>
          <p className="text-lg font-extrabold text-[var(--color-forest-900)] mt-1.5 leading-tight">
            {biggestCause}
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">Kategori kerugian dominan</p>
        </Card>

        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-leaf-50 grid place-items-center text-[var(--color-leaf-500)] mb-3">
            <TrendingDown size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Menu Paling Boros
          </p>
          <p className="text-lg font-extrabold text-[var(--color-forest-900)] mt-1.5 leading-tight truncate">
            {worstMenu?.menu ?? "-"}
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">
            {worstMenu ? fmtRp(worstMenu.lostRevenue) : "-"} berpotensi rugi
          </p>
        </Card>
      </div>

      {/* Prediksi vs Realisasi + root cause */}
      <div className="grid lg:grid-cols-[1.3fr,1fr] gap-6">
        <Card className="p-6">
          <SectionHeading
            eyebrow="Rekonsiliasi Penjualan"
            title="Prediksi vs Realisasi per Menu"
            subtitle="Semakin besar gap, semakin besar potensi bahan terbuang atau permintaan tak terlayani"
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-leaf-100)" />
                <XAxis
                  dataKey="menu"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-ink-400)", fontSize: 11 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-ink-400)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-leaf-100)", fontSize: 13 }}
                  formatter={(v) => [`${v} porsi`]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Prediksi" fill="var(--color-leaf-100)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Realisasi" fill="var(--color-forest-900)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading eyebrow="Root Cause" title="Distribusi Penyebab Kerugian" />
          <div className="h-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={causeDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={3}
                  stroke="none"
                >
                  {causeDistribution.map((entry, i) => (
                    <Cell key={i} fill={CAUSE_COLORS[entry.name] || "var(--color-ink-400)"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-leaf-100)", fontSize: 13 }}
                  formatter={(v, n) => [`${v}%`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1.5 mt-2">
            {causeDistribution.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[var(--color-ink-600)]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: CAUSE_COLORS[c.name] || "var(--color-ink-400)" }}
                />
                {c.name} — {c.value}%
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Detail table */}
      <Card className="p-6">
        <SectionHeading eyebrow="Detail per Menu" title="Rincian Rekonsiliasi & Rekomendasi" />
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
                <th className="px-2 py-2">Menu</th>
                <th className="px-2 py-2">Prediksi</th>
                <th className="px-2 py-2">Realisasi</th>
                <th className="px-2 py-2">Deviasi</th>
                <th className="px-2 py-2">Penyebab</th>
                <th className="px-2 py-2">Est. Kerugian</th>
              </tr>
            </thead>
            <tbody>
              {perMenu.map((m) => (
                <tr key={m.menu} className="border-t border-leaf-100/70">
                  <td className="px-2 py-3 font-semibold text-[var(--color-forest-900)]">{m.menu}</td>
                  <td className="px-2 py-3 text-[var(--color-ink-600)]">{m.qtyForecast} porsi</td>
                  <td className="px-2 py-3 text-[var(--color-ink-600)]">{m.qtySold} porsi</td>
                  <td className="px-2 py-3">
                    <span
                      className={
                        m.deviationPct < 0 ? "text-[#c0392b]" : m.deviationPct > 0 ? "text-[var(--color-forest-900)]" : "text-[var(--color-leaf-500)]"
                      }
                    >
                      {m.deviationPct > 0 ? "+" : ""}
                      {m.deviationPct}%
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <Badge
                      tone={
                        m.cause === "Over-production"
                          ? "danger"
                          : m.cause === "Sesuai Prediksi"
                          ? "leaf"
                          : "amber"
                      }
                    >
                      {m.cause}
                    </Badge>
                  </td>
                  <td className="px-2 py-3 font-semibold text-[var(--color-forest-900)]">
                    {m.lostRevenue > 0 ? fmtRp(m.lostRevenue) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--color-ink-400)] mt-4">
          Estimasi kerugian dihitung dari selisih porsi (prediksi − realisasi) × harga jual × asumsi rasio
          biaya bahan baku 35% — lalu dipetakan ke bahan baku lewat resep (BOM) tiap menu.
        </p>
      </Card>
    </div>
  );
}
