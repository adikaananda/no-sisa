import { Menu, Bell } from "lucide-react";
import images from "../lib/images";

export default function Topbar({ title, subtitle, onMenuClick }) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-cream-50)]/90 backdrop-blur-sm border-b border-leaf-100/70">
      <div className="flex items-center gap-3 px-5 sm:px-8 py-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 grid place-items-center rounded-xl bg-white border border-leaf-100 text-[var(--color-forest-900)]"
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-forest-900)] truncate">{title}</h1>
          {subtitle && <p className="text-sm text-[var(--color-ink-600)] truncate">{subtitle}</p>}
        </div>

        <button
          className="relative w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-white border border-leaf-100 text-[var(--color-forest-900)] hover:bg-leaf-50"
          aria-label="Notifikasi"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-[var(--color-amber-500)]" />
        </button>

        <img
          src={images.team.avatar1}
          alt="Foto profil pengguna"
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
        />
      </div>
    </header>
  );
}
