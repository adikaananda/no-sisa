// Helper kecil untuk menyimpan pengaturan & histori di localStorage
// (prototype ini tidak pakai backend — semua data tersimpan di browser)

const KEYS = {
  GEMINI_API_KEY: "nosisa.gemini.apiKey",
  GEMINI_MODEL: "nosisa.gemini.model",
  MENU_HISTORY: "nosisa.menu.history",
  KITCHEN_NAME: "nosisa.kitchen.name",
  STOCK_OUTLOOK_HISTORY: "nosisa.stock.outlookHistory",
  CUSTOM_STOCK_ITEMS: "nosisa.stock.customItems",
  RESTAURANT_MENU_ITEMS: "nosisa.restaurant.menuItems",
  // Integrasi sistem penjualan (POS)
  POS_PROVIDER: "nosisa.pos.provider",
  POS_ENDPOINT: "nosisa.pos.endpoint",
  POS_API_KEY: "nosisa.pos.apiKey",
  POS_STATUS: "nosisa.pos.status", // "connected" | "disconnected"
  POS_LAST_SYNC: "nosisa.pos.lastSync",
  SALES_RECORDS: "nosisa.pos.salesRecords",
  // Circular Recovery
  CR_RECORDS: "nosisa.circular.records",
  CR_PICKUPS: "nosisa.circular.pickups",
  CR_KITCHEN_LOCATION: "nosisa.circular.kitchenLocation",
};


export function getSetting(key, fallback = "") {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function setSetting(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage bisa gagal di mode privat — abaikan dengan aman
  }
}

export function getJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Mengembalikan false kalau gagal (mis. kuota localStorage penuh karena foto)
export function setJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export { KEYS };
