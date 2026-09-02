import images from "./images";

export const kitchenTeam = {
  name: "Dapur Kitchen Team",
  todayDate: new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }),
};

export const predictedNeeds = {
  label: "Prediksi Kebutuhan Besok",
  servings: 120,
  trend: "on-track",
  weekly: [
    { day: "Sen", value: 96 },
    { day: "Sel", value: 108 },
    { day: "Rab", value: 101 },
    { day: "Kam", value: 114 },
    { day: "Jum", value: 132 },
    { day: "Sab", value: 140 },
    { day: "Min", value: 120 },
  ],
};

export const foodWasteThisWeek = {
  kg: 2.4,
  changePct: -18,
};

export const stockStatus = {
  goodItems: 32,
  totalItems: 41,
};

export const topExpiringSoon = [
  { id: "tomatoes", name: "Tomat", qty: "1.2 kg", daysLeft: 2, img: images.ingredients.tomatoes },
  { id: "chicken", name: "Ayam Fillet", qty: "0.8 kg", daysLeft: 3, img: images.ingredients.chicken },
  { id: "milk", name: "Susu Segar", qty: "1.5 L", daysLeft: 4, img: images.ingredients.milk },
  { id: "greens", name: "Sayur Hijau", qty: "0.6 kg", daysLeft: 1, img: images.ingredients.leafyGreens },
];

export const analytics = {
  foodWasteReducedKg: 24.6,
  foodWasteReducedChangePct: 23,
  co2ImpactKg: 62.3,
  wasteByCategory: [
    { name: "Sayuran", value: 45, color: "var(--color-leaf-500)" },
    { name: "Buah", value: 20, color: "var(--color-gold-400)" },
    { name: "Protein", value: 20, color: "var(--color-amber-500)" },
    { name: "Lainnya", value: 15, color: "var(--color-forest-900)" },
  ],
  monthlyTrend: [
    { week: "Minggu 1", waste: 6.8, saved: 12 },
    { week: "Minggu 2", waste: 5.4, saved: 18 },
    { week: "Minggu 3", waste: 4.1, saved: 24 },
    { week: "Minggu 4", waste: 2.4, saved: 31 },
  ],
  savingsIdr: 4820000,
};

export const inventorySnapshot = [
  { id: "1", name: "Tomat", stock: "12 kg", status: "aman", img: images.ingredients.tomatoes },
  { id: "2", name: "Ayam Fillet", stock: "8 kg", status: "hampir habis", img: images.ingredients.chicken },
  { id: "3", name: "Susu Segar", stock: "6 L", status: "hampir kedaluwarsa", img: images.ingredients.milk },
  { id: "4", name: "Wortel", stock: "9 kg", status: "aman", img: images.ingredients.carrots },
  { id: "5", name: "Roti Tawar", stock: "14 pcs", status: "aman", img: images.ingredients.bread },
  { id: "6", name: "Sayur Hijau", stock: "3 kg", status: "hampir kedaluwarsa", img: images.ingredients.leafyGreens },
];

export const defaultIngredientsInput = `Tomat 1.2 kg (2 hari lagi)
Ayam fillet 0.8 kg (3 hari lagi)
Susu segar 1.5 L (4 hari lagi)
Sayur hijau 0.6 kg (1 hari lagi)
Wortel 3 kg
Roti tawar 8 pcs`;
