import { useState } from "react";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Link2,
  Unlink,
  RefreshCw,
  Upload,
  ChevronRight,
} from "lucide-react";
import { Card, SectionHeading, Badge } from "../components/Card";
import { getSetting, setSetting, getJSON, setJSON, KEYS } from "../lib/storage";
import { testGeminiKey, GEMINI_MODELS } from "../lib/gemini";
import {
  POS_PROVIDERS,
  generateMockSyncBatch,
  fetchCustomPOSSales,
  parseSalesCSV,
} from "../lib/salesIntegration";

export default function Settings({ onNavigate }) {
  const [apiKey, setApiKey] = useState(() => getSetting(KEYS.GEMINI_API_KEY));
  const [model, setModel] = useState(() => getSetting(KEYS.GEMINI_MODEL, GEMINI_MODELS[0].id));
  const [kitchenName, setKitchenName] = useState(() => getSetting(KEYS.KITCHEN_NAME, "Dapur Kitchen Team"));
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState(null); // null | "testing" | "ok" | "error"
  const [statusMsg, setStatusMsg] = useState("");
  const [saved, setSaved] = useState(false);

  // ---- Integrasi Sistem Penjualan (POS) ----
  const [posProvider, setPosProvider] = useState(() => getSetting(KEYS.POS_PROVIDER, "moka"));
  const [posEndpoint, setPosEndpoint] = useState(() => getSetting(KEYS.POS_ENDPOINT));
  const [posApiKey, setPosApiKey] = useState(() => getSetting(KEYS.POS_API_KEY));
  const [posStatus, setPosStatus] = useState(() => getSetting(KEYS.POS_STATUS, "disconnected"));
  const [posLastSync, setPosLastSync] = useState(() => getSetting(KEYS.POS_LAST_SYNC, ""));
  const [posSyncState, setPosSyncState] = useState(null); // null | "syncing" | "error"
  const [posError, setPosError] = useState("");
  const [posSyncedCount, setPosSyncedCount] = useState(() => getJSON(KEYS.SALES_RECORDS, []).length);
  const [csvFileName, setCsvFileName] = useState("");
  const [showPosKey, setShowPosKey] = useState(false);

  const isCustomApi = posProvider === "custom";
  const isCsv = posProvider === "csv";

  async function handlePosConnect() {
    setPosSyncState("syncing");
    setPosError("");
    try {
      let records;

      if (isCustomApi) {
        try {
          records = await fetchCustomPOSSales({ endpoint: posEndpoint, apiKey: posApiKey });
        } catch (e) {
          // Fallback ke data simulasi supaya demo tetap bisa jalan walau endpoint belum siap
          records = generateMockSyncBatch().records;
          setPosError(`Endpoint kustom gagal diakses (${e.message}) — memakai data simulasi untuk demo.`);
        }
      } else if (isCsv) {
        throw new Error("__NEEDS_CSV__");
      } else {
        // Provider POS umum (Moka/Pawoon/Olsera/ESB) — simulasikan sinkronisasi
        await new Promise((r) => setTimeout(r, 900));
        records = generateMockSyncBatch().records;
      }

      const now = new Date().toISOString();
      setJSON(KEYS.SALES_RECORDS, records);
      setSetting(KEYS.POS_PROVIDER, posProvider);
      setSetting(KEYS.POS_ENDPOINT, posEndpoint);
      setSetting(KEYS.POS_API_KEY, posApiKey);
      setSetting(KEYS.POS_STATUS, "connected");
      setSetting(KEYS.POS_LAST_SYNC, now);

      setPosStatus("connected");
      setPosLastSync(now);
      setPosSyncedCount(records.length);
      setPosSyncState(null);
    } catch (e) {
      if (e.message === "__NEEDS_CSV__") {
        setPosSyncState(null);
        setPosError("Pilih file CSV dulu untuk diunggah.");
      } else {
        setPosSyncState("error");
        setPosError(e.message);
      }
    }
  }

  function handleCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const records = parseSalesCSV(String(reader.result));
        const now = new Date().toISOString();
        setJSON(KEYS.SALES_RECORDS, records);
        setSetting(KEYS.POS_PROVIDER, "csv");
        setSetting(KEYS.POS_STATUS, "connected");
        setSetting(KEYS.POS_LAST_SYNC, now);
        setPosStatus("connected");
        setPosLastSync(now);
        setPosSyncedCount(records.length);
        setPosError("");
        setPosSyncState(null);
      } catch (err) {
        setPosSyncState("error");
        setPosError(err.message);
      }
    };
    reader.readAsText(file);
  }

  function handlePosDisconnect() {
    setSetting(KEYS.POS_STATUS, "disconnected");
    setJSON(KEYS.SALES_RECORDS, []);
    setPosStatus("disconnected");
    setPosSyncedCount(0);
    setPosLastSync("");
    setPosError("");
  }

  function handleSave() {
    setSetting(KEYS.GEMINI_API_KEY, apiKey.trim());
    setSetting(KEYS.GEMINI_MODEL, model);
    setSetting(KEYS.KITCHEN_NAME, kitchenName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleTest() {
    setStatus("testing");
    setStatusMsg("");
    try {
      await testGeminiKey({ apiKey: apiKey.trim(), model });
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setStatusMsg(e.message);
    }
  }

  return (
    <div className="space-y-6 animate-rise max-w-2xl">
     
      {/* Integrasi Sistem Penjualan (POS) */}
      <Card className="p-6 sm:p-8">
        <SectionHeading
          eyebrow="Pengaturan"
          title="Integrasi Sistem Penjualan (POS)"
          subtitle="Hubungkan data transaksi penjualan supaya No Sisa bisa menghitung kerugian riil (Rp), bukan cuma estimasi stok"
          action={
            <Badge tone={posStatus === "connected" ? "leaf" : "outline"}>
              {posStatus === "connected" ? (
                <>
                  <Link2 size={12} /> Terhubung
                </>
              ) : (
                <>
                  <Unlink size={12} /> Belum terhubung
                </>
              )}
            </Badge>
          }
        />

        <div className="flex items-start gap-3 bg-leaf-50 rounded-xl px-4 py-3 mb-6 text-sm text-[var(--color-forest-900)]">
          <ShieldCheck size={18} className="shrink-0 mt-0.5" />
          <p>
            No Sisa membandingkan <b>realisasi penjualan</b> dari POS dengan <b>prediksi AI Food Planner</b>{" "}
            untuk tiap menu, lalu memetakannya ke resep (BOM) supaya bisa dihitung estimasi bahan yang
            terbuang beserta nilai kerugiannya. Prototype ini mensimulasikan koneksi POS umum; untuk "API
            Kustom" akan mencoba fetch langsung ke endpoint yang kamu isi.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Provider POS / Sumber Data
            </label>
            <select
              value={posProvider}
              onChange={(e) => {
                setPosProvider(e.target.value);
                setPosError("");
              }}
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none bg-white"
            >
              {POS_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {isCustomApi && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
                  URL Endpoint API Penjualan
                </label>
                <input
                  type="text"
                  value={posEndpoint}
                  onChange={(e) => setPosEndpoint(e.target.value)}
                  placeholder="https://pos.contoh-resto.com/api/sales/today"
                  className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none font-mono"
                />
                <p className="text-xs text-[var(--color-ink-400)] mt-1.5">
                  Diharapkan mengembalikan JSON array berisi{" "}
                  <code className="bg-leaf-50 px-1 rounded">{`{ menu, qtySold, price, date }`}</code>
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
                  API Key (opsional, Bearer token)
                </label>
                <div className="relative">
                  <input
                    type={showPosKey ? "text" : "password"}
                    value={posApiKey}
                    onChange={(e) => setPosApiKey(e.target.value)}
                    placeholder="API Key POS..."
                    className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 pr-11 text-sm outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPosKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]"
                    aria-label={showPosKey ? "Sembunyikan key" : "Tampilkan key"}
                  >
                    {showPosKey ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {isCsv && (
            <div>
              <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
                Unggah CSV Penjualan
              </label>
              <label className="flex items-center gap-3 border border-dashed border-leaf-100 hover:border-[var(--color-leaf-500)] rounded-xl px-4 py-3.5 text-sm cursor-pointer transition-colors">
                <Upload size={17} className="text-[var(--color-leaf-500)] shrink-0" />
                <span className="text-[var(--color-ink-600)]">
                  {csvFileName || "Pilih file .csv (kolom: menu, qty, price, date)"}
                </span>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
              </label>
            </div>
          )}

          {!isCustomApi && !isCsv && (
            <p className="text-xs text-[var(--color-ink-400)]">
              Sinkronisasi akan menarik transaksi hari ini dari {POS_PROVIDERS.find((p) => p.id === posProvider)?.label}{" "}
              (disimulasikan untuk keperluan demo prototype).
            </p>
          )}
        </div>

        {posError && (
          <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#fdecec] rounded-xl px-4 py-2.5 mt-5">
            <AlertTriangle size={16} className="shrink-0" /> {posError}
          </div>
        )}

        {posStatus === "connected" && !posError && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-leaf-500)] bg-leaf-50 rounded-xl px-4 py-2.5 mt-5">
            <CheckCircle2 size={16} />
            {posSyncedCount} transaksi tersinkron
            {posLastSync && ` · terakhir ${new Date(posLastSync).toLocaleString("id-ID")}`}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-6">
          {!isCsv && (
            <button
              onClick={handlePosConnect}
              disabled={posSyncState === "syncing"}
              className="inline-flex items-center gap-2 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {posSyncState === "syncing" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              {posStatus === "connected" ? "Sinkronkan ulang" : "Hubungkan & Sinkronkan"}
            </button>
          )}

          {posStatus === "connected" && (
            <>
              <button
                onClick={handlePosDisconnect}
                className="inline-flex items-center gap-2 bg-white border border-leaf-100 hover:bg-leaf-50 text-[var(--color-forest-900)] text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Unlink size={15} />
                Putuskan koneksi
              </button>
              <button
                onClick={() => onNavigate?.("loss-analysis")}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-leaf-500)] ml-auto"
              >
                Lihat Analisis Kerugian <ChevronRight size={15} />
              </button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
