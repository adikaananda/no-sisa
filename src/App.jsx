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
  settings: {
    title: "Pengaturan",
    subtitle: "Kelola koneksi API dan preferensi dapur",
    Component: Settings,
  },
};

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { title, subtitle, Component } = PAGES[active];

  function navigate(page) {
    setActive(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-cream-50)]">
      <Sidebar active={active} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-5 sm:px-8 py-6 max-w-[1400px] w-full mx-auto">
          <Component onNavigate={navigate} />
        </main>
        <Footer/>
      </div>
    </div>
  );
}
