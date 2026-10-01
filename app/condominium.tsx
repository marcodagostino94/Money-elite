"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Flame,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  formatItalianDate,
  toIsoDate,
  type MoneyAccount,
  type MoneyCategory,
} from "@/lib/money/data";

type ManagementType = "ordinary" | "heating";
type InstallmentKind = "regular" | "extraordinary" | "settlement";

type Period = {
  id: string;
  managementType: ManagementType;
  label: string;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  finalAmount: number | null;
  closingBalance: number;
  placeholder: boolean;
  status: "active" | "archived";
  notes: string;
};

type Installment = {
  id: string;
  periodId: string;
  sourcePeriodId: string | null;
  kind: InstallmentKind;
  description: string;
  amount: number;
  originalAmount: number;
  dueDate: string;
  accountId: string | null;
  categoryId: string | null;
  recurrenceId: string | null;
  paidAt: string | null;
  notes: string;
};

type LinkedTransaction = {
  recurrenceId?: string | null;
  confirmedAt?: string | null;
  dateISO?: string;
};

type ScheduleDraft = {
  description: string;
  amount: string;
  date: string;
  createPlanned: boolean;
};

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
const money = (value: number) =>
  euro.format(Number.isFinite(value) ? value : 0);
const parseAmount = (value: FormDataEntryValue | string | null) => {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized) || 0;
};
const amountValue = (value?: number | null) =>
  value == null ? "" : value.toFixed(2).replace(".", ",");
const splitAmount = (total: number, count: number) => {
  const cents = Math.round(Math.max(0, total) * 100);
  const base = Math.floor(cents / count);
  const extra = cents - base * count;
  return Array.from(
    { length: count },
    (_, index) => (base + (index === 0 ? extra : 0)) / 100,
  );
};

function standardDates(type: ManagementType, year: number, count: number) {
  const standard =
    type === "ordinary"
      ? [`${year}-01-15`, `${year}-04-15`, `${year}-07-15`, `${year}-10-15`]
      : [
          `${year}-11-15`,
          `${year}-12-15`,
          `${year + 1}-01-15`,
          `${year + 1}-02-15`,
          `${year + 1}-03-15`,
        ];
  if (count <= standard.length) return standard.slice(0, count);
  const rows = [...standard];
  const cursor = new Date(`${rows.at(-1)}T12:00:00`);
  while (rows.length < count) {
    cursor.setMonth(cursor.getMonth() + 1);
    rows.push(toIsoDate(cursor));
  }
  return rows;
}

function periodDefinition(type: ManagementType, year: number) {
  return type === "ordinary"
    ? {
        label: String(year),
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      }
    : {
        label: `${year}/${year + 1}`,
        startDate: `${year}-11-01`,
        endDate: `${year + 1}-06-30`,
      };
}

