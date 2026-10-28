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
  confirmPayment,
  estimateTariff,
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

// Pendapatan per kg (harga demo BSF Sanur: sayur & buah Rp400/kg, tanpa ongkos)
assert.deepEqual(estimateTariff(sanur, [veg]), { income: 5000, cost: 0, net: 5000, pricePerKg: 400 });

let pk = createPickup({ ...req, now });
assert.equal(pk.status, "menunggu");
assert.equal(pk.tariff.pricePerKg, 400);

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
assert.deepEqual([pk.payment.amount, pk.payment.status], [4400, "menunggu"]); // 11 kg aktual x Rp400

// Pembayaran belum dikonfirmasi -> masih "menunggu", belum masuk pendapatan diterima
let paidStats = computeCircularStats([veg], [pk]);
assert.deepEqual([paidStats.incomePaid, paidStats.incomePending], [0, 4400]);
assert.throws(() => confirmPayment(pk, { method: "cek" }));
const paid = confirmPayment(pk, { method: "transfer", reference: "TRX1", now });
assert.equal(paid.payment.status, "dibayar");
assert.throws(() => confirmPayment(paid, { method: "transfer" })); // tidak bisa dibayar dua kali
paidStats = computeCircularStats([veg], [paid]);
assert.deepEqual([paidStats.incomePaid, paidStats.incomePending, paidStats.netIncome], [4400, 0, 4400]);

stats = computeCircularStats([veg, meaty], [pk]);
assert.equal(stats.receivedKg, 11); // berat aktual, bukan berat awal
assert.equal(stats.totalRecordedKg, 25);
assert.equal(stats.pendingKg, 12.5);
assert.equal(stats.successRate, 100);
assert.equal(stats.discrepancyCount, 1);
assert.equal(stats.managementCost, 0);
assert.equal(stats.incomePending, 4400);
assert.equal(stats.receivedByPathway.find((p) => p.id === "bsf").value, 11);

// Pickup dibatalkan membebaskan catatan limbah
const cancelled = transitionPickup(createPickup({ ...req, records: [meaty], now }), "dibatalkan", { actor: "restoran", now });
assert.equal(recordStatusMap([meaty], [cancelled])[meaty.id], "belum");

// Makanan berlebih layak konsumsi -> donasi jadi jalur utama
const surplusInput = { ...base, category: "layak_konsumsi", contamination: "", storage: "dingin", safeUntil: "2026-10-28T20:00", weightKg: "6" };
assert.deepEqual(validateWasteRecord(surplusInput, now), {});
assert.ok(validateWasteRecord({ ...surplusInput, safeUntil: "" }, now).safeUntil);
assert.ok(validateWasteRecord({ ...surplusInput, storage: "" }, now).storage);
const surplus = createWasteRecord(surplusInput, now);
assert.equal(surplus.contamination, "bersih");
const a3 = analyzeWasteRules(surplus, now);
assert.equal(a3.recommendations[0].pathway, "donasi");
assert.equal(a3.recommendations[0].suitability, "sesuai");
// Lewat batas aman -> donasi tidak disarankan
const late = analyzeWasteRules(surplus, new Date(2026, 9, 28, 21, 0));
assert.equal(late.recommendations.find((r) => r.pathway === "donasi").suitability, "tidak disarankan");
// Sisa sayur bukan untuk donasi, tapi cocok untuk pakan
assert.equal(analyzeWasteRules(veg).recommendations.find((r) => r.pathway === "donasi").suitability, "tidak disarankan");
assert.equal(analyzeWasteRules(veg).recommendations.find((r) => r.pathway === "pakan").suitability, "sesuai");

// Mitra donasi: bisa ambil hari ini, gratis, dan tanggal tidak boleh lewat batas aman
const bank = DEMO_PARTNERS.find((p) => p.id === "donasi-renon");
assert.equal(nextPickupDate(bank, now), "2026-10-28");
const donReq = { partner: bank, records: [surplus], date: "2026-10-28", slot: bank.timeSlots[1], origin: DEMO_KITCHEN_LOCATION, today: now };
assert.deepEqual(validatePickupRequest(donReq), []);
assert.ok(validatePickupRequest({ ...donReq, date: "2026-10-29" }).some((e) => e.includes("batas aman")));
// Batas aman jam 18.00, slot 19.00 di hari yang sama -> ditolak
const earlyLimit = { ...surplus, safeUntil: new Date(2026, 9, 28, 18, 0).toISOString() };
assert.ok(validatePickupRequest({ ...donReq, records: [earlyLimit] }).some((e) => e.includes("batas aman")));
assert.ok(validatePickupRequest({ ...donReq, slot: bank.timeSlots[0] }).some((e) => e.includes("sudah lewat"))); // 10.00 < jam 10.00 sekarang
// Semua slot hari ini lewat -> jadwal terdekat besok
assert.equal(nextPickupDate(bank, new Date(2026, 9, 28, 21, 30)), "2026-10-29");
assert.equal(evaluatePartner(bank, { records: [veg], origin: DEMO_KITCHEN_LOCATION }).eligible, false); // tidak terima sisa sayur
const donation = createPickup({ ...donReq, now });
assert.equal(donation.tariff.pricePerKg, 0);

// Pengolah pakan membeli per kg
const pakan = DEMO_PARTNERS.find((p) => p.id === "pakan-abiansemal");
assert.equal(estimateTariff(pakan, [veg]).income, 4375); // 12,5 kg x Rp350
assert.equal(evaluatePartner(pakan, { records: [meaty], origin: DEMO_KITCHEN_LOCATION }).eligible, false); // tolak daging

console.log("circularRecovery: semua cek lulus");
