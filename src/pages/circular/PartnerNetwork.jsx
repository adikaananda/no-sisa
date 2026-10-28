import { useState } from "react";
import { MapPin, Navigation, Loader2, CalendarDays, Truck, CheckCircle2, AlertTriangle, Handshake, Coins } from "lucide-react";
import { Card, SectionHeading } from "../../components/Card";
import {
  useCircularData,
  useToast,
  Toast,
  SimulationNote,
  SimBadge,
  PathwayDot,
  SuitabilityBadge,
  FilterChips,
  EmptyState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  fmtKg,
  fmtRp,
  fmtDate,
} from "../../components/Circular";
import {
  PATHWAYS,
  PATHWAY_ORDER,
  WASTE_CATEGORIES,
  DEMO_KITCHEN_LOCATION,
  labelOf,
  analyzeWasteRules,
  matchPartners,
  recordStatusMap,
  pickupDaysLabel,
} from "../../lib/circularRecovery";

export default function PartnerNetwork({ onNavigate, params }) {
  const { records, pickups, partners, origin, saveOrigin } = useCircularData();
  const { toast, notify, clear } = useToast();
  const [type, setType] = useState("all");
  const [locating, setLocating] = useState(false);

  const status = recordStatusMap(records, pickups);
  const available = records
    .filter((r) => status[r.id] === "belum")
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const ready = available.filter((r) => analyzeWasteRules(r).sufficient);

  const [selectedIds, setSelectedIds] = useState(() =>
    (params?.recordIds || []).filter((id) => ready.some((r) => r.id === id))
  );
  const selected = ready.filter((r) => selectedIds.includes(r.id));
  const totalKg = selected.reduce((s, r) => s + r.weightKg, 0);

  const filtered = type === "all" ? partners : partners.filter((p) => p.type === type);
  const matches = matchPartners(filtered, { records: selected, pickups, origin });

  function toggle(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function locateKitchen() {
    if (!navigator.geolocation) {
      notify("error", "Browser ini tidak mendukung geolokasi.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const ok = saveOrigin({
          lat: +pos.coords.latitude.toFixed(5),
          lng: +pos.coords.longitude.toFixed(5),
          label: "Lokasi perangkat",
        });
        notify(ok ? "success" : "error", ok ? "Lokasi dapur diperbarui." : "Gagal menyimpan lokasi.");
      },
      (err) => {
        setLocating(false);
        notify("error", err.code === 1 ? "Izin lokasi ditolak." : "Lokasi tidak bisa didapatkan.");
      },
      { timeout: 10000 }
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <Toast toast={toast} onClose={clear} />

      <SimulationNote>
        Semua mitra di bawah adalah <b>data demo (simulasi)</b> — nama, lokasi, kapasitas, dan tarif bukan mitra
        sungguhan. Jarak dihitung garis lurus dari lokasi dapur.
      </SimulationNote>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
        <Card className="p-5">
          <SectionHeading eyebrow="Lokasi Dapur" title={origin.label} />
          <p className="text-xs text-[var(--color-ink-400)] font-mono -mt-2 mb-4">
            {origin.lat}, {origin.lng}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={locateKitchen} disabled={locating} className={BTN_SECONDARY}>
              {locating ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
              Gunakan lokasi saya
            </button>
            {origin.label !== DEMO_KITCHEN_LOCATION.label && (
              <button onClick={() => saveOrigin(DEMO_KITCHEN_LOCATION)} className={BTN_SECONDARY}>
                Reset ke default
              </button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading
            eyebrow="Limbah yang Disalurkan"
            title={selected.length ? `${selected.length} catatan · ${fmtKg(totalKg)}` : "Pilih catatan limbah"}
            subtitle="Hanya catatan yang belum diajukan & datanya lengkap"
          />
          {ready.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-400)]">
              {available.length
                ? "Ada catatan yang datanya belum lengkap — lengkapi dulu di AI Waste Analysis."
                : "Belum ada limbah yang menunggu penyaluran."}{" "}
              <button
                onClick={() => onNavigate(available.length ? "cr-analysis" : "cr-recording")}
                className="font-semibold text-[var(--color-leaf-500)]"
              >
                {available.length ? "Lengkapi data" : "Catat limbah"}
              </button>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ready.map((r) => {
                const on = selectedIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    aria-pressed={on}
                    className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${
                      on
                        ? "bg-[var(--color-forest-900)] border-[var(--color-forest-900)] text-white"
                        : "bg-white border-leaf-100 text-[var(--color-ink-600)] hover:bg-leaf-50"
                    }`}
                  >
                    <b>{fmtKg(r.weightKg)}</b> · {labelOf(WASTE_CATEGORIES, r.category)}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Filter jenis mitra"
          value={type}
          onChange={setType}
          options={[
            { id: "all", label: "Semua mitra", count: partners.length },
            ...PATHWAY_ORDER.map((id) => ({
              id,
              label: PATHWAYS[id].label,
              count: partners.filter((p) => p.type === id).length,
            })),
          ]}
        />
        {selected.length > 0 && (
          <p className="text-xs text-[var(--color-ink-400)]">Diurutkan: mitra cocok → kesesuaian jalur → jarak terdekat</p>
        )}
      </div>

      {matches.length === 0 ? (
        <Card className="p-2">
          <EmptyState icon={Handshake} title="Tidak ada mitra di kategori ini" />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {matches.map((m) => (
            <PartnerCard
              key={m.partner.id}
              match={m}
              hasSelection={selected.length > 0}
              onRequest={() => onNavigate("cr-pickups", { partnerId: m.partner.id, recordIds: selected.map((r) => r.id) })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerCard({ match, hasSelection, onRequest }) {
  const { partner: p, eligible, issues, distanceKm, remainingKg, tariff, nextPickup, suitability } = match;
  const usedPct = Math.round(((p.capacityKgPerWeek - remainingKg) / p.capacityKgPerWeek) * 100);

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <PathwayDot pathway={p.type} />
        {p.simulated && <SimBadge />}
      </div>
      <h3 className="font-bold text-[var(--color-forest-900)] mt-2">{p.name}</h3>
      <p className="text-xs text-[var(--color-ink-400)] flex items-center gap-1 mt-0.5">
        <MapPin size={12} /> {p.area} · {distanceKm} km
      </p>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-[var(--color-ink-600)] mb-1">
          <span>Kapasitas tersisa minggu ini</span>
          <span className="font-semibold text-[var(--color-forest-900)]">
            {fmtKg(remainingKg)} / {fmtKg(p.capacityKgPerWeek)}
          </span>
        </div>
        <div className="w-full h-2 bg-leaf-50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${usedPct}%`, background: usedPct > 85 ? "var(--color-amber-500)" : "var(--color-leaf-500)" }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div>
          <dt className="text-[var(--color-ink-400)] flex items-center gap-1">
            <CalendarDays size={12} /> Jadwal
          </dt>
          <dd className="font-semibold text-[var(--color-forest-900)] mt-0.5">{pickupDaysLabel(p)}</dd>
          {nextPickup && <dd className="text-[var(--color-ink-400)]">Terdekat {fmtDate(nextPickup)}</dd>}
        </div>
        <div>
          <dt className="text-[var(--color-ink-400)] flex items-center gap-1">
            <Truck size={12} /> {hasSelection ? "Estimasi biaya" : "Tarif angkut"}
          </dt>
          <dd className="font-semibold text-[var(--color-forest-900)] mt-0.5">
            {hasSelection
              ? fmtRp(tariff.cost)
              : `${fmtRp(p.transportFeeFlat)}${p.transportFeePerKg ? ` + ${fmtRp(p.transportFeePerKg)}/kg` : ""}`}
          </dd>
          <dd className="text-[var(--color-ink-400)]">Min. {fmtKg(p.minPickupKg)} · radius {p.serviceRadiusKm} km</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[var(--color-ink-400)] flex items-center gap-1">
            <Coins size={12} /> Nilai material
          </dt>
          <dd className="font-semibold text-[var(--color-forest-900)] mt-0.5">
            {p.materialValuePerKg == null
              ? "Tidak tersedia"
              : `${fmtRp(p.materialValuePerKg)}/kg${hasSelection ? ` · est. ${fmtRp(tariff.value)}` : ""}`}
          </dd>
        </div>
      </dl>

      <p className="text-xs text-[var(--color-ink-400)] mt-4">
        Menerima: {p.accepts.map((c) => labelOf(WASTE_CATEGORIES, c).toLowerCase()).join(", ")}
      </p>
      <ul className="text-xs text-[var(--color-ink-600)] mt-2 space-y-1 flex-1">
        {p.requirements.map((r) => (
          <li key={r}>• {r}</li>
        ))}
      </ul>

      {hasSelection && (
        <div className="mt-4">
          {eligible ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-leaf-500)]">
              <CheckCircle2 size={14} /> Cocok dengan limbah terpilih
              {suitability && <SuitabilityBadge value={suitability} />}
            </p>
          ) : (
            <ul className="space-y-1">
              {issues.map((i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-[#c0392b]">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {i}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button onClick={onRequest} disabled={!hasSelection || !eligible} className={`${BTN_PRIMARY} mt-4 w-full`}>
        <Truck size={15} /> Ajukan pengambilan
      </button>
      {!hasSelection && <p className="text-[11px] text-[var(--color-ink-400)] text-center mt-1.5">Pilih catatan limbah dulu</p>}
    </Card>
  );
}
