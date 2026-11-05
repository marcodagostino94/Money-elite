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
  const currentYear = new Date().getFullYear();
  useEffect(() => {
    let active = true;
    void getSupabaseBrowserClient().from("pension_tfr_history_base").select("*").maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setError("Storico non disponibile: verifica di aver eseguito SQL_AGGIORNAMENTO_V14.sql.");
      else if (data) setBase({ closingYear: data.closing_year, companyAmount: Number(data.company_amount), fundAmount: Number(data.fund_amount) });
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const rows = base ? tfrAnnualHistory(base, entries, transfers, currentYear) : [];
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
      {!error && <button className="outline" onClick={() => setEditing(true)}><Pencil size={14} /> {base ? "Dati di partenza" : "Imposta dato di partenza"}</button>}
    </div>
    <p className="modal-hint">Totali progressivi per mese di competenza, inclusi gli importi maturati non ancora versati. I trasferimenti dall’azienda spostano il TFR alla loro data. Contributi personali/datore, rendimenti e versamenti manuali generici sono esclusi.</p>
    {loading ? <p>Caricamento storico…</p> : error ? <p role="alert" className="negative">{error}</p> : !base ? <div className="empty">Inserisci i totali noti a fine anno (ad esempio 2025). Non ricaviamo il passato dal saldo attuale: gli anni senza dati non vengono mostrati come zero.</div> : <>
      <div className="tfr-history-table"><table><thead><tr><th>Situazione al</th><th>TFR lasciato in azienda</th><th>TFR maturato nel fondo</th></tr></thead><tbody>{rows.map(row => <tr key={row.year}><th>31 dicembre {row.year}{row.year === base.closingYear && <small>Dato di partenza</small>}</th><td className={row.company < 0 ? "negative" : ""}>{euro(row.company)}</td><td>{euro(row.fund)}</td></tr>)}</tbody></table></div>
      {rows.some(r => r.company < 0) && <p className="negative" role="alert">Il TFR storico in azienda risulta negativo: verifica il dato iniziale, le mensilità e i trasferimenti. Il valore non viene corretto artificialmente.</p>}
      <p className="modal-hint">Il {currentYear} comparirà a fine anno. Le mensilità successive non cambiano gli anni precedenti; eventuali correzioni di mensilità o trasferimenti storici aggiornano il relativo riepilogo. Sono dati registrati nell’app, da confrontare con la documentazione ricevuta.</p>
    </>}
    {editing && <div className="modal-backdrop" onMouseDown={() => !saving && setEditing(false)}><form className="modal" onSubmit={save} onMouseDown={e => e.stopPropagation()}>
      <div className="modal-title"><div><small>SOLO PER LO STORICO</small><h2>Dati TFR di partenza</h2></div><button type="button" disabled={saving} onClick={() => setEditing(false)}><X /></button></div>
      <p className="modal-hint">Inserisci i totali cumulativi al 31 dicembre dell’anno scelto, già comprensivi di tutte le mensilità e dei trasferimenti fino a quella data. Le mensilità successive saranno aggiunte automaticamente. Questa impostazione non modifica i saldi attuali né crea versamenti.</p>
      <label>Anno concluso<input name="year" type="number" min="1900" max={currentYear - 1} required defaultValue={base?.closingYear ?? currentYear - 1} /></label>
      <label>TFR rimasto in azienda a quella data<input name="company" inputMode="decimal" required defaultValue={base?.companyAmount.toFixed(2).replace(".", ",") ?? ""} placeholder="0,00" /></label>
      <label>TFR maturato destinato al fondo a quella data<input name="fund" inputMode="decimal" required defaultValue={base?.fundAmount.toFixed(2).replace(".", ",") ?? ""} placeholder="0,00 se il fondo non era ancora aperto" /></label>
      <div className="modal-actions"><button type="button" className="cancel" disabled={saving} onClick={() => setEditing(false)}>Annulla</button><button className="save-action transfer" disabled={saving}>{saving ? "Salvataggio…" : "Salva dati di partenza"}</button></div>
    </form></div>}
  </article>;
}
