import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import MenuPlanner from "./pages/MenuPlanner";
import StockPredictor from "./pages/StockPredictor";
import Analytics from "./pages/Analytics";
import LossAnalysis from "./pages/LossAnalysis";
import Settings from "./pages/Settings";
import Footer from "./components/Footer";
import CircularOverview from "./pages/circular/Overview";
import WasteRecording from "./pages/circular/WasteRecording";
import WasteAnalysis from "./pages/circular/WasteAnalysis";
import PartnerNetwork from "./pages/circular/PartnerNetwork";
import PickupScheduling from "./pages/circular/PickupScheduling";
import RecoveryHistory from "./pages/circular/RecoveryHistory";
import CircularImpact from "./pages/circular/CircularImpact";

const PAGES = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Ringkasan operasional dapur hari ini",
    Component: Dashboard,
  },
  "menu-planner": {
    title: "AI Menu Planner",
    subtitle: "Susun menu dari stok yang tersedia dengan bantuan AI",
    Component: MenuPlanner,
  },
  "stock-predictor": {
    title: "Stock Predictor",
    subtitle: "Prediksi kebutuhan bahan baku mingguan",
    Component: StockPredictor,
  },
  analytics: {
    title: "Analytics",
    subtitle: "Dampak pengurangan food waste & efisiensi biaya",
    Component: Analytics,
  },
  "loss-analysis": {
    title: "Analisis Kerugian",
    subtitle: "Rekonsiliasi data penjualan (POS) vs prediksi AI untuk hitung kerugian riil",
    Component: LossAnalysis,
  },
  // ---- Circular Recovery (modul tambahan) ----
  "cr-overview": {
    title: "Circular Recovery",
    subtitle: "Salurkan limbah organik yang tetap terjadi ke mitra pengolah",
    Component: CircularOverview,
  },
  "cr-recording": {
    title: "Waste Recording",
    subtitle: "Catat jenis, berat, dan sumber limbah organik",
    Component: WasteRecording,
  },
  "cr-analysis": {
    title: "AI Waste Analysis",
    subtitle: "Rekomendasi jalur pengolahan & persyaratan yang perlu diverifikasi",
    Component: WasteAnalysis,
  },
  "cr-partners": {
    title: "Partner Network",
    subtitle: "Cocokkan dengan bank pangan, pengolah pakan, maggot BSF, kompos, dan biogas",
    Component: PartnerNetwork,
  },
  "cr-pickups": {
    title: "Pickup Scheduling",
    subtitle: "Ajukan dan pantau jadwal pengambilan limbah",
    Component: PickupScheduling,
  },
  "cr-history": {
    title: "Recovery History",
    subtitle: "Riwayat penyaluran dan verifikasi berat penerimaan",
    Component: RecoveryHistory,
  },
  "cr-impact": {
    title: "Circular Impact",
    subtitle: "Dampak penyaluran limbah berdasarkan transaksi terkonfirmasi",
    Component: CircularImpact,
  },
  settings: {
    title: "Pengaturan",
    subtitle: "Kelola koneksi API dan preferensi dapur",
    Component: Settings,
  },
};

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [params, setParams] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { title, subtitle, Component } = PAGES[active];

  // params opsional untuk meneruskan konteks antar halaman (mis. recordId di Circular Recovery)
  function navigate(page, nextParams = {}) {
    setActive(page);
    setParams(nextParams);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-cream-50)]">
      <Sidebar active={active} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-5 sm:px-8 py-6 max-w-[1400px] w-full mx-auto">
          <Component key={`${active}:${JSON.stringify(params)}`} onNavigate={navigate} params={params} />
        </main>
        <Footer/>
      </div>
    </div>
  );
}
