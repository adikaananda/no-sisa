export default function WasteRing({
  value = 72,
  size = 168,
  stroke = 14,
  label = "Stock Health",
  sublabel,
  tone = "leaf", // leaf | amber
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const color = tone === "amber" ? "var(--color-amber-500)" : "var(--color-leaf-500)";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ "--ring-circumference": circumference, "--ring-offset": offset }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-leaf-50)"
          strokeWidth={stroke}
        />
        <circle
          className="animate-ring"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center px-4">
        <span className="text-3xl font-extrabold text-[var(--color-forest-900)] leading-none">
          {value}
          <span className="text-lg align-top">%</span>
        </span>
        <span className="text-xs font-semibold text-[var(--color-ink-600)] mt-1">{label}</span>
        {sublabel && <span className="text-[11px] text-[var(--color-ink-400)] mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}
