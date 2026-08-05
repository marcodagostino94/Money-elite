import type { SupabaseClient } from "@supabase/supabase-js";

export type MoneyAccount = {
  id: string;
  name: string;
  type: "bank" | "cash" | "savings" | "meal_vouchers" | "other";
  openingBalance: number;
  balance: number;
  voucherUnitValue: number | null;
  voucherCount: number;
  hidden: boolean;
  archived: boolean;
  icon: string;
  color: string;
  notes: string;
  currency: string;
  exchangeRate: number;
};

export type MoneyCategory = {
  id: string;
  parentId: string | null;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
};

export type MoneyTransaction = {
  id: string;
  kind: "income" | "expense" | "transfer" | "refund" | "card_repayment";
  accountId: string;
  cardId: string | null;
  destinationAccountId: string | null;
  categoryId: string | null;
  recurrenceId: string | null;
  refundOfId: string | null;
  amount: number;
  voucherCount: number | null;
  transactionDate: string;
  dueDate: string | null;
  confirmedAt: string | null;
  accountedAt: string | null;
  notes: string;
  destinationAmount: number | null;
  exchangeRate: number | null;
};

export type MoneyCard = {
  id: string;
  name: string;
  linkedAccountId: string | null;
  periodType: "monthly" | "no_period";
  creditLimit: number | null;
  cycleStartDay: number | null;
  paymentDay: number | null;
  automaticPayment: boolean;
  archived: boolean;
};

export type MoneyBudget = {
  id: string;
  categoryId: string;
  amount: number;
  month: string;
};

export type MoneyRecurrence = {
  id: string;
  accountId: string | null;
  destinationAccountId: string | null;
  cardId: string | null;
  categoryId: string | null;
  kind: "income" | "expense" | "transfer";
  amount: number;
  nextDate: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  intervalCount: number;
  occurrenceLimit: number | null;
  occurrenceCount: number;
  endDate: string | null;
  automaticAccounting: boolean;
  isSubscription: boolean;
  active: boolean;
  notes: string;
};

const categorySeeds: Array<[MoneyCategory["kind"], string, string, string, string[]]> = [
  ["income", "Guadagni", "#26734d", "gift", ["Regalo", "Rimborso"]],
  ["income", "Proventi Finanziari", "#d9792b", "finance", []],
  ["income", "Reddito", "#3d9b69", "income", ["730", "Altri lavori", "Buoni pasto", "Stipendio", "Straordinari"]],
  ["expense", "Abbonamenti", "#7a5ac7", "subscriptions", ["App Store", "Finanziamenti", "iCloud", "Sky e Netflix", "Spotify"]],
  ["expense", "Alimenti", "#42a9c7", "groceries", ["Bar", "Buoni pasto", "Drink", "Pranzi/Cene", "Supermercato"]],
  ["expense", "Casa", "#d99345", "home", ["Arredamento", "Condominio", "Gas", "Giardino", "Lavori", "Luce", "Luce e Gas", "Prodotti Casa", "Pulizie", "Riscaldamento", "Rifiuti", "Vodafone"]],
  ["expense", "Divertimento", "#8d62c8", "cinema", ["Cinema", "Discoteca", "Divertimento", "Mare"]],
  ["expense", "Salute", "#d85b5b", "health", ["Farmacia", "Lenti a contatto", "Medici", "Sport"]],
  ["expense", "Spese Personali", "#c47a47", "package", ["Abbigliamento", "Amazon", "Cosmesi", "Cura Personale", "Regali", "Scommesse", "Tabacchi", "Tecnologia"]],
  ["expense", "Tasse", "#b56b55", "document", ["Multe", "Tasse"]],
  ["expense", "Trasporti", "#477fae", "car", ["Automobile", "Box", "Carburante", "Noleggio", "Parcheggio", "Scooter", "Telepass", "Trasporti pubblici"]],
  ["expense", "Viaggi", "#3c9b91", "travel", ["Divertimento Viaggi", "Hotel", "Pranzi/Cene Viaggi", "Trasporti Viaggi"]],
];

