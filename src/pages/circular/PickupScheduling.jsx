import { useState } from "react";
import { Truck, Plus, X, ChevronRight, CalendarDays } from "lucide-react";
import { Card, SectionHeading } from "../../components/Card";
import {
  useCircularData,
  useToast,
  Toast,
  SimulationNote,
  SimBadge,
  PickupStatusBadge,
  PickupDetailModal,
  usePickupDetail,
  PathwayDot,
  FilterChips,
  EmptyState,
  ErrorBox,
  INPUT,
  LABEL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  fmtKg,
  fmtRp,
  fmtDate,
} from "../../components/Circular";
import {
  PICKUP_STATUSES,
  WASTE_CATEGORIES,
  labelOf,
  analyzeWasteRules,
  evaluatePartner,
  validatePickupRequest,
  createPickup,
  recordStatusMap,
  nextPickupDate,
  pickupDaysLabel,
  isPickupActive,
  toISODate,
} from "../../lib/circularRecovery";

export default function PickupScheduling({ onNavigate, params }) {
  const data = useCircularData();
  const { records, pickups, partners, origin, savePickups } = data;
  const { toast, notify, clear } = useToast();
  const detail = usePickupDetail({ pickups, updatePickupStatus: data.updatePickupStatus, notify });

  const status = recordStatusMap(records, pickups);
  const ready = records.filter((r) => status[r.id] === "belum" && analyzeWasteRules(r).sufficient);

  const initialPartner = partners.find((p) => p.id === params?.partnerId);
  const [showForm, setShowForm] = useState(!!initialPartner);
  const [partnerId, setPartnerId] = useState(initialPartner?.id ?? "");
  const [recordIds, setRecordIds] = useState(() =>
    (params?.recordIds || []).filter((id) => ready.some((r) => r.id === id))
  );
  const [date, setDate] = useState(initialPartner ? nextPickupDate(initialPartner) ?? "" : "");
  const [slot, setSlot] = useState(initialPartner?.timeSlots[0] ?? "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState([]);
  const [filter, setFilter] = useState("active");

  const partner = partners.find((p) => p.id === partnerId);
  const selected = ready.filter((r) => recordIds.includes(r.id));
  const evaluation = partner && selected.length ? evaluatePartner(partner, { records: selected, pickups, origin }) : null;

  function selectPartner(id) {
    const p = partners.find((x) => x.id === id);
    setPartnerId(id);
    setDate(p ? nextPickupDate(p) ?? "" : "");
    setSlot(p?.timeSlots[0] ?? "");
    setErrors([]);
  }

  function resetForm() {
    setShowForm(false);
    setPartnerId("");
    setRecordIds([]);
    setDate("");
    setSlot("");
    setNotes("");
    setErrors([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validatePickupRequest({ partner, records: selected, date, slot, pickups, origin });
    setErrors(errs);
    if (errs.length) return;
    const pickup = createPickup({ partner, records: selected, date, slot, notes });
    if (!savePickups([...pickups, pickup])) {
      notify("error", "Gagal menyimpan permintaan pengambilan.");
      return;
    }
    resetForm();
    notify("success", `Permintaan dibuat — menunggu konfirmasi ${partner.simulated ? "mitra (simulasi)" : "mitra"}.`);
    detail.setOpenId(pickup.id);
  }

  const sorted = [...pickups].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visible = sorted.filter((p) => (filter === "active" ? isPickupActive(p) : p.status === filter));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

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

      <SimulationNote>
        Belum ada integrasi dengan mitra sungguhan. Permintaan dikirim ke <b>mitra demo</b>; aksi mitra (terima, tolak,
        jadwal, konfirmasi penerimaan) disimulasikan di detail transaksi dan tidak berarti pengambilan benar-benar
        terjadi.
      </SimulationNote>

      {showForm ? (
        <Card className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="Pickup Scheduling"
            title="Ajukan jadwal pengambilan"
            action={
              <button onClick={resetForm} aria-label="Tutup formulir" className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
                <X size={18} />
              </button>
            }
          />
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={LABEL} htmlFor="pk-partner">
                  Mitra pengolah
                </label>
                <select id="pk-partner" value={partnerId} onChange={(e) => selectPartner(e.target.value)} className={INPUT}>
                  <option value="">Pilih mitra...</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {partner && (
                  <p className="text-xs text-[var(--color-ink-400)] mt-1.5">
                    Hari layanan: {pickupDaysLabel(partner)} · min. {fmtKg(partner.minPickupKg)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL} htmlFor="pk-date">
                    Tanggal
                  </label>
                  <input
                    id="pk-date"
                    type="date"
                    min={toISODate(tomorrow)}
                    value={date}
                    disabled={!partner}
                    onChange={(e) => setDate(e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="pk-slot">
                    Slot waktu
                  </label>
                  <select id="pk-slot" value={slot} disabled={!partner} onChange={(e) => setSlot(e.target.value)} className={INPUT}>
                    {(partner?.timeSlots || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <fieldset>
              <legend className={LABEL}>Limbah yang diangkut</legend>
              {ready.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-400)]">
                  Tidak ada limbah siap disalurkan.{" "}
                  <button type="button" onClick={() => onNavigate("cr-recording")} className="font-semibold text-[var(--color-leaf-500)]">
                    Catat limbah
                  </button>
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {ready.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2.5 rounded-xl border border-leaf-100 px-3.5 py-2.5 text-sm cursor-pointer hover:bg-leaf-50"
                    >
                      <input
                        type="checkbox"
                        checked={recordIds.includes(r.id)}
                        onChange={() =>
                          setRecordIds((ids) => (ids.includes(r.id) ? ids.filter((x) => x !== r.id) : [...ids, r.id]))
                        }
                        className="accent-[var(--color-forest-900)]"
                      />
                      <span className="flex-1 text-[var(--color-forest-900)]">{labelOf(WASTE_CATEGORIES, r.category)}</span>
                      <span className="font-semibold text-[var(--color-forest-900)]">{fmtKg(r.weightKg)}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div>
              <label className={LABEL} htmlFor="pk-notes">
                Catatan untuk mitra (opsional)
              </label>
              <input
                id="pk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="mis. ambil dari pintu belakang dapur"
                className={INPUT}
              />
            </div>

            {evaluation && (
              <div className="rounded-xl bg-leaf-50 px-4 py-3 text-sm text-[var(--color-forest-900)] flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  Total: <b>{fmtKg(evaluation.totalKg)}</b>
                </span>
                <span>
                  Estimasi biaya: <b>{fmtRp(evaluation.tariff.cost)}</b>
                </span>
                <span>
                  Jarak: <b>{evaluation.distanceKm} km</b>
                </span>
                <span>
                  Kapasitas tersisa: <b>{fmtKg(evaluation.remainingKg)}</b>
                </span>
              </div>
            )}

            {errors.length > 0 && (
              <ErrorBox>
                <ul className="list-disc pl-4 space-y-0.5">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </ErrorBox>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={BTN_PRIMARY}>
                <Truck size={16} /> Ajukan pengambilan
              </button>
              <button type="button" onClick={() => onNavigate("cr-partners", { recordIds })} className={BTN_SECONDARY}>
                Bandingkan mitra
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>
            <Plus size={16} /> Ajukan pengambilan baru
          </button>
          <button onClick={() => onNavigate("cr-partners")} className={BTN_SECONDARY}>
            Cari mitra dulu <ChevronRight size={15} />
          </button>
        </div>
      )}

      <Card className="p-6">
        <SectionHeading
          eyebrow="Transaksi"
          title="Status pengambilan"
          action={
            <FilterChips
              label="Filter status"
              value={filter}
              onChange={setFilter}
              options={[
                { id: "active", label: "Aktif", count: pickups.filter(isPickupActive).length },
                ...Object.entries(PICKUP_STATUSES).map(([id, s]) => ({
                  id,
                  label: s.label,
                  count: pickups.filter((p) => p.status === id).length,
                })),
              ]}
            />
          }
        />
        {visible.length === 0 ? (
          <EmptyState icon={Truck} title={pickups.length ? "Tidak ada transaksi dengan status ini" : "Belum ada pengambilan"}>
            {pickups.length ? "Pilih filter status lain." : "Ajukan pengambilan setelah memilih mitra yang cocok."}
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {visible.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => detail.setOpenId(p.id)}
                  className="w-full flex flex-wrap items-center gap-3 rounded-xl border border-leaf-100 hover:bg-leaf-50 px-4 py-3 text-left transition-colors"
                >
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-semibold text-[var(--color-forest-900)]">{p.partnerName}</p>
                    <p className="text-xs text-[var(--color-ink-400)] flex items-center gap-1 mt-0.5">
                      <CalendarDays size={12} /> {fmtDate(p.date)} · {p.slot}
                    </p>
                  </div>
                  <PathwayDot pathway={p.pathway} />
                  <span className="text-sm font-bold text-[var(--color-forest-900)]">
                    {fmtKg(p.verification?.actualKg ?? p.plannedKg)}
                  </span>
                  <PickupStatusBadge status={p.status} />
                  {p.simulated && <SimBadge />}
                  <ChevronRight size={16} className="text-[var(--color-ink-400)]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
