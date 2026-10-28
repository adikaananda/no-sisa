// Komponen & hook bersama untuk modul Circular Recovery.
// Semua mengikuti pola visual yang sudah ada (Card, Badge, token warna).
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  X,
  FlaskConical,
  Inbox,
  Camera,
  Trash2,
  Clock,
  Loader2,
  Scale,
} from "lucide-react";
import { Card, Badge } from "./Card";
import { getJSON, getSetting, setJSON, KEYS } from "../lib/storage";
import { inventorySnapshot } from "../lib/sampleData";
import { computeLossAnalysis } from "../lib/salesIntegration";
import {
  DEMO_PARTNERS,
  DEMO_KITCHEN_LOCATION,
  PICKUP_STATUSES,
  PATHWAYS,
  SUITABILITY,
  TRANSITIONS,
  WASTE_CATEGORIES,
  WASTE_SOURCES,
  DISCREPANCY_THRESHOLD_PCT,
  labelOf,
  transitionPickup,
} from "../lib/circularRecovery";

export const INPUT =
  "w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none bg-white";
export const LABEL = "block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5";
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 bg-white border border-leaf-100 hover:bg-leaf-50 disabled:opacity-60 disabled:cursor-not-allowed text-[var(--color-forest-900)] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors";

export function fmtKg(n) {
  return `${(n ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`;
}

export function fmtRp(n) {
  return `Rp ${Math.round(n ?? 0).toLocaleString("id-ID")}`;
}

export function fmtDateTime(iso) {
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}

const ACTOR_LABELS = { restoran: "Dapur Anda", mitra: "Mitra" };

export function actorLabel(actor, simulated) {
  return actor === "mitra" && simulated ? "Mitra (simulasi)" : ACTOR_LABELS[actor] ?? actor;
}

/** State catatan limbah & transaksi pickup, tersimpan di localStorage. */
export function useCircularData() {
  const [records, setRecords] = useState(() => getJSON(KEYS.CR_RECORDS, []));
  const [pickups, setPickups] = useState(() => getJSON(KEYS.CR_PICKUPS, []));
  const [origin, setOrigin] = useState(() => getJSON(KEYS.CR_KITCHEN_LOCATION, DEMO_KITCHEN_LOCATION));

  function persist(key, value, setter) {
    if (!setJSON(key, value)) return false;
    setter(value);
    return true;
  }

  const saveRecords = (v) => persist(KEYS.CR_RECORDS, v, setRecords);
  const savePickups = (v) => persist(KEYS.CR_PICKUPS, v, setPickups);
  const saveOrigin = (v) => persist(KEYS.CR_KITCHEN_LOCATION, v, setOrigin);

  /** Ubah status pickup sesuai aturan transisi. Return pesan error, atau null kalau berhasil. */
  function updatePickupStatus(pickup, to, opts) {
    let next;
    try {
      next = transitionPickup(pickup, to, opts);
    } catch (e) {
      return e.message;
    }
    if (!savePickups(pickups.map((p) => (p.id === pickup.id ? next : p)))) {
      return "Gagal menyimpan ke penyimpanan browser (kemungkinan penuh). Coba kurangi/hapus foto dokumentasi.";
    }
    return null;
  }

  return {
    records,
    pickups,
    origin,
    partners: DEMO_PARTNERS,
    saveRecords,
    savePickups,
    saveOrigin,
    updatePickupStatus,
  };
}

/**
 * Data operasional yang memang tersedia di No Sisa (Stock Predictor &
 * Analisis Kerugian), dipakai sebagai referensi sumber limbah & konteks AI.
 */
export function useOperationalSignals() {
  return useMemo(() => {
    const expiring = [...inventorySnapshot, ...getJSON(KEYS.CUSTOM_STOCK_ITEMS, [])].filter(
      (i) => i.status === "hampir kedaluwarsa"
    );
    const alerts = getJSON(KEYS.STOCK_OUTLOOK_HISTORY, null)?.waste_risk_alerts || [];
    const posConnected = getSetting(KEYS.POS_STATUS, "disconnected") === "connected";
    const sales = posConnected ? getJSON(KEYS.SALES_RECORDS, []) : [];
    const overproduction = sales.length ? computeLossAnalysis(sales).perMenu.filter((m) => m.excessPortions > 0) : [];
    return { expiring, alerts, overproduction, posConnected };
  }, []);
}