const seededChildIcons: Record<string, string> = {
  "730":"document","Abbigliamento":"clothes","Altri lavori":"work","Amazon":"package","App Store":"technology","Arredamento":"furniture",
  "Automobile":"car","Bar":"coffee","Box":"home","Buoni pasto":"voucher","Carburante":"fuel","Cinema":"cinema","Condominio":"building",
  "Cosmesi":"health","Cura Personale":"health","Discoteca":"music","Divertimento":"fun","Divertimento Viaggi":"fun","Drink":"coffee",
  "Farmacia":"medical","Finanziamenti":"finance","Gas":"flame","Giardino":"home","Hotel":"building","iCloud":"cloud","Lavori":"hammer",
  "Lenti a contatto":"eye","Luce":"light","Luce e Gas":"energy","Mare":"beach","Medici":"stethoscope","Multe":"tax","Noleggio":"car",
  "Parcheggio":"parking","Pranzi/Cene":"food","Pranzi/Cene Viaggi":"food","Prodotti Casa":"home","Pulizie":"cleaning","Regali":"gift",
  "Regalo":"gift","Rifiuti":"trash","Rimborso":"refund","Riscaldamento":"flame","Scommesse":"fun","Scooter":"bike","Sky e Netflix":"streaming",
  "Spotify":"music","Sport":"sport","Stipendio":"finance","Straordinari":"clock","Supermercato":"groceries","Tabacchi":"circle","Tasse":"tax",
  "Tecnologia":"technology","Telepass":"telepass","Trasporti pubblici":"bus","Trasporti Viaggi":"travel","Vodafone":"technology",
};

const seededChildColors: Record<string, string> = {
  "Stipendio":"#43a66f","Straordinari":"#348d5c","730":"#6bb98b","Altri lavori":"#527e67","Buoni pasto":"#d39a2f",
  "Regalo":"#397c64","Rimborso":"#4f967c","Bar":"#4fb5cf","Drink":"#279bbd","Pranzi/Cene":"#3b9bb6","Supermercato":"#62bdd4",
  "Farmacia":"#e26b70","Medici":"#c94c53","Sport":"#d86b62","Lenti a contatto":"#c76578",
};

const accountSeeds = [
  { name: "Buoni pasto", type: "meal_vouchers", opening_balance: 144, voucher_unit_value: 8, icon: "voucher", color: "#7051bf" },
  { name: "Contanti", type: "cash", opening_balance: 520, voucher_unit_value: null, icon: "cash", color: "#4f9d82" },
  { name: "Conto principale", type: "bank", opening_balance: 8940.65, voucher_unit_value: null, icon: "bank", color: "#7051bf" },
  { name: "Risparmi", type: "savings", opening_balance: 3380, voucher_unit_value: null, icon: "savings", color: "#4f9d82" },
] as const;

