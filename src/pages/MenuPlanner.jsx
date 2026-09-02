import { useState } from "react";
import {
  Sparkles, Loader2, AlertTriangle, ChefHat, Flame, Wheat, Beef, Droplet,
  KeyRound, BookOpen, Plus, X, Trash2, Pencil,
} from "lucide-react";
import { Card, Badge, SectionHeading } from "../components/Card";
import images from "../lib/images";
import { generateMenuPlan } from "../lib/gemini";
import { getSetting, setJSON, getJSON, KEYS } from "../lib/storage";
import { defaultIngredientsInput } from "../lib/sampleData";

const FOOD_IMAGE_POOL = [images.cards.chefPlating, images.cards.vegetablesCrate, images.cards.cateringSetup];

export default function MenuPlanner({ onNavigate }) {
  const [ingredients, setIngredients] = useState(defaultIngredientsInput);
  const [portions, setPortions] = useState(40);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(() => getJSON(KEYS.MENU_HISTORY, null));

  // "Database" menu resep restoran — array, disimpan permanen, edit lewat modal
  const [menuItems, setMenuItems] = useState(() => getJSON(KEYS.RESTAURANT_MENU_ITEMS, []));
  const [restrictToOwnMenu, setRestrictToOwnMenu] = useState(true);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const storedApiKey = getSetting(KEYS.GEMINI_API_KEY);
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const apiKey = storedApiKey || envApiKey;
  const usingEnvKey = !storedApiKey && !!envApiKey;

  const model = getSetting(KEYS.GEMINI_MODEL, "gemini-3.5-flash-lite");

  function persistMenuItems(items) {
    setMenuItems(items);
    setJSON(KEYS.RESTAURANT_MENU_ITEMS, items);
  }

  function handleSaveMenuItem(item) {
    if (item.id) {
      // edit item yang sudah ada
      persistMenuItems(menuItems.map((m) => (m.id === item.id ? item : m)));
    } else {
      persistMenuItems([...menuItems, { ...item, id: `menu-${Date.now()}` }]);
    }
    setShowMenuModal(false);
    setEditingItem(null);
  }

  function handleDeleteMenuItem(id) {
    persistMenuItems(menuItems.filter((m) => m.id !== id));
  }

  // Konversi list menu jadi teks buat dikirim ke AI
  function menuItemsToText() {
    return menuItems
      .map((m) => `${m.name} — ${m.ingredients}`)
      .join("\n");
  }

  async function handleGenerate() {
    setError("");
    if (!apiKey) {
      setError("Gemini API key belum diisi.");
      return;
    }
    if (!ingredients.trim()) {
      setError("Isi dulu daftar bahan yang tersedia di dapur.");
      return;
    }
    setLoading(true);
    try {
      const plan = await generateMenuPlan({
        apiKey,
        model,
        ingredients,
        portions,
        notes,
        restaurantMenu: menuItemsToText(),
        restrictToOwnMenu,
      });
      setResult(plan);
      setJSON(KEYS.MENU_HISTORY, plan);
    } catch (e) {
      setError(e.message || "Terjadi kesalahan saat memanggil Gemini API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-rise relative">
      {showMenuModal && (
        <MenuItemModal
          initial={editingItem}
          onClose={() => {
            setShowMenuModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveMenuItem}
        />
      )}

      <Card className="p-6 sm:p-8">
        <SectionHeading
          eyebrow="AI Menu & Nutrition Planner"
          title="Ubah stok jadi menu, bukan sampah"
          subtitle="Masukkan bahan yang tersedia — AI menyusun rekomendasi menu lengkap dengan estimasi gizi per porsi."
        />

        {!apiKey && (
          <div className="flex items-start gap-3 bg-[#fff8e6] border border-[var(--color-gold-400)]/60 text-[#8a6300] rounded-xl px-4 py-3 mb-5 text-sm">
            <KeyRound size={18} className="shrink-0 mt-0.5" />
            <div>
              Gemini API key belum diatur.{" "}
              <button
                className="font-semibold underline underline-offset-2"
                onClick={() => onNavigate("settings")}
              >
                Tambahkan di halaman Pengaturan
              </button>{" "}
              supaya AI Menu Planner bisa dipakai.
            </div>
          </div>
        )}

        {usingEnvKey && (
          <p className="text-xs text-[var(--color-ink-400)] mb-5 -mt-2"> </p>
        )}

        {/* Database menu resep restoran */}
        <div className="rounded-xl border border-leaf-100 bg-leaf-50/50 p-4 mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--color-leaf-500)]" />
              <span className="text-sm font-semibold text-[var(--color-forest-900)]">
                Menu resep restoran Anda
              </span>
              <span className="text-xs text-[var(--color-ink-400)]">({menuItems.length} menu tersimpan)</span>
            </div>
            <button
              onClick={() => setShowMenuModal(true)}
              className="inline-flex items-center gap-1.5 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Tambah Menu
            </button>
          </div>

          {menuItems.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-400)]">
              Belum ada menu tersimpan. Tambahkan resep-resep restoran Anda supaya AI hanya menyarankan menu yang memang Anda jual.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {menuItems.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-center gap-2 bg-white border border-leaf-100 rounded-full pl-3 pr-1.5 py-1.5 text-xs"
                >
                  <div>
                    <span className="font-semibold text-[var(--color-forest-900)]">{m.name}</span>
                    {m.ingredients && (
                      <span className="text-[var(--color-ink-400)]"> — {m.ingredients}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditingItem(m);
                      setShowMenuModal(true);
                    }}
                    className="text-[var(--color-ink-400)] hover:text-[var(--color-forest-900)] p-1"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteMenuItem(m.id)}
                    className="text-[var(--color-ink-400)] hover:text-red-600 p-1"
                    title="Hapus"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {menuItems.length > 0 && (
            <label className="flex items-center gap-2 mt-3 text-sm text-[var(--color-forest-900)] cursor-pointer">
              <input
                type="checkbox"
                checked={restrictToOwnMenu}
                onChange={(e) => setRestrictToOwnMenu(e.target.checked)}
                className="rounded border-leaf-100"
              />
              Hanya sarankan dari menu resep saya (jangan buat menu baru)
            </label>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Bahan tersedia di dapur
            </label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              rows={7}
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none resize-none"
              placeholder="Contoh: Tomat 1.2 kg (2 hari lagi), Ayam fillet 0.8 kg..."
            />
            <p className="text-xs text-[var(--color-ink-400)] mt-1.5">
              Tips: tulis "(x hari lagi)" untuk bahan yang hampir kedaluwarsa supaya AI memprioritaskannya.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
                Target jumlah porsi
              </label>
              <input
                type="number"
                min={1}
                value={portions}
                onChange={(e) => setPortions(e.target.value)}
                className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
                Catatan tambahan (opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none resize-none"
                placeholder="Contoh: menu untuk katering kantor, hindari pedas"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#fdecec] rounded-xl px-4 py-2.5 mt-4">
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] disabled:opacity-60 text-white text-sm font-semibold px-5 py-3 rounded-xl mt-5 transition-colors"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
          {loading ? "AI sedang menyusun menu..." : "Buat rekomendasi menu"}
        </button>
      </Card>

      {result?.unmatched_note && (
        <div className="flex items-start gap-2 text-sm text-[#8a6300] bg-[#fff8e6] border border-[var(--color-gold-400)]/60 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          {result.unmatched_note}
        </div>
      )}

      {result?.menus?.length > 0 && (
        <div>
          <SectionHeading
            eyebrow="Hasil AI"
            title={`${result.menus.length} rekomendasi menu`}
            subtitle={result.procurement_tip}
          />
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {result.menus.map((menu, i) => (
              <MenuCard key={i} menu={menu} image={FOOD_IMAGE_POOL[i % FOOD_IMAGE_POOL.length]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [ingredientsText, setIngredientsText] = useState(initial?.ingredients || "");
  const [formError, setFormError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Nama menu wajib diisi.");
      return;
    }
    onSave({
      id: initial?.id,
      name: name.trim(),
      ingredients: ingredientsText.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--color-forest-900)]">
            {initial ? "Edit Menu" : "Tambah Menu Resep"}
          </h3>
          <button onClick={onClose} className="text-[var(--color-ink-400)] hover:text-[var(--color-ink-600)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Nama menu
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Nasi Goreng Kampung"
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-forest-900)] mb-1.5">
              Bahan utama (opsional)
            </label>
            <input
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="mis. nasi, ayam suwir, telur, kecap"
              className="w-full rounded-xl border border-leaf-100 focus:border-[var(--color-leaf-500)] px-3.5 py-2.5 text-sm outline-none"
            />
            <p className="text-xs text-[var(--color-ink-400)] mt-1.5">
              Makin lengkap bahannya, makin akurat AI mencocokkan dengan stok yang tersedia.
            </p>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-[#c0392b] bg-[#fdecec] rounded-xl px-3.5 py-2">
              <AlertTriangle size={14} className="shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-leaf-100 text-sm font-semibold px-4 py-2.5 text-[var(--color-forest-900)] hover:bg-leaf-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[var(--color-forest-900)] hover:bg-[var(--color-forest-800)] text-white text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MenuCard({ menu, image }) {
  const n = menu.nutrition || {};
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative h-36">
        <img src={image} alt={menu.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex gap-2">
          {menu.from_own_menu && (
            <Badge tone="leaf" className="bg-white/95">
              <BookOpen size={12} /> Menu Anda
            </Badge>
          )}
          {menu.uses_expiring_stock && (
            <Badge tone="amber" className="bg-white/95">
              <ChefHat size={12} /> Pakai stok hampir habis
            </Badge>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-[var(--color-forest-900)]">{menu.name}</h3>
        <p className="text-sm text-[var(--color-ink-600)] mt-1 flex-1">{menu.description}</p>

        {menu.main_ingredients?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {menu.main_ingredients.map((ing, idx) => (
              <span
                key={idx}
                className="text-xs bg-leaf-50 text-[var(--color-forest-900)] rounded-full px-2.5 py-1"
              >
                {ing}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-leaf-100">
          <NutriStat icon={Flame} value={n.calories_kcal} unit="kkal" />
          <NutriStat icon={Beef} value={n.protein_g} unit="g" label="Protein" />
          <NutriStat icon={Wheat} value={n.carbs_g} unit="g" label="Karbo" />
          <NutriStat icon={Droplet} value={n.fat_g} unit="g" label="Lemak" />
        </div>

        {menu.waste_reduction_note && (
          <p className="text-xs text-[var(--color-leaf-500)] font-medium mt-3">
             {menu.waste_reduction_note}
          </p>
        )}
      </div>
    </Card>
  );
}

function NutriStat({ icon: Icon, value, unit, label }) {
  return (
    <div className="text-center">
      <Icon size={14} className="mx-auto text-[var(--color-amber-500)] mb-1" />
      <div className="text-xs font-bold text-[var(--color-forest-900)]">
        {value ?? "–"}
        <span className="font-normal text-[10px]">{unit}</span>
      </div>
      {label && <div className="text-[9px] text-[var(--color-ink-400)]">{label}</div>}
    </div>
  );
}