import { useState } from "react";
import { Plus, Trash2, Sparkles, PackageX, Wallet, ChefHat, ClipboardList, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Card, Badge, SectionHeading } from "../../components/Card";
import {
  useCircularData,
  useOperationalSignals,
  useToast,
  Toast,
  PhotoInput,
  FieldError,
  FilterChips,
  EmptyState,
  INPUT,
  LABEL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  fmtKg,
  fmtDateTime,
} from "../../components/Circular";
import {
  WASTE_CATEGORIES,
  WASTE_SOURCES,
  WEIGHT_METHODS,
  CONTAMINATION,
  WASTE_FLAGS,
  RECORD_STATUSES,
  labelOf,
  validateWasteRecord,
  createWasteRecord,
  recordStatusMap,
} from "../../lib/circularRecovery";

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const emptyForm = () => ({
  category: "",
  weightKg: "",
  weightMethod: "timbangan",
  recordedAt: nowLocalInput(),
  source: "",
  sourceRef: "",
  contamination: "",
  flags: [],
  noSpecialFlags: false,
  notes: "",
  photo: null,
});

export default function WasteRecording({ onNavigate }) {
  const { records, pickups, saveRecords } = useCircularData();
  const { toast, notify, clear } = useToast();
  const signals = useOperationalSignals();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const status = recordStatusMap(records, pickups);
  const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const visible = filter === "all" ? sorted : sorted.filter((r) => r.category === filter);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function toggleFlag(id) {
    set({
      flags: form.flags.includes(id) ? form.flags.filter((f) => f !== id) : [...form.flags, id],
      noSpecialFlags: false,
    });
  }

  function applySuggestion(source, sourceRef) {
    set({ source, sourceRef });
    notify("success", "Sumber limbah terisi dari data operasional. Berat tetap diisi dari timbangan/staf.");
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validateWasteRecord(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify("error", "Periksa kembali isian yang ditandai.");
      return;
    }
    setSaving(true);
    const record = createWasteRecord(form);
    const ok = saveRecords([...records, record]);
    setSaving(false);
    if (!ok) {
      notify("error", "Gagal menyimpan — penyimpanan browser penuh. Coba simpan tanpa foto.");
      return;
    }
    setForm(emptyForm());
    setErrors({});
    setLastSavedId(record.id);
    notify("success", `Limbah ${fmtKg(record.weightKg)} berhasil dicatat.`);
  }

  function handleDelete(r) {
    if (!window.confirm(`Hapus catatan limbah ${fmtKg(r.weightKg)} (${labelOf(WASTE_CATEGORIES, r.category)})?`)) return;
    if (saveRecords(records.filter((x) => x.id !== r.id))) notify("success", "Catatan limbah dihapus.");
    else notify("error", "Gagal menghapus catatan.");
  }

  const hasSignals = signals.expiring.length || signals.alerts.length || signals.overproduction.length;

  return (
    <div className="space-y-6 animate-rise">
      <Toast toast={toast} onClose={clear} />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <Card className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="Waste Recording"
            title="Catat limbah organik"
            subtitle="Berat wajib dari timbangan atau input staf — bukan estimasi foto."
          />

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <fieldset>
              <legend className={LABEL}>Kategori limbah</legend>
              <div className="grid sm:grid-cols-3 gap-2">
                {WASTE_CATEGORIES.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-sm cursor-pointer transition-colors ${
                      form.category === c.id
                        ? "border-[var(--color-forest-900)] bg-leaf-50 font-semibold text-[var(--color-forest-900)]"
                        : "border-leaf-100 text-[var(--color-ink-600)] hover:bg-leaf-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={c.id}
                      checked={form.category === c.id}
                      onChange={() => set({ category: c.id })}
                      className="accent-[var(--color-forest-900)]"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <FieldError>{errors.category}</FieldError>
            </fieldset>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={LABEL} htmlFor="wr-weight">
                  Berat (kg)
                </label>
                <input
                  id="wr-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.weightKg}
                  onChange={(e) => set({ weightKg: e.target.value })}
                  placeholder="mis. 4.5"
                  className={INPUT}
                />
                <FieldError>{errors.weightKg}</FieldError>
              </div>
              <div>
                <label className={LABEL} htmlFor="wr-method">
                  Sumber data berat
                </label>
                <select
                  id="wr-method"
                  value={form.weightMethod}
                  onChange={(e) => set({ weightMethod: e.target.value })}
                  className={INPUT}
                >
                  {WEIGHT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <FieldError>{errors.weightMethod}</FieldError>
              </div>
              <div>
                <label className={LABEL} htmlFor="wr-time">
                  Waktu pencatatan
                </label>
                <input
                  id="wr-time"
                  type="datetime-local"
                  value={form.recordedAt}
                  max={nowLocalInput()}
                  onChange={(e) => set({ recordedAt: e.target.value })}
                  className={INPUT}
                />
                <FieldError>{errors.recordedAt}</FieldError>
              </div>
              <div>
                <label className={LABEL} htmlFor="wr-source">
                  Sumber limbah
                </label>
                <select
                  id="wr-source"
                  value={form.source}
                  onChange={(e) => set({ source: e.target.value, sourceRef: "" })}
                  className={INPUT}
                >
                  <option value="">Pilih sumber...</option>
                  {WASTE_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {form.sourceRef && <p className="text-xs text-[var(--color-leaf-500)] mt-1.5">Terkait: {form.sourceRef}</p>}
                <FieldError>{errors.source}</FieldError>
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="wr-contamination">
                Status pemilahan
              </label>
              <select
                id="wr-contamination"
                value={form.contamination}
                onChange={(e) => set({ contamination: e.target.value })}
                className={INPUT}
              >
                <option value="">Pilih status...</option>
                {CONTAMINATION.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <FieldError>{errors.contamination}</FieldError>
            </div>

            <fieldset>
              <legend className={LABEL}>Karakteristik material</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {WASTE_FLAGS.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm text-[var(--color-ink-600)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.flags.includes(f.id)}
                      onChange={() => toggleFlag(f.id)}
                      className="accent-[var(--color-forest-900)]"
                    />
                    {f.label}
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-[var(--color-ink-600)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.noSpecialFlags}
                    onChange={(e) => set({ noSpecialFlags: e.target.checked, flags: e.target.checked ? [] : form.flags })}
                    className="accent-[var(--color-forest-900)]"
                  />
                  Sudah dicek — tidak ada karakteristik khusus
                </label>
              </div>
            </fieldset>

            <div>
              <label className={LABEL} htmlFor="wr-notes">
                Catatan (opsional)
              </label>
              <textarea
                id="wr-notes"
                rows={2}
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="mis. sisa buffet sarapan, disimpan di bin hijau"
                className={`${INPUT} resize-none`}
              />
            </div>

            <PhotoInput value={form.photo} onChange={(photo) => set({ photo })} onError={(m) => notify("error", m)} />

            <div className="flex flex-wrap gap-3 pt-1">
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                <Plus size={16} /> Simpan catatan
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm());
                  setErrors({});
                }}
                className={BTN_SECONDARY}
              >
                Reset
              </button>
            </div>
          </form>

          {lastSavedId && records.some((r) => r.id === lastSavedId) && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-leaf-50 rounded-xl px-4 py-3 mt-5 text-sm text-[var(--color-forest-900)]">
              Catatan tersimpan. Lanjutkan ke analisis jalur pengolahan.
              <button
                onClick={() => onNavigate("cr-analysis", { recordId: lastSavedId })}
                className="inline-flex items-center gap-1 font-semibold text-[var(--color-leaf-500)]"
              >
                <Sparkles size={14} /> Analisis sekarang
              </button>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading
            eyebrow="Terhubung ke No Sisa"
            title="Sinyal dari data operasional"
            subtitle="Gunakan sebagai referensi sumber limbah. Berat tetap ditimbang."
          />

          {!hasSignals && (
            <p className="text-sm text-[var(--color-ink-400)]">
              Belum ada bahan berisiko atau data over-production. Data ini muncul dari Stock Predictor dan Analisis
              Kerugian (setelah POS terhubung).
            </p>
          )}

          {signals.expiring.length > 0 && (
            <SignalGroup icon={PackageX} title="Stock Predictor — hampir kedaluwarsa">
              {signals.expiring.map((i) => (
                <SignalItem
                  key={`exp-${i.id}`}
                  label={i.name}
                  detail={`Stok ${i.stock}`}
                  onUse={() => applySuggestion("kedaluwarsa", `Stock Predictor: ${i.name} (stok ${i.stock})`)}
                />
              ))}
            </SignalGroup>
          )}

          {signals.alerts.length > 0 && (
            <SignalGroup icon={Sparkles} title="Stock Predictor (AI) — risiko terbuang">
              {signals.alerts.map((a, idx) => (
                <SignalItem
                  key={`alert-${idx}`}
                  label={a.ingredient}
                  detail={a.reason}
                  onUse={() => applySuggestion("kedaluwarsa", `Stock Predictor (AI): ${a.ingredient}`)}
                />
              ))}
            </SignalGroup>
          )}

          {signals.overproduction.length > 0 && (
            <SignalGroup icon={Wallet} title="Analisis Kerugian — over-production">
              {signals.overproduction.map((m) => (
                <SignalItem
                  key={`op-${m.menu}`}
                  label={`${m.menu} · ${m.excessPortions} porsi lebih`}
                  detail={
                    m.wastedIngredients.length
                      ? `Estimasi resep (BOM): ${m.wastedIngredients.map((w) => `${w.ingredient} ${w.qty} ${w.unit}`).join(", ")} — hanya acuan, timbang ulang.`
                      : "Tidak ada resep (BOM) untuk menu ini."
                  }
                  onUse={() =>
                    applySuggestion("overproduksi", `Analisis Kerugian: ${m.menu} — ${m.excessPortions} porsi lebih`)
                  }
                />
              ))}
            </SignalGroup>
          )}

          {!signals.posConnected && (
            <button
              onClick={() => onNavigate("settings")}
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-leaf-500)]"
            >
              Hubungkan POS untuk data over-production <ChevronRight size={13} />
            </button>
          )}

          <button
            onClick={() => onNavigate("menu-planner")}
            className="w-full mt-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-forest-900)] bg-leaf-50 hover:bg-[var(--color-leaf-100)] rounded-xl py-2.5 transition-colors"
          >
            <ChefHat size={15} /> Masih layak? Olah dulu di AI Menu Planner
          </button>
        </Card>
      </div>

      <Card className="p-6">
        <SectionHeading
          eyebrow="Catatan Limbah"
          title="Riwayat pencatatan"
          action={
            <FilterChips
              label="Filter kategori"
              value={filter}
              onChange={setFilter}
              options={[
                { id: "all", label: "Semua", count: records.length },
                ...WASTE_CATEGORIES.map((c) => ({
                  id: c.id,
                  label: c.label.replace("Sisa ", "").replace("Limbah organik ", ""),
                  count: records.filter((r) => r.category === c.id).length,
                })),
              ]}
            />
          }
        />
        {visible.length === 0 ? (
          <EmptyState icon={ClipboardList} title={records.length ? "Tidak ada catatan di kategori ini" : "Belum ada catatan limbah"}>
            {records.length ? "Pilih kategori lain." : "Catatan yang disimpan lewat formulir di atas akan muncul di sini."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
                  <th className="px-2 py-2">Waktu</th>
                  <th className="px-2 py-2">Kategori</th>
                  <th className="px-2 py-2">Berat</th>
                  <th className="px-2 py-2">Sumber</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const st = RECORD_STATUSES[status[r.id]];
                  return (
                    <tr key={r.id} className="border-t border-leaf-100/70">
                      <td className="px-2 py-3 text-[var(--color-ink-600)] whitespace-nowrap">{fmtDateTime(r.recordedAt)}</td>
                      <td className="px-2 py-3 font-semibold text-[var(--color-forest-900)]">
                        <span className="inline-flex items-center gap-1.5">
                          {labelOf(WASTE_CATEGORIES, r.category)}
                          {r.photo && <ImageIcon size={13} className="text-[var(--color-ink-400)]" aria-label="Ada foto" />}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-[var(--color-forest-900)] font-semibold whitespace-nowrap">
                        {fmtKg(r.weightKg)}
                        <span className="block text-[11px] font-normal text-[var(--color-ink-400)]">
                          {labelOf(WEIGHT_METHODS, r.weightMethod)}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-[var(--color-ink-600)]">
                        {labelOf(WASTE_SOURCES, r.source)}
                        {r.sourceRef && <span className="block text-[11px] text-[var(--color-ink-400)]">{r.sourceRef}</span>}
                      </td>
                      <td className="px-2 py-3">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate("cr-analysis", { recordId: r.id })}
                            className="text-xs font-semibold text-[var(--color-leaf-500)] hover:text-[var(--color-forest-900)]"
                          >
                            Analisis
                          </button>
                          {status[r.id] === "belum" && (
                            <button
                              onClick={() => handleDelete(r)}
                              className="text-[var(--color-ink-400)] hover:text-red-600 p-1"
                              aria-label="Hapus catatan"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SignalGroup({ icon: Icon, title, children }) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)] mb-2">
        <Icon size={13} /> {title}
      </p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function SignalItem({ label, detail, onUse }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-leaf-100 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--color-forest-900)]">{label}</p>
        {detail && <p className="text-xs text-[var(--color-ink-400)] mt-0.5">{detail}</p>}
      </div>
      <button onClick={onUse} className="text-xs font-semibold text-[var(--color-leaf-500)] hover:text-[var(--color-forest-900)] shrink-0">
        Gunakan
      </button>
    </li>
  );
}