export async function ensureInitialData(supabase: SupabaseClient, userId: string) {
  const { error: profileError } = await supabase.from("profiles").upsert({ id: userId, display_name: "Marco" }, { onConflict: "id" });
  if (profileError) throw profileError;

  const { count: accountCount, error: countAccountsError } = await supabase.from("accounts").select("id", { count: "exact", head: true });
  if (countAccountsError) throw countAccountsError;
  if (!accountCount) {
    const { error } = await supabase.from("accounts").insert(accountSeeds.map(account => ({ ...account, user_id: userId })));
    if (error) throw error;
  }

  const { count: categoryCount, error: countCategoriesError } = await supabase.from("categories").select("id", { count: "exact", head: true });
  if (countCategoriesError) throw countCategoriesError;
  if (!categoryCount) {
    for (const [kind, name, color, icon, children] of categorySeeds) {
      const { data: root, error } = await supabase.from("categories").insert({ user_id: userId, kind, name, color, icon }).select("id").single();
      if (error) throw error;
      if (!root) throw new Error("Impossibile creare la categoria iniziale");
      if (children.length) {
        const { error: childrenError } = await supabase.from("categories").insert(children.sort((a, b) => a.localeCompare(b, "it")).map((child, index) => ({
          user_id: userId,
          parent_id: root.id,
          kind,
          name: child,
          color: seededChildColors[child] || color,
          icon: seededChildIcons[child] || icon,
          sort_order: index,
        })));
        if (childrenError) throw childrenError;
      }
    }
  }

  // v3.0.2 targeted repair: Buoni pasto (entrata) belongs under Reddito,
  // never under Guadagni, and always keeps the dedicated voucher icon.
  // Existing databases may contain the old placement, so repair it safely
  // without touching any other user category.
  const { data: incomeRoots, error: incomeRootsError } = await supabase
    .from("categories")
    .select("id,name")
    .eq("user_id", userId)
    .eq("kind", "income")
    .is("parent_id", null)
    .in("name", ["Reddito", "Guadagni"]);
  if (incomeRootsError) throw incomeRootsError;

  const reddito = incomeRoots?.find(root => root.name === "Reddito");
  const guadagni = incomeRoots?.find(root => root.name === "Guadagni");
  if (reddito) {
    const parentIds = [reddito.id, guadagni?.id].filter(Boolean) as string[];
    const { data: voucherRows, error: voucherRowsError } = await supabase
      .from("categories")
      .select("id,parent_id,name")
      .eq("user_id", userId)
      .eq("kind", "income")
      .ilike("name", "Buoni pasto")
      .in("parent_id", parentIds);
    if (voucherRowsError) throw voucherRowsError;

    const correct = voucherRows?.find(row => row.parent_id === reddito.id);
    const misplaced = voucherRows?.filter(row => guadagni && row.parent_id === guadagni.id) ?? [];

    let targetId = correct?.id;
    if (!targetId && misplaced.length) {
      targetId = misplaced[0].id;
      const { error: moveError } = await supabase.from("categories").update({
        parent_id: reddito.id,
        icon: "voucher",
        color: seededChildColors["Buoni pasto"],
      }).eq("id", targetId);
      if (moveError) throw moveError;
    } else if (targetId) {
      const { error: styleError } = await supabase.from("categories").update({
        icon: "voucher",
        color: seededChildColors["Buoni pasto"],
      }).eq("id", targetId);
      if (styleError) throw styleError;
    }

    if (targetId) {
      for (const duplicate of misplaced.filter(row => row.id !== targetId)) {
        const [{ error: txError }, { error: recurrenceError }] = await Promise.all([
          supabase.from("transactions").update({ category_id: targetId }).eq("category_id", duplicate.id),
          supabase.from("recurrences").update({ category_id: targetId }).eq("category_id", duplicate.id),
        ]);
        if (txError) throw txError;
        if (recurrenceError) throw recurrenceError;
        const { error: deleteError } = await supabase.from("categories").delete().eq("id", duplicate.id);
        if (deleteError) throw deleteError;
      }
    }
  }
}

async function loadAllTransactions(supabase: SupabaseClient, userId: string) {
  const pageSize = 1000;
  const rows: any[] = [];
  let lastId: string | null = null;

  // IMPORTANT: use keyset pagination instead of OFFSET/RANGE pagination.
  // With more than 1,000 transactions, a realtime INSERT can arrive while the
  // history is being loaded. OFFSET pagination would then shift page boundaries
  // and could duplicate one old transaction while omitting another one, causing
  // an unrelated account balance to jump after saving a new transaction.
  for (;;) {
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .limit(pageSize);

    if (lastId) query = query.gt("id", lastId);

    const { data, error } = await query;
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;

    lastId = page[page.length - 1]?.id ?? null;
    if (!lastId) break;
  }

  // The UI expects the most recent transactions first. Pagination order is
  // deliberately independent from display order so page boundaries stay stable.
  rows.sort((a, b) => {
    const dateCompare = String(b.transaction_date ?? "").localeCompare(String(a.transaction_date ?? ""));
    if (dateCompare !== 0) return dateCompare;
    const createdCompare = String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    if (createdCompare !== 0) return createdCompare;
    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  });

  return rows;
}

