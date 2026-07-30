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
          color,
          icon: child === "Medici" ? "stethoscope" : child === "Telepass" ? "telepass" : icon,
          sort_order: index,
        })));
        if (childrenError) throw childrenError;
      }
    }
  }
}

export async function loadMoneyData(supabase: SupabaseClient, userId: string) {
  await ensureInitialData(supabase, userId);
  const [{ data: rawAccounts, error: accountsError }, { data: rawCategories, error: categoriesError }, { data: rawTransactions, error: transactionsError }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const error = accountsError ?? categoriesError ?? transactionsError;
  if (error) throw error;

  const transactions: MoneyTransaction[] = (rawTransactions ?? []).map(row => ({
    id: row.id,
    kind: row.kind,
    accountId: row.account_id,
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
  }));

  const accounts: MoneyAccount[] = (rawAccounts ?? []).map(row => {
    const relevant = transactions.filter(transaction => transaction.accountId === row.id || transaction.destinationAccountId === row.id);
    const delta = relevant.reduce((sum, transaction) => {
      if (transaction.kind === "transfer") {
        if (transaction.accountId === row.id) return sum - transaction.amount;
        if (transaction.destinationAccountId === row.id) return sum + transaction.amount;
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
  return { accounts, categories, transactions };
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