/** State modal detail pickup + handler transisi status dengan notifikasi. */
export function usePickupDetail({ pickups, updatePickupStatus, notify }) {
  const [openId, setOpenId] = useState(null);
  const open = pickups.find((p) => p.id === openId) || null;

  function onTransition(pickup, to, opts) {
    const err = updatePickupStatus(pickup, to, opts);
    if (!err) notify("success", `Status diperbarui: ${PICKUP_STATUSES[to].label}.`);
    return err;
  }

  return { open, setOpenId, onTransition };
}

export function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  return {
    toast,
    notify: (type, message) => setToast({ type, message, id: Date.now() }),
    clear: () => setToast(null),
  };
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  const ok = toast.type === "success";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`fixed bottom-5 left-5 right-5 sm:left-auto sm:max-w-sm z-[60] flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-[var(--shadow-card-hover)] animate-rise ${
        ok
          ? "bg-white border-leaf-100 text-[var(--color-forest-900)]"
          : "bg-[#fdecec] border-[#f5c6c1] text-[#c0392b]"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={17} className="shrink-0 mt-0.5 text-[var(--color-leaf-500)]" />
      ) : (
        <AlertTriangle size={17} className="shrink-0 mt-0.5" />
      )}
      <p className="flex-1">{toast.message}</p>
      <button onClick={onClose} aria-label="Tutup notifikasi" className="opacity-60 hover:opacity-100">
        <X size={15} />
      </button>
    </div>
  );
}

export function SimulationNote({ children }) {
  return (
    <div className="flex items-start gap-3 bg-[#fff8e6] border border-[var(--color-gold-400)]/60 text-[#8a6300] rounded-xl px-4 py-3 text-sm">
      <FlaskConical size={18} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

export function SimBadge() {
  return (
    <Badge tone="gold">
      <FlaskConical size={11} /> Simulasi
    </Badge>
  );
}

export function ErrorBox({ children }) {
  return (
    <div className="flex items-start gap-2 text-sm text-[#c0392b] bg-[#fdecec] rounded-xl px-4 py-2.5">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <p className="text-xs text-[#c0392b] mt-1.5">{children}</p>;
}

export function PickupStatusBadge({ status }) {
  const s = PICKUP_STATUSES[status];
  return <Badge tone={s?.tone ?? "outline"}>{s?.label ?? status}</Badge>;
}

export function SuitabilityBadge({ value }) {
  const s = SUITABILITY[value];
  return <Badge tone={s?.tone ?? "outline"}>{s?.label ?? value}</Badge>;
}

export function PathwayDot({ pathway }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-forest-900)]">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PATHWAYS[pathway]?.color }} />
      {PATHWAYS[pathway]?.label ?? pathway}
    </span>
  );
}

export function StatCard({ icon: Icon, tone = "leaf", label, value, hint }) {
  const tones = {
    leaf: "bg-leaf-50 text-[var(--color-leaf-500)]",
    amber: "bg-[#fff2e0] text-[var(--color-amber-500)]",
    gold: "bg-[#fff8e6] text-[#a67c00]",
    forest: "bg-[var(--color-leaf-100)] text-[var(--color-forest-900)]",
  };
  return (
    <Card className="p-5">
      <div className={`w-9 h-9 rounded-lg grid place-items-center mb-3 ${tones[tone]}`}>
        <Icon size={17} />
      </div>
      <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-[var(--color-forest-900)] mt-1">{value}</p>
      {hint && <p className="text-xs text-[var(--color-ink-400)] mt-1">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-14 h-14 rounded-2xl bg-leaf-50 grid place-items-center mx-auto mb-4 text-[var(--color-leaf-500)]">
        <Icon size={26} />
      </div>
      <h3 className="text-base font-bold text-[var(--color-forest-900)]">{title}</h3>
      {children && <p className="text-sm text-[var(--color-ink-600)] mt-2 max-w-md mx-auto">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FilterChips({ options, value, onChange, label = "Filter" }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              active
                ? "bg-[var(--color-forest-900)] border-[var(--color-forest-900)] text-white"
                : "bg-white border-leaf-100 text-[var(--color-ink-600)] hover:bg-leaf-50"
            }`}
          >
            {o.label}
            {o.count != null && <span className={active ? "text-white/70" : "text-[var(--color-ink-400)]"}> {o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Kecilkan foto ke JPEG ≤640px supaya muat di localStorage. */
export function readPhoto(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("File harus berupa gambar."));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("Ukuran foto maksimal 10 MB."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Foto tidak bisa dibaca."));
    };
    img.src = url;
  });
}

