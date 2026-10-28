import { useState } from "react";
import { History, AlertTriangle } from "lucide-react";
import { Card, SectionHeading } from "../../components/Card";
import {
  useCircularData,
  useToast,
  usePickupDetail,
  Toast,
  PickupStatusBadge,
  PickupDetailModal,
  PathwayDot,
  SimBadge,
  FilterChips,
  EmptyState,
  INPUT,
  fmtKg,
  fmtDate,
  fmtDateTime,
} from "../../components/Circular";
import { PATHWAYS, PATHWAY_ORDER, DISCREPANCY_THRESHOLD_PCT, isPickupActive } from "../../lib/circularRecovery";

const STATUS_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "diterima", label: "Diterima" },
  { id: "aktif", label: "Dalam proses" },
  { id: "dibatalkan", label: "Dibatalkan" },
];

export default function RecoveryHistory({ onNavigate }) {
  const data = useCircularData();
  const { records, pickups } = data;
  const { toast, notify, clear } = useToast();
  const detail = usePickupDetail({ pickups, updatePickupStatus: data.updatePickupStatus, notify });
  const [status, setStatus] = useState("all");
  const [pathway, setPathway] = useState("all");

  const visible = [...pickups]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((p) =>
      status === "all" ? true : status === "aktif" ? isPickupActive(p) : p.status === status
    )
    .filter((p) => pathway === "all" || p.pathway === pathway);

  const countOf = (id) =>
    id === "all" ? pickups.length : id === "aktif" ? pickups.filter(isPickupActive).length : pickups.filter((p) => p.status === id).length;

  return (
    <div className="space-y-6 animate-rise">
      <Toast toast={toast} onClose={clear} />
      {detail.open && (
        <PickupDetailModal
          pickup={detail.open}
          records={records}
          onClose={() => detail.setOpenId(null)}
          onTransition={detail.onTransition}
        />
      )}

      <Card className="p-6">
        <SectionHeading
          eyebrow="Recovery History"
          title="Riwayat penyaluran & verifikasi"
          subtitle="Berat awal (tercatat dapur) dibandingkan dengan berat aktual yang dikonfirmasi mitra"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <FilterChips
            label="Filter status"
            value={status}
            onChange={setStatus}
            options={STATUS_FILTERS.map((f) => ({ ...f, count: countOf(f.id) }))}
          />
          <select
            value={pathway}
            onChange={(e) => setPathway(e.target.value)}
            aria-label="Filter jalur pengolahan"
            className={`${INPUT} sm:w-48`}
          >
            <option value="all">Semua jalur</option>
            {PATHWAY_ORDER.map((id) => (
              <option key={id} value={id}>
                {PATHWAYS[id].label}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={History}
            title={pickups.length ? "Tidak ada transaksi yang cocok dengan filter" : "Belum ada riwayat penyaluran"}
            action={
              !pickups.length && (
                <button
                  onClick={() => onNavigate("cr-pickups")}
                  className="text-sm font-semibold text-[var(--color-leaf-500)]"
                >
                  Ajukan pengambilan pertama
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
                  <th className="px-2 py-2">Diajukan</th>
                  <th className="px-2 py-2">Mitra</th>
                  <th className="px-2 py-2">Jadwal</th>
                  <th className="px-2 py-2">Berat awal</th>
                  <th className="px-2 py-2">Diterima</th>
                  <th className="px-2 py-2">Selisih</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const v = p.verification;
                  const flagged = v && Math.abs(v.diffPct) > DISCREPANCY_THRESHOLD_PCT;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => detail.setOpenId(p.id)}
                      className="border-t border-leaf-100/70 hover:bg-leaf-50/60 cursor-pointer"
                    >
                      <td className="px-2 py-3 text-[var(--color-ink-600)] whitespace-nowrap">{fmtDateTime(p.createdAt)}</td>
                      <td className="px-2 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            detail.setOpenId(p.id);
                          }}
                          className="font-semibold text-[var(--color-forest-900)] text-left hover:underline"
                        >
                          {p.partnerName}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          <PathwayDot pathway={p.pathway} />
                          {p.simulated && <SimBadge />}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-[var(--color-ink-600)] whitespace-nowrap">
                        {fmtDate(p.date)}
                        <span className="block text-[11px] text-[var(--color-ink-400)]">{p.slot}</span>
                      </td>
                      <td className="px-2 py-3 text-[var(--color-forest-900)] font-semibold">{fmtKg(p.plannedKg)}</td>
                      <td className="px-2 py-3 text-[var(--color-forest-900)] font-semibold">{v ? fmtKg(v.actualKg) : "—"}</td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        {v ? (
                          <span className={`inline-flex items-center gap-1 ${flagged ? "text-[#c0392b]" : "text-[var(--color-ink-600)]"}`}>
                            {flagged && <AlertTriangle size={13} />}
                            {v.diffKg > 0 ? "+" : ""}
                            {fmtKg(v.diffKg)} ({v.diffPct > 0 ? "+" : ""}
                            {v.diffPct}%)
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <PickupStatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-[var(--color-ink-400)] mt-4">
          Selisih di atas {DISCREPANCY_THRESHOLD_PCT}% ditandai untuk ditinjau. Hanya transaksi berstatus Diterima yang
          dihitung sebagai limbah berhasil disalurkan.
        </p>
      </Card>
    </div>
  );
}
