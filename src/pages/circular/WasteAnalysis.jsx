import { useState } from "react";
import {
  Sparkles,
  Loader2,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Handshake,
  ChefHat,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Card, Badge, SectionHeading } from "../../components/Card";
import {
  useCircularData,
  useOperationalSignals,
  useToast,
  Toast,
  FilterChips,
  EmptyState,
  ErrorBox,
  SuitabilityBadge,
  PathwayDot,
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
  analyzeWasteRules,
  recordStatusMap,
} from "../../lib/circularRecovery";
import { analyzeWasteRecovery } from "../../lib/gemini";
import { getSetting, KEYS } from "../../lib/storage";

export default function WasteAnalysis({ onNavigate, params }) {
  const { records, pickups, partners, saveRecords } = useCircularData();
  const { toast, notify, clear } = useToast();
  const signals = useOperationalSignals();
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const status = recordStatusMap(records, pickups);
  const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const withAnalysis = sorted.map((r) => ({ record: r, analysis: analyzeWasteRules(r) }));
  const visible = withAnalysis.filter(({ analysis }) =>
    filter === "all" ? true : filter === "gaps" ? !analysis.sufficient : analysis.sufficient
  );

  const [selectedId, setSelectedId] = useState(
    () => params?.recordId ?? withAnalysis.find((x) => !x.analysis.sufficient)?.record.id ?? sorted[0]?.id ?? null
  );
  const selected = withAnalysis.find((x) => x.record.id === selectedId);

  const apiKey = getSetting(KEYS.GEMINI_API_KEY) || import.meta.env.VITE_GEMINI_API_KEY || "";
  const model = getSetting(KEYS.GEMINI_MODEL, "gemini-3.5-flash-lite");

  function updateRecord(id, patch) {
    return saveRecords(records.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleAi() {
    if (!selected) return;
    setAiError("");
    if (!apiKey) {
      setAiError("Gemini API key belum diisi.");
      return;
    }
    setLoading(true);
    try {
      const operationalContext = [
        signals.expiring.length && `Bahan hampir kedaluwarsa (Stock Predictor): ${signals.expiring.map((i) => i.name).join(", ")}`,
        signals.overproduction.length &&
          `Over-production hari ini (Analisis Kerugian): ${signals.overproduction
            .map((m) => `${m.menu} ${m.excessPortions} porsi`)
            .join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n");
      const result = await analyzeWasteRecovery({
        apiKey,
        model,
        record: selected.record,
        ruleAnalysis: selected.analysis,
        partners,
        operationalContext,
      });
      if (updateRecord(selected.record.id, { aiAnalysis: { result, model, at: new Date().toISOString() } })) {
        notify("success", "Analisis Gemini AI selesai dan tersimpan.");
      } else {
        notify("error", "Analisis selesai, tetapi gagal disimpan ke browser.");
      }
    } catch (e) {
      setAiError(e.message || "Terjadi kesalahan saat memanggil Gemini API.");
    } finally {
      setLoading(false);
    }
  }

  if (records.length === 0) {
    return (
      <div className="animate-rise max-w-xl">
        <Card className="p-2">
          <EmptyState
            icon={ClipboardList}
            title="Belum ada limbah untuk dianalisis"
            action={
              <button onClick={() => onNavigate("cr-recording")} className={BTN_PRIMARY}>
                Catat limbah dulu
              </button>
            }
          >
            Analisis jalur pengolahan butuh catatan limbah dengan kategori, berat, dan karakteristik material.
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <Toast toast={toast} onClose={clear} />

      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6 items-start">
        <Card className="p-5">
          <SectionHeading eyebrow="Pilih Catatan" title="Limbah tercatat" />
          <FilterChips
            label="Filter kelengkapan data"
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: "Semua", count: withAnalysis.length },
              { id: "gaps", label: "Perlu dilengkapi", count: withAnalysis.filter((x) => !x.analysis.sufficient).length },
              { id: "ready", label: "Siap", count: withAnalysis.filter((x) => x.analysis.sufficient).length },
            ]}
          />
          <ul className="space-y-2 mt-4 max-h-[520px] overflow-y-auto pr-1">
            {visible.map(({ record: r, analysis }) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setSelectedId(r.id);
                    setAiError("");
                  }}
                  aria-current={r.id === selectedId ? "true" : undefined}
                  className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${
                    r.id === selectedId
                      ? "border-[var(--color-forest-900)] bg-leaf-50"
                      : "border-leaf-100 hover:bg-leaf-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[var(--color-forest-900)]">
                      {labelOf(WASTE_CATEGORIES, r.category)}
                    </span>
                    <span className="text-sm font-bold text-[var(--color-forest-900)] shrink-0">{fmtKg(r.weightKg)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-[var(--color-ink-400)]">{fmtDateTime(r.recordedAt)}</span>
                    {analysis.sufficient ? (
                      <Badge tone="leaf">Siap</Badge>
                    ) : (
                      <Badge tone="amber">Perlu data</Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="text-sm text-[var(--color-ink-400)] py-4 text-center">Tidak ada catatan.</li>}
          </ul>
        </Card>

        {selected ? (
          <AnalysisPanel
            key={selected.record.id}
            record={selected.record}
            analysis={selected.analysis}
            recordStatus={status[selected.record.id]}
            onUpdate={(patch) => {
              if (updateRecord(selected.record.id, patch)) notify("success", "Data limbah diperbarui — analisis dihitung ulang.");
              else notify("error", "Gagal menyimpan perubahan.");
            }}
            onAi={handleAi}
            aiLoading={loading}
            aiError={aiError}
            hasApiKey={!!apiKey}
            onNavigate={onNavigate}
          />
        ) : (
          <Card className="p-6">
            <p className="text-sm text-[var(--color-ink-400)]">Pilih catatan limbah di sebelah kiri.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function AnalysisPanel({ record, analysis, recordStatus, onUpdate, onAi, aiLoading, aiError, hasApiKey, onNavigate }) {
  const [draft, setDraft] = useState({
    contamination: record.contamination,
    flags: record.flags,
    noSpecialFlags: record.noSpecialFlags,
  });
  const editable = recordStatus === "belum";
  const dirty =
    draft.contamination !== record.contamination ||
    draft.noSpecialFlags !== record.noSpecialFlags ||
    draft.flags.join() !== record.flags.join();
  const ai = record.aiAnalysis?.result;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-[var(--color-leaf-500)] mb-1">AI Waste Analysis</p>
            <h2 className="text-xl font-bold text-[var(--color-forest-900)]">
              {labelOf(WASTE_CATEGORIES, record.category)} · {fmtKg(record.weightKg)}
            </h2>
            <p className="text-sm text-[var(--color-ink-600)] mt-1">
              {labelOf(WASTE_SOURCES, record.source)} · berat dari {labelOf(WEIGHT_METHODS, record.weightMethod).toLowerCase()} ·{" "}
              {fmtDateTime(record.recordedAt)}
            </p>
          </div>
          <Badge tone={RECORD_STATUSES[recordStatus].tone}>{RECORD_STATUSES[recordStatus].label}</Badge>
        </div>

        {record.photo && (
          <img src={record.photo} alt="Dokumentasi limbah" className="w-28 h-28 rounded-xl object-cover mb-4" />
        )}

        <div className="rounded-xl border border-leaf-100 bg-leaf-50/50 p-4">
          <p className="text-sm font-semibold text-[var(--color-forest-900)] mb-3">Karakteristik & pemilahan</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL} htmlFor="an-contamination">
                Status pemilahan
              </label>
              <select
                id="an-contamination"
                value={draft.contamination}
                disabled={!editable}
                onChange={(e) => setDraft({ ...draft, contamination: e.target.value })}
                className={INPUT}
              >
                {CONTAMINATION.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              {WASTE_FLAGS.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={draft.flags.includes(f.id)}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        noSpecialFlags: false,
                        flags: draft.flags.includes(f.id) ? draft.flags.filter((x) => x !== f.id) : [...draft.flags, f.id],
                      })
                    }
                    className="accent-[var(--color-forest-900)]"
                  />
                  {f.label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={draft.noSpecialFlags}
                  onChange={(e) => setDraft({ ...draft, noSpecialFlags: e.target.checked, flags: e.target.checked ? [] : draft.flags })}
                  className="accent-[var(--color-forest-900)]"
                />
                Tidak ada karakteristik khusus
              </label>
            </div>
          </div>
          {editable ? (
            <button onClick={() => onUpdate(draft)} disabled={!dirty} className={`${BTN_SECONDARY} mt-4`}>
              Perbarui data & hitung ulang
            </button>
          ) : (
            <p className="text-xs text-[var(--color-ink-400)] mt-3">
              Data terkunci karena limbah sudah diajukan ke mitra.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeading
          eyebrow="Analisis Berbasis Aturan"
          title="Rekomendasi jalur pengolahan"
          subtitle="Rekomendasi awal dari aturan umum pengolahan limbah organik. Keputusan akhir mengikuti persyaratan mitra."
        />

        {analysis.preventionTip && (
          <div className="flex items-start gap-3 bg-leaf-50 rounded-xl px-4 py-3 mb-4 text-sm text-[var(--color-forest-900)]">
            <ChefHat size={17} className="shrink-0 mt-0.5 text-[var(--color-leaf-500)]" />
            <div>
              {analysis.preventionTip}{" "}
              <button onClick={() => onNavigate("menu-planner")} className="font-semibold underline underline-offset-2">
                Buka AI Menu Planner
              </button>
            </div>
          </div>
        )}

        {!analysis.sufficient ? (
          <div className="rounded-xl border border-[var(--color-gold-400)]/60 bg-[#fff8e6] p-4 text-sm text-[#8a6300]">
            <p className="font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle size={16} /> Data belum cukup untuk rekomendasi yang aman
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {analysis.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Lengkapi lewat kolom "Karakteristik & pemilahan" di atas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.recommendations.map((rec) => (
              <div key={rec.pathway} className="rounded-xl border border-leaf-100 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <PathwayDot pathway={rec.pathway} />
                  <SuitabilityBadge value={rec.suitability} />
                </div>
                <ul className="text-sm text-[var(--color-ink-600)] space-y-1">
                  {rec.reasons.map((r) => (
                    <li key={r} className="flex gap-2">
                      <Info size={13} className="shrink-0 mt-1 text-[var(--color-ink-400)]" />
                      {r}
                    </li>
                  ))}
                </ul>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)] mt-3 mb-1">
                  Verifikasi ke mitra
                </p>
                <ul className="text-xs text-[var(--color-ink-600)] space-y-1">
                  {rec.requirements.map((q) => (
                    <li key={q} className="flex gap-2">
                      <ShieldCheck size={13} className="shrink-0 mt-0.5 text-[var(--color-leaf-500)]" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-5">
          <button
            onClick={() => onNavigate("cr-partners", { recordIds: [record.id] })}
            disabled={!analysis.sufficient || recordStatus !== "belum"}
            className={BTN_PRIMARY}
          >
            <Handshake size={16} /> Cari mitra yang cocok
          </button>
          {recordStatus !== "belum" && (
            <span className="text-xs text-[var(--color-ink-400)] self-center">Limbah ini sudah diajukan ke mitra.</span>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeading
          eyebrow="Gemini AI"
          title="Perdalam analisis dengan AI"
          subtitle="Opsional — AI menilai kecocokan dengan persyaratan mitra & konteks operasional. Berat tidak diubah AI."
        />

        {!hasApiKey && (
          <div className="flex items-start gap-3 bg-[#fff8e6] border border-[var(--color-gold-400)]/60 text-[#8a6300] rounded-xl px-4 py-3 mb-4 text-sm">
            <KeyRound size={18} className="shrink-0 mt-0.5" />
            <div>
              Gemini API key belum diatur (VITE_GEMINI_API_KEY di file .env). Analisis berbasis aturan di atas tetap bisa
              dipakai.
            </div>
          </div>
        )}

        {aiError && (
          <div className="mb-4">
            <ErrorBox>{aiError}</ErrorBox>
          </div>
        )}

        <button onClick={onAi} disabled={aiLoading || !hasApiKey || !analysis.sufficient} className={BTN_PRIMARY}>
          {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {aiLoading ? "AI sedang menganalisis..." : ai ? "Analisis ulang dengan AI" : "Analisis dengan Gemini AI"}
        </button>
        {!analysis.sufficient && hasApiKey && (
          <p className="text-xs text-[var(--color-ink-400)] mt-2">Lengkapi data limbah dulu sebelum analisis AI.</p>
        )}

        {ai && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-[var(--color-ink-400)]">
              Hasil {record.aiAnalysis.model} · {fmtDateTime(record.aiAnalysis.at)}
            </p>
            {ai.summary && <p className="rounded-xl bg-leaf-50 p-3 text-sm text-[var(--color-forest-900)]">{ai.summary}</p>}
            {ai.data_sufficient === false && ai.missing_info?.length > 0 && (
              <div className="rounded-xl border border-[var(--color-gold-400)]/60 bg-[#fff8e6] p-3 text-sm text-[#8a6300]">
                <p className="font-semibold mb-1">AI meminta informasi tambahan:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {ai.missing_info.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {ai.recommendations?.map((rec, i) => (
              <div key={i} className="rounded-xl border border-leaf-100 p-4">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <PathwayDot pathway={rec.pathway} />
                  <SuitabilityBadge value={rec.suitability} />
                </div>
                <p className="text-sm text-[var(--color-ink-600)]">{rec.reason}</p>
                {rec.requirements_to_verify?.length > 0 && (
                  <ul className="text-xs text-[var(--color-ink-600)] space-y-1 mt-2">
                    {rec.requirements_to_verify.map((q) => (
                      <li key={q} className="flex gap-2">
                        <ShieldCheck size={13} className="shrink-0 mt-0.5 text-[var(--color-leaf-500)]" />
                        {q}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {ai.handling_tips?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-400)] mb-1.5">
                  Penanganan sebelum pengambilan
                </p>
                <ul className="text-sm text-[var(--color-ink-600)] space-y-1">
                  {ai.handling_tips.map((t) => (
                    <li key={t} className="flex gap-2">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[var(--color-leaf-500)]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ai.prevention_tip && (
              <p className="text-xs text-[var(--color-leaf-500)] font-medium">Pencegahan: {ai.prevention_tip}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
