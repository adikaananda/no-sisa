// Rekonstruksi vektor dari logo No Sisa (mangkuk sayur di dalam lingkaran).
// Ganti dengan <img src="/logo.svg" /> milikmu sendiri kalau sudah ada file logo final.
export default function LogoMark({ size = 40, className = "" }) {
  return (
    <img
      src="nosisa.png"
      width={34}
      height={34}
      className={`${className} rounded-full object-cover`}
      alt="Logo No Sisa"
    />
  );
}

export function LogoLockup({ size = 36, tagline = true, dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-tight">
        <div
          className="font-bold tracking-tight"
          style={{
            fontSize: size * 0.62,
            color: dark ? "#fff" : "var(--color-forest-900)",
          }}
        >
          No Sisa
        </div>
        {tagline && (
          <div
            className="text-[11px] font-medium -mt-0.5"
            style={{ color: dark ? "var(--color-leaf-100)" : "var(--color-leaf-500)" }}
          >
            Predict better. Waste less.
          </div>
        )}
      </div>
    </div>
  );
}
