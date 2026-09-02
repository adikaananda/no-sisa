import { LayoutDashboard, ChefHat, PackageSearch, PieChart, Wallet, Settings, Leaf, X } from "lucide-react";
import { LogoLockup } from "./LogoMark";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "menu-planner", label: "AI Menu Planner", icon: ChefHat, badge: "AI" },
  { id: "stock-predictor", label: "Stock Predictor", icon: PackageSearch, badge: "AI" },
  { id: "analytics", label: "Analytics", icon: PieChart },
  { id: "loss-analysis", label: "Analisis Kerugian", icon: Wallet, badge: "POS" },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

export default function Sidebar({ active, onNavigate, open, onClose }) {
  return (
    <>
      {open && (
        <button
          aria-label="Tutup menu"
          onClick={onClose}
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 shrink-0 bg-[var(--color-forest-900)] text-white z-40
        flex flex-col transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <LogoLockup dark size={34} />
          <button className="lg:hidden text-white/70 hover:text-white" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2" aria-label="Navigasi utama">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-white text-[var(--color-forest-900)] shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <Icon size={18} strokeWidth={2.1} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-[var(--color-leaf-100)] text-[var(--color-forest-900)]" : "bg-[var(--color-gold-400)] text-[var(--color-forest-950)]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="m-4 p-4 rounded-2xl bg-white/10">
          <div className="flex items-center gap-2 text-[var(--color-gold-400)] mb-1.5">
            <Leaf size={16} />
            <span className="text-xs font-semibold">Dampak bulan ini</span>
          </div>
          <p className="text-sm text-white/85 leading-snug">
            24.6 kg food waste berhasil dicegah setara 62.3 kg CO₂e.
          </p>
        </div>
      </aside>
    </>
  );
}

export { NAV };
