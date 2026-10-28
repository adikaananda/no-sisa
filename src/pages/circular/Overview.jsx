import { useMemo } from "react";
import {
  ClipboardList,
  Sparkles,
  Handshake,
  Truck,
  Scale,
  TrendingUp,
  Recycle,
  Hourglass,
  CheckCircle2,
  Target,
  ChevronRight,
  ChefHat,
  PackageSearch,
} from "lucide-react";
import { Card, SectionHeading } from "../../components/Card";
import { useCircularData, StatCard, EmptyState, fmtKg, fmtRp, BTN_SECONDARY } from "../../components/Circular";
import { analyzeWasteRules, computeCircularStats, recordStatusMap } from "../../lib/circularRecovery";

export default function CircularOverview({ onNavigate }) {
  const { records, pickups, partners } = useCircularData();
  const stats = useMemo(() => computeCircularStats(records, pickups), [records, pickups]);

  const status = recordStatusMap(records, pickups);
  const unassigned = records.filter((r) => status[r.id] === "belum");
  const needsData = unassigned.filter((r) => !analyzeWasteRules(r).sufficient);
  const readyToMatch = unassigned.length - needsData.length;
  const awaitingPartner = pickups.filter((p) => ["menunggu", "disetujui", "terjadwal"].includes(p.status));
  const awaitingVerification = pickups.filter((p) => p.status === "dalam_pengambilan");
  const awaitingPayment = pickups.filter((p) => p.payment?.status === "menunggu");

  const steps = [
    { id: "cr-recording", icon: ClipboardList, title: "Record", desc: "Catat limbah", value: `${records.length} catatan` },
    { id: "cr-analysis", icon: Sparkles, title: "Analyze", desc: "Rekomendasi jalur", value: `${records.length - needsData.length} siap` },
    { id: "cr-partners", icon: Handshake, title: "Match", desc: "Cocokkan mitra", value: `${partners.length} mitra` },
    { id: "cr-pickups", icon: Truck, title: "Collect", desc: "Jadwal pengambilan", value: `${stats.activeCount} aktif` },
    { id: "cr-history", icon: Scale, title: "Verify", desc: "Konfirmasi berat", value: `${stats.receivedCount} terverifikasi` },
    { id: "cr-impact", icon: TrendingUp, title: "Measure", desc: "Dampak sirkular", value: fmtKg(stats.receivedKg) },
  ];

  const todos = [
    needsData.length > 0 && {
      label: `${needsData.length} catatan limbah perlu dilengkapi datanya`,
      page: "cr-analysis",
      cta: "Lengkapi",
    },
    readyToMatch > 0 && {
      label: `${readyToMatch} catatan limbah siap dicarikan mitra`,
      page: "cr-partners",
      cta: "Cari mitra",
    },
    awaitingPartner.length > 0 && {
      label: `${awaitingPartner.length} pengambilan menunggu proses mitra`,
      page: "cr-pickups",
      cta: "Pantau",
    },
    awaitingVerification.length > 0 && {
      label: `${awaitingVerification.length} pengambilan menunggu konfirmasi penerimaan`,
      page: "cr-pickups",
      cta: "Verifikasi",
    },
    awaitingPayment.length > 0 && {
      label: `${awaitingPayment.length} pembayaran limbah (${fmtRp(stats.incomePending)}) menunggu konfirmasi mitra`,
      page: "cr-pickups",
      cta: "Cek pembayaran",
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6 animate-rise">

      <Card className="p-6">
        <SectionHeading
          eyebrow="Alur Circular Recovery"
          title="Record → Analyze → Match → Collect → Verify → Measure"
          subtitle="Klik setiap tahap untuk membuka halamannya"
        />
        <ol className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.id}>
                <button
                  onClick={() => onNavigate(s.id)}
                  className="w-full h-full text-left rounded-xl border border-leaf-100 hover:border-[var(--color-leaf-500)] hover:bg-leaf-50 p-4 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="w-9 h-9 rounded-lg bg-leaf-50 grid place-items-center text-[var(--color-leaf-500)]">
                      <Icon size={17} />
                    </span>
                    <span className="text-xs font-bold text-[var(--color-ink-400)]">{i + 1}</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--color-forest-900)]">{s.title}</p>
                  <p className="text-xs text-[var(--color-ink-400)]">{s.desc}</p>
                  <p className="text-xs font-semibold text-[var(--color-leaf-500)] mt-2">{s.value}</p>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Recycle} label="Limbah Tercatat" value={fmtKg(stats.totalRecordedKg)} hint={`${stats.recordCount} catatan`} />
        <StatCard
          icon={CheckCircle2}
          tone="forest"
          label="Diterima Mitra"
          value={fmtKg(stats.receivedKg)}
          hint="Hanya transaksi yang sudah dikonfirmasi"
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
          label="Keberhasilan Penyaluran"
          value={stats.successRate == null ? "—" : `${stats.successRate}%`}
          hint={stats.successRate == null ? "Belum ada transaksi selesai" : "Diterima ÷ (diterima + dibatalkan)"}
        />
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <Card className="p-6">
          <SectionHeading eyebrow="Perlu Tindakan" title="Langkah berikutnya" />
          {todos.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={records.length ? "Semua catatan sudah diproses" : "Belum ada catatan limbah"}
              action={
                <button onClick={() => onNavigate("cr-recording")} className={BTN_SECONDARY}>
                  Catat limbah <ChevronRight size={15} />
                </button>
              }
            >
              {records.length
                ? "Tidak ada catatan atau pengambilan yang menunggu tindakan."
                : "Mulai dengan mencatat limbah organik yang tetap terjadi hari ini — berat dari timbangan atau input staf."}
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {todos.map((t) => (
                <li
                  key={t.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-leaf-100 px-4 py-3"
                >
                  <span className="text-sm text-[var(--color-forest-900)]">{t.label}</span>
                  <button
                    onClick={() => onNavigate(t.page)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-leaf-500)] shrink-0"
                  >
                    {t.cta} <ChevronRight size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading
            eyebrow="Cegah Dulu"
            title="Pencegahan tetap prioritas"
            subtitle="Circular Recovery melengkapi — bukan menggantikan — fitur pencegahan No Sisa."
          />
          <div className="space-y-2">
            <button
              onClick={() => onNavigate("menu-planner")}
              className="w-full flex items-center gap-3 rounded-xl bg-leaf-50 hover:bg-[var(--color-leaf-100)] px-4 py-3 text-left transition-colors"
            >
              <ChefHat size={18} className="text-[var(--color-leaf-500)] shrink-0" />
              <span className="flex-1 text-sm font-semibold text-[var(--color-forest-900)]">
                Olah bahan hampir kedaluwarsa jadi menu
              </span>
              <ChevronRight size={15} className="text-[var(--color-ink-400)]" />
            </button>
            <button
              onClick={() => onNavigate("stock-predictor")}
              className="w-full flex items-center gap-3 rounded-xl bg-leaf-50 hover:bg-[var(--color-leaf-100)] px-4 py-3 text-left transition-colors"
            >
              <PackageSearch size={18} className="text-[var(--color-leaf-500)] shrink-0" />
              <span className="flex-1 text-sm font-semibold text-[var(--color-forest-900)]">
                Cek risiko bahan terbuang di Stock Predictor
              </span>
              <ChevronRight size={15} className="text-[var(--color-ink-400)]" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
