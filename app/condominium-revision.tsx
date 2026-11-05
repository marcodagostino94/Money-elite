"use client";
import { useState, type FormEvent } from "react";
import { X, Check } from "lucide-react";
import { monthlyDates, splitMoney, revisionTotals, cents, type RevisionRow } from "@/lib/money/planning";
import { toIsoDate, formatItalianDate, type MoneyAccount } from "@/lib/money/data";

type Row = RevisionRow & { description: string; dueDate: string; accountId: string | null; pendingTransaction: boolean };
type DraftRow = { description: string; amount: string; date: string; planned: boolean };
export type BudgetRevisionDraft = {
  requestId: string; budget: number; replaceUnpaid: boolean; note: string;
  schedule: { description: string; amount: number; due_date: string; account_id: string; category_id: string | null; create_planned: boolean }[];
};
const euro = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
const parse = (s: string) => { const raw = s.trim().replace(/\s/g, ""); return raw ? Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw) : NaN; };
const input = (v: number) => v.toFixed(2).replace(".", ",");

export function BudgetRevisionModal({ period, rows, accounts, defaultCategoryId, onClose, onSave }: {
  period: { id: string; label: string; budgetAmount: number };
  rows: Row[]; accounts: MoneyAccount[]; defaultCategoryId: string | null;
  onClose: () => void; onSave: (draft: BudgetRevisionDraft) => Promise<boolean>;
}) {
  const [amountText, setAmountText] = useState(input(period.budgetAmount));
  const [replaceUnpaid, setReplaceUnpaid] = useState(false);
  const [countText, setCountText] = useState("4");
  const [firstDate, setFirstDate] = useState(toIsoDate(new Date()));
  const validAccounts = accounts.filter(a => !a.archived && !a.hidden && !a.isContainer);
  const [accountId, setAccountId] = useState(validAccounts.find(a => a.id === rows.at(-1)?.accountId)?.id || validAccounts[0]?.id || "");
  const [note, setNote] = useState("");
  const [schedule, setSchedule] = useState<DraftRow[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [approved, setApproved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const budget = parse(amountText);
  const totals = revisionTotals(rows, Number.isFinite(budget) ? budget : 0, replaceUnpaid);
  const reset = () => { setSchedule([]); setReviewing(false); setApproved(false); };
  const calculate = () => {
    const count = Number(countText);
    if (!Number.isFinite(budget) || budget < 0 || !Number.isInteger(count) || count < 1 || count > 120 || !firstDate) return alert("Controlla totale, prima scadenza e numero di rate (1–120).");
    if (totals.invalidPreservation) return alert("Il nuovo totale non copre le rate da conservare. Scegli di ridistribuire le rate non pagate oppure verifica le rate coperte da credito.");
    const dates = monthlyDates(firstDate, count);
    setSchedule(totals.remaining === 0 ? [] : splitMoney(totals.remaining, count).map((v, i) => ({ description: `Rata ${totals.preserved.length + i + 1}`, amount: input(v), date: dates[i], planned: v > 0 })));
  };
  const updateAmount = (index: number, value: string) => setSchedule(current => {
    const next = current.map((r, i) => i === index ? { ...r, amount: value } : r);
    const following = next.length - index - 1;
    if (following > 0) {
      const used = next.slice(0, index + 1).reduce((sum, r) => sum + (Number.isFinite(parse(r.amount)) ? cents(parse(r.amount)) : 0), 0);
      const amounts = splitMoney(Math.max(0, cents(totals.remaining) - used) / 100, following);
      for (let i = index + 1; i < next.length; i++) next[i] = { ...next[i], amount: input(amounts[i - index - 1]) };
    }
    return next;
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!Number.isFinite(budget) || budget < 0 || totals.invalidPreservation) return alert("Controlla il totale e le rate da conservare.");
    if (schedule.some(r => !r.description.trim() || !r.date || !Number.isFinite(parse(r.amount)) || parse(r.amount) < 0)) return alert("Controlla descrizioni, date e importi delle rate.");
    if (schedule.reduce((sum, r) => sum + cents(parse(r.amount)), 0) !== cents(totals.remaining)) return alert("Calcola le nuove rate: la loro somma deve coincidere con l’importo ancora da pianificare.");
    if (schedule.length && !accountId) return alert("Scegli un conto.");
    if (schedule.some(r => r.planned && parse(r.amount) > 0) && !defaultCategoryId) return alert("La categoria Casa della gestione non è disponibile. Ripristinala nelle impostazioni oppure deseleziona le pianificate.");
    if (!reviewing) { setReviewing(true); return; }
    if (totals.removed.length && !approved) return alert("Approva esplicitamente la sostituzione delle rate non pagate.");
    setSaving(true);
    try { await onSave({ requestId, budget: cents(budget) / 100, replaceUnpaid, note,
      schedule: schedule.map(r => ({ description: r.description.trim(), amount: cents(parse(r.amount)) / 100, due_date: r.date, account_id: accountId, category_id: defaultCategoryId, create_planned: r.planned && parse(r.amount) > 0 })) });
    } finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={() => !saving && onClose()}><form className="modal condominium-period-modal budget-revision-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
    <div className="modal-title"><div><small>{period.label}</small><h2>{reviewing ? "Conferma aggiornamento" : "Aggiorna preventivo e rate"}</h2></div><button type="button" disabled={saving} onClick={onClose}><X /></button></div>
    <p className="modal-hint">Inserisci il nuovo totale della tua quota, comprensivo degli anticipi. Le rate pagate e quelle coperte anche parzialmente da credito restano invariate. Rate straordinarie e saldi di altre gestioni rimangono separati e non vengono ricalcolati.</p>
    <div className="revision-totals"><div><small>Preventivo attuale</small><strong>{euro(period.budgetAmount)}</strong></div><div><small>Rate del preventivo già pagate</small><strong className="positive">{euro(totals.paid)}</strong></div><div><small>Credito già applicato</small><strong>{euro(totals.credits)}</strong></div><div><small>Da distribuire in nuove rate</small><strong>{euro(totals.remaining)}</strong></div></div>
    {!reviewing ? <>
      <label>Nuovo totale complessivo della tua quota<input inputMode="decimal" required value={amountText} onChange={e => { setAmountText(e.target.value); reset(); }} /></label>
      <fieldset className="revision-options"><legend>Rate non pagate del preventivo</legend>
        <label><input type="radio" name="revision-mode" checked={!replaceUnpaid} onChange={() => { setReplaceUnpaid(false); reset(); }} /> Mantieni le rate esistenti e aggiungi solo la differenza</label>
        <label><input type="radio" name="revision-mode" checked={replaceUnpaid} onChange={() => { setReplaceUnpaid(true); reset(); }} /> Ridistribuisci il residuo sostituendo le sole rate non pagate, senza credito</label>
      </fieldset>
      <div className="condominium-form-grid"><label>Numero nuove rate<input type="number" min="1" max="120" value={countText} onChange={e => { setCountText(e.target.value); reset(); }} /></label><label>Prima scadenza<input type="date" value={firstDate} onChange={e => { setFirstDate(e.target.value); reset(); }} /></label><label>Conto per le nuove rate<select value={accountId} onChange={e => setAccountId(e.target.value)}>{validAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Nota della revisione<input value={note} onChange={e => setNote(e.target.value)} placeholder="Es. Preventivo definitivo" /></label></div>
      <button type="button" className="outline" onClick={calculate}>Calcola nuove rate</button>
      <div className="condominium-schedule-editor">{schedule.map((row, i) => <div className="condominium-schedule-row" key={i}>
        <input type="checkbox" aria-label={`Crea pianificata ${i + 1}`} checked={row.planned} onChange={e => setSchedule(s => s.map((r, j) => i === j ? { ...r, planned: e.target.checked } : r))} />
        <input aria-label={`Descrizione rata ${i + 1}`} value={row.description} onChange={e => setSchedule(s => s.map((r, j) => i === j ? { ...r, description: e.target.value } : r))} />
        <input type="date" aria-label={`Scadenza rata ${i + 1}`} value={row.date} onChange={e => setSchedule(s => s.map((r, j) => i === j ? { ...r, date: e.target.value } : r))} />
        <input inputMode="decimal" aria-label={`Importo rata ${i + 1}`} value={row.amount} onChange={e => updateAmount(i, e.target.value)} />
        <small>Spunta solo le rate da creare anche nelle pianificate.</small>
      </div>)}</div>
    </> : <>
      <p><strong>Nuovo preventivo: {euro(budget)}</strong></p>
      <h3>Rate conservate</h3><div className="revision-review-list">{rows.filter(r => !totals.removed.some(x => x.id === r.id)).map(r => <div key={r.id} className={r.paid ? "positive" : ""}><span>{r.paid && <Check size={14} />} {r.description}<small>{r.paid ? "Pagata / coperta" : "Da pagare · invariata"} · {formatItalianDate(r.dueDate)}</small></span><strong>{euro(r.amount)}</strong></div>)}</div>
      {totals.removed.length > 0 && <div className="revision-warning"><h3>Rate non pagate da sostituire</h3>{rows.filter(r => totals.removed.some(x => x.id === r.id)).map(r => <p key={r.id}>{r.description} · {euro(r.amount)} · {formatItalianDate(r.dueDate)}{r.pendingTransaction ? " · in attesa di conferma" : ""}</p>)}<label><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> Approvo la sostituzione di queste rate e la rimozione delle loro pianificate e delle eventuali transazioni non confermate. Nessun pagamento confermato sarà eliminato.</label></div>}
      <h3>Nuove rate e pianificate</h3><div className="revision-review-list">{schedule.map((r, i) => <div key={i}><label><input type="checkbox" checked={r.planned} onChange={e => setSchedule(s => s.map((row, j) => i === j ? { ...row, planned: e.target.checked } : row))} /><span>{r.description}<small>{formatItalianDate(r.date)} · {accounts.find(a => a.id === accountId)?.name} · {r.planned && parse(r.amount) > 0 ? "Crea pianificata" : "Solo rata interna"}</small></span></label><strong>{euro(parse(r.amount))}</strong></div>)}</div>
      {!schedule.length && <p>Nessuna nuova rata da creare.</p>}
    </>}
    {totals.excess > 0 && <p className={totals.invalidPreservation ? "negative" : "positive"}>{totals.invalidPreservation ? "Le rate da conservare superano il nuovo preventivo: scegli una diversa distribuzione." : `Anticipo/credito eccedente ${euro(totals.excess)}: resterà visibile, senza generare rate negative o rimborsi automatici.`}</p>}
    <div className="modal-actions"><button type="button" className="cancel" disabled={saving} onClick={() => reviewing ? setReviewing(false) : onClose()}>{reviewing ? "Indietro" : "Annulla"}</button><button className="save-action transfer" disabled={saving || (reviewing && totals.removed.length > 0 && !approved)}>{saving ? "Salvataggio…" : reviewing ? "Conferma aggiornamento" : "Mostra anteprima"}</button></div>
  </form></div>;
}