export function CondominiumSection({
  accounts,
  categories,
  transactions,
  refreshMoney,
}: {
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  transactions: LinkedTransaction[];
  refreshMoney: () => Promise<void>;
}) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [busy, setBusy] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newType, setNewType] = useState<ManagementType | null>(null);
  const [extraMode, setExtraMode] = useState<{
    period: Period;
    kind: "extraordinary" | "settlement";
    source?: Period;
  } | null>(null);
  const [editingInstallment, setEditingInstallment] =
    useState<Installment | null>(null);
  const [finalPeriod, setFinalPeriod] = useState<Period | null>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    const [periodResult, installmentResult] = await Promise.all([
      supabase
        .from("condominium_periods")
        .select("*")
        .order("start_date", { ascending: false }),
      supabase
        .from("condominium_installments")
        .select("*")
        .order("due_date", { ascending: true }),
    ]);
    const error = periodResult.error || installmentResult.error;
    if (error) {
      alert(error.message);
      setBusy(false);
      return;
    }
    setPeriods(
      (periodResult.data || []).map((row) => ({
        id: row.id,
        managementType: row.management_type,
        label: row.label,
        startDate: row.start_date,
        endDate: row.end_date,
        budgetAmount: Number(row.budget_amount || 0),
        finalAmount: row.final_amount == null ? null : Number(row.final_amount),
        closingBalance: Number(row.closing_balance || 0),
        placeholder: Boolean(row.is_placeholder),
        status: row.status,
        notes: row.notes || "",
      })),
    );
    setInstallments(
      (installmentResult.data || []).map((row) => ({
        id: row.id,
        periodId: row.period_id,
        sourcePeriodId: row.source_period_id,
        kind: row.kind,
        description: row.description,
        amount: Number(row.amount),
        originalAmount: Number(row.original_amount ?? row.amount),
        dueDate: row.due_date,
        accountId: row.account_id,
        categoryId: row.category_id,
        recurrenceId: row.planned_recurrence_id,
        paidAt: row.paid_at,
        notes: row.notes || "",
      })),
    );
    setBusy(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const isPaid = (item: Installment) =>
    item.amount === 0 ||
    Boolean(
      item.paidAt ||
      (item.recurrenceId &&
        transactions.some(
          (transaction) =>
            transaction.recurrenceId === item.recurrenceId &&
            transaction.confirmedAt,
        )),
    );
  const paymentDate = (item: Installment) =>
    item.paidAt ||
    transactions.find(
      (transaction) =>
        transaction.recurrenceId === item.recurrenceId &&
        transaction.confirmedAt,
    )?.dateISO ||
    null;
  const rowsFor = (periodId: string) =>
    installments.filter((item) => item.periodId === periodId);
  const paidFor = (periodId: string) =>
    rowsFor(periodId)
      .filter(isPaid)
      .reduce((sum, item) => sum + item.amount, 0);
  const periodBalance = (period: Period) => {
    const settledElsewhere = installments.some(
      (item) => item.sourcePeriodId === period.id && isPaid(item),
    );
    if (settledElsewhere) return 0;
    if (period.placeholder) return period.closingBalance;
    if (period.status === "archived") return period.closingBalance;
    if (period.finalAmount == null) return period.closingBalance;
    return period.finalAmount - paidFor(period.id);
  };
  const byType = (type: ManagementType) =>
    periods.filter((period) => period.managementType === type);
  const currentFor = (type: ManagementType) =>
    byType(type).find((period) => !period.placeholder) || null;
  const previousFor = (type: ManagementType, current?: Period | null) =>
    byType(type).find((period) => period.id !== current?.id) || null;

  const categoryFor = (type: ManagementType) => {
    const casa = categories.find(
      (item) => !item.parentId && item.name.toLocaleLowerCase("it") === "casa",
    );
    const wanted = type === "ordinary" ? "condominio" : "riscaldamento";
    return categories.find(
      (item) =>
        item.parentId === casa?.id &&
        item.name.toLocaleLowerCase("it") === wanted,
    );
  };

  const createPlanned = async (
    item: Pick<Installment, "description" | "amount" | "dueDate" | "accountId">,
    type: ManagementType,
  ) => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !item.accountId) return null;
    const category = categoryFor(type);
    if (!category)
      throw new Error(
        `Categoria Casa › ${type === "ordinary" ? "Condominio" : "Riscaldamento"} non trovata.`,
      );
    const { data, error } = await supabase
      .from("recurrences")
      .insert({
        user_id: user.id,
        account_id: item.accountId,
        category_id: category.id,
        kind: "expense",
        amount: item.amount,
        frequency: "monthly",
        interval_count: 1,
        occurrence_limit: 1,
        occurrence_count: 0,
        next_date: item.dueDate,
        automatic_accounting: false,
        is_subscription: false,
        active: true,
        notes: item.description,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  };

  const markPaid = async (item: Installment) => {
    const date = window.prompt(
      "Data del pagamento (AAAA-MM-GG)",
      toIsoDate(new Date()),
    );
    if (!date) return;
    const { error } = await getSupabaseBrowserClient()
      .from("condominium_installments")
      .update({ paid_at: date })
      .eq("id", item.id);
    if (error) alert(error.message);
    else await load();
  };

  const deleteInstallment = async (item: Installment) => {
    if (!window.confirm(`Eliminare “${item.description}”?`)) return;
    const supabase = getSupabaseBrowserClient();
    if (item.recurrenceId) {
      const confirmed = transactions.some(
        (transaction) =>
          transaction.recurrenceId === item.recurrenceId &&
          transaction.confirmedAt,
      );
      if (!confirmed)
        await supabase.from("recurrences").delete().eq("id", item.recurrenceId);
    }
    const { error } = await supabase
      .from("condominium_installments")
      .delete()
      .eq("id", item.id);
    if (error) return alert(error.message);
    await Promise.all([load(), refreshMoney()]);
  };

  const deletePeriod = async (period: Period) => {
    if (
      !window.confirm(
        `Eliminare la gestione ${period.label}? Le pianificate future verranno eliminate, mentre i movimenti confermati resteranno nello storico.`,
      )
    )
      return;
    setWorking(true);
    const supabase = getSupabaseBrowserClient();
    for (const item of rowsFor(period.id)) {
      if (!item.recurrenceId) continue;
      const confirmed = transactions.some(
        (transaction) =>
          transaction.recurrenceId === item.recurrenceId &&
          transaction.confirmedAt,
      );
      if (!confirmed)
        await supabase.from("recurrences").delete().eq("id", item.recurrenceId);
    }
    const { error } = await supabase
      .from("condominium_periods")
      .delete()
      .eq("id", period.id);
    setWorking(false);
    if (error) return alert(error.message);
    setSelectedId(null);
    await Promise.all([load(), refreshMoney()]);
  };

  const selected = periods.find((period) => period.id === selectedId) || null;
  if (selected) {
    const periodRows = rowsFor(selected.id);
    const paid = paidFor(selected.id);
    const balance = periodBalance(selected);
    const previous = previousFor(selected.managementType, selected);
    const previousBalance = previous ? periodBalance(previous) : 0;
    return (
      <section className="section-page condominium-page">
        <div className="inner-page-header condominium-detail-header">
          <button onClick={() => setSelectedId(null)}>
            <ArrowLeft size={19} />
          </button>
          <div>
            <small>
              {selected.managementType === "ordinary"
                ? "GESTIONE ORDINARIA"
                : "GESTIONE RISCALDAMENTO"}
            </small>
            <h2>{selected.label}</h2>
            <p>
              {formatItalianDate(selected.startDate)} –{" "}
              {formatItalianDate(selected.endDate)}
            </p>
          </div>
          <button
            className="danger-outline"
            onClick={() => void deletePeriod(selected)}
          >
            <Trash2 size={15} /> Elimina
          </button>
        </div>
        <div className="condominium-summary">
          <div>
            <small>PREVENTIVO</small>
            <strong>{money(selected.budgetAmount)}</strong>
            <button
              onClick={async () => {
                const value = window.prompt(
                  "Nuovo importo del preventivo",
                  amountValue(selected.budgetAmount),
                );
                if (value == null) return;
                const { error } = await getSupabaseBrowserClient()
                  .from("condominium_periods")
                  .update({ budget_amount: Math.abs(parseAmount(value)) })
                  .eq("id", selected.id);
                if (error) alert(error.message);
                else await load();
              }}
            >
              <Pencil size={12} /> Modifica
            </button>
          </div>
          <div className="positive-card">
            <small>VERSATO</small>
            <strong>{money(paid)}</strong>
          </div>
          <div className="negative-card">
            <small>RIMANENTE</small>
            <strong>
              {money(
                periodRows
                  .filter((item) => !isPaid(item))
                  .reduce((sum, item) => sum + item.amount, 0),
              )}
            </strong>
          </div>
          <div className={balance > 0 ? "negative-card" : "positive-card"}>
            <small>SALDO CONSUNTIVO</small>
            <strong>
              {selected.finalAmount == null ? "—" : money(Math.abs(balance))}
            </strong>
            {selected.finalAmount != null && (
              <span>
                {balance > 0
                  ? "Da pagare"
                  : balance < 0
                    ? "A credito"
                    : "Chiuso"}
              </span>
            )}
          </div>
        </div>
        <div className="condominium-toolbar">
          <button
            className="outline"
            onClick={() =>
              setExtraMode({ period: selected, kind: "extraordinary" })
            }
          >
            <Plus size={15} /> Rata straordinaria
          </button>
          <button className="outline" onClick={() => setFinalPeriod(selected)}>
            {selected.finalAmount == null ? (
              <>
                <ReceiptText size={15} /> Aggiungi consuntivo
              </>
            ) : (
              <>
                <Pencil size={15} /> Modifica consuntivo
              </>
            )}
          </button>
          {previous && previousBalance > 0 && (
            <button
              className="outline settlement"
              onClick={() =>
                setExtraMode({
                  period: selected,
                  kind: "settlement",
                  source: previous,
                })
              }
            >
              <Plus size={15} /> Salda consuntivo {previous.label}
            </button>
          )}
        </div>
        <article className="panel condominium-installments">
          <div className="condominium-list-title">
            <div>
              <small>SCADENZE</small>
              <h3>Rate della gestione</h3>
            </div>
            <span>{periodRows.length} rate</span>
          </div>
          {periodRows.length ? (
            periodRows.map((item) => {
              const paidItem = isPaid(item);
              return (
                <div
                  className={`condominium-installment ${paidItem ? "paid" : "pending"}`}
                  key={item.id}
                >
                  <div className="condominium-installment-state">
                    {paidItem ? <Check size={17} /> : <span />}
                  </div>
                  <div>
                    <small>
                      {item.kind === "regular"
                        ? "RATA"
                        : item.kind === "settlement"
                          ? "SALDO CONSUNTIVO"
                          : "STRAORDINARIA"}
                    </small>
                    <h3>{item.description}</h3>
                    <p>
                      Scadenza {formatItalianDate(item.dueDate)}
                      {paidItem && paymentDate(item)
                        ? ` · Pagata il ${formatItalianDate(paymentDate(item)!)}`
                        : ""}
                    </p>
                    {item.notes && <em>{item.notes}</em>}
                  </div>
                  <strong>{money(item.amount)}</strong>
                  <div className="condominium-row-actions">
                    {!paidItem && !item.recurrenceId && (
                      <button onClick={() => void markPaid(item)}>
                        Segna pagata
                      </button>
                    )}
                    <button
                      aria-label="Modifica rata"
                      onClick={() => setEditingInstallment(item)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      aria-label="Elimina rata"
                      onClick={() => void deleteInstallment(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty">Nessuna rata inserita.</div>
          )}
        </article>
        {selected.finalAmount != null && (
          <article className="panel condominium-final-card">
            <div>
              <small>CONSUNTIVO {selected.label}</small>
              <h3>{money(selected.finalAmount)}</h3>
              <button
                className="condominium-edit-final"
                onClick={() => setFinalPeriod(selected)}
              >
                <Pencil size={12} /> Modifica consuntivo
              </button>
            </div>
            <div className={balance > 0 ? "negative" : "positive"}>
              <small>DIFFERENZA TRA VERSATO E CONSUNTIVO</small>
              <strong>{money(Math.abs(balance))}</strong>
              <span>
                {balance > 0
                  ? "Ancora da pagare"
                  : balance < 0
                    ? "Credito a tuo favore"
                    : "Gestione chiusa"}
              </span>
            </div>
          </article>
        )}
        {extraMode && (
          <InstallmentModal
            mode={extraMode}
            accounts={accounts}
            defaultAmount={
              extraMode.kind === "settlement" ? previousBalance : 0
            }
            onClose={() => setExtraMode(null)}
            onSave={async (drafts) => {
              setWorking(true);
              const createdRecurrenceIds: string[] = [];
              try {
                const supabase = getSupabaseBrowserClient();
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;
                const category = categoryFor(selected.managementType);
                for (const draft of drafts) {
                  const recurrenceId = draft.createPlanned
                    ? await createPlanned(draft, selected.managementType)
                    : null;
                  if (recurrenceId) createdRecurrenceIds.push(recurrenceId);
                  const { error } = await supabase
                    .from("condominium_installments")
                    .insert({
                      user_id: user.id,
                      period_id: selected.id,
                      source_period_id: extraMode.source?.id || null,
                      kind: extraMode.kind,
                      description: draft.description,
                      amount: draft.amount,
                      original_amount: draft.amount,
                      due_date: draft.dueDate,
                      account_id: draft.accountId,
                      category_id: category?.id || null,
                      planned_recurrence_id: recurrenceId,
                      notes: draft.notes || null,
                    });
                  if (error) throw error;
                }
                setExtraMode(null);
                await Promise.all([load(), refreshMoney()]);
              } catch (error) {
                for (const recurrenceId of createdRecurrenceIds)
                  await getSupabaseBrowserClient()
                    .from("recurrences")
                    .delete()
                    .eq("id", recurrenceId);
                alert(
                  error instanceof Error
                    ? error.message
                    : "Impossibile salvare la rata.",
                );
              } finally {
                setWorking(false);
              }
            }}
          />
        )}
        {editingInstallment && (
          <EditInstallmentModal
            item={editingInstallment}
            accounts={accounts}
            onClose={() => setEditingInstallment(null)}
            onSave={async (draft) => {
              const supabase = getSupabaseBrowserClient();
              if (editingInstallment.recurrenceId) {
                const confirmed = transactions.some(
                  (transaction) =>
                    transaction.recurrenceId ===
                      editingInstallment.recurrenceId &&
                    transaction.confirmedAt,
                );
                if (!confirmed) {
                  const updateLinked = window.confirm(
                    "Vuoi aggiornare anche la transazione pianificata collegata?",
                  );
                  if (updateLinked) {
                    const { error } = await supabase
                      .from("recurrences")
                      .update({
                        account_id: draft.accountId,
                        amount: draft.amount,
                        next_date: draft.dueDate,
                        notes: draft.description,
                      })
                      .eq("id", editingInstallment.recurrenceId);
                    if (error) return alert(error.message);
                  }
                }
              }
              const { error } = await supabase
                .from("condominium_installments")
                .update({
                  description: draft.description,
                  amount: draft.amount,
                  due_date: draft.dueDate,
                  account_id: draft.accountId,
                  notes: draft.notes || null,
                })
                .eq("id", editingInstallment.id);
              if (error) return alert(error.message);
              setEditingInstallment(null);
              await Promise.all([load(), refreshMoney()]);
            }}
          />
        )}
        {finalPeriod && (
          <FinalModal
            period={finalPeriod}
            onClose={() => setFinalPeriod(null)}
            onSave={async (amount) => {
              const wasNew = finalPeriod.finalAmount == null;
              const managementType = finalPeriod.managementType;
              const { error } = await getSupabaseBrowserClient()
                .from("condominium_periods")
                .update({ final_amount: amount })
                .eq("id", finalPeriod.id);
              if (error) return alert(error.message);
              setFinalPeriod(null);
              await load();
              if (wasNew) {
                setSelectedId(null);
                setNewType(managementType);
              }
            }}
            onDelete={async () => {
              if (!window.confirm("Eliminare il consuntivo inserito?")) return;
              const { error } = await getSupabaseBrowserClient()
                .from("condominium_periods")
                .update({ final_amount: null })
                .eq("id", finalPeriod.id);
              if (error) return alert(error.message);
              setFinalPeriod(null);
              await load();
            }}
          />
        )}
      </section>
    );
  }

  const renderArea = (type: ManagementType) => {
    const current = currentFor(type);
    const previous = previousFor(type, current);
    const currentRows = current ? rowsFor(current.id) : [];
    const paid = current ? paidFor(current.id) : 0;
    const remaining = currentRows
      .filter((item) => !isPaid(item))
      .reduce((sum, item) => sum + item.amount, 0);
    const previousBalance = previous ? periodBalance(previous) : 0;
    return (
      <article className={`panel condominium-area ${type}`}>
        <div className="condominium-area-heading">
          <div className="condominium-area-icon">
            {type === "ordinary" ? <Building2 /> : <Flame />}
          </div>
          <div>
            <small>
              {type === "ordinary" ? "GENNAIO – DICEMBRE" : "NOVEMBRE – GIUGNO"}
            </small>
            <h2>
              {type === "ordinary"
                ? "Gestione ordinaria"
                : "Gestione riscaldamento"}
            </h2>
          </div>
          <button className="primary" onClick={() => setNewType(type)}>
            <Plus size={15} /> Nuovo preventivo
          </button>
        </div>
        <div className="condominium-area-totals">
          <div
            className={
              previousBalance > 0
                ? "negative"
                : previousBalance < 0
                  ? "positive"
                  : ""
            }
          >
            <small>SALDO CONSUNTIVO {previous?.label || "PRECEDENTE"}</small>
            <strong>{money(Math.abs(previousBalance))}</strong>
            <span>
              {previousBalance > 0
                ? "Da pagare"
                : previousBalance < 0
                  ? "A credito"
                  : "Chiuso"}
            </span>
          </div>
          <div>
            <small>PREVENTIVO {current?.label || "IN CORSO"}</small>
            <strong>{money(current?.budgetAmount || 0)}</strong>
          </div>
          <div className="positive">
            <small>VERSATO</small>
            <strong>{money(paid)}</strong>
          </div>
          <div className="negative">
            <small>RIMANENTE</small>
            <strong>{money(remaining)}</strong>
          </div>
        </div>
        <div className="condominium-period-tabs">
          {byType(type).map((period) => {
            const isCurrent = period.id === current?.id;
            const balance = periodBalance(period);
            return (
              <button key={period.id} onClick={() => setSelectedId(period.id)}>
                <span>
                  {period.placeholder ? "Saldo iniziale" : "Gestione"}
                </span>
                <b>{period.label}</b>
                <em
                  className={
                    isCurrent ? "current" : balance === 0 ? "closed" : "open"
                  }
                >
                  {isCurrent ? "In corso" : balance === 0 ? "Chiusa" : "Aperta"}
                </em>
              </button>
            );
          })}
          {!byType(type).length && (
            <div className="empty">Nessuna gestione inserita.</div>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="section-page condominium-page">
      {busy ? (
        <div className="panel empty">Caricamento gestioni…</div>
      ) : (
        <div className="condominium-areas">
          {renderArea("ordinary")}
          {renderArea("heating")}
        </div>
      )}
      {newType && (
        <NewPeriodModal
          type={newType}
          accounts={accounts}
          hasHistory={byType(newType).length > 0}
          previous={currentFor(newType)}
          previousBalance={
            currentFor(newType) ? periodBalance(currentFor(newType)!) : 0
          }
          onClose={() => setNewType(null)}
          onSave={async (draft) => {
            setWorking(true);
            const supabase = getSupabaseBrowserClient();
            let createdPeriodId: string | null = null;
            let createdOpeningId: string | null = null;
            const createdRecurrenceIds: string[] = [];
            let carrySourceId: string | null = draft.previousPeriodId;
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              let carry = draft.openingBalance;
              if (!byType(newType).length && carry !== 0) {
                const previousYear = draft.year - 1;
                const previousDefinition = periodDefinition(
                  newType,
                  previousYear,
                );
                const { data: openingPeriod, error } = await supabase
                  .from("condominium_periods")
                  .insert({
                    user_id: user.id,
                    management_type: newType,
                    label: previousDefinition.label,
                    start_date: previousDefinition.startDate,
                    end_date: previousDefinition.endDate,
                    budget_amount: 0,
                    closing_balance: carry,
                    is_placeholder: true,
                    status: carry === 0 ? "archived" : "active",
                    notes: "Saldo iniziale inserito senza storico rate",
                  })
                  .select("id")
                  .single();
                if (error) throw error;
                carrySourceId = openingPeriod.id;
                createdOpeningId = openingPeriod.id;
              } else if (draft.previousPeriodId) {
                carry = draft.previousBalance;
              }
              const definition = periodDefinition(newType, draft.year);
              const { data: periodRow, error: periodError } = await supabase
                .from("condominium_periods")
                .insert({
                  user_id: user.id,
                  management_type: newType,
                  label: definition.label,
                  start_date: definition.startDate,
                  end_date: definition.endDate,
                  budget_amount: draft.budgetAmount,
                  closing_balance: 0,
                  is_placeholder: false,
                  status: "active",
                })
                .select("id")
                .single();
              if (periodError) throw periodError;
              createdPeriodId = periodRow.id;
              const category = categoryFor(newType);
              if (carry > 0 && carrySourceId) {
                const sourceLabel =
                  periods.find((period) => period.id === carrySourceId)
                    ?.label || periodDefinition(newType, draft.year - 1).label;
                const description = `Saldo consuntivo ${sourceLabel}`;
                let recurrenceId: string | null = null;
                if (draft.settlementPlanned) {
                  recurrenceId = await createPlanned(
                    {
                      description,
                      amount: carry,
                      dueDate: draft.schedule[0].date,
                      accountId: draft.accountId,
                    },
                    newType,
                  );
                  if (recurrenceId) createdRecurrenceIds.push(recurrenceId);
                }
                const { error } = await supabase
                  .from("condominium_installments")
                  .insert({
                    user_id: user.id,
                    period_id: periodRow.id,
                    source_period_id: carrySourceId,
                    kind: "settlement",
                    description,
                    amount: carry,
                    original_amount: carry,
                    credit_applied: 0,
                    due_date: draft.schedule[0].date,
                    account_id: draft.accountId,
                    category_id: category?.id || null,
                    planned_recurrence_id: recurrenceId,
                  });
                if (error) throw error;
              }
              let availableCredit = Math.max(0, -carry);
              for (const [index, row] of draft.schedule.entries()) {
                const originalAmount = row.amount;
                const appliedCredit = Math.min(availableCredit, originalAmount);
                const amount = Math.max(0, originalAmount - appliedCredit);
                availableCredit -= appliedCredit;
                let recurrenceId: string | null = null;
                if (row.createPlanned && amount > 0) {
                  recurrenceId = await createPlanned(
                    {
                      description: row.description,
                      amount,
                      dueDate: row.date,
                      accountId: draft.accountId,
                    },
                    newType,
                  );
                  if (recurrenceId) createdRecurrenceIds.push(recurrenceId);
                }
                const { error } = await supabase
                  .from("condominium_installments")
                  .insert({
                    user_id: user.id,
                    period_id: periodRow.id,
                    kind: "regular",
                    description: row.description || `Rata ${index + 1}`,
                    amount,
                    original_amount: originalAmount,
                    credit_applied: appliedCredit,
                    due_date: row.date,
                    account_id: draft.accountId,
                    category_id: category?.id || null,
                    planned_recurrence_id: recurrenceId,
                  });
                if (error) throw error;
              }
              if (carry < 0) {
                const source = carrySourceId;
                if (source) {
                  await supabase
                    .from("condominium_periods")
                    .update({
                      closing_balance: 0,
                      status: "archived",
                    })
                    .eq("id", source);
                }
                if (availableCredit > 0)
                  await supabase
                    .from("condominium_periods")
                    .update({ closing_balance: -availableCredit })
                    .eq("id", periodRow.id);
              }
              if (draft.previousPeriodId && carry === 0)
                await supabase
                  .from("condominium_periods")
                  .update({ status: "archived", closing_balance: 0 })
                  .eq("id", draft.previousPeriodId);
              setNewType(null);
              await Promise.all([load(), refreshMoney()]);
              setSelectedId(periodRow.id);
            } catch (error) {
              if (createdPeriodId)
                await supabase
                  .from("condominium_periods")
                  .delete()
                  .eq("id", createdPeriodId);
              if (createdOpeningId)
                await supabase
                  .from("condominium_periods")
                  .delete()
                  .eq("id", createdOpeningId);
              for (const recurrenceId of createdRecurrenceIds)
                await supabase
                  .from("recurrences")
                  .delete()
                  .eq("id", recurrenceId);
              alert(
                error instanceof Error
                  ? error.message
                  : "Impossibile creare la gestione.",
              );
            } finally {
              setWorking(false);
            }
          }}
        />
      )}
      {working && <div className="condominium-working">Salvataggio…</div>}
    </section>
  );
}

function NewPeriodModal({
  type,
  accounts,
  hasHistory,
  previous,
  previousBalance,
  onClose,
  onSave,
}: {
  type: ManagementType;
  accounts: MoneyAccount[];
  hasHistory: boolean;
  previous: Period | null;
  previousBalance: number;
  onClose: () => void;
  onSave: (draft: {
    year: number;
    budgetAmount: number;
    accountId: string;
    openingBalance: number;
    previousPeriodId: string | null;
    previousBalance: number;
    settlementPlanned: boolean;
    schedule: Array<{
      description: string;
      amount: number;
      date: string;
      createPlanned: boolean;
    }>;
  }) => Promise<void>;
}) {
  const now = new Date();
  const previousStartYear = Number(previous?.label.split("/")[0]);
  const defaultYear = Number.isFinite(previousStartYear)
    ? previousStartYear + 1
    : type === "ordinary"
      ? now.getFullYear()
      : now.getMonth() >= 6
        ? now.getFullYear()
        : now.getFullYear() - 1;
  const defaultCount = type === "ordinary" ? 4 : 5;
  const [year, setYear] = useState(defaultYear);
  const [amountText, setAmountText] = useState("");
  const [countText, setCountText] = useState(String(defaultCount));
  const [accountId, setAccountId] = useState(
    accounts.find((item) => !item.archived && !item.hidden && !item.isContainer)
      ?.id || "",
  );
  const [openingKind, setOpeningKind] = useState<"none" | "debt" | "credit">(
    "none",
  );
  const [openingAmountText, setOpeningAmountText] = useState("");
  const [schedule, setSchedule] = useState<ScheduleDraft[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [settlementPlanned, setSettlementPlanned] = useState(true);

  const amount = Math.abs(parseAmount(amountText));
  const openingAmount = Math.abs(parseAmount(openingAmountText));
  const count = Math.max(1, Number(countText) || 1);

  const calculate = () => {
    const values = splitAmount(amount, Math.max(1, count));
    const dates = standardDates(type, year, Math.max(1, count));
    setSchedule(
      values.map((value, index) => ({
        description: `Rata ${index + 1}`,
        amount: amountValue(value),
        date: dates[index],
        createPlanned: true,
      })),
    );
  };
  const effectiveCarry = hasHistory
    ? previousBalance
    : openingKind === "debt"
      ? Math.abs(openingAmount)
      : openingKind === "credit"
        ? -Math.abs(openingAmount)
        : 0;
  const previewCredit = Math.max(0, -effectiveCarry);
  const updateScheduleAmount = (index: number, value: string) => {
    setSchedule((current) => {
      const next = current.map((item, position) =>
        position === index ? { ...item, amount: value } : item,
      );
      const following = next.length - index - 1;
      if (following <= 0) return next;
      const used = next
        .slice(0, index + 1)
        .reduce((sum, item) => sum + Math.abs(parseAmount(item.amount)), 0);
      const redistributed = splitAmount(Math.max(0, amount - used), following);
      return next.map((item, position) =>
        position > index
          ? {
              ...item,
              amount: amountValue(redistributed[position - index - 1]),
            }
          : item,
      );
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal condominium-period-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!schedule.length)
            return alert("Premi Calcola per generare le rate.");
          const scheduleTotal = schedule.reduce(
            (sum, row) => sum + Math.abs(parseAmount(row.amount)),
            0,
          );
          if (Math.abs(scheduleTotal - amount) > 0.009)
            return alert(
              "La somma delle rate deve coincidere con il preventivo.",
            );
          if (!reviewing) {
            setReviewing(true);
            return;
          }
          void onSave({
            year,
            budgetAmount: amount,
            accountId,
            openingBalance: effectiveCarry,
            previousPeriodId: previous?.id || null,
            previousBalance,
            settlementPlanned,
            schedule: schedule.map((row) => ({
              ...row,
              amount: Math.abs(parseAmount(row.amount)),
            })),
          });
        }}
      >
        <div className="modal-title">
          <div>
            <small>CONDOMINIO</small>
            <h2>
              Nuovo preventivo ·{" "}
              {type === "ordinary" ? "Ordinaria" : "Riscaldamento"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="condominium-form-grid">
          <label>
            {type === "ordinary" ? "Anno" : "Anno iniziale della stagione"}
            <input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              min="2000"
              max="2100"
            />
          </label>
          <label>
            Preventivo per il tuo appartamento
            <input
              inputMode="decimal"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              placeholder="0,00"
            />
          </label>
          <label>
            Numero rate
            <input
              type="number"
              min="1"
              max="24"
              value={countText}
              onChange={(event) => setCountText(event.target.value)}
            />
          </label>
          <label>
            Conto di pagamento
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              required
            >
              {accounts
                .filter(
                  (item) => !item.archived && !item.hidden && !item.isContainer,
                )
                .map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {!hasHistory && (
          <fieldset className="opening-balance-fieldset">
            <legend>Saldo della gestione precedente non caricata</legend>
            <div className="type-switch">
              {(["none", "debt", "credit"] as const).map((kind) => (
                <button
                  type="button"
                  key={kind}
                  className={openingKind === kind ? "selected" : ""}
                  onClick={() => setOpeningKind(kind)}
                >
                  {kind === "none"
                    ? "Nessuno"
                    : kind === "debt"
                      ? "Debito"
                      : "Credito"}
                </button>
              ))}
            </div>
            {openingKind !== "none" && (
              <label>
                Importo
                <input
                  inputMode="decimal"
                  value={openingAmountText}
                  onChange={(event) => setOpeningAmountText(event.target.value)}
                />
              </label>
            )}
          </fieldset>
        )}
        {hasHistory && previousBalance !== 0 && (
          <div
            className={`carry-preview ${previousBalance > 0 ? "debt" : "credit"}`}
          >
            Saldo precedente:{" "}
            <strong>{money(Math.abs(previousBalance))}</strong> ·{" "}
            {previousBalance > 0
              ? "da pagare"
              : "sarà sottratto dalle prime rate"}
          </div>
        )}
        <button
          type="button"
          className="outline calculate-installments"
          onClick={calculate}
        >
          Calcola rate
        </button>
        {schedule.length > 0 && !reviewing && (
          <div className="condominium-schedule-editor">
            <div className="schedule-editor-heading">
              <span>Rate calcolate</span>
              <small>Seleziona quelle da creare nelle pianificate</small>
            </div>
            {schedule.map((row, index) => {
              const creditBefore = schedule
                .slice(0, index)
                .reduce(
                  (sum, item) => sum + Math.abs(parseAmount(item.amount)),
                  0,
                );
              const applied = Math.min(
                Math.max(0, previewCredit - creditBefore),
                Math.abs(parseAmount(row.amount)),
              );
              return (
                <div className="condominium-schedule-row" key={index}>
                  <input
                    type="checkbox"
                    checked={row.createPlanned}
                    onChange={() =>
                      setSchedule((current) =>
                        current.map((item, position) =>
                          position === index
                            ? { ...item, createPlanned: !item.createPlanned }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    value={row.description}
                    onChange={(event) =>
                      setSchedule((current) =>
                        current.map((item, position) =>
                          position === index
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    type="date"
                    value={row.date}
                    onChange={(event) =>
                      setSchedule((current) =>
                        current.map((item, position) =>
                          position === index
                            ? { ...item, date: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(event) =>
                      updateScheduleAmount(index, event.target.value)
                    }
                  />
                  <small>
                    Rata originaria {money(Math.abs(parseAmount(row.amount)))}
                    {applied > 0
                      ? ` · credito −${money(applied)} · da pagare ${money(Math.max(0, Math.abs(parseAmount(row.amount)) - applied))}`
                      : ` · da pagare ${money(Math.abs(parseAmount(row.amount)))}`}
                  </small>
                </div>
              );
            })}
          </div>
        )}
        {reviewing && (
          <div className="planned-review">
            <div className="schedule-editor-heading">
              <span>Transazioni pianificate da creare</span>
              <small>Seleziona soltanto quelle che desideri</small>
            </div>
            {effectiveCarry > 0 && (
              <label className="planned-review-row settlement-review">
                <input
                  type="checkbox"
                  checked={settlementPlanned}
                  onChange={() => setSettlementPlanned((value) => !value)}
                />
                <span>
                  <b>Saldo consuntivo {previous?.label || "precedente"}</b>
                  <small>
                    {formatItalianDate(schedule[0].date)} · Casa ›{" "}
                    {type === "ordinary" ? "Condominio" : "Riscaldamento"}
                  </small>
                </span>
                <strong>{money(effectiveCarry)}</strong>
              </label>
            )}
            {schedule.map((row, index) => {
              const creditBefore = schedule
                .slice(0, index)
                .reduce(
                  (sum, item) => sum + Math.abs(parseAmount(item.amount)),
                  0,
                );
              const applied = Math.min(
                Math.max(0, previewCredit - creditBefore),
                Math.abs(parseAmount(row.amount)),
              );
              const effective = Math.max(
                0,
                Math.abs(parseAmount(row.amount)) - applied,
              );
              return (
                <label className="planned-review-row" key={index}>
                  <input
                    type="checkbox"
                    checked={row.createPlanned && effective > 0}
                    disabled={effective === 0}
                    onChange={() =>
                      setSchedule((current) =>
                        current.map((item, position) =>
                          position === index
                            ? { ...item, createPlanned: !item.createPlanned }
                            : item,
                        ),
                      )
                    }
                  />
                  <span>
                    <b>{row.description}</b>
                    <small>
                      {formatItalianDate(row.date)} · Casa ›{" "}
                      {type === "ordinary" ? "Condominio" : "Riscaldamento"} ·{" "}
                      {accounts.find((item) => item.id === accountId)?.name ||
                        "Conto"}
                    </small>
                  </span>
                  <strong>{money(effective)}</strong>
                </label>
              );
            })}
          </div>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="cancel"
            onClick={() => (reviewing ? setReviewing(false) : onClose())}
          >
            {reviewing ? "Indietro" : "Annulla"}
          </button>
          <button
            className="save-action transfer"
            disabled={!schedule.length || !accountId}
          >
            {reviewing ? "Conferma e crea" : "Rivedi pianificate"}
          </button>
        </div>
      </form>
    </div>
  );
}

type InstallmentDraft = {
  description: string;
  amount: number;
  dueDate: string;
  accountId: string;
  notes: string;
};

function InstallmentModal({
  mode,
  accounts,
  defaultAmount,
  onClose,
  onSave,
}: {
  mode: {
    period: Period;
    kind: "extraordinary" | "settlement";
    source?: Period;
  };
  accounts: MoneyAccount[];
  defaultAmount: number;
  onClose: () => void;
  onSave: (
    drafts: Array<InstallmentDraft & { createPlanned: boolean }>,
  ) => Promise<void>;
}) {
  const extraordinary = mode.kind === "extraordinary";
  const [description, setDescription] = useState(
    extraordinary
      ? "Rata straordinaria"
      : `Saldo consuntivo ${mode.source?.label || "precedente"}`,
  );
  const [amountText, setAmountText] = useState(amountValue(defaultAmount));
  const [countText, setCountText] = useState("1");
  const [firstDate, setFirstDate] = useState(toIsoDate(new Date()));
  const [accountId, setAccountId] = useState(
    accounts.find((item) => !item.archived && !item.hidden && !item.isContainer)
      ?.id || "",
  );
  const [notes, setNotes] = useState("");
  const [schedule, setSchedule] = useState<ScheduleDraft[]>([]);
  const total = Math.abs(parseAmount(amountText));
  const count = extraordinary ? Math.max(1, Number(countText) || 1) : 1;
  const calculate = () => {
    const amounts = splitAmount(total, count);
    const start = new Date(`${firstDate}T12:00:00`);
    setSchedule(
      amounts.map((amount, index) => {
        const date = new Date(start);
        date.setMonth(date.getMonth() + index);
        return {
          description:
            count === 1 ? description : `${description} ${index + 1}/${count}`,
          amount: amountValue(amount),
          date: toIsoDate(date),
          createPlanned: true,
        };
      }),
    );
  };
  const updateAmount = (index: number, value: string) => {
    setSchedule((current) => {
      const next = current.map((item, position) =>
        position === index ? { ...item, amount: value } : item,
      );
      const following = next.length - index - 1;
      if (following <= 0) return next;
      const used = next
        .slice(0, index + 1)
        .reduce((sum, item) => sum + Math.abs(parseAmount(item.amount)), 0);
      const redistributed = splitAmount(Math.max(0, total - used), following);
      return next.map((item, position) =>
        position > index
          ? {
              ...item,
              amount: amountValue(redistributed[position - index - 1]),
            }
          : item,
      );
    });
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          if (!schedule.length)
            return alert("Premi Calcola rate prima di salvare.");
          const scheduleTotal = schedule.reduce(
            (sum, row) => sum + Math.abs(parseAmount(row.amount)),
            0,
          );
          if (Math.abs(scheduleTotal - total) > 0.009)
            return alert("La somma delle rate deve coincidere con il totale.");
          void onSave(
            schedule.map((row) => ({
              description: row.description,
              amount: Math.abs(parseAmount(row.amount)),
              dueDate: row.date,
              accountId,
              notes: notes.trim(),
              createPlanned: row.createPlanned,
            })),
          );
        }}
      >
        <div className="modal-title">
          <div>
            <small>CONDOMINIO</small>
            <h2>
              {mode.kind === "settlement"
                ? `Salda consuntivo ${mode.source?.label || "precedente"}`
                : "Nuova rata straordinaria"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <label>
          Descrizione
          <input
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          Importo
          <input
            inputMode="decimal"
            required
            value={amountText}
            onChange={(event) => setAmountText(event.target.value)}
          />
        </label>
        {extraordinary && (
          <label>
            Numero rate
            <input
              type="number"
              min="1"
              max="36"
              value={countText}
              onChange={(event) => setCountText(event.target.value)}
            />
          </label>
        )}
        <label>
          {count > 1 ? "Scadenza prima rata" : "Scadenza"}
          <input
            type="date"
            required
            value={firstDate}
            onChange={(event) => setFirstDate(event.target.value)}
          />
        </label>
        <label>
          Conto
          <select
            required
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts
              .filter(
                (item) => !item.archived && !item.hidden && !item.isContainer,
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Note
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="outline calculate-installments"
          onClick={calculate}
        >
          Calcola rate
        </button>
        {schedule.length > 0 && (
          <div className="condominium-schedule-editor extraordinary-schedule">
            <div className="schedule-editor-heading">
              <span>Rate da creare</span>
              <small>Seleziona le transazioni pianificate</small>
            </div>
            {schedule.map((row, index) => (
              <div className="condominium-schedule-row" key={index}>
                <input
                  type="checkbox"
                  checked={row.createPlanned}
                  onChange={() =>
                    setSchedule((current) =>
                      current.map((item, position) =>
                        position === index
                          ? { ...item, createPlanned: !item.createPlanned }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  value={row.description}
                  onChange={(event) =>
                    setSchedule((current) =>
                      current.map((item, position) =>
                        position === index
                          ? { ...item, description: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  type="date"
                  value={row.date}
                  onChange={(event) =>
                    setSchedule((current) =>
                      current.map((item, position) =>
                        position === index
                          ? { ...item, date: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(event) => updateAmount(index, event.target.value)}
                />
                <small>
                  {money(Math.abs(parseAmount(row.amount)))} · Casa ›{" "}
                  {mode.period.managementType === "ordinary"
                    ? "Condominio"
                    : "Riscaldamento"}
                </small>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="cancel" onClick={onClose}>
            Annulla
          </button>
          <button
            className="save-action transfer"
            disabled={!schedule.length || !accountId}
          >
            {schedule.length > 1 ? "Salva rate" : "Salva rata"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditInstallmentModal({
  item,
  accounts,
  onClose,
  onSave,
}: {
  item: Installment;
  accounts: MoneyAccount[];
  onClose: () => void;
  onSave: (draft: InstallmentDraft) => Promise<void>;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const fd = new FormData(event.currentTarget);
          void onSave({
            description: String(fd.get("description")),
            amount: Math.abs(parseAmount(fd.get("amount"))),
            dueDate: String(fd.get("dueDate")),
            accountId: String(fd.get("account")),
            notes: String(fd.get("notes") || "").trim(),
          });
        }}
      >
        <div className="modal-title">
          <div>
            <small>CONDOMINIO</small>
            <h2>Modifica rata</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <label>
          Descrizione
          <input name="description" required defaultValue={item.description} />
        </label>
        <label>
          Importo
          <input
            name="amount"
            inputMode="decimal"
            required
            defaultValue={amountValue(item.amount)}
          />
        </label>
        <label>
          Scadenza
          <input
            name="dueDate"
            type="date"
            required
            defaultValue={item.dueDate}
          />
        </label>
        <label>
          Conto
          <select name="account" required defaultValue={item.accountId || ""}>
            {accounts
              .filter(
                (account) =>
                  !account.archived && !account.hidden && !account.isContainer,
              )
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Note
          <textarea name="notes" defaultValue={item.notes} />
        </label>
        <div className="modal-actions">
          <button type="button" className="cancel" onClick={onClose}>
            Annulla
          </button>
          <button className="save-action transfer">Salva modifiche</button>
        </div>
      </form>
    </div>
  );
}

function FinalModal({
  period,
  onClose,
  onSave,
  onDelete,
}: {
  period: Period;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void onSave(
            Math.abs(
              parseAmount(new FormData(event.currentTarget).get("amount")),
            ),
          );
        }}
      >
        <div className="modal-title">
          <div>
            <small>GESTIONE {period.label}</small>
            <h2>
              {period.finalAmount == null
                ? "Inserisci consuntivo"
                : "Modifica consuntivo"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="modal-hint">
          Inserisci il costo consuntivo complessivo attribuito al tuo
          appartamento.
        </p>
        <label>
          Importo del consuntivo
          <input
            name="amount"
            inputMode="decimal"
            required
            defaultValue={amountValue(period.finalAmount)}
          />
        </label>
        <div className="modal-actions">
          {period.finalAmount != null && (
            <button type="button" className="danger" onClick={onDelete}>
              Elimina consuntivo
            </button>
          )}
          <button type="button" className="cancel" onClick={onClose}>
            Annulla
          </button>
          <button className="save-action transfer">
            {period.finalAmount == null ? "Salva consuntivo" : "Salva modifica"}
          </button>
        </div>
      </form>
    </div>
  );
}