export async function loadMoneyData(supabase: SupabaseClient, userId: string) {
  await ensureInitialData(supabase, userId);
  const [{ data: rawAccounts, error: accountsError }, { data: rawCategories, error: categoriesError }, rawTransactions, { data: rawCards, error: cardsError }, { data: rawBudgets, error: budgetsError }, { data: rawRecurrences, error: recurrencesError }, {data:profile,error:profileError}] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    loadAllTransactions(supabase, userId),
    supabase.from("cards").select("*").order("name"),
    supabase.from("budgets").select("*").order("month", { ascending: false }),
    supabase.from("recurrences").select("*").order("next_date"),
    supabase.from("profiles").select("currency").eq("id",userId).single(),
  ]);
  const error = accountsError ?? categoriesError ?? cardsError ?? budgetsError ?? recurrencesError ?? profileError;
  if (error) throw error;

  const transactions: MoneyTransaction[] = (rawTransactions ?? []).map(row => ({
    id: row.id,
    kind: row.kind,
    accountId: row.account_id,
    cardId: row.card_id,
    destinationAccountId: row.destination_account_id,
    categoryId: row.category_id,
    recurrenceId: row.recurrence_id,
    refundOfId: row.refund_of_id,
    amount: Number(row.amount),
    voucherCount: row.voucher_count,
    transactionDate: row.transaction_date,
    dueDate: row.due_date,
    confirmedAt: row.confirmed_at,
    accountedAt: row.accounted_at,
    notes: row.notes ?? "",
    destinationAmount: row.destination_amount == null ? null : Number(row.destination_amount),
    exchangeRate: row.exchange_rate == null ? null : Number(row.exchange_rate),
  }));

  // A planned transaction is only a forecast until the user confirms it.
  // Pending/future planned rows must never alter real account balances.
  const effectiveTransactions = transactions.filter(transaction => !transaction.dueDate || Boolean(transaction.confirmedAt));

  const accounts: MoneyAccount[] = (rawAccounts ?? []).map(row => {
    const relevant = effectiveTransactions.filter(transaction => transaction.accountId === row.id || transaction.destinationAccountId === row.id);
    const delta = relevant.reduce((sum, transaction) => {
      if (transaction.kind === "transfer") {
        if (transaction.accountId === row.id) return sum - transaction.amount;
        if (transaction.destinationAccountId === row.id) return sum + (transaction.destinationAmount ?? transaction.amount);
      }
      if (transaction.accountId !== row.id) return sum;
      return sum + (transaction.kind === "expense" || transaction.kind === "card_repayment" ? -transaction.amount : transaction.amount);
    }, 0);
    const voucherDelta = relevant.reduce((sum, transaction) => transaction.accountId === row.id && transaction.voucherCount
      ? sum + (transaction.kind === "expense" ? -transaction.voucherCount : transaction.voucherCount)
      : sum, 0);
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      openingBalance: Number(row.opening_balance),
      balance: Number(row.opening_balance) + delta,
      voucherUnitValue: row.voucher_unit_value == null ? null : Number(row.voucher_unit_value),
      voucherCount: row.type === "meal_vouchers" ? Math.round(Number(row.opening_balance) / Number(row.voucher_unit_value)) + voucherDelta : 0,
      hidden: row.hidden_from_totals,
      archived: Boolean(row.archived_at),
      icon: row.icon || "bank",
      color: row.color || "#7051bf",
      notes: row.notes ?? "",
      currency: row.currency || "EUR",
      exchangeRate: Number(row.exchange_rate || 1),
    };
  });

  const categories: MoneyCategory[] = (rawCategories ?? []).map(row => ({
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    kind: row.kind,
    color: row.color,
    icon: row.icon,
  }));
  const cards: MoneyCard[] = (rawCards ?? []).map(row => ({
    id: row.id,
    name: row.name,
    linkedAccountId: row.linked_account_id,
    periodType: row.period_type,
    creditLimit: row.credit_limit == null ? null : Number(row.credit_limit),
    cycleStartDay: row.cycle_start_day,
    paymentDay: row.payment_day,
    automaticPayment: Boolean(row.automatic_payment),
    archived: Boolean(row.archived_at),
  }));
  const budgets: MoneyBudget[] = (rawBudgets ?? []).map(row => ({ id: row.id, categoryId: row.category_id, amount: Number(row.amount), month: row.month }));
  const recurrences: MoneyRecurrence[] = (rawRecurrences ?? []).map(row => ({
    id: row.id, accountId: row.account_id, destinationAccountId: row.destination_account_id, cardId: row.card_id, categoryId: row.category_id,
    kind: row.kind, amount: Number(row.amount), nextDate: row.next_date, frequency: row.frequency,
    intervalCount: Number(row.interval_count ?? 1), occurrenceLimit: row.occurrence_limit == null ? null : Number(row.occurrence_limit),
    occurrenceCount: Number(row.occurrence_count ?? 0), endDate: row.end_date ?? null,
    automaticAccounting: Boolean(row.automatic_accounting), isSubscription: Boolean(row.is_subscription), active: Boolean(row.active), notes: row.notes ?? "",
  }));
  return { accounts, categories, transactions, cards, budgets, recurrences, primaryCurrency: profile?.currency || "EUR" };
}

export const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatItalianDate = (isoDate: string) => new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date(`${isoDate}T12:00:00`)).replace(".", "");
