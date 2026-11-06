// Importi monetari calcolati in centesimi: nessuna perdita da arrotondamento.
export const cents = (value: number) => Math.round(value * 100);
export const splitMoney = (total: number, count: number) => {
  if (!Number.isInteger(count) || count < 1 || count > 120) throw new Error("Numero rate non valido (1–120).");
  const value = Math.max(0, cents(total));
  const base = Math.floor(value / count);
  return Array.from({ length: count }, (_, i) => (base + (i === 0 ? value - base * count : 0)) / 100);
};
export function monthlyDates(first: string, count: number): string[] {
  const [year, month, day] = first.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Scegli la scadenza della prima rata.");
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 1 + i, 1, 12);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
  });
}
export type RevisionRow = {
  id: string; kind: string; amount: number; creditApplied: number; paid: boolean;
};
export function revisionTotals(rows: RevisionRow[], budget: number, replaceUnpaid: boolean) {
  const regular = rows.filter(r => r.kind === "regular");
  const removable = regular.filter(r => !r.paid && r.amount > 0 && r.creditApplied === 0);
  const removed = replaceUnpaid ? removable : [];
  const preserved = regular.filter(r => !removed.some(x => x.id === r.id));
  const covered = preserved.reduce((sum, r) => sum + cents(r.amount) + cents(r.creditApplied), 0);
  const total = cents(budget);
  return {
    removed, preserved,
    paid: regular.filter(r => r.paid).reduce((sum, r) => sum + cents(r.amount), 0) / 100,
    credits: regular.reduce((sum, r) => sum + cents(r.creditApplied), 0) / 100,
    remaining: Math.max(0, total - covered) / 100,
    excess: Math.max(0, covered - total) / 100,
    invalidPreservation: covered > total && preserved.some(r => !r.paid && r.amount > 0),
  };
}

export type TfrHistoryBase = { closingYear: number; companyAmount: number; fundAmount: number };
type TfrEntry = { competenceMonth: string; tfrAmount: number; destination: "company" | "fund" };
type TfrTransfer = { paidAt: string; amount: number };
export function tfrAnnualHistory(base: TfrHistoryBase, entries: TfrEntry[], transfers: TfrTransfer[], currentYear: number, confirmations: TfrHistoryBase[] = []) {
  const rows = [];
  let company = cents(base.companyAmount), fund = cents(base.fundAmount);
  for (let year = base.closingYear; year < currentYear; year++) {
    const baseDate = `${year - 1}-12-31`;
    const end = `${year}-12-31`;
    for (const e of entries) {
      if (year === base.closingYear) continue;
      const date = `${e.competenceMonth.slice(0, 7)}-01`;
      if (date <= baseDate || date > end) continue;
      if (e.destination === "company") company += cents(e.tfrAmount);
      else fund += cents(e.tfrAmount);
    }
    for (const t of transfers) {
      if (year === base.closingYear) continue;
      if (t.paidAt.slice(0, 10) <= baseDate || t.paidAt.slice(0, 10) > end) continue;
      company -= cents(t.amount); fund += cents(t.amount);
    }
    const confirmed = confirmations.find(c => c.closingYear === year);
    if (confirmed) {
      company = cents(confirmed.companyAmount); fund = cents(confirmed.fundAmount);
    }
    rows.push({ year, company: company / 100, fund: fund / 100 });
  }
  return rows;
}
