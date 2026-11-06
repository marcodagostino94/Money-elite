"use client";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Pencil, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cents, tfrAnnualHistory, type TfrHistoryBase } from "@/lib/money/planning";

const euro = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
const parse = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(/\s/g, "");
  return s ? Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s) : NaN;
};
export function TfrHistory({ entries, transfers }: {
  entries: { competenceMonth: string; tfrAmount: number; destination: "company" | "fund" }[];
  transfers: { paidAt: string; amount: number }[];
}) {
  const [base, setBase] = useState<TfrHistoryBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmations, setConfirmations] = useState<TfrHistoryBase[]>([]);
  const [verifying, setVerifying] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();
  useEffect(() => {
    let active = true;
    const db = getSupabaseBrowserClient();
    void Promise.all([db.from("pension_tfr_history_base").select("*").maybeSingle(), db.from("pension_tfr_annual_confirmations").select("*")]).then(([{ data, error }, checks]) => {
      if (!active) return;
      if (error || checks.error) setError("Esegui SQL_AGGIORNAMENTO_V14_1.sql per aggiornare lo storico.");
      else if (data) setBase({ closingYear: data.closing_year, companyAmount: Number(data.company_amount), fundAmount: Number(data.fund_amount) });
      setConfirmations((checks.data || []).map(r => ({ closingYear: r.closing_year, companyAmount: Number(r.company_amount), fundAmount: Number(r.fund_amount) })));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const rows = base ? tfrAnnualHistory(base, entries, transfers, currentYear, confirmations) : [];
  const verificationRow = rows.find(r => r.year === verifying);
  const calculated = base && verifying !== null ? tfrAnnualHistory(base, entries, transfers, currentYear, confirmations.filter(c => c.closingYear < verifying)).find(r => r.year === verifying) : null;
  const saveConfirmation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || verifying === null || !calculated) return;
    const fd = new FormData(event.currentTarget);
    const companyAmount = parse(fd.get("company")), fundAmount = parse(fd.get("fund"));
    if (![companyAmount, fundAmount].every(n => Number.isFinite(n) && n >= 0)) return alert("Inserisci due importi validi, anche zero.");
    setSaving(true);
    try {
      const db = getSupabaseBrowserClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Accedi per confermare lo storico.");
      const next = { closingYear: verifying, companyAmount: cents(companyAmount) / 100, fundAmount: cents(fundAmount) / 100 };
      const { error } = await db.from("pension_tfr_annual_confirmations").upsert({ user_id: user.id, closing_year: verifying, company_amount: next.companyAmount, fund_amount: next.fundAmount, calculated_company: calculated.company, calculated_fund: calculated.fund, confirmed_at: new Date().toISOString() });
      if (error) throw error;
      setConfirmations(old => [...old.filter(c => c.closingYear !== verifying), next]); setVerifying(null);
    } catch (e) { alert((e as { message?: string }).message || "Conferma non salvata."); }
    finally { setSaving(false); }
  };
  const removeConfirmation = async () => {
    if (saving || verifying === null || !window.confirm("Rimuovere la conferma CU e ripristinare il calcolo automatico per questo anno?")) return;
    setSaving(true);
    try {
      const { error } = await getSupabaseBrowserClient().from("pension_tfr_annual_confirmations").delete().eq("closing_year", verifying);
      if (error) throw error;
      setConfirmations(old => old.filter(c => c.closingYear !== verifying)); setVerifying(null);
    } catch (e) { alert((e as { message?: string }).message || "Conferma non rimossa."); }
    finally { setSaving(false); }
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const fd = new FormData(event.currentTarget);
    const next = { closingYear: Number(fd.get("year")), companyAmount: parse(fd.get("company")), fundAmount: parse(fd.get("fund")) };
    if (!Number.isInteger(next.closingYear) || next.closingYear < 1900 || next.closingYear >= currentYear || !Number.isFinite(next.companyAmount) || !Number.isFinite(next.fundAmount) || next.companyAmount < 0 || next.fundAmount < 0) return alert("Inserisci un anno già concluso e due importi validi, anche zero.");
    next.companyAmount = cents(next.companyAmount) / 100;
    next.fundAmount = cents(next.fundAmount) / 100;
    setSaving(true);
    try {
      const db = getSupabaseBrowserClient();
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Accedi per salvare il dato di partenza.");
      const { error } = await db.from("pension_tfr_history_base").upsert({ user_id: user.id, closing_year: next.closingYear, company_amount: next.companyAmount, fund_amount: next.fundAmount, updated_at: new Date().toISOString() });
      if (error) throw error;
      setBase(next); setError(""); setEditing(false);
    } catch (e) { alert(e instanceof Error ? e.message : "Impossibile salvare i dati di partenza."); }
    finally { setSaving(false); }
  };
  return <article className="panel tfr-history">
    <div className="tfr-history-heading"><div><small>STORICO ANNUALE · SOLO TFR</small><h3><CalendarDays size={19} /> Situazione al 31 dicembre</h3></div>
      {!error && <button className="outline tfr-small-action" disabled={loading} onClick={() => setEditing(true)}><Pencil size={12} /> {base ? "Dati di partenza" : "Imposta dato iniziale"}</button>}
    </div>
    {loading ? <p>Caricamento storico…</p> : error ? <p role="alert" className="negative">{error}</p> : !base ? <div className="empty">Imposta i totali di partenza al 31 dicembre.</div> : <>
      <div className="tfr-history-table"><table><thead><tr><th>Situazione al</th><th>TFR in azienda</th><th>TFR nel fondo</th><th>Verifica</th></tr></thead><tbody>{rows.map(row => <tr key={row.year}><th>31 dicembre {row.year}{row.year === base.closingYear && <small>Dato di partenza</small>}{confirmations.some(c => c.closingYear === row.year) && <small className="positive">Confermato con CU</small>}</th><td className={row.company < 0 ? "negative" : ""}>{euro(row.company)}</td><td>{euro(row.fund)}</td><td><button className="outline tfr-small-action" onClick={() => setVerifying(row.year)}>{confirmations.some(c => c.closingYear === row.year) ? "Modifica" : "Verifica CU"}</button></td></tr>)}</tbody></table></div>
      {rows.some(r => r.company < 0) && <p className="negative" role="alert">TFR in azienda negativo: verifica dati iniziali e trasferimenti.</p>}
      <p className="modal-hint">Il {currentYear} comparirà a fine anno.</p>
    </>}
    {editing && <div className="modal-backdrop" onMouseDown={() => !saving && setEditing(false)}><form className="modal" onSubmit={save} onMouseDown={e => e.stopPropagation()}>
      <div className="modal-title"><div><small>SOLO PER LO STORICO</small><h2>Dati TFR di partenza</h2></div><button type="button" disabled={saving} onClick={() => setEditing(false)}><X /></button></div>
      <p className="modal-hint">Totali al 31 dicembre. Non modifica mensilità o versamenti.</p>
      <label>Anno concluso<input name="year" type="number" min="1900" max={currentYear - 1} required defaultValue={base?.closingYear ?? currentYear - 1} /></label>
      <label>TFR rimasto in azienda a quella data<input name="company" inputMode="decimal" required defaultValue={base?.companyAmount.toFixed(2).replace(".", ",") ?? ""} placeholder="0,00" /></label>
      <label>TFR maturato destinato al fondo a quella data<input name="fund" inputMode="decimal" required defaultValue={base?.fundAmount.toFixed(2).replace(".", ",") ?? ""} placeholder="0,00 se il fondo non era ancora aperto" /></label>
      <div className="modal-actions"><button type="button" className="cancel" disabled={saving} onClick={() => setEditing(false)}>Annulla</button><button className="save-action transfer" disabled={saving}>{saving ? "Salvataggio…" : "Salva dati di partenza"}</button></div>
    </form></div>}
    {verificationRow && calculated && <div className="modal-backdrop" onMouseDown={() => !saving && setVerifying(null)}><form className="modal" onSubmit={saveConfirmation} onMouseDown={e => e.stopPropagation()}>
      <div className="modal-title"><h2>Verifica CU · {verifying}</h2><button type="button" disabled={saving} onClick={() => setVerifying(null)}><X /></button></div>
      <p className="modal-hint">Conferma i totali al 31 dicembre: saranno la base degli anni successivi, fino alla prossima conferma CU. Nessuna modifica ai versamenti.</p>
      <p>Calcolo app: azienda {euro(calculated.company)} · fondo {euro(calculated.fund)}</p>
      <label>TFR in azienda<input name="company" inputMode="decimal" required defaultValue={verificationRow.company.toFixed(2).replace(".", ",")} /></label>
      <label>TFR nel fondo<input name="fund" inputMode="decimal" required defaultValue={verificationRow.fund.toFixed(2).replace(".", ",")} /></label>
      {confirmations.some(c => c.closingYear === verifying) && <button type="button" className="danger-outline" disabled={saving} onClick={() => void removeConfirmation()}>Rimuovi conferma CU</button>}
      <div className="modal-actions"><button type="button" className="cancel" disabled={saving} onClick={() => setVerifying(null)}>Annulla</button><button className="save-action transfer" disabled={saving}>{saving ? "Salvataggio…" : "OK, conferma"}</button></div>
    </form></div>}
  </article>;
}
