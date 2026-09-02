import { Leaf, Code2, Link2, Send } from "lucide-react";
import { LogoLockup } from "./LogoMark";

const LINKS = [
  { label: "Tentang", href: "#" },
  { label: "Dokumentasi", href: "#" },
  { label: "Bantuan", href: "#" },
  { label: "Privasi", href: "#" },
];

const SOCIALS = [
  { icon: Send, href: "#", label: "Instagram" },
  { icon: Link2, href: "#", label: "LinkedIn" },
  { icon: Code2, href: "#", label: "GitHub" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-forest-900)]/10 bg-white/60">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <LogoLockup size={30} />
            <p className="mt-3 text-sm text-[var(--color-ink-400)] leading-relaxed">
              Platform AI food intelligence untuk bantu dapur & UMKM kurangi
              food waste dan ambil keputusan stok yang lebih presisi.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-forest-900)] bg-[var(--color-leaf-100)] px-2.5 py-1 rounded-full">
              <Leaf size={12} />
              24.6 kg food waste dicegah bulan ini
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-12">
            <div>
              <p className="text-xs font-semibold text-[var(--color-ink-400)] uppercase tracking-wide mb-3">
                Produk
              </p>
              <ul className="space-y-2">
                {LINKS.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-[var(--color-forest-900)]/80 hover:text-[var(--color-forest-900)] transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--color-ink-400)] uppercase tracking-wide mb-3">
                Terhubung
              </p>
              <div className="flex gap-2">
                {SOCIALS.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-forest-900)]/5 text-[var(--color-forest-900)] hover:bg-[var(--color-forest-900)] hover:text-white transition-colors"
                  >
                    <Icon size={15} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-5 border-t border-[var(--color-forest-900)]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-ink-400)]">
            © {new Date().getFullYear()} No Sisa. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-ink-400)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-leaf-100)] ring-2 ring-[var(--color-leaf-100)]/40" />
            Made with care in Bali
          </div>
        </div>
      </div>
    </footer>
  );
}