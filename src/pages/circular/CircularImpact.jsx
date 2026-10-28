import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Recycle, CheckCircle2, Hourglass, Target, Wallet, Coins, Scale, Leaf, PieChart as PieIcon } from "lucide-react";
import { Card, SectionHeading } from "../../components/Card";
import { useCircularData, StatCard, EmptyState, SimulationNote, fmtKg, fmtRp } from "../../components/Circular";
import { computeCircularStats, DISCREPANCY_THRESHOLD_PCT } from "../../lib/circularRecovery";

const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid var(--color-leaf-100)", fontSize: 13 };

export default function CircularImpact({ onNavigate }) {
  const { records, pickups } = useCircularData();
  const stats = useMemo(() => computeCircularStats(records, pickups), [records, pickups]);
  const pathwayData = stats.receivedByPathway.filter((p) => p.value > 0);
  const categoryData = stats.byCategory.map((c) => ({
    name: c.name.replace("Sisa ", "").replace("Limbah organik ", ""),
    "Belum disalurkan": c.belum,
    "Dalam proses": c.dalam_proses,
    Diterima: c.diterima,
  }));

  if (records.length === 0) {
    return (
      <div className="animate-rise max-w-xl">
        <Card className="p-2">
          <EmptyState
            icon={Recycle}
            title="Belum ada data dampak"
            action={
              <button onClick={() => onNavigate("cr-recording")} className="text-sm font-semibold text-[var(--color-leaf-500)]">
                Catat limbah pertama
              </button>
            }
          >
            Dampak sirkular dihitung dari catatan limbah dan transaksi yang sudah dikonfirmasi mitra.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      {pickups.some((p) => p.simulated) && (
        <SimulationNote>
          Angka di bawah dihitung dari transaksi dengan <b>mitra demo (simulasi)</b>. Biaya dan nilai material memakai
          tarif simulasi saat pengajuan.
        </SimulationNote>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Recycle} label="Total Tercatat" value={fmtKg(stats.totalRecordedKg)} hint={`${stats.recordCount} catatan limbah`} />
        <StatCard
          icon={CheckCircle2}
          tone="forest"
          label="Diterima Mitra"
          value={fmtKg(stats.receivedKg)}
          hint={`Berat aktual dari ${stats.receivedCount} transaksi terkonfirmasi`}
        />
        <StatCard
          icon={Hourglass}
          tone="amber"
          label="Menunggu Penyaluran"
          value={fmtKg(stats.pendingKg)}
          hint={`${fmtKg(stats.unassignedKg)} belum diajukan · ${fmtKg(stats.inProcessKg)} dalam proses`}
        />
        <StatCard
          icon={Target}
          tone="gold"
          label="Tingkat Keberhasilan"
          value={stats.successRate == null ? "—" : `${stats.successRate}%`}
          hint={
            stats.successRate == null
              ? "Belum ada transaksi yang selesai"
              : `${stats.receivedCount} diterima · ${stats.cancelledCount} dibatalkan`
          }
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
        <Card className="p-6">
          <SectionHeading eyebrow="Terverifikasi" title="Distribusi per jalur pengolahan" />
          {pathwayData.length === 0 ? (
            <EmptyState icon={PieIcon} title="Belum ada limbah diterima mitra">
              Grafik muncul setelah mitra mengonfirmasi penerimaan.
            </EmptyState>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pathwayData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} stroke="none">
                      {pathwayData.map((p) => (
                        <Cell key={p.id} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtKg(v), n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 mt-2">
                {stats.receivedByPathway.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-xs text-[var(--color-ink-600)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="flex-1">{p.name}</span>
                    <b className="text-[var(--color-forest-900)]">{fmtKg(p.value)}</b>
                    {stats.receivedKg > 0 && <span>({Math.round((p.value / stats.receivedKg) * 100)}%)</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading
            eyebrow="Per Kategori"
            title="Status penyaluran limbah"
            subtitle="Berdasarkan berat awal yang dicatat dapur"
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-leaf-100)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-ink-400)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-ink-400)", fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtKg(v), n]} cursor={{ fill: "var(--color-leaf-50)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Diterima" stackId="a" fill="var(--color-forest-900)" />
                <Bar dataKey="Dalam proses" stackId="a" fill="var(--color-amber-500)" />
                <Bar dataKey="Belum disalurkan" stackId="a" fill="var(--color-leaf-100)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-[#fdecec] grid place-items-center text-[#c0392b] mb-3">
            <Wallet size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">Biaya Pengelolaan</p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">{fmtRp(stats.managementCost)}</p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">Tarif angkut × berat aktual, transaksi diterima</p>
        </Card>

        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-[#fff8e6] grid place-items-center text-[#a67c00] mb-3">
            <Coins size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">Nilai Ekonomi Dipulihkan</p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">
            {stats.recoveredValue == null ? "—" : fmtRp(stats.recoveredValue)}
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">
            {stats.recoveredValue == null
              ? "Tidak tersedia — mitra penerima tidak mencantumkan nilai material"
              : "Nilai material per kg dari mitra × berat aktual"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="w-9 h-9 rounded-lg bg-leaf-50 grid place-items-center text-[var(--color-leaf-500)] mb-3">
            <Scale size={17} />
          </div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">Verifikasi Berat</p>
          <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">
            {stats.weightDiffKg > 0 ? "+" : ""}
            {fmtKg(stats.weightDiffKg)}
          </p>
          <p className="text-xs text-[var(--color-ink-400)] mt-1">
            Selisih berat diterima vs tercatat ({fmtKg(stats.receivedPlannedKg)} awal) · {stats.discrepancyCount} transaksi
            selisih &gt;{DISCREPANCY_THRESHOLD_PCT}%
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-leaf-50 grid place-items-center text-[var(--color-leaf-500)] shrink-0">
            <Leaf size={17} />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--color-forest-900)]">Estimasi dampak lingkungan belum ditampilkan</p>
            <p className="text-sm text-[var(--color-ink-600)] mt-1">
              Estimasi emisi (CO₂e) untuk tiap jalur pengolahan butuh metode dan faktor emisi yang terverifikasi untuk
              mitra terkait. Faktor tersebut belum tersedia, jadi angka dampak lingkungan tidak dihitung agar tidak
              menyesatkan.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
