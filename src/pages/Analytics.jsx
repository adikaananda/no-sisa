import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from "recharts";
import { Leaf, TrendingUp, Wallet, Recycle, ChevronRight } from "lucide-react";
import { Card, SectionHeading } from "../components/Card";
import { analytics } from "../lib/sampleData";
import { useCircularData, fmtKg } from "../components/Circular";
import { computeCircularStats } from "../lib/circularRecovery";

export default function Analytics({ onNavigate }) {
  const { records, pickups } = useCircularData();
  const circular = computeCircularStats(records, pickups);

  return (
    <div className="space-y-6 animate-rise">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-leaf-50 grid place-items-center text-[var(--color-leaf-500)] mb-3">
            <TrendingUp size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Food Waste Berkurang
          </p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">
            {analytics.foodWasteReducedKg} kg
            <span className="text-sm font-semibold text-[var(--color-leaf-500)] ml-2">
              ↑ {analytics.foodWasteReducedChangePct}%
            </span>
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">Bulan ini</p>
        </Card>

        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-[#fff2e0] grid place-items-center text-[var(--color-amber-500)] mb-3">
            <Leaf size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            CO₂e Impact Saved
          </p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">
            {analytics.co2ImpactKg} kg
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">Setara emisi yang dicegah</p>
        </Card>

        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-[#fff8e6] grid place-items-center text-[#a67c00] mb-3">
            <Wallet size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Estimasi Penghematan
          </p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">
            Rp {(analytics.savingsIdr / 1000000).toFixed(1)} jt
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">Biaya bahan baku, bulan ini</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr,1.2fr] gap-6">
        <Card className="p-6">
          <SectionHeading eyebrow="Distribusi" title="Waste by Category" />
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.wasteByCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  stroke="none"
                >
                  {analytics.wasteByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-leaf-100)", fontSize: 13 }}
                  formatter={(v, n) => [`${v}%`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-xl font-extrabold text-[var(--color-forest-900)]">45%</div>
                <div className="text-[11px] text-[var(--color-ink-400)]">Sayuran</div>
              </div>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-2 mt-3">
            {analytics.wasteByCategory.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-[var(--color-ink-600)]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                {c.name} — {c.value}%
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <SectionHeading eyebrow="4 Minggu Terakhir" title="Tren Waste vs Penghematan" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlyTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="wasteFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-amber-500)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-amber-500)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="savedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-leaf-500)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-leaf-500)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-leaf-100)" />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-ink-400)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--color-leaf-100)", fontSize: 13 }}
                />
                <Area
                  type="monotone"
                  dataKey="waste"
                  name="Waste (kg)"
                  stroke="var(--color-amber-500)"
                  fill="url(#wasteFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="saved"
                  name="Penghematan (%)"
                  stroke="var(--color-leaf-500)"
                  fill="url(#savedFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Circular Recovery — dihitung dari catatan & transaksi nyata di modul tersebut */}
      <Card className="p-6">
        <SectionHeading
          eyebrow="Circular Recovery"
          title="Penyaluran limbah ke mitra pengolah"
          subtitle="Dari catatan limbah & transaksi di modul Circular Recovery — bukan data contoh"
          action={
            <button
              onClick={() => onNavigate?.("cr-impact")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-leaf-500)] shrink-0"
            >
              Lihat detail <ChevronRight size={15} />
            </button>
          }
        />
        {circular.recordCount === 0 ? (
          <p className="text-sm text-[var(--color-ink-400)] flex items-center gap-2">
            <Recycle size={16} className="text-[var(--color-leaf-500)]" />
            Belum ada limbah yang dicatat di Circular Recovery.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Tercatat", fmtKg(circular.totalRecordedKg)],
              ["Diterima mitra", fmtKg(circular.receivedKg)],
              ["Menunggu penyaluran", fmtKg(circular.pendingKg)],
              ["Keberhasilan", circular.successRate == null ? "—" : `${circular.successRate}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-leaf-50 p-4">
                <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">{label}</p>
                <p className="text-xl font-extrabold text-[var(--color-forest-900)] mt-1">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