export function PhotoInput({ value, onChange, onError, label = "Foto dokumentasi (opsional)" }) {
  const [loading, setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    try {
      onChange(await readPhoto(file));
    } catch (err) {
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className={LABEL}>{label}</span>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="Pratinjau foto dokumentasi" className="w-20 h-20 rounded-xl object-cover border border-leaf-100" />
          <button type="button" onClick={() => onChange(null)} className={BTN_SECONDARY}>
            <Trash2 size={14} /> Hapus foto
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-3 border border-dashed border-leaf-100 hover:border-[var(--color-leaf-500)] rounded-xl px-4 py-3.5 text-sm cursor-pointer transition-colors">
          {loading ? (
            <Loader2 size={17} className="animate-spin text-[var(--color-leaf-500)] shrink-0" />
          ) : (
            <Camera size={17} className="text-[var(--color-leaf-500)] shrink-0" />
          )}
          <span className="text-[var(--color-ink-600)]">{loading ? "Memproses foto..." : "Pilih atau ambil foto"}</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        </label>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-[var(--color-forest-900)]">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-ink-400)]">{label}</dt>
      <dd className="text-sm font-semibold text-[var(--color-forest-900)] mt-0.5">{children}</dd>
    </div>
  );
}

/**
 * Detail transaksi pickup + riwayat status + aksi.
 * Aksi "mitra" dikelompokkan di panel simulasi karena belum ada integrasi mitra nyata.
 */
export function PickupDetailModal({ pickup, records, onClose, onTransition }) {
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [verify, setVerify] = useState({ actualKg: "", receiverName: "", note: "", photo: null });
  const [error, setError] = useState("");

  const items = records.filter((r) => pickup.recordIds.includes(r.id));
  const actions = TRANSITIONS[pickup.status] || [];
  const restoActions = actions.filter((a) => a.actor === "restoran");
  const partnerActions = actions.filter((a) => a.actor === "mitra");
  const v = pickup.verification;
  const estCost = pickup.tariff.transportFeeFlat + pickup.tariff.transportFeePerKg * (v?.actualKg ?? pickup.plannedKg);

  function run(action) {
    setError("");
    const opts = { actor: action.actor };
    if (action.needsNote) opts.note = `Ditolak mitra: ${rejectNote}`.trim();
    if (action.needsNote && !rejectNote.trim()) {
      setError("Alasan penolakan wajib diisi.");
      return;
    }
    if (action.needsVerification) opts.verification = verify;
    const err = onTransition(pickup, action.to, opts);
    if (err) setError(err);
    else {
      setShowReject(false);
      setRejectNote("");
    }
  }

  return (
    <Modal title="Detail Transaksi Pengambilan" onClose={onClose} wide>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <PickupStatusBadge status={pickup.status} />
        <PathwayDot pathway={pickup.pathway} />
        {pickup.simulated && <SimBadge />}
        <span className="text-xs text-[var(--color-ink-400)] ml-auto font-mono">{pickup.id}</span>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-xl bg-leaf-50/60 p-4">
        <DetailRow label="Mitra">{pickup.partnerName}</DetailRow>
        <DetailRow label="Jadwal">
          {fmtDate(pickup.date)} · {pickup.slot}
        </DetailRow>
        <DetailRow label="Berat awal (tercatat)">{fmtKg(pickup.plannedKg)}</DetailRow>
        <DetailRow label={v ? "Biaya pengelolaan" : "Estimasi biaya"}>{fmtRp(estCost)}</DetailRow>
        <DetailRow label="Diajukan">{fmtDateTime(pickup.createdAt)}</DetailRow>
        {pickup.notes && <DetailRow label="Catatan">{pickup.notes}</DetailRow>}
      </dl>

      <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">
        Limbah yang disalurkan
      </h4>
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 text-sm border border-leaf-100 rounded-xl px-3 py-2">
            <span className="text-[var(--color-forest-900)] font-medium">
              {labelOf(WASTE_CATEGORIES, r.category)}
              <span className="text-[var(--color-ink-400)] font-normal"> · {labelOf(WASTE_SOURCES, r.source)}</span>
            </span>
            <span className="font-semibold text-[var(--color-forest-900)] shrink-0">{fmtKg(r.weightKg)}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-[var(--color-ink-400)]">Catatan limbah sudah dihapus.</li>}
      </ul>

      {v && (
        <div className="mt-5 rounded-xl border border-leaf-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale size={16} className="text-[var(--color-leaf-500)]" />
            <h4 className="text-sm font-bold text-[var(--color-forest-900)]">Verifikasi penerimaan</h4>
            {Math.abs(v.diffPct) > DISCREPANCY_THRESHOLD_PCT && <Badge tone="amber">Selisih perlu ditinjau</Badge>}
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DetailRow label="Berat awal">{fmtKg(pickup.plannedKg)}</DetailRow>
            <DetailRow label="Berat diterima">{fmtKg(v.actualKg)}</DetailRow>
            <DetailRow label="Selisih">
              <span className={v.diffKg < 0 ? "text-[#c0392b]" : ""}>
                {v.diffKg > 0 ? "+" : ""}
                {fmtKg(v.diffKg)} ({v.diffPct > 0 ? "+" : ""}
                {v.diffPct}%)
              </span>
            </DetailRow>
            <DetailRow label="Penerima">{v.receiverName}</DetailRow>
          </dl>
          {v.note && <p className="text-xs text-[var(--color-ink-600)] mt-3">Catatan: {v.note}</p>}
          {v.photo && <img src={v.photo} alt="Dokumentasi penerimaan" className="mt-3 w-32 h-32 rounded-xl object-cover" />}
        </div>
      )}

      <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)]">
        Riwayat status
      </h4>
      <ol className="relative border-l border-leaf-100 ml-2 space-y-3">
        {pickup.history.map((h, i) => (
          <li key={i} className="pl-4">
            <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-[var(--color-leaf-500)]" />
            <div className="flex flex-wrap items-center gap-2">
              <PickupStatusBadge status={h.status} />
              <span className="text-xs text-[var(--color-ink-400)] inline-flex items-center gap-1">
                <Clock size={11} /> {fmtDateTime(h.at)} · {actorLabel(h.actor, pickup.simulated)}
              </span>
            </div>
            {h.note && <p className="text-xs text-[var(--color-ink-600)] mt-1">{h.note}</p>}
          </li>
        ))}
      </ol>

      {error && (
        <div className="mt-5">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {partnerActions.length > 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--color-gold-400)] bg-[#fffbf0] p-4">
          <p className="text-xs font-semibold text-[#8a6300] flex items-center gap-1.5">
            <FlaskConical size={13} />
            {pickup.simulated
              ? "Simulasi aksi mitra — belum ada integrasi dengan mitra sungguhan. Status ini tidak berarti pengambilan benar-benar terjadi."
              : "Aksi mitra"}
          </p>

          {partnerActions.some((a) => a.needsVerification) && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={LABEL} htmlFor="verify-kg">
                  Berat aktual diterima (kg)
                </label>
                <input
                  id="verify-kg"
                  type="number"
                  min="0"
                  step="0.01"
                  value={verify.actualKg}
                  onChange={(e) => setVerify({ ...verify, actualKg: e.target.value })}
                  placeholder={`Berat awal ${pickup.plannedKg}`}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="verify-name">
                  Nama petugas penerima
                </label>
                <input
                  id="verify-name"
                  value={verify.receiverName}
                  onChange={(e) => setVerify({ ...verify, receiverName: e.target.value })}
                  placeholder="mis. Wayan (petugas mitra)"
                  className={INPUT}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL} htmlFor="verify-note">
                  Catatan penerimaan (opsional)
                </label>
                <input
                  id="verify-note"
                  value={verify.note}
                  onChange={(e) => setVerify({ ...verify, note: e.target.value })}
                  placeholder="mis. 1 kg ditolak karena tercampur plastik"
                  className={INPUT}
                />
              </div>
              <div className="sm:col-span-2">
                <PhotoInput
                  label="Dokumentasi penerimaan (opsional)"
                  value={verify.photo}
                  onChange={(photo) => setVerify({ ...verify, photo })}
                  onError={setError}
                />
              </div>
            </div>
          )}

          {showReject && (
            <div className="mt-4">
              <label className={LABEL} htmlFor="reject-note">
                Alasan penolakan
              </label>
              <input
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="mis. Kapasitas penuh minggu ini"
                className={INPUT}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {partnerActions.map((a) =>
              a.needsNote && !showReject ? (
                <button key={a.label} onClick={() => setShowReject(true)} className={BTN_SECONDARY}>
                  {a.label}
                </button>
              ) : (
                <button key={a.label} onClick={() => run(a)} className={a.needsNote ? BTN_SECONDARY : BTN_PRIMARY}>
                  {a.needsNote ? "Kirim penolakan" : a.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {restoActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {restoActions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                if (window.confirm("Batalkan permintaan pengambilan ini? Catatan limbah akan kembali berstatus belum disalurkan.")) run(a);
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#c0392b] hover:bg-[#fdecec] px-4 py-2.5 rounded-xl transition-colors"
            >
              <X size={15} /> {a.label}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
