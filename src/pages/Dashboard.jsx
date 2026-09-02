import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp, Clock, ChevronRight, Sparkles } from "lucide-react";
import { Card, Badge, SectionHeading } from "../components/Card";
import WasteRing from "../components/WasteRing";
import images from "../lib/images";
import {
  predictedNeeds,
  foodWasteThisWeek,
  stockStatus,
  topExpiringSoon,
  kitchenTeam,
} from "../lib/sampleData";

export default function Dashboard({ onNavigate }) {
  const stockHealthPct = Math.round((stockStatus.goodItems / stockStatus.totalItems) * 100);

  return (
    <div className="space-y-6 animate-rise">
      {/* Hero */}
      <Card className="relative overflow-hidden !rounded-[1.5rem]">
        <div className="grid md:grid-cols-[1.3fr,1fr] items-stretch">
          <div className="p-6 sm:p-8 flex flex-col justify-center">
            <Badge tone="gold" className="w-fit mb-3">
              {kitchenTeam.todayDate}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-forest-900)] leading-tight">
              Selamat pagi, {kitchenTeam.name}! 
            </h2>
            <p className="text-[var(--color-ink-600)] mt-2 max-w-md">
              AI memprediksi kebutuhan besok sudah siap. Ada 4 bahan yang perlu segera diolah sebelum
              terbuang.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <button
                onClick={() => onNavigate("menu-planner")}
                className="inline-flex items-center gap-2 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Sparkles size={16} />
                Buat rekomendasi menu AI
              </button>
              <button
                onClick={() => onNavigate("stock-predictor")}
                className="inline-flex items-center gap-2 bg-white border border-leaf-100 hover:bg-leaf-50 text-[var(--color-forest-900)] text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                Lihat prediksi stok
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="relative min-h-[180px] hidden md:block">
            <img
              src={images.hero.kitchenAction}
              alt="Tim dapur komersial sedang menyiapkan bahan makanan segar"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/10 to-transparent md:hidden" />
          </div>
        </div>
      </Card>

      {/* Stat row */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            {predictedNeeds.label}
          </p>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-extrabold text-[var(--color-forest-900)]">
              {predictedNeeds.servings}
              <span className="text-base font-semibold text-[var(--color-ink-600)]"> porsi</span>
            </span>
            <Badge tone="leaf">On Track</Badge>
          </div>
          <div className="h-14 -mx-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictedNeeds.weekly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <Bar dataKey="value" radius={[4, 4, 4, 4]} fill="var(--color-leaf-500)" />
                <XAxis dataKey="day" hide />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Food Waste Minggu Ini
          </p>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-extrabold text-[var(--color-forest-900)]">
              {foodWasteThisWeek.kg}
              <span className="text-base font-semibold text-[var(--color-ink-600)]"> kg</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-leaf-500)]">
              <TrendingDown size={16} />
              {Math.abs(foodWasteThisWeek.changePct)}%
            </span>
          </div>
          <p className="text-xs text-[var(--color-ink-400)] mt-8">vs minggu lalu — tren membaik</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
            Status Stok
          </p>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-extrabold text-[var(--color-forest-900)]">
              {stockStatus.goodItems}
              <span className="text-base font-semibold text-[var(--color-ink-600)]">
                {" "}
                / {stockStatus.totalItems} bahan
              </span>
            </span>
          </div>
          <div className="w-full h-2 bg-leaf-50 rounded-full mt-8 overflow-hidden">
            <div
              className="h-full bg-[var(--color-leaf-500)] rounded-full"
              style={{ width: `${stockHealthPct}%` }}
            />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--color-ink-600)] uppercase tracking-wide">
              Stock Health
            </p>
            <p className="text-xs text-[var(--color-ink-400)] mt-1 max-w-[8rem]">
              Skor kesehatan stok dapur hari ini
            </p>
          </div>
          <WasteRing value={stockHealthPct} size={84} stroke={9} label="" />
        </Card>
      </div>

      {/* Top expiring + weekly chart */}
      <div className="grid lg:grid-cols-[1.2fr,1fr] gap-6">
        <Card className="p-6">
          <SectionHeading
            eyebrow="Prediksi 7 Hari"
            title="Tren Kebutuhan Porsi"
            subtitle="Perkiraan jumlah porsi yang perlu disiapkan setiap hari"
          />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictedNeeds.weekly} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-leaf-100)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-ink-400)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-leaf-50)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-leaf-100)",
                    fontSize: 13,
                  }}
                  formatter={(v) => [`${v} porsi`, "Prediksi"]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-forest-900)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading eyebrow="Perlu Perhatian" title="Segera Kedaluwarsa" />
          <ul className="space-y-3">
            {topExpiringSoon.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-forest-900)] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-ink-400)]">{item.qty}</p>
                </div>
                <Badge tone={item.daysLeft <= 1 ? "danger" : "amber"} className="shrink-0">
                  <Clock size={12} />
                  {item.daysLeft} hari
                </Badge>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onNavigate("menu-planner")}
            className="w-full mt-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-forest-900)] bg-leaf-50 hover:bg-[var(--color-leaf-100)] rounded-xl py-2.5 transition-colors"
          >
            <Sparkles size={15} />
            Alihkan bahan ini jadi menu
          </button>
        </Card>
      </div>
    </div>
  );
}
