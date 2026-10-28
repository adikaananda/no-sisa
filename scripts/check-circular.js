// Self-check logika Circular Recovery: `npm run check:circular`
import assert from "node:assert/strict";
import {
  DEMO_PARTNERS,
  DEMO_KITCHEN_LOCATION,
  validateWasteRecord,
  createWasteRecord,
  analyzeWasteRules,
  evaluatePartner,
  matchPartners,
  validatePickupRequest,
  createPickup,
  transitionPickup,
  computeCircularStats,
  recordStatusMap,
  nextPickupDate,
} from "../src/lib/circularRecovery.js";

const now = new Date(2026, 9, 28, 10, 0); // Rabu
const base = {
  category: "sayur_buah",
  weightKg: "12.5",
  weightMethod: "timbangan",
  recordedAt: "2026-10-28T09:00",
  source: "persiapan",
  contamination: "bersih",
  flags: [],
};

// Validasi input
assert.deepEqual(validateWasteRecord(base, now), {});
assert.ok(validateWasteRecord({ ...base, weightKg: "0" }, now).weightKg);
assert.ok(validateWasteRecord({ ...base, recordedAt: "2026-10-29T09:00" }, now).recordedAt);

const veg = createWasteRecord(base, now);
assert.equal(veg.weightKg, 12.5);

// Data kurang -> minta dilengkapi, tanpa rekomendasi
const unchecked = createWasteRecord({ ...base, category: "campuran", contamination: "belum_dicek" }, now);
const a1 = analyzeWasteRules(unchecked);
assert.equal(a1.sufficient, false);
assert.equal(a1.gaps.length, 2);
assert.equal(a1.recommendations.length, 0);

// Daging -> kompos tidak disarankan, BSF bersyarat
const meaty = createWasteRecord({ ...base, category: "campuran", flags: ["daging_ikan"] }, now);
const a2 = analyzeWasteRules(meaty);
assert.equal(a2.recommendations.find((r) => r.pathway === "kompos").suitability, "tidak disarankan");
assert.equal(a2.recommendations.find((r) => r.pathway === "bsf").suitability, "bersyarat");
assert.equal(a2.recommendations.at(-1).pathway, "kompos");

// Matching: mitra yang menolak daging tidak eligible
const tabanan = DEMO_PARTNERS.find((p) => p.id === "demo-bsf-tabanan");
const ctx = { records: [meaty], pickups: [], origin: DEMO_KITCHEN_LOCATION };
assert.equal(evaluatePartner(tabanan, ctx).eligible, false);
const ranked = matchPartners(DEMO_PARTNERS, { ...ctx, records: [veg] });
assert.ok(ranked[0].eligible);

// Pickup: tanggal harus hari layanan mitra & mulai besok
const sanur = DEMO_PARTNERS.find((p) => p.id === "demo-bsf-sanur"); // Sen, Rab, Jum
const date = nextPickupDate(sanur, now);
assert.equal(date, "2026-10-30"); // Jumat
const req = { partner: sanur, records: [veg], date, slot: sanur.timeSlots[0], origin: DEMO_KITCHEN_LOCATION, today: now };
assert.deepEqual(validatePickupRequest(req), []);
assert.ok(validatePickupRequest({ ...req, date: "2026-10-28" }).length); // hari ini
assert.ok(validatePickupRequest({ ...req, date: "2026-10-31" }).length); // Sabtu

let pk = createPickup({ ...req, now });
assert.equal(pk.status, "menunggu");

// Kapasitas terpakai oleh pickup aktif
assert.equal(evaluatePartner(sanur, { records: [], pickups: [pk], origin: DEMO_KITCHEN_LOCATION }).remainingKg, 337.5);

// Transisi tidak valid ditolak
assert.throws(() => transitionPickup(pk, "diterima", { actor: "mitra" }));
assert.throws(() => transitionPickup(pk, "dibatalkan", { actor: "mitra" })); // tolak tanpa alasan

// Belum diterima -> belum dihitung tersalurkan
let stats = computeCircularStats([veg], [pk]);
assert.equal(stats.receivedKg, 0);
assert.equal(stats.inProcessKg, 12.5);
assert.equal(stats.successRate, null);

pk = transitionPickup(pk, "disetujui", { actor: "mitra", now });
pk = transitionPickup(pk, "terjadwal", { actor: "mitra", now });
pk = transitionPickup(pk, "dalam_pengambilan", { actor: "mitra", now });
assert.throws(() => transitionPickup(pk, "diterima", { actor: "mitra", verification: { actualKg: 0, receiverName: "Budi" } }));
pk = transitionPickup(pk, "diterima", { actor: "mitra", verification: { actualKg: "11", receiverName: "Budi" }, now });
assert.equal(pk.verification.diffKg, -1.5);
assert.equal(pk.verification.diffPct, -12);
assert.equal(pk.history.length, 5);

stats = computeCircularStats([veg, meaty], [pk]);
assert.equal(stats.receivedKg, 11); // berat aktual, bukan berat awal
assert.equal(stats.totalRecordedKg, 25);
assert.equal(stats.pendingKg, 12.5);
assert.equal(stats.successRate, 100);
assert.equal(stats.discrepancyCount, 1);
assert.equal(stats.managementCost, 25000);
assert.equal(stats.recoveredValue, null); // mitra tidak punya data nilai material
assert.equal(stats.receivedByPathway.find((p) => p.id === "bsf").value, 11);

// Pickup dibatalkan membebaskan catatan limbah
const cancelled = transitionPickup(createPickup({ ...req, records: [meaty], now }), "dibatalkan", { actor: "restoran", now });
assert.equal(recordStatusMap([meaty], [cancelled])[meaty.id], "belum");

console.log("circularRecovery: semua cek lulus");
