export function Card({ children, className = "", as: As = "div", ...props }) {
  return (
    <As
      className={`bg-white rounded-[var(--radius-card)] border border-leaf-100/70 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}

export function Badge({ children, tone = "leaf", className = "" }) {
  const tones = {
    leaf: "bg-[var(--color-leaf-100)] text-[var(--color-forest-900)]",
    amber: "bg-[#fff2e0] text-[var(--color-amber-500)]",
    gold: "bg-[#fff8e6] text-[#a67c00]",
    forest: "bg-[var(--color-forest-900)] text-white",
    danger: "bg-[#fdecec] text-[#c0392b]",
    outline: "bg-transparent border border-[var(--color-leaf-100)] text-[var(--color-ink-600)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        {eyebrow && (
          <div className="text-xs font-semibold tracking-wide uppercase text-[var(--color-leaf-500)] mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-bold text-[var(--color-forest-900)]">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--color-ink-600)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
