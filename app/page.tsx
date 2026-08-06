"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import * as L from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatItalianDate, loadMoneyData, toIsoDate, type MoneyAccount, type MoneyBudget, type MoneyCard, type MoneyCategory, type MoneyRecurrence, type MoneyTransaction } from "@/lib/money/data";

type Section =
  | "Dashboard"
  | "Bilancio"
  | "Transazioni"
  | "Pianificate"
  | "Abbonamenti"
  | "Conti"
  | "Carte di credito"
  | "Budget"
  | "Debiti"
  | "Report"
  | "Informazioni"
  | "Impostazioni";

type Transaction = {
  id: string;
  label: string;
  category: string;
  account: string;
  notes?: string;
  destinationAccountName?: string | null;
  date: string;
  amount: number;
  icon: string;
  color: string;
  categoryColor?: string;
  accounted?: boolean;
  isRefund?: boolean;
  refundOf?: string;
  accountId?: string;
  cardId?: string | null;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  recurrenceId?: string | null;
  dateISO?: string;
  kind?: MoneyTransaction["kind"];
  voucherCount?: number | null;
  dueDate?: string | null;
  confirmedAt?: string | null;
  planned?: boolean;
  subscription?: boolean;
  automaticAccounting?: boolean;
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  intervalCount?: number;
  occurrenceLimit?: number | null;
  recurrencePlaceholder?: boolean;
  currency?: string;
  destinationCurrency?: string;
  destinationAmount?: number | null;
  exchangeRate?: number | null;
};

type AccountDraft = {
  name: string;
  type: MoneyAccount["type"];
  openingBalance: number;
  voucherUnitValue: number | null;
  notes: string;
  icon: string;
  currency: string;
  exchangeRate: number;
  isContainer: boolean;
  parentAccountId: string | null;
  accountRole: MoneyAccount["accountRole"];
  annualInterestRate: number;
};

type DashboardPreferences = {
  accountIds: string[];
};

type TransactionTemplate = {
  id: string;
  name: string;
  kind: "income" | "expense";
  amount: number;
  category: string;
  account: string;
  notes: string;
};

const DASHBOARD_PREFERENCES_KEY = "money-elite-dashboard-preferences-v1";
const ACCOUNT_ORDER_KEY = "money-elite-account-order-v1";
const TRANSACTION_TEMPLATES_KEY = "money-elite-transaction-templates-v1";
const PRIMARY_CURRENCY_KEY="money-elite-primary-currency-v1";
const BUDGET_NOTIFICATIONS_KEY="money-elite-budget-notifications-v1";
const ISO_CURRENCIES=["EUR","USD","GBP","EGP","CHF","JPY","CAD","AUD","AED","ALL","ARS","BRL","CNY","CZK","DKK","HKD","HUF","INR","ISK","MAD","MXN","NOK","NZD","PLN","RON","SEK","SGD","THB","TRY","ZAR"];

const loadTransactionTemplates = (): TransactionTemplate[] => {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(TRANSACTION_TEMPLATES_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};
const saveTransactionTemplates = (templates: TransactionTemplate[]) => {
  window.localStorage.setItem(TRANSACTION_TEMPLATES_KEY, JSON.stringify(templates));
  window.dispatchEvent(new Event("money-elite-templates-changed"));
  void (async()=>{
    const supabase=getSupabaseBrowserClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return;
    if(templates.length){
      const {error}=await supabase.from("transaction_templates").upsert(templates.map(template=>({id:template.id,user_id:user.id,name:template.name,kind:template.kind,amount:template.amount,category:template.category,account:template.account,notes:template.notes})),{onConflict:"id"});
      if(error){console.warn("Sincronizzazione modelli non disponibile",error.message);return;}
    }
    const {data:remote}=await supabase.from("transaction_templates").select("id").eq("user_id",user.id);
    const removed=(remote||[]).map(row=>row.id).filter(id=>!templates.some(template=>template.id===id));
    if(removed.length)await supabase.from("transaction_templates").delete().in("id",removed).eq("user_id",user.id);
  })();
};

const syncTransactionTemplates=async()=>{
  const supabase=getSupabaseBrowserClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return;
  const local=loadTransactionTemplates();
  let {data,error}=await supabase.from("transaction_templates").select("*").eq("user_id",user.id).order("updated_at",{ascending:false});
  if(error)return;
  if(!data?.length&&local.length){await supabase.from("transaction_templates").upsert(local.map(template=>({id:template.id,user_id:user.id,name:template.name,kind:template.kind,amount:template.amount,category:template.category,account:template.account,notes:template.notes})),{onConflict:"id"});const refreshed=await supabase.from("transaction_templates").select("*").eq("user_id",user.id).order("updated_at",{ascending:false});data=refreshed.data;error=refreshed.error;if(error)return;}
  const templates:TransactionTemplate[]=(data||[]).map(row=>({id:row.id,name:row.name,kind:row.kind,amount:Number(row.amount),category:row.category,account:row.account,notes:row.notes||""}));
  window.localStorage.setItem(TRANSACTION_TEMPLATES_KEY,JSON.stringify(templates));
  window.dispatchEvent(new Event("money-elite-templates-changed"));
};

const sortAccountsBySavedOrder = (accounts: MoneyAccount[]) => {
  if (typeof window === "undefined") return accounts;
  try {
    const saved = JSON.parse(window.localStorage.getItem(ACCOUNT_ORDER_KEY) || "[]") as string[];
    if (!Array.isArray(saved) || !saved.length) return accounts;
    const positions = new Map(saved.map((id,index)=>[id,index]));
    return [...accounts].sort((a,b)=>(positions.get(a.id)??Number.MAX_SAFE_INTEGER)-(positions.get(b.id)??Number.MAX_SAFE_INTEGER));
  } catch {
    return accounts;
  }
};

const nav: { label: Section; icon: string }[] = [
  { label: "Dashboard", icon: "dashboard" },
  { label: "Bilancio", icon: "balance" },
  { label: "Transazioni", icon: "transactions" },
  { label: "Pianificate", icon: "planned" },
  { label: "Abbonamenti", icon: "subscriptions" },
  { label: "Conti", icon: "accounts" },
  { label: "Carte di credito", icon: "card" },
  { label: "Budget", icon: "budget" },
  { label: "Report", icon: "report" },
  { label: "Informazioni", icon: "info" },
  { label: "Impostazioni", icon: "settings" },
];

const initialTransactions: Transaction[] = [
  { id: "demo-1", label: "Stipendio", category: "Entrate", account: "Conto principale", date: "28 Lug 2026", amount: 2450, icon: "income", color: "green" },
  { id: "demo-2", label: "Esselunga", category: "Spesa alimentare", account: "Carta Elite", date: "27 Lug 2026", amount: -86.4, icon: "groceries", color: "orange" },
  { id: "demo-3", label: "Netflix", category: "Abbonamenti", account: "Carta Elite", date: "26 Lug 2026", amount: -17.99, icon: "streaming", color: "purple" },
  { id: "demo-4", label: "Eni Plenitude", category: "Casa e utenze", account: "Conto principale", date: "25 Lug 2026", amount: -64.8, icon: "energy", color: "blue" },
  { id: "demo-5", label: "Pranzo", category: "Ristoranti", account: "Contanti", date: "24 Lug 2026", amount: -24.5, icon: "food", color: "red", accounted: false },
  { id: "demo-6", label: "Amazon", category: "Spese Personali › Amazon", account: "Revolut", date: "23 Lug 2026", amount: -50.99, icon: "package", color: "orange" },
  { id: "demo-7", label: "Carburante", category: "Trasporti › Carburante", account: "Carta Elite", date: "22 Lug 2026", amount: -62, icon: "fuel", color: "blue" },
  { id: "demo-8", label: "Farmacia", category: "Salute › Farmacia", account: "Conto principale", date: "21 Lug 2026", amount: -18.7, icon: "medical", color: "red" },
  { id: "demo-9", label: "Rimborso farmacia", category: "Rimborso · Salute › Farmacia", account: "Conto principale", date: "21 Lug 2026", amount: 10, icon: "refund", color: "green", isRefund: true, refundOf: "demo-8" },
  { id: "demo-10", label: "Vodafone", category: "Casa › Vodafone", account: "Conto principale", date: "20 Lug 2026", amount: -29.9, icon: "technology", color: "blue" },
  { id: "demo-11", label: "Cinema", category: "Divertimento › Cinema", account: "Contanti", date: "19 Lug 2026", amount: -12, icon: "cinema", color: "purple" },
  { id: "demo-12", label: "Supermercato", category: "Alimenti › Supermercato", account: "Carta Elite", date: "18 Lug 2026", amount: -74.35, icon: "groceries", color: "orange" },
  { id: "demo-13", label: "Parcheggio", category: "Trasporti › Parcheggio", account: "Contanti", date: "17 Lug 2026", amount: -4.5, icon: "parking", color: "blue" },
  { id: "demo-14", label: "Spotify", category: "Abbonamenti › Spotify", account: "Revolut", date: "16 Lug 2026", amount: -10.99, icon: "music", color: "purple" },
];

const budgets = [
  { name: "Spesa alimentare", spent: 286, limit: 400, color: "#e6a35b" },
  { name: "Ristoranti", spent: 142, limit: 250, color: "#7859ce" },
  { name: "Trasporti", spent: 96, limit: 180, color: "#4a89b7" },
  { name: "Tempo libero", spent: 118, limit: 200, color: "#4f9d82" },
];

const money = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const accountMoney = (value:number,currency="EUR") => new Intl.NumberFormat("it-IT",{style:"currency",currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value);

const parseItalianAmount = (value: FormDataEntryValue | string | null) => {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const amountInput = (value: number | null | undefined) => value == null ? "" : value.toFixed(2).replace(".", ",");

const addOneMonth = (isoDate: string) => {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setMonth(date.getMonth()+1);
  return toIsoDate(date);
};

const nextRecurrenceDate = (recurrence: MoneyRecurrence) => {
  const interval = Math.max(1, recurrence.intervalCount || 1);
  const date = new Date(`${recurrence.nextDate}T12:00:00`);
  if (recurrence.frequency === "daily") date.setDate(date.getDate() + interval);
  if (recurrence.frequency === "weekly") date.setDate(date.getDate() + (7 * interval));
  if (recurrence.frequency === "monthly") {
    const originalDay = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + interval);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
  }
  if (recurrence.frequency === "yearly") {
    const originalMonth = date.getMonth();
    const originalDay = date.getDate();
    date.setDate(1);
    date.setFullYear(date.getFullYear() + interval);
    date.setMonth(originalMonth);
    const lastDay = new Date(date.getFullYear(), originalMonth + 1, 0).getDate();
    date.setDate(Math.min(originalDay, lastDay));
  }
  return toIsoDate(date);
};

const monthKeyFromDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
const monthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date(year,month-1,1));
};
const shiftMonthKey = (monthKey: string, delta: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  return monthKeyFromDate(new Date(year,month-1+delta,1));
};
const dateInMonth = (isoDate: string | undefined, monthKey: string) => Boolean(isoDate?.startsWith(monthKey));
// Planned transactions are forecasts until confirmation. Only effective transactions
// may affect balances, budgets, card debt or financial summaries.
const isEffectiveTransaction = (transaction: Transaction) => !transaction.dueDate || Boolean(transaction.confirmedAt);
const netExpenses = (transactions: Transaction[]) => {
  const expenses = transactions.filter(transaction=>transaction.kind==="expense").reduce((sum,transaction)=>sum+Math.abs(transaction.amount),0);
  const refunds = transactions.filter(transaction=>transaction.kind==="refund"||transaction.isRefund).reduce((sum,transaction)=>sum+Math.abs(transaction.amount),0);
  return Math.max(0,expenses-refunds);
};
const cardCycleBounds = (monthKey: string, cycleStartDay: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month-1, Math.max(1,Math.min(31,cycleStartDay)), 12);
  if (start.getMonth() !== month-1) start.setDate(0);
  const nextStart = new Date(start);
  nextStart.setMonth(nextStart.getMonth()+1);
  if (nextStart.getDate() !== start.getDate()) nextStart.setDate(0);
  const end = new Date(nextStart);
  end.setDate(end.getDate()-1);
  return { start: toIsoDate(start), end: toIsoDate(end) };
};
const compactDate = (isoDate: string) => new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(`${isoDate}T12:00:00`));

const transactionFromDatabase = (row: MoneyTransaction, accounts: MoneyAccount[], categories: MoneyCategory[], cards: MoneyCard[]): Transaction => {
  const account = accounts.find(item => item.id === row.accountId);
  const destinationAccount = accounts.find(item => item.id === row.destinationAccountId);
  const card = cards.find(item => item.id === row.cardId);
  const category = categories.find(item => item.id === row.categoryId);
  const parent = category?.parentId ? categories.find(item => item.id === category.parentId) : null;
  const categoryLabel = category ? (parent ? `${parent.name} › ${category.name}` : category.name) : row.kind === "transfer" ? "Trasferimento tra conti" : "Senza categoria";
  const titleBase = category?.name ?? (row.kind === "transfer" ? "Giroconto" : "Senza categoria");
  const signedAmount = row.kind === "expense" || row.kind === "card_repayment" ? -row.amount : row.amount;
  return {
    id: row.id,
    label: row.kind === "transfer" ? "Giroconto" : row.kind === "refund" ? `${titleBase} (Rimborso)` : titleBase,
    category: categoryLabel,
    account: card?.name ?? account?.name ?? "Conto archiviato",
    notes: row.notes ?? "",
    destinationAccountName: destinationAccount?.name ?? null,
    accountId: row.accountId,
    cardId: row.cardId,
    destinationAccountId: row.destinationAccountId,
    categoryId: row.categoryId,
    recurrenceId: row.recurrenceId,
    date: formatItalianDate(row.transactionDate),
    dateISO: row.transactionDate,
    dueDate: row.dueDate,
    confirmedAt: row.confirmedAt,
    amount: signedAmount,
    currency: account?.currency || "EUR",
    destinationCurrency: destinationAccount?.currency || null || undefined,
    destinationAmount: row.destinationAmount,
    exchangeRate: row.exchangeRate,
    icon: category ? categoryVisual(category).icon : (row.kind === "transfer" ? "transfer" : row.kind === "refund" ? "refund" : row.kind === "income" ? "income" : "expense"),
    color: row.kind === "income" || row.kind === "refund" ? "green" : row.kind === "transfer" ? "blue" : "orange",
    categoryColor: category?.color || (row.kind === "transfer" ? "#729ac5" : row.kind === "income" || row.kind === "refund" ? "#559476" : "#c9716c"),
    accounted: Boolean(row.accountedAt),
    isRefund: row.kind === "refund",
    refundOf: row.refundOfId ?? undefined,
    kind: row.kind,
    voucherCount: row.voucherCount,
  };
};

const assetPath = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;

const iconMap: Record<string, L.LucideIcon> = {
  dashboard:L.LayoutDashboard,balance:L.Scale,transactions:L.ArrowUpDown,planned:L.CalendarClock,
  subscriptions:L.Repeat2,repeat:L.RefreshCw,accounts:L.WalletCards,card:L.CreditCard,budget:L.ChartNoAxesColumnIncreasing,
  debts:L.HandCoins,report:L.ChartPie,settings:L.Settings,notification:L.Bell,income:L.ArrowDownLeft,
  expense:L.ArrowUpRight,transfer:L.ArrowLeftRight,groceries:L.ShoppingCart,streaming:L.MonitorPlay,
  energy:L.Zap,food:L.Utensils,bank:L.Landmark,cash:L.Banknote,savings:L.PiggyBank,voucher:L.Ticket,
  home:L.House,gift:L.Gift,refund:L.RotateCcw,document:L.FileText,work:L.BriefcaseBusiness,cloud:L.Cloud,
  music:L.Music2,furniture:L.Sofa,car:L.CarFront,coffee:L.Coffee,package:L.Package,hammer:L.Hammer,
  health:L.HeartPulse,medical:L.Pill,travel:L.Plane,fuel:L.Fuel,clothes:L.Shirt,technology:L.Smartphone,
  finance:L.BadgeEuro,trash:L.Trash2,archive:L.Archive,edit:L.Pencil,building:L.Building2,parking:L.CircleParking,
  flame:L.Flame,light:L.Lightbulb,cleaning:L.SprayCan,bike:L.Bike,bus:L.BusFront,beach:L.Umbrella,
  cinema:L.Clapperboard,fun:L.Sparkles,tax:L.ReceiptText,sport:L.Dumbbell,more:L.MoreHorizontal,
  plus:L.Plus,close:L.X,back:L.ArrowLeft,forward:L.ChevronRight,search:L.Search,calendar:L.CalendarDays,logout:L.LogOut,
  pause:L.Pause,play:L.Play,copy:L.Copy,info:L.Info,cigarette:L.Cigarette,drink:L.Martini,perfume:L.SprayCan,
  betting:L.Dices,justice:L.Scale,garage:L.Warehouse,
  star:L.Star,
  eye:L.Eye,eyeOff:L.EyeOff,check:L.Check,down:L.ChevronDown,up:L.ChevronUp,clock:L.Clock3,stethoscope:L.Stethoscope,
  list:L.List,
};

function AppIcon({name,size=18}: {name:string;size?:number}) {
  if(name==="bank-logo-revolut"||name==="bank-logo-mediolanum") return <img className="bank-logo-icon" src={assetPath(name==="bank-logo-revolut"?"/bank-revolut.png":"/bank-mediolanum.png")} alt={name==="bank-logo-revolut"?"Revolut":"Mediolanum"} style={{width:size,height:size}}/>;
  if(name==="telepass") return <span className="letter-icon" style={{fontSize:Math.max(11,size-3)}}>T</span>;
  const Icon = iconMap[name] || L.Circle;
  return <Icon size={size} strokeWidth={1.8}/>;
}

const categoryIcon = (name: string) => {
  const icons: Record<string, string> = {
    "730":"document","Abbigliamento":"clothes","Abbonamenti":"subscriptions","Alimenti":"groceries",
    "Altri lavori":"work","Amazon":"package","App Store":"technology","Arredamento":"furniture",
    "Automobile":"car","Bar":"coffee","Box":"garage","Buoni pasto":"voucher","Carburante":"fuel",
    "Casa":"home","Cinema":"cinema","Condominio":"building","Cosmesi":"perfume","Cura Personale":"health",
    "Discoteca":"music","Divertimento":"fun","Divertimento Viaggi":"fun","Drink":"drink",
    "Farmacia":"medical","Finanziamenti":"finance","Gas":"flame","Giardino":"home","Guadagni":"income",
    "Hotel":"building","iCloud":"cloud","Lavori":"hammer","Lenti a contatto":"eye","Luce":"light",
    "Luce e Gas":"energy","Mare":"travel","Medici":"stethoscope","Multe":"justice","Noleggio":"car",
    "Parcheggio":"parking","Pranzi/Cene":"food","Pranzi/Cene Viaggi":"food","Prodotti Casa":"home",
    "Proventi Finanziari":"finance","Pulizie":"cleaning","Reddito":"income","Regali":"gift","Regalo":"gift",
    "Rifiuti":"trash","Rimborso":"refund","Riscaldamento":"flame","Salute":"health","Scommesse":"betting",
    "Scooter":"bike","Sky e Netflix":"streaming","Spese Personali":"clothes","Spotify":"music","Sport":"sport",
    "Stipendio":"finance","Straordinari":"clock","Supermercato":"groceries","Tabacchi":"cigarette",
    "Tasse":"justice","Tecnologia":"technology","Telepass":"telepass","Trasporti":"car","Trasporti pubblici":"bus",
    "Trasporti Viaggi":"travel","Viaggi":"travel","Vodafone":"technology",
  };
  return icons[name] || "circle";
};

const categoryColor = (name: string) => {
  const groups: [string[],string][] = [
    [["Reddito","Stipendio","Straordinari","730","Altri lavori","Buoni pasto"],"#16A05D"],
    [["Guadagni","Regalo","Regali","Rimborso"],"#00866E"],
    [["Proventi Finanziari"],"#C98500"],
    [["Alimenti","Bar","Drink","Pranzi/Cene","Supermercato"],"#F07818"],
    [["Salute","Farmacia","Medici","Sport","Lenti a contatto"],"#D93F55"],
    [["Casa","Arredamento","Condominio","Gas","Giardino","Lavori","Luce","Luce e Gas","Prodotti Casa","Pulizie","Riscaldamento","Rifiuti","Vodafone"],"#2878C7"],
    [["Abbonamenti","App Store","Finanziamenti","iCloud","Sky e Netflix","Spotify"],"#7651C6"],
    [["Spese Personali","Abbigliamento","Amazon","Cosmesi","Cura Personale","Scommesse","Tabacchi","Tecnologia"],"#D43A91"],
    [["Trasporti","Automobile","Box","Carburante","Noleggio","Parcheggio","Scooter","Telepass","Trasporti pubblici"],"#009BB5"],
    [["Viaggi","Divertimento Viaggi","Hotel","Pranzi/Cene Viaggi","Trasporti Viaggi"],"#00A184"],
    [["Divertimento","Cinema","Discoteca","Mare"],"#9B42C6"],
    [["Tasse","Multe"],"#596579"],
  ];
  return groups.find(([names])=>names.includes(name))?.[1] || "#5C718A";
};

// Le categorie storiche di Money Elite hanno una propria identita visiva.
// I vecchi seed del database assegnavano spesso alle sottocategorie l'icona del padre:
// per i nomi standard usiamo quindi la mappa canonica, lasciando intatte le categorie personalizzate.
const canonicalCategoryNames = new Set([
  "730","Abbigliamento","Abbonamenti","Alimenti","Altri lavori","Amazon","App Store","Arredamento",
  "Automobile","Bar","Box","Buoni pasto","Carburante","Casa","Cinema","Condominio","Cosmesi","Cura Personale",
  "Discoteca","Divertimento","Divertimento Viaggi","Drink","Farmacia","Finanziamenti","Gas","Giardino","Guadagni",
  "Hotel","iCloud","Lavori","Lenti a contatto","Luce","Luce e Gas","Mare","Medici","Multe","Noleggio",
  "Parcheggio","Pranzi/Cene","Pranzi/Cene Viaggi","Prodotti Casa","Proventi Finanziari","Pulizie","Reddito","Regali",
  "Regalo","Rifiuti","Rimborso","Riscaldamento","Salute","Scommesse","Scooter","Sky e Netflix","Spese Personali",
  "Spotify","Sport","Stipendio","Straordinari","Supermercato","Tabacchi","Tasse","Tecnologia","Telepass","Trasporti",
  "Trasporti pubblici","Trasporti Viaggi","Viaggi","Vodafone",
]);

const categoryVisual = (category: Pick<MoneyCategory, "name" | "icon" | "color">) =>
  canonicalCategoryNames.has(category.name)
    ? { icon: categoryIcon(category.name), color: categoryColor(category.name) }
    : { icon: category.icon || "circle", color: category.color || "#678098" };

const categoryVisualByName = (value:string,categories:MoneyCategory[]) => {
  const leaf=value.split("›").at(-1)?.trim()||value;
  const category=categories.find(item=>item.name===leaf);
  return category ? categoryVisual(category) : {icon:categoryIcon(leaf),color:categoryColor(leaf)};
};

const mealVoucherLeaf = (value: string) => value.split("›").at(-1)?.trim().toLocaleLowerCase("it") === "buoni pasto";

function Logo() {
  return (
    <div className="brand">
      <img className="brand-mark" src={assetPath("/money-elite-icon.png")} alt="Money Elite" />
      <div><strong>Money Elite</strong><small>Il tuo denaro, con stile.</small></div>
    </div>
  );
}

function Sidebar({ active, setActive, email, signOut }: { active: Section; setActive: (s: Section) => void; email: string; signOut: () => void }) {
  return (
    <aside className="sidebar">
      <Logo />
      <nav>
        <p className="nav-title">PANORAMICA</p>
        {nav.slice(0, 3).map((item) => (
          <button key={item.label} className={`${active === item.label ? "active" : ""} nav-${item.icon}`} onClick={() => setActive(item.label)}>
            <span><AppIcon name={item.icon}/></span>{item.label}
          </button>
        ))}
        <p className="nav-title menu-group">TRANSAZIONI PIANIFICATE</p>
        {nav.slice(3, 5).map((item) => (
          <button key={item.label} className={`nested ${active === item.label ? "active" : ""} nav-${item.icon}`} onClick={() => setActive(item.label)}>
            <span><AppIcon name={item.icon}/></span>{item.label === "Pianificate" ? "Transazioni pianificate" : item.label}
          </button>
        ))}
        <p className="nav-title">GESTIONE</p>
        {nav.slice(5, 8).map((item) => (
          <button key={item.label} className={`${active === item.label ? "active" : ""} nav-${item.icon}`} onClick={() => setActive(item.label)}>
            <span><AppIcon name={item.icon}/></span>{item.label}
          </button>
        ))}
        <p className="nav-title">ANALISI</p>
        {nav.slice(8).map((item) => (
          <button key={item.label} className={`${active === item.label ? "active" : ""} nav-${item.icon}`} onClick={() => setActive(item.label)}>
            <span><AppIcon name={item.icon}/></span>{item.label}
          </button>
        ))}
      </nav>
      <div className="profile"><div className="avatar">MD</div><div><b>Marco</b><small title={email}>Profilo personale</small></div><button onClick={signOut} aria-label="Esci dall’account" title="Esci"><AppIcon name="logout" size={17}/></button></div>
    </aside>
  );
}

function LoginScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { data, error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setError("Email o password non corretti.");
      setBusy(false);
      return;
    }

    onSignedIn(data.user);
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <img src={assetPath("/money-elite-icon.png")} alt="" />
          <div><h1>Money Elite</h1><p>Il tuo denaro, con stile.</p></div>
        </div>
        <div className="login-heading">
          <span>AREA PERSONALE</span>
          <h2>Bentornato, Marco</h2>
          <p>Accedi per consultare i tuoi conti e le tue transazioni.</p>
        </div>
        <form onSubmit={submit}>
          <label>Email
            <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required />
          </label>
          <label>Password
            <span className="password-field">
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Nascondi password" : "Mostra password"}>
                <AppIcon name={showPassword ? "eyeOff" : "eye"} size={18}/>
              </button>
            </span>
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" disabled={busy}>{busy ? "Accesso in corso…" : "Accedi"}</button>
        </form>
        <p className="login-security"><AppIcon name="check" size={14}/> Accesso protetto e dati personali separati tramite Supabase.</p>
      </section>
    </main>
  );
}

function Header({ active }: { active: Section }) {
  const title = active === "Pianificate" ? "Transazioni pianificate" : active === "Debiti" ? "Debiti e crediti" : active;
  const todayLabel = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <header>
      <div><p>{todayLabel}</p><h1>{title}</h1></div>
    </header>
  );
}

function Sparkline({ mode = "wealth", weekData = [], wealthData = [] }: { mode?: "wealth" | "week" | "month"; weekData?: { date: string; value: number }[]; wealthData?: { label: string; value: number }[] }) {
  if (mode === "week") {
    const maximum=Math.max(1,...weekData.map(day=>day.value));
    return <div className="weekly-bars" aria-label="Spese degli ultimi sette giorni">
      {weekData.map(({date,value})=><div className="week-bar" key={date}><b>{money(value)}</b><i style={{height:`${value>0?Math.max(5,value/maximum*100):0}%`}}/><span>{date.slice(8,10)}/{date.slice(5,7)}</span></div>)}
    </div>;
  }
  if (mode === "wealth") {
    const values=wealthData.map(point=>point.value);
    const minimum=Math.min(...values,0);
    const maximum=Math.max(...values,1);
    const range=Math.max(maximum-minimum,1);
    const points=wealthData.map((point,index)=>`${wealthData.length>1?index/(wealthData.length-1)*100:50},${36-(point.value-minimum)/range*30}`).join(" ");
    return <div className="sparkline wealth wealth-history" aria-label="Andamento del patrimonio negli ultimi dodici mesi">
      <div className="chart-grid"><span/><span/><span/><span/></div>
      <svg viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="wealth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4292b8" stopOpacity=".42"/><stop offset="100%" stopColor="#4292b8" stopOpacity=".05"/></linearGradient></defs>
        <polygon points={`0,42 ${points} 100,42`} fill="url(#wealth-fill)"/>
        <polyline points={points} fill="none" stroke="#237ca8" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="chart-months">{wealthData.map((point,index)=><span key={`${point.label}-${index}`}>{point.label}</span>)}</div>
    </div>;
  }
  const months = ["1","5","10","15","20","25","29"];
  return (
    <div className={`sparkline ${mode}`} aria-label="Grafico finanziario">
      <div className="chart-grid"><span /><span /><span /><span /></div>
      <div className="area" />
      <div className="line" />
      <div className="dot" />
      <div className="chart-months">{months.map(x=><span key={x}>{x}</span>)}</div>
    </div>
  );
}

function Dashboard({ transactions, accounts, cards, budgets, categories, recurrences, primaryCurrency, dashboardAccountIds, setActive, confirmTransaction, openTransaction }: { transactions: Transaction[]; accounts: MoneyAccount[]; cards: MoneyCard[]; budgets: MoneyBudget[]; categories: MoneyCategory[]; recurrences: MoneyRecurrence[]; primaryCurrency:string; dashboardAccountIds: string[]; setActive: (s: Section) => void; confirmTransaction: (t: Transaction) => void | Promise<void>; openTransaction: (t: Transaction) => void }) {
  const [chart, setChart] = useState<"week" | "wealth">("week");
  const today = toIsoDate(new Date());
  const currentMonth = today.slice(0,7);
  const effectiveTransactions = transactions.filter(isEffectiveTransaction);
  const primaryMoney=(value:number)=>accountMoney(value,primaryCurrency);
  const inPrimary=(transaction:Transaction)=>Math.abs(transaction.amount)/Math.max(accounts.find(account=>account.id===transaction.accountId||account.name===transaction.account)?.exchangeRate||1,.00000001);
  const monthTransactions = effectiveTransactions.filter(transaction=>transaction.dateISO?.startsWith(currentMonth));
  const income = monthTransactions.filter(transaction=>transaction.kind==="income").reduce((sum,transaction)=>sum+inPrimary(transaction),0);
  const expenses = Math.max(0,monthTransactions.filter(transaction=>transaction.kind==="expense").reduce((sum,transaction)=>sum+inPrimary(transaction),0)-monthTransactions.filter(transaction=>transaction.kind==="refund"||transaction.isRefund).reduce((sum,transaction)=>sum+inPrimary(transaction),0));
  const balance = income-expenses;
  const visibleAccounts = accounts.filter(account=>!account.archived&&!account.hidden&&!account.isContainer);
  const dashboardAccounts = dashboardAccountIds
    .map(id=>visibleAccounts.find(account=>account.id===id))
    .filter((account): account is MoneyAccount=>Boolean(account));
  const savings = visibleAccounts.filter(account=>account.type==="savings").reduce((sum,account)=>sum+account.balance/Math.max(account.exchangeRate||1,.00000001),0);
  const liquidity = visibleAccounts.filter(account=>account.type!=="savings").reduce((sum,account)=>sum+account.balance/Math.max(account.exchangeRate||1,.00000001),0);
  const wealth = liquidity+savings;
  const foreignHoldings=Array.from(visibleAccounts.filter(account=>account.currency!==primaryCurrency&&account.balance>0).reduce((map,account)=>map.set(account.currency,(map.get(account.currency)||0)+account.balance),new Map<string,number>()).entries());
  const cardDebt = cards.filter(card=>!card.archived).reduce((sum,card)=>sum+Math.max(0,effectiveTransactions.filter(t=>t.cardId===card.id).reduce((subtotal,t)=>subtotal+(t.kind==="card_repayment"?-Math.abs(t.amount):t.amount<0?Math.abs(t.amount):0),0)),0);
  const dashboardBudgets = budgets.filter(item=>item.month.startsWith(currentMonth)).map(item=>{const category=categories.find(c=>c.id===item.categoryId);const spent=effectiveTransactions.filter(t=>t.categoryId===item.categoryId&&t.amount<0&&t.dateISO?.startsWith(currentMonth)).reduce((sum,t)=>sum+Math.abs(t.amount),0);return {name:category?.name||"Categoria",spent,limit:item.amount,color:category?.color||"#7c65b5"};});
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate()-6);
  const netPrimary=(rows:Transaction[])=>Math.max(0,rows.filter(t=>t.kind==="expense").reduce((sum,t)=>sum+inPrimary(t),0)-rows.filter(t=>t.kind==="refund"||t.isRefund).reduce((sum,t)=>sum+inPrimary(t),0));
  const weekData=Array.from({length:7},(_,index)=>{const date=new Date(sevenDaysAgo);date.setDate(sevenDaysAgo.getDate()+index);const iso=toIsoDate(date);return {date:iso,value:netPrimary(effectiveTransactions.filter(transaction=>transaction.dateISO===iso))};});
  const weekExpenses = netPrimary(effectiveTransactions.filter(transaction=>transaction.dateISO&&transaction.dateISO>=toIsoDate(sevenDaysAgo)&&transaction.dateISO<=today));
  const transactionWealthEffect=(transaction:Transaction)=>{
    const source=accounts.find(account=>account.id===transaction.accountId||account.name===transaction.account);
    const sourceValue=Math.abs(transaction.amount)/Math.max(source?.exchangeRate||1,.00000001);
    if(transaction.kind==="transfer"){
      const destination=accounts.find(account=>account.id===transaction.destinationAccountId||account.name===transaction.destinationAccountName);
      const destinationValue=Math.abs(transaction.destinationAmount??transaction.amount)/Math.max(destination?.exchangeRate||1,.00000001);
      return destinationValue-sourceValue;
    }
    return transaction.kind==="expense"||transaction.kind==="card_repayment"?-sourceValue:sourceValue;
  };
  const wealthData=Array.from({length:12},(_,index)=>{
    const month=new Date(); month.setDate(1); month.setMonth(month.getMonth()-11+index);
    const cutoff=index===11?today:toIsoDate(new Date(month.getFullYear(),month.getMonth()+1,0,12));
    const laterEffect=effectiveTransactions.filter(transaction=>transaction.dateISO&&transaction.dateISO>cutoff&&transaction.dateISO<=today).reduce((sum,transaction)=>sum+transactionWealthEffect(transaction),0);
    return {label:new Intl.DateTimeFormat("it-IT",{month:"short"}).format(month).replace(".",""),value:wealth-laterEffect};
  });
  const recurrenceDuePending = recurrences
    .filter(item=>item.active&&item.nextDate<=today)
    .map(recurrence=>{
      const existing = transactions.find(item=>item.recurrenceId===recurrence.id&&!item.confirmedAt&&(item.dueDate||item.dateISO)===recurrence.nextDate);
      if (existing) return existing;
      const account = accounts.find(item=>item.id===recurrence.accountId);
      const card = cards.find(item=>item.id===recurrence.cardId);
      const destination = accounts.find(item=>item.id===recurrence.destinationAccountId);
      const category = categories.find(item=>item.id===recurrence.categoryId);
      const amount = recurrence.kind==="expense" ? -Math.abs(recurrence.amount) : Math.abs(recurrence.amount);
      return {
        id:`recurrence:${recurrence.id}:${recurrence.nextDate}`,
        label:recurrence.kind==="transfer"?"Giroconto":category?.name||recurrence.notes||"Pianificata",
        category:category?.name||"Senza categoria",
        account:card?.name||account?.name||"Conto archiviato",
        notes:recurrence.notes,
        destinationAccountName:destination?.name||null,
        accountId:recurrence.accountId||undefined,
        cardId:recurrence.cardId,
        destinationAccountId:recurrence.destinationAccountId,
        categoryId:recurrence.categoryId,
        recurrenceId:recurrence.id,
        date:formatItalianDate(recurrence.nextDate),
        dateISO:recurrence.nextDate,
        dueDate:recurrence.nextDate,
        confirmedAt:null,
        amount,
        icon:category?.icon||recurrence.kind,
        color:recurrence.kind==="income"?"green":recurrence.kind==="transfer"?"blue":"orange",
        kind:recurrence.kind,
        planned:true,
        automaticAccounting:recurrence.automaticAccounting,
        recurrencePlaceholder:true,
      } satisfies Transaction;
    });
  const activeRecurrenceIds = new Set(recurrences.filter(item=>item.active).map(item=>item.id));
  const pendingKeys = new Set(recurrenceDuePending.map(item=>`${item.recurrenceId}:${item.dueDate||item.dateISO}`));
  const additionalPending = transactions.filter(item=>item.recurrenceId&&activeRecurrenceIds.has(item.recurrenceId)&&!item.confirmedAt&&Boolean(item.dueDate||item.dateISO)&&(item.dueDate||item.dateISO||"")<=today&&!pendingKeys.has(`${item.recurrenceId}:${item.dueDate||item.dateISO}`));
  const duePending = [...recurrenceDuePending,...additionalPending]
    .sort((a,b)=>(a.dueDate||a.dateISO||"").localeCompare(b.dueDate||b.dateISO||""));
  const futurePlanned = recurrences
    .filter(item=>item.active&&item.nextDate>today)
    .sort((a,b)=>a.nextDate.localeCompare(b.nextDate))
    .slice(0,5);
  const recent = transactions.filter(item=>!item.dueDate||item.confirmedAt).slice(0,5);
  const currentMonthLabel = new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date());
  return (
    <>
      {duePending.length > 0 && <section className="pending-confirmations panel">
        <div className="pending-heading"><div><span className="pending-badge">●</span><div><h3>Da confermare</h3><p>{duePending.length} {duePending.length === 1 ? "transazione pianificata richiede" : "transazioni pianificate richiedono"} la tua conferma</p></div></div><button onClick={()=>setActive("Pianificate")}>Vedi pianificate →</button></div>
        <div className="pending-items">
          {duePending.map(item=><div className="pending-item" key={item.id}><div className="pending-date"><b>{item.date.split(" ")[0]}</b><span>{item.date.split(" ")[1]}</span></div><div><b>{item.label}</b><span>{item.account}{item.notes?.trim()?` • ${item.notes.trim()}`:""}</span></div><strong>{money(item.amount)}</strong><button onClick={()=>void confirmTransaction(item)}>Conferma</button></div>)}
        </div>
      </section>}

      <section className="dashboard-overview-grid">
        <button className="dashboard-month-balance panel" onClick={()=>setActive("Bilancio")}>
          <div className="panel-title"><div><h3>Bilancio del mese</h3><p>{currentMonthLabel}</p></div><AppIcon name="forward" size={18}/></div>
          <div className="dashboard-balance-content">
            <div className="dashboard-balance-donut" style={{background:`conic-gradient(#559476 0 ${income+expenses>0?Math.round((income/(income+expenses))*100):50}%,#c9716c ${income+expenses>0?Math.round((income/(income+expenses))*100):50}% 100%)`}}>
              <div><strong>{primaryMoney(balance)}</strong><span>SALDO</span></div>
            </div>
            <div className="dashboard-balance-lines">
              <div><span><i className="income-dot"/>Entrate</span><strong className="positive">{primaryMoney(income)}</strong></div>
              <div><span><i className="expense-dot"/>Uscite</span><strong>{primaryMoney(-expenses)}</strong></div>
              <div className="total"><span>Saldo del mese</span><strong className={balance>=0?"positive":""}>{primaryMoney(balance)}</strong></div>
            </div>
          </div>
        </button>

        <article className="balance-card dark dashboard-wealth-card dashboard-wealth-overview">
          <div className="wealth-main-grid">
            <button className="wealth-total-link" onClick={()=>setActive("Conti")}>
              <div className="card-heading"><span>Patrimonio totale</span><AppIcon name="forward" size={18}/></div>
              <div className="wealth-total-line"><h2>{primaryMoney(wealth)}</h2>{foreignHoldings.length>0&&<div className="foreign-holdings">{foreignHoldings.map(([currency,value])=><span key={currency}>di cui {accountMoney(value,currency)}</span>)}</div>}</div>
            </button>
            <div className="wealth-account-balances">
              <div className="wealth-account-heading"><strong>Saldi conti</strong><button onClick={()=>setActive("Impostazioni")}>Preferenze</button></div>
              <div className="wealth-account-list">
                {dashboardAccounts.map(account=><button key={account.id} onClick={()=>setActive("Conti")}><span>{account.name}</span><b>{accountMoney(account.balance,account.currency)}</b></button>)}
                {!dashboardAccounts.length&&<p>Scegli i conti da mostrare nelle Impostazioni.</p>}
              </div>
            </div>
          </div>
          <div className="balance-breakdown">
            <div><small>LIQUIDITÀ</small><b>{primaryMoney(liquidity)}</b></div>
            <div><small>CARTA DI CREDITO</small><b className="card-debt">{primaryMoney(-cardDebt)}</b></div>
            <div><small>RISPARMI</small><b>{primaryMoney(savings)}</b></div>
          </div>
        </article>
      </section>

      <section className="panel insight-panel dashboard-spending-chart">
        <div className="panel-title dashboard-chart-title"><div><h3>Andamento finanziario</h3><p>Spese recenti e patrimonio complessivo</p></div></div>
        <div className="chart-tabs spending-tabs">
          <button className={chart==="week"?"active":""} onClick={()=>setChart("week")}><span>Ultimi 7 giorni</span><b>{primaryMoney(weekExpenses)}</b></button>
          <button className={chart==="wealth"?"active":""} onClick={()=>setChart("wealth")}><span>Andamento patrimonio</span><b>{primaryMoney(wealth)}</b></button>
        </div>
        <div className="insight-chart"><div><small>{chart==="week"?"SPESA SETTIMANALE":"ULTIMI 12 MESI"}</small><h3>{chart==="week"?`Media ${primaryMoney(weekExpenses/7)} al giorno`:primaryMoney(wealth)}</h3></div><Sparkline mode={chart} weekData={weekData} wealthData={wealthData}/></div>
      </section>

      <section className="dashboard-stack">
        <article className="panel budget-panel dashboard-budget">
          <div className="panel-title"><div><h3>Budget mensili</h3><p>{currentMonthLabel}</p></div><button className="text-button" onClick={() => setActive("Budget")}>Gestisci →</button></div>
          <div className="dashboard-budget-grid">{dashboardBudgets.map((b) => (
            <div className="budget-row" key={b.name}>
              <div><b>{b.name}</b><span>{money(b.spent)} di {money(b.limit)}</span></div>
              <div className="progress"><i style={{ width: `${Math.min(100,(b.spent / b.limit) * 100)}%`, background: b.color }} /></div>
              <small>{Math.round((b.spent / b.limit) * 100)}%</small>
            </div>
          ))}{!dashboardBudgets.length&&<div className="empty">Nessun budget creato per questo mese.</div>}</div>
          {dashboardBudgets.length>0&&<div className="budget-footer"><span>Budget disponibile</span><strong>{money(dashboardBudgets.reduce((sum,item)=>sum+item.limit-item.spent,0))}</strong></div>}
        </article>

        <article className="panel transactions dashboard-list">
          <div className="panel-title"><div><h3>Transazioni recenti</h3><p>Gli ultimi movimenti registrati</p></div><button className="text-button" onClick={() => setActive("Transazioni")}>Vedi tutte →</button></div>
          <div className="transaction-list">
            {recent.map((t) => <TransactionRow key={t.id} t={t} onOpen={openTransaction} />)}
          </div>
        </article>

        <article className="panel planned-panel">
          <div className="panel-title"><div><h3>Transazioni pianificate</h3><p>I prossimi movimenti previsti</p></div><button className="text-button" onClick={() => setActive("Pianificate")}>Gestisci →</button></div>
          <div className="planned-grid">
            {futurePlanned.map(item=>{
              const category=categories.find(category=>category.id===item.categoryId);
              const account=cards.find(card=>card.id===item.cardId)?.name||accounts.find(account=>account.id===item.accountId)?.name||"Conto";
              const signedAmount=item.kind==="expense"?-Math.abs(item.amount):Math.abs(item.amount);
              const date=formatItalianDate(item.nextDate).split(" ");
              return <button className="planned-item" key={item.id} onClick={()=>setActive("Pianificate")}><div className="planned-date"><b>{date[0]}</b><span>{date[1]}</span></div><div><b>{category?.name||item.notes||"Pianificata"}</b><span>{account}{item.notes?.trim()?` • ${item.notes.trim()}`:""}</span></div><strong className={signedAmount>0?"positive":""}>{money(signedAmount)}</strong></button>;
            })}
            {!futurePlanned.length&&<div className="empty">Nessuna transazione pianificata in arrivo.</div>}
          </div>
        </article>
      </section>
    </>
  );
}

type ActionKind = "expense" | "income" | "transfer";

function QuickActions({ openAction, allowTransfer = true, plannedLabels = false }: { openAction: (kind: ActionKind) => void; allowTransfer?: boolean; plannedLabels?: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className={open ? "quick-actions open" : "quick-actions"}>
    <div className="quick-menu">
      <button onClick={()=>{setOpen(false);openAction("expense")}}><span className="quick-icon expense"><AppIcon name="expense"/></span><b>{plannedLabels?"Uscita pianificata":"Uscita"}</b></button>
      <button onClick={()=>{setOpen(false);openAction("income")}}><span className="quick-icon income"><AppIcon name="income"/></span><b>{plannedLabels?"Entrata pianificata":"Entrata"}</b></button>
      {allowTransfer && <button onClick={()=>{setOpen(false);openAction("transfer")}}><span className="quick-icon transfer"><AppIcon name="transfer"/></span><b>{plannedLabels?"Trasferimento pianificato":"Trasferisci fondi"}</b></button>}
    </div>
    <button className="quick-main" onClick={()=>setOpen(x=>!x)} aria-label="Apri azioni rapide"><AppIcon name={open?"close":"plus"} size={23}/></button>
  </div>
}

function TransactionRow({ t, onOpen }: { t: Transaction; onOpen?: (t: Transaction) => void }) {
  const categoryTitle = t.category.replace(/^Rimborso\s*[·:-]?\s*/i, "").split("›").at(-1)?.trim() || "Senza categoria";
  const title = t.kind === "transfer" ? "Giroconto" : `${categoryTitle}${t.isRefund ? " (Rimborso)" : ""}`;
  const subtitle = t.kind === "transfer"
    ? `Trasferimento tra conti: ${t.account} → ${t.destinationAccountName || "Conto destinazione"}`
    : `${t.account}${t.notes?.trim() ? ` • ${t.notes.trim()}` : ""}`;
  return (
    <button type="button" className={`transaction-row ${onOpen?"clickable":""}`} onClick={()=>onOpen?.(t)}>
      <div className={`transaction-icon ${t.color}`} style={{color:t.categoryColor||undefined,background:t.categoryColor?`${t.categoryColor}18`:undefined}}><AppIcon name={t.icon}/>{t.accounted === false && <i className="unaccounted" title="Da contabilizzare">?</i>}</div>
      <div className="transaction-info"><b>{title}</b><span>{subtitle}</span></div>
      <div className="transaction-amount"><b className={t.amount > 0 ? "positive" : ""}>{t.amount > 0 ? "+" : ""}{accountMoney(t.amount,t.currency)}</b>{t.kind==="transfer"&&t.destinationAmount&&<small>→ {accountMoney(t.destinationAmount,t.destinationCurrency)}</small>}<span>{t.date}</span></div>
      <i className={`transaction-direction-line ${t.kind==="transfer"?"transfer":t.amount>=0?"income":"expense"}`} aria-hidden="true"/>
    </button>
  );
}

const sectionData: Record<Exclude<Section, "Dashboard" | "Transazioni">, { title: string; intro: string; action: string }> = {
  Bilancio: { title: "Bilancio", intro: "Entrate, uscite e risultato mese per mese.", action: "Esporta bilancio" },
  Pianificate: { title: "Transazioni pianificate", intro: "Tutti i movimenti previsti in ordine di scadenza.", action: "Nuova pianificata" },
  Abbonamenti: { title: "Abbonamenti", intro: "Costi ricorrenti, prossime scadenze e media mensile.", action: "Nuovo abbonamento" },
  Conti: { title: "I tuoi conti", intro: "Saldi e disponibilità aggiornati in un unico posto.", action: "Aggiungi conto" },
  "Carte di credito": { title: "Carte di credito", intro: "Controlla plafond, addebiti e date di chiusura.", action: "Aggiungi carta" },
  Budget: { title: "Budget", intro: "Definisci i limiti mensili e controlla quanto resta.", action: "Crea budget" },
  Debiti: { title: "Debiti e crediti", intro: "Una sezione opzionale per ricordare chi deve dare cosa.", action: "Nuovo debito" },
  Report: { title: "Report e analisi", intro: "Leggi le tue abitudini e confronta i periodi.", action: "Esporta report" },
  Informazioni: { title: "Informazioni", intro: "Versione, tecnologia e indicazioni utili sull'app.", action: "" },
  Impostazioni: { title: "Impostazioni", intro: "Personalizza Money Elite e gestisci i tuoi dati.", action: "Salva modifiche" },
};

function GenericSection({ section, onAdd, accounts, cards, budgets, recurrences, categories, transactions, primaryCurrency, onChangePrimaryCurrency, dashboardAccountIds, onChangeDashboardAccounts, onSaveAccount, onToggleAccount, onArchiveAccount, onDeleteAccount, onMoveAccount, openTransaction, editRecurrence, duplicateRecurrence, refresh }: { section: Exclude<Section, "Dashboard" | "Transazioni">; onAdd: (kind: ActionKind, defaultAccount?: string, cardId?: string) => void; accounts: MoneyAccount[]; cards: MoneyCard[]; budgets: MoneyBudget[]; recurrences: MoneyRecurrence[]; categories: MoneyCategory[]; transactions: Transaction[]; primaryCurrency:string; onChangePrimaryCurrency:(currency:string)=>Promise<void>; dashboardAccountIds: string[]; onChangeDashboardAccounts: (ids:string[])=>void; onSaveAccount: (draft: AccountDraft, account?: MoneyAccount) => Promise<void>; onToggleAccount: (account: MoneyAccount) => Promise<void>; onArchiveAccount: (account: MoneyAccount) => Promise<void>; onDeleteAccount: (account: MoneyAccount) => Promise<void>; onMoveAccount: (accountId:string,direction:-1|1)=>void; openTransaction: (transaction: Transaction) => void; editRecurrence: (recurrence: MoneyRecurrence) => void; duplicateRecurrence: (recurrence: MoneyRecurrence) => void; refresh: () => Promise<void> }) {
  const legacyCards: Record<string, { name: string; sub: string; value: string; icon: string }[]> = {
    Conti: [
      { name: "Conto principale", sub: "Banca ·•• 4832", value: "€ 8.940,65", icon: "B" },
      { name: "Contanti", sub: "Portafoglio", value: "€ 520,00", icon: "€" },
      { name: "Risparmi", sub: "Fondo personale", value: "€ 3.380,00", icon: "R" },
    ],
    "Carte di credito": [
      { name: "Carta Elite", sub: "Credito ·•• 7391", value: "€ 1.146,30 usati", icon: "E" },
      { name: "Carta quotidiana", sub: "Debito ·•• 2048", value: "Collegata al conto", icon: "Q" },
    ],
    Debiti: [
      { name: "Prestito a Luca", sub: "Scadenza 15 agosto", value: "+€ 120,00", icon: "L" },
      { name: "Cena di gruppo", sub: "Da restituire a Sara", value: "−€ 32,00", icon: "S" },
    ],
  };
  if (section === "Budget") return <BudgetSection budgets={budgets} categories={categories} transactions={transactions} refresh={refresh}/>;
  if (section === "Report") return <ReportSectionInteractive transactions={transactions} accounts={accounts} categories={categories} recurrences={recurrences} primaryCurrency={primaryCurrency}/>;
  if (section === "Informazioni") return <InformationSection />;
  if (section === "Impostazioni") return <SettingsSection accounts={accounts} categories={categories} primaryCurrency={primaryCurrency} onChangePrimaryCurrency={onChangePrimaryCurrency} dashboardAccountIds={dashboardAccountIds} onChangeDashboardAccounts={onChangeDashboardAccounts}/>;
  if (section === "Bilancio") return <BalanceHistorySection onAdd={onAdd} transactions={transactions} accounts={accounts} primaryCurrency={primaryCurrency} openTransaction={openTransaction} />;
  if (section === "Pianificate") return <PlannedSection recurrences={recurrences} accounts={accounts} cards={cards} categories={categories} refresh={refresh} onEdit={editRecurrence} onDuplicate={duplicateRecurrence}/>;
  if (section === "Abbonamenti") return <SubscriptionsSection recurrences={recurrences} categories={categories} refresh={refresh} onEdit={editRecurrence}/>;
  if (section === "Conti") return <AccountsSectionReal onAdd={onAdd} accounts={accounts} transactions={transactions} onSaveAccount={onSaveAccount} onToggleAccount={onToggleAccount} onArchiveAccount={onArchiveAccount} onDeleteAccount={onDeleteAccount} onMoveAccount={onMoveAccount} openTransaction={openTransaction}/>;
  if (section === "Carte di credito") return <CreditCardsSection onAdd={onAdd} cards={cards} accounts={accounts} transactions={transactions} refresh={refresh} openTransaction={openTransaction}/>;
  const info = sectionData[section];
  return (
    <section className="section-page">
      <div className="section-toolbar"><button className="outline">＋ {info.action}</button></div>
      <div className="item-grid">
        {(legacyCards[section] || []).map((item) => (
          <article className="item-card" key={item.name}>
            <div className="item-icon">{item.icon}</div><div className="item-body"><small>{item.sub}</small><h3>{item.name}</h3><strong>{item.value}</strong></div><button>•••</button>
          </article>
        ))}
        <button className="add-card"><span>＋</span>{info.action}</button>
      </div>
    </section>
  );
}

function AccountModal({ account, accounts = [], primaryCurrency = typeof window!=="undefined"?(window.localStorage.getItem(PRIMARY_CURRENCY_KEY)||"EUR"):"EUR", close, save }: { account?: MoneyAccount | "new" | null; accounts?: MoneyAccount[]; primaryCurrency?:string; close: () => void; save: (draft: AccountDraft, account?: MoneyAccount) => Promise<void> }) {
  const currentAccount=account&&account!=="new"?account:undefined;
  const [availableAccounts,setAvailableAccounts]=useState<MoneyAccount[]>(accounts);
  const [name, setName] = useState(currentAccount?.name ?? "");
  const [type, setType] = useState<MoneyAccount["type"]>(currentAccount?.type ?? "bank");
  const [openingBalance, setOpeningBalance] = useState(currentAccount ? amountInput(currentAccount.openingBalance) : "");
  const [voucherUnitValue, setVoucherUnitValue] = useState(amountInput(currentAccount?.voucherUnitValue ?? 8));
  const [notes, setNotes] = useState(currentAccount?.notes ?? "");
  const [icon,setIcon]=useState(currentAccount?.icon ?? "bank");
  const [currency,setCurrency]=useState(currentAccount?.currency ?? primaryCurrency);
  const [exchangeRate,setExchangeRate]=useState(currentAccount?.exchangeRate ? String(currentAccount.exchangeRate).replace(".",",") : "1");
  const [isContainer,setIsContainer]=useState(currentAccount?.isContainer??false);
  const [parentAccountId,setParentAccountId]=useState(currentAccount?.parentAccountId??"");
  const [accountRole,setAccountRole]=useState<MoneyAccount["accountRole"]>(currentAccount?.accountRole??"standard");
  const [annualInterestRate,setAnnualInterestRate]=useState(amountInput(currentAccount?.annualInterestRate));
  const [busy, setBusy] = useState(false);
  const parsedVoucherValue = parseItalianAmount(voucherUnitValue) || 8;
  const standardAccountIcons=["bank","cash","savings","voucher","card","building","finance","home","car","travel","work"];
  const accountIcons=isContainer?["bank-logo-revolut","bank-logo-mediolanum",...standardAccountIcons]:standardAccountIcons;
  useEffect(()=>{
    if(accounts.length){setAvailableAccounts(accounts);return;}
    void getSupabaseBrowserClient().from("accounts").select("*").is("archived_at",null).then(({data})=>setAvailableAccounts((data||[]).map(row=>({id:row.id,name:row.name,type:row.type,openingBalance:Number(row.opening_balance||0),balance:0,voucherUnitValue:null,voucherCount:0,hidden:false,archived:false,icon:row.icon||"bank",color:row.color||"#7051bf",notes:row.notes||"",currency:row.currency||"EUR",exchangeRate:Number(row.exchange_rate||1),sortOrder:Number(row.sort_order||0),isContainer:Boolean(row.is_container),parentAccountId:row.parent_account_id||null,accountRole:row.account_role||"standard",annualInterestRate:Number(row.annual_interest_rate||0),interestLastAccrualDate:row.interest_last_accrual_date||null}))));
  },[accounts]);
  const containers=availableAccounts.filter(item=>item.isContainer&&!item.archived&&item.id!==currentAccount?.id);
  return <div className="modal-backdrop"><form className="modal entity-modal" onSubmit={async event=>{event.preventDefault();setBusy(true);await save({name:name.trim(),type:isContainer?"other":type,openingBalance:isContainer?0:parseItalianAmount(openingBalance),voucherUnitValue:!isContainer&&type==="meal_vouchers"?parsedVoucherValue:null,notes,icon,currency,exchangeRate:currency===primaryCurrency?1:Math.max(.00000001,parseItalianAmount(exchangeRate)),isContainer,parentAccountId:isContainer?null:parentAccountId||null,accountRole:isContainer?"standard":accountRole,annualInterestRate:!isContainer&&accountRole==="deposit"?Math.max(0,parseItalianAmount(annualInterestRate)):0},currentAccount);setBusy(false)}}>
    <div className="modal-title"><div><small>{currentAccount?"MODIFICA CONTO":"NUOVO CONTO"}</small><h2>{currentAccount?currentAccount.name:"Crea nuovo conto"}</h2></div></div>
    <label>Nome<input required value={name} onChange={event=>setName(event.target.value)} placeholder="Es. Conto principale"/></label>
    <label>Struttura<select value={isContainer?"container":"account"} onChange={event=>setIsContainer(event.target.value==="container")} disabled={Boolean(account)}><option value="account">Conto operativo</option><option value="container">Conto contenitore</option></select><small>{isContainer?"Raggruppa più conti senza avere un saldo proprio.":"Può ricevere transazioni e trasferimenti."}</small></label>
    {!isContainer&&<><label>Tipo di conto<select value={type} onChange={event=>setType(event.target.value as MoneyAccount["type"])} disabled={Boolean(account)}><option value="bank">Conto corrente</option><option value="cash">Contanti</option><option value="savings">Conto deposito</option><option value="meal_vouchers">Buoni pasto</option><option value="other">Altro</option></select></label><label>Appartiene a<select value={parentAccountId} onChange={event=>setParentAccountId(event.target.value)}><option value="">Nessun contenitore</option>{containers.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>{parentAccountId&&<label>Ruolo nel contenitore<select value={accountRole} onChange={event=>{const role=event.target.value as MoneyAccount["accountRole"];setAccountRole(role);if(role==="deposit")setType("savings")}}><option value="main">Conto principale</option><option value="pocket">Pocket</option><option value="deposit">Conto deposito</option><option value="standard">Altro</option></select></label>}</>}
    <label>Valuta<select value={currency} onChange={event=>{setCurrency(event.target.value);if(event.target.value===primaryCurrency)setExchangeRate("1")}} disabled={type==="meal_vouchers"}>{ISO_CURRENCIES.map(value=><option key={value}>{value}</option>)}</select></label>
    {!isContainer&&currency!==primaryCurrency&&type!=="meal_vouchers"&&<label>Tasso fisso del conto<span className="exchange-rate-input"><b>1 {primaryCurrency} =</b><input required type="text" inputMode="decimal" value={exchangeRate} onChange={event=>setExchangeRate(event.target.value)}/><b>{currency}</b></span><small>Usato per patrimonio, Dashboard, budget e statistiche.</small></label>}
    <div className="account-icon-field"><span>{isContainer?"Logo del contenitore":"Icona del conto"}</span><div className="account-icon-choices bank-logo-choices">{accountIcons.map(value=><button type="button" className={icon===value?"selected":""} key={value} title={value==="bank-logo-revolut"?"Revolut":value==="bank-logo-mediolanum"?"Mediolanum":"Icona conto"} onClick={()=>setIcon(value)}><AppIcon name={value} size={value.startsWith("bank-logo-")?28:19}/></button>)}</div></div>
    {!isContainer&&(type==="meal_vouchers"?<><label>Valore di ogni buono<div className="amount-input"><span>€</span><input type="text" inputMode="decimal" value={voucherUnitValue} onChange={event=>setVoucherUnitValue(event.target.value)} placeholder="8,00"/></div></label><label>Numero iniziale di buoni<input type="text" inputMode="numeric" value={openingBalance ? String(Math.round(parseItalianAmount(openingBalance)/parsedVoucherValue)) : ""} onChange={event=>setOpeningBalance(String(Math.max(0, Number(event.target.value)||0)*parsedVoucherValue).replace(".",","))} placeholder="0"/></label></>:<label>Importo iniziale<input type="text" inputMode="decimal" value={openingBalance} onChange={event=>setOpeningBalance(event.target.value)} placeholder="0,00"/></label>)}
    {!isContainer&&accountRole==="deposit"&&<label>Interesse annuo lordo (%)<input type="text" inputMode="decimal" value={annualInterestRate} onChange={event=>setAnnualInterestRate(event.target.value)} placeholder="2,00"/><small>L’interesse viene calcolato sul saldo e accreditato ogni giorno.</small></label>}
    <label>Note<input value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Opzionale"/></label>
    <div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer" disabled={busy}>{busy?"Salvataggio…":"Salva"}</button></div>
  </form></div>;
}

function AccountsSectionReal({ onAdd, accounts, transactions, onSaveAccount, onToggleAccount, onArchiveAccount, onDeleteAccount, onMoveAccount, openTransaction }: { onAdd: (kind: ActionKind, defaultAccount?: string) => void; accounts: MoneyAccount[]; transactions: Transaction[]; onSaveAccount: (draft: AccountDraft, account?: MoneyAccount) => Promise<void>; onToggleAccount: (account: MoneyAccount) => Promise<void>; onArchiveAccount: (account: MoneyAccount) => Promise<void>; onDeleteAccount: (account: MoneyAccount) => Promise<void>; onMoveAccount: (accountId:string,direction:-1|1)=>void; openTransaction: (transaction: Transaction) => void }) {
  const [editor, setEditor] = useState<MoneyAccount | "new" | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailMonth, setDetailMonth] = useState(monthKeyFromDate(new Date()));
  const [archivedOpen,setArchivedOpen]=useState(false);
  const [openContainers,setOpenContainers]=useState<Set<string>>(()=>new Set(accounts.filter(account=>account.isContainer).map(account=>account.id)));
  const rawActiveAccounts = accounts.filter(account=>!account.archived);
  const operationalAccounts = rawActiveAccounts.filter(account=>!account.isContainer);
  const activeAccounts = rawActiveAccounts.filter(account=>!account.parentAccountId).flatMap(root=>root.isContainer?[{...root,balance:rawActiveAccounts.filter(child=>child.parentAccountId===root.id&&!child.hidden).reduce((sum,child)=>sum+child.balance/Math.max(child.exchangeRate||1,.00000001),0),currency:"EUR"},...rawActiveAccounts.filter(child=>child.parentAccountId===root.id)]:[root]);
  const archivedAccounts = accounts.filter(account=>account.archived);
  const visibleTotal = operationalAccounts.filter(account=>!account.hidden).reduce((sum,account)=>sum+account.balance/Math.max(account.exchangeRate||1,.00000001),0);
  const detail = accounts.find(account=>account.id===detailId);
  if(detail) {
    const accountTransactions = transactions.filter(transaction=>isEffectiveTransaction(transaction) && (transaction.accountId===detail.id || transaction.destinationAccountId===detail.id));
    const rows = accountTransactions
      .filter(transaction=>dateInMonth(transaction.dateISO, detailMonth))
      .map(transaction=>transaction.kind==="transfer" ? {...transaction, currency:detail.currency, amount: transaction.destinationAccountId===detail.id ? Math.abs(transaction.destinationAmount??transaction.amount) : -Math.abs(transaction.amount)} : transaction);
    return <section className="section-page">
      <div className="inner-page-header compact-account-header"><button aria-label="Torna ai conti" onClick={()=>setDetailId(null)}><AppIcon name="back"/></button><div><small>CONTO</small><h2>{detail.name}</h2></div></div>
      <div className="period-nav icon-period-nav"><button aria-label="Mese precedente" title="Mese precedente" onClick={()=>setDetailMonth(month=>shiftMonthKey(month,-1))}><AppIcon name="back" size={18}/></button><strong>{monthLabel(detailMonth)}</strong><button aria-label="Mese successivo" title="Mese successivo" onClick={()=>setDetailMonth(month=>shiftMonthKey(month,1))}><AppIcon name="forward" size={18}/></button></div>
      <div className="account-compact-summary"><span>Saldo ad oggi</span><strong>{accountMoney(detail.balance,detail.currency)}</strong><small>{rows.length} {rows.length===1?"movimento":"movimenti"}{detail.type==="meal_vouchers"?` · ${detail.voucherCount} buoni`:""}</small></div>
      <article className="panel month-transactions">{rows.length?rows.map(transaction=><TransactionRow key={transaction.id} t={transaction} onOpen={openTransaction}/>):<div className="empty">Nessuna transazione in {monthLabel(detailMonth)}.</div>}</article>
      {!detail.archived&&<QuickActions openAction={kind=>onAdd(kind,detail.name)}/>}</section>;
  }
  const roots=rawActiveAccounts.filter(account=>!account.parentAccountId);
  const renderOperationalAccount=(account:MoneyAccount,index:number,child=false)=><article className={`account-row ${child?"account-child-row":""} ${account.type==="meal_vouchers"?"voucher-account":""} ${account.hidden?"hidden-account":""}`} key={account.id} onClick={()=>{setDetailId(account.id);setDetailMonth(monthKeyFromDate(new Date()))}}>
    <div className="item-icon real-icon"><AppIcon name={account.icon}/></div>
    <div><small className="account-role-label">{child?(account.accountRole==="main"?"CONTO PRINCIPALE":account.accountRole==="pocket"?"POCKET":account.accountRole==="deposit"?"CONTO DEPOSITO":"SOTTOCONTO"):"CONTO"}</small><h3>{account.name}</h3><strong>{account.hidden?"Saldo nascosto":accountMoney(account.balance,account.currency)}</strong>{account.accountRole==="deposit"&&<span className="interest-label">{account.annualInterestRate.toLocaleString("it-IT")}% annuo · accredito giornaliero</span>}</div>
    <button className="eye-button modern" onClick={event=>{event.stopPropagation();void onToggleAccount(account)}}><AppIcon name={account.hidden?"eyeOff":"eye"} size={18}/></button>
    <button onClick={event=>{event.stopPropagation();onAdd("transfer",account.name)}}><AppIcon name="transfer" size={18}/></button>
    <button onClick={event=>{event.stopPropagation();setMenu(menu===account.id?null:account.id)}}><AppIcon name="more" size={19}/></button>
    {menu===account.id&&<div className="account-menu" onClick={event=>event.stopPropagation()}><button onClick={()=>onMoveAccount(account.id,-1)}><AppIcon name="up"/> Sposta più in alto</button><button onClick={()=>onMoveAccount(account.id,1)}><AppIcon name="down"/> Sposta più in basso</button><button onClick={()=>onAdd("income",account.name)}><AppIcon name="income"/> Aggiungi entrata</button><button onClick={()=>onAdd("expense",account.name)}><AppIcon name="expense"/> Aggiungi uscita</button><button onClick={()=>{setEditor(account);setMenu(null)}}><AppIcon name="edit"/> Modifica conto</button><button onClick={()=>void onArchiveAccount(account)}><AppIcon name="archive"/> Archivia conto</button><button className="danger" onClick={()=>void onDeleteAccount(account)}><AppIcon name="trash"/> Elimina conto</button></div>}
  </article>;
  return <section className="section-page">
    <div className="accounts-total"><div><small>TOTALE DEI CONTI VISIBILI</small></div><strong>{money(visibleTotal)}</strong></div>
    <div className="accounts-list account-hierarchy">{roots.map((root,index)=>{
      if(!root.isContainer)return renderOperationalAccount(root,index);
      const children=rawActiveAccounts.filter(child=>child.parentAccountId===root.id);
      const aggregate=children.filter(child=>!child.hidden).reduce((sum,child)=>sum+child.balance/Math.max(child.exchangeRate||1,.00000001),0);
      const expanded=openContainers.has(root.id);
      return <section className={`account-master ${expanded?"open":""}`} key={root.id}>
        <article className="account-master-row"><button className="master-toggle" onClick={()=>setOpenContainers(current=>{const next=new Set(current);if(next.has(root.id))next.delete(root.id);else next.add(root.id);return next})}><span className="item-icon real-icon"><AppIcon name={root.icon}/></span><span><small>CONTO CONTENITORE · {children.length} {children.length===1?"SOTTOCONTO":"SOTTOCONTI"}</small><b>{root.name}</b></span><strong>{money(aggregate)}</strong><AppIcon name={expanded?"up":"down"} size={18}/></button><button className="master-more" onClick={()=>setMenu(menu===root.id?null:root.id)}><AppIcon name="more" size={19}/></button>{menu===root.id&&<div className="account-menu master-menu"><button onClick={()=>{setEditor(root);setMenu(null)}}><AppIcon name="edit"/> Modifica contenitore</button><button onClick={()=>void onArchiveAccount(root)}><AppIcon name="archive"/> Archivia contenitore</button><button className="danger" onClick={()=>void onDeleteAccount(root)}><AppIcon name="trash"/> Elimina contenitore</button></div>}</article>
        {expanded&&<div className="account-children">{children.map((child,childIndex)=>renderOperationalAccount(child,childIndex,true))}{!children.length&&<div className="empty">Nessun sottoconto collegato.</div>}</div>}
      </section>;
    })}</div>
    {archivedAccounts.length>0&&<div className={`archived-accounts ${archivedOpen?"open":""}`}><button className="archived-toggle" onClick={()=>setArchivedOpen(value=>!value)}><b>Conti archiviati</b><span>{archivedAccounts.length}</span><AppIcon name={archivedOpen?"up":"down"} size={17}/></button>{archivedOpen&&archivedAccounts.map(account=><button key={account.id} onClick={()=>!account.isContainer&&setDetailId(account.id)}><span><AppIcon name={account.icon}/></span><div><b>{account.name}</b><small>{account.isContainer?"Contenitore":"Sola consultazione"}</small></div><strong>{account.isContainer?"—":accountMoney(account.balance,account.currency)}</strong></button>)}</div>}
    <button className="quick-main quick-standalone" onClick={()=>setEditor("new")}><AppIcon name="plus" size={22}/></button>
    {editor&&<AccountModal accounts={accounts} account={editor==="new"?undefined:editor} close={()=>setEditor(null)} save={async(draft,current)=>{await onSaveAccount(draft,current);setEditor(null)}}/>}
  </section>;
  /* Vecchio rendering mantenuto solo come riferimento durante la migrazione visiva. */
  return <section className="section-page"><div className="accounts-total"><div><small>TOTALE DEI CONTI VISIBILI</small></div><strong>{money(visibleTotal)}</strong></div><div className="accounts-list">{activeAccounts.map((account,index)=><article className={`account-row ${account.type==="meal_vouchers"?"voucher-account":""} ${account.hidden?"hidden-account":""}`} key={account.id} onClick={()=>{setDetailId(account.id);setDetailMonth(monthKeyFromDate(new Date()))}}><div className="item-icon real-icon"><AppIcon name={account.icon}/></div><div><h3>{account.name}</h3><strong>{account.hidden?"Saldo nascosto":accountMoney(account.balance,account.currency)}</strong>{account.type==="meal_vouchers"&&!account.hidden&&<div className="voucher-meter"><i style={{width:"60%"}}/><span>{account.voucherCount} buoni</span></div>}</div><button className="eye-button modern" onClick={event=>{event.stopPropagation();void onToggleAccount(account)}}><AppIcon name={account.hidden?"eyeOff":"eye"} size={18}/></button><button onClick={event=>{event.stopPropagation();onAdd("transfer",account.name)}}><AppIcon name="transfer" size={18}/></button><button onClick={event=>{event.stopPropagation();setMenu(menu===account.id?null:account.id)}}><AppIcon name="more" size={19}/></button>{menu===account.id&&<div className="account-menu" onClick={event=>event.stopPropagation()}><button disabled={index===0} onClick={()=>onMoveAccount(account.id,-1)}><AppIcon name="up"/> Sposta più in alto</button><button disabled={index===activeAccounts.length-1} onClick={()=>onMoveAccount(account.id,1)}><AppIcon name="down"/> Sposta più in basso</button><button onClick={()=>onAdd("income",account.name)}><AppIcon name="income"/> Aggiungi entrata</button><button onClick={()=>onAdd("expense",account.name)}><AppIcon name="expense"/> Aggiungi uscita</button><button onClick={()=>{setEditor(account);setMenu(null)}}><AppIcon name="edit"/> Modifica conto</button><button onClick={()=>void onArchiveAccount(account)}><AppIcon name="archive"/> Archivia conto</button><button className="danger" onClick={()=>void onDeleteAccount(account)}><AppIcon name="trash"/> Elimina conto</button></div>}</article>)}</div>{archivedAccounts.length>0&&<div className={`archived-accounts ${archivedOpen?"open":""}`}><button className="archived-toggle" onClick={()=>setArchivedOpen(value=>!value)}><b>Conti archiviati</b><span>{archivedAccounts.length}</span><AppIcon name={archivedOpen?"up":"down"} size={17}/></button>{archivedOpen&&archivedAccounts.map(account=><button key={account.id} onClick={()=>setDetailId(account.id)}><span><AppIcon name={account.icon}/></span><div><b>{account.name}</b><small>Sola consultazione</small></div><strong>{accountMoney(account.balance,account.currency)}</strong></button>)}</div>}<button className="quick-main quick-standalone" onClick={()=>setEditor("new")}><AppIcon name="plus" size={22}/></button>{editor&&<AccountModal account={editor==="new"?undefined:editor} close={()=>setEditor(null)} save={async(draft,account)=>{await onSaveAccount(draft,account);setEditor(null)}}/>}</section>;
}

function AccountsSection({ onAdd }: { onAdd: (kind: ActionKind, defaultAccount?: string) => void }) {
  const [newAccount, setNewAccount] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [detailAccount, setDetailAccount] = useState<string | null>(null);
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set());
  const [archivedAccounts, setArchivedAccounts] = useState<Set<string>>(new Set());
  const accounts = [
    {name:"Conto principale",sub:"Banca ·•• 4832",balance:8940.65,icon:"bank"},
    {name:"Contanti",sub:"Portafoglio",balance:520,icon:"cash"},
    {name:"Risparmi",sub:"Conto deposito",balance:3380,icon:"savings"},
    {name:"Buoni pasto",sub:"18 buoni disponibili · € 8,00 ciascuno",balance:144,icon:"voucher",voucher:true},
  ];
  const activeAccounts = accounts.filter(a=>!archivedAccounts.has(a.name));
  const archived = accounts.filter(a=>archivedAccounts.has(a.name));
  const visibleTotal = activeAccounts.filter(a=>!hiddenAccounts.has(a.name)).reduce((sum,a)=>sum+a.balance,0);
  const toggleHidden = (name:string) => setHiddenAccounts(current=>{const next=new Set(current);if(next.has(name))next.delete(name);else next.add(name);return next});
  const archive = (name:string) => {setArchivedAccounts(current=>new Set(current).add(name));setMenu(null)};
  if (detailAccount) {
    const account = accounts.find(a=>a.name===detailAccount)!;
    const monthEndDelta = detailAccount==="Conto principale" ? -679.9 : detailAccount==="Carta Elite" ? -29.9 : detailAccount==="Buoni pasto" ? 24 : 0;
    const rows = detailAccount==="Buoni pasto"
      ? [{id:"demo-91",label:"Ricarica buoni pasto",category:"Reddito › Buoni pasto",account:"Buoni pasto",date:"29 Lug 2026",amount:160,icon:"voucher",color:"green"} as Transaction,{id:"demo-92",label:"Pranzi/Cene",category:"Alimenti › Buoni pasto",account:"Buoni pasto",date:"28 Lug 2026",amount:-16,icon:"food",color:"orange"} as Transaction]
      : initialTransactions.filter(t=>t.account===detailAccount);
    return <section className="section-page"><div className="inner-page-header"><button onClick={()=>setDetailAccount(null)}><AppIcon name="back"/></button><div><small>CONTO · LUGLIO 2026</small><h2>{detailAccount}</h2><p>Transazioni del mese corrente</p></div></div><div className="account-detail-summary"><div className="item-icon real-icon"><AppIcon name={account.icon}/></div><div className="account-balance-pair"><div><small>SALDO ALLA DATA DI OGGI</small><strong>{money(account.balance)}</strong></div><div><small>SALDO PREVISTO AL 31 LUGLIO</small><strong>{money(account.balance+monthEndDelta)}</strong></div>{account.voucher&&<span>18 buoni da {money(8)}</span>}</div></div><div className="future-balance-note"><AppIcon name="planned" size={16}/><span>Il saldo previsto comprende anche le transazioni inserite con una data futura entro la fine del mese.</span></div><article className="panel month-transactions">{rows.length?rows.map(t=><TransactionRow key={t.id} t={t}/>):<div className="empty">Nessuna transazione per questo conto nel mese corrente.</div>}</article><QuickActions openAction={kind=>onAdd(kind,detailAccount)}/></section>;
  }
  return <section className="section-page"><p className="section-help">Tocca un conto per vedere le transazioni del mese corrente.</p><div className="accounts-total"><div><small>TOTALE DEI CONTI VISIBILI</small><span>I conti nascosti non sono inclusi</span></div><strong>{money(visibleTotal)}</strong></div><div className="accounts-list">{activeAccounts.map(a=>{const hidden=hiddenAccounts.has(a.name);return <article className={`account-row ${a.voucher?"voucher-account":""} ${hidden?"hidden-account":""}`} key={a.name} onClick={()=>setDetailAccount(a.name)}><div className="item-icon real-icon"><AppIcon name={a.icon}/></div><div><small>{a.sub}</small><h3>{a.name}</h3><strong>{hidden?"Saldo nascosto":money(a.balance)}</strong>{a.voucher&&!hidden&&<div className="voucher-meter"><i style={{width:"60%"}}/><span>18 buoni</span></div>}</div><button className="eye-button modern" title={hidden?"Mostra conto":"Nascondi conto"} onClick={e=>{e.stopPropagation();toggleHidden(a.name)}}><AppIcon name={hidden?"eyeOff":"eye"} size={17}/></button><button title="Trasferisci fondi" onClick={e=>{e.stopPropagation();onAdd("transfer",a.name)}}><AppIcon name="transfer" size={17}/></button><button onClick={e=>{e.stopPropagation();setMenu(menu===a.name?null:a.name)}}><AppIcon name="more" size={18}/></button>{menu===a.name&&<div className="account-menu" onClick={e=>e.stopPropagation()}>{a.voucher&&<button onClick={()=>onAdd("income",a.name)}><AppIcon name="voucher" size={14}/> Ricarica buoni</button>}<button onClick={()=>onAdd("income",a.name)}><AppIcon name="income" size={14}/> Aggiungi entrata</button><button onClick={()=>onAdd("expense",a.name)}><AppIcon name="expense" size={14}/> Aggiungi uscita</button><button><AppIcon name="edit" size={14}/> Modifica conto</button><button onClick={()=>archive(a.name)}><AppIcon name="archive" size={14}/> Archivia conto</button><button className="danger"><AppIcon name="trash" size={14}/> Elimina conto</button></div>}</article>})}</div>{archived.length>0&&<div className="archived-accounts"><div><b>Conti archiviati</b><span>Le transazioni passate restano in bilanci e report.</span></div>{archived.map(a=><button key={a.name} onClick={()=>setDetailAccount(a.name)}><span><AppIcon name={a.icon}/></span><div><b>{a.name}</b><small>Archiviato · sola consultazione</small></div><strong><AppIcon name="forward" size={16}/></strong></button>)}</div>}<button className="quick-main quick-standalone" onClick={()=>setNewAccount(true)}><AppIcon name="plus" size={22}/></button>{newAccount&&<SimpleEntityModal title="Crea nuovo conto" close={()=>setNewAccount(false)} type="account"/>}</section>
}

function CreditCardsSection({ onAdd, cards, accounts, transactions, refresh, openTransaction }: { onAdd: (kind: ActionKind, defaultAccount?: string, cardId?: string) => void; cards: MoneyCard[]; accounts: MoneyAccount[]; transactions: Transaction[]; refresh: () => Promise<void>; openTransaction: (transaction: Transaction) => void }) {
  const [editor, setEditor] = useState<MoneyCard | "new" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cycleMonth, setCycleMonth] = useState(monthKeyFromDate(new Date()));
  const [actions, setActions] = useState(false);
  const [repay, setRepay] = useState(false);
  const visibleCards = cards.filter(card => !card.archived);
  const cycleRowsFor = (card: MoneyCard, monthKey: string) => {
    if(card.periodType==="no_period") return transactions.filter(t=>isEffectiveTransaction(t)&&t.cardId===card.id);
    const {start,end}=cardCycleBounds(monthKey,card.cycleStartDay??1);
    return transactions.filter(t=>isEffectiveTransaction(t)&&t.cardId===card.id && Boolean(t.dateISO) && t.dateISO! >= start && t.dateISO! <= end);
  };
  const debtFromRows = (rows: Transaction[]) => rows.reduce((sum,t)=>sum+(t.kind==="card_repayment"?-Math.abs(t.amount):t.amount<0?Math.abs(t.amount):0),0);
  const currentCycleMonth = monthKeyFromDate(new Date());
  const debtFor = (card: MoneyCard) => debtFromRows(cycleRowsFor(card,currentCycleMonth));
  const detail = cards.find(card=>card.id===detailId);
  if (detail) {
    const rows = cycleRowsFor(detail,cycleMonth);
    const due = Math.max(0,debtFromRows(rows));
    const linked = accounts.find(account=>account.id===detail.linkedAccountId);
    const bounds = detail.periodType==="monthly" ? cardCycleBounds(cycleMonth,detail.cycleStartDay??1) : null;
    return <section className="section-page">
      <div className="inner-page-header"><button onClick={()=>setDetailId(null)}><AppIcon name="back"/></button><div><small>CARTA DI CREDITO</small><h2>{detail.name}</h2><p>{detail.periodType==="monthly"?`Ciclo dal giorno ${detail.cycleStartDay??1} · addebito il ${detail.paymentDay??1}`:"Carta senza periodo"}</p></div><button className="outline edit-card-button" onClick={()=>setEditor(detail)}><AppIcon name="edit" size={15}/> Modifica carta</button></div>
      {bounds&&<div className="period-nav"><button onClick={()=>setCycleMonth(month=>shiftMonthKey(month,-1))}><AppIcon name="back" size={15}/> Ciclo precedente</button><strong>{compactDate(bounds.start)} – {compactDate(bounds.end)}</strong><button onClick={()=>setCycleMonth(month=>shiftMonthKey(month,1))}>Ciclo successivo <AppIcon name="forward" size={15}/></button></div>}
      <div className="card-due-summary"><span>Ammontare dovuto nel ciclo</span><strong>{money(due)}</strong></div>
      <article className="panel month-transactions">{rows.length?rows.map(t=><TransactionRow key={t.id} t={t} onOpen={openTransaction}/>):<div className="empty">Nessun movimento nel ciclo selezionato.</div>}</article>
      <div className={actions?"card-actions open":"card-actions"}><div><button onClick={()=>setRepay(true)}><span><AppIcon name="card"/></span>Ripaga</button><button onClick={()=>onAdd("transfer",linked?.name)}><span><AppIcon name="transfer"/></span>Trasferisci fondi</button><button onClick={()=>onAdd("income",linked?.name,detail.id)}><span><AppIcon name="income"/></span>Entrata</button><button onClick={()=>onAdd("expense",linked?.name,detail.id)}><span><AppIcon name="expense"/></span>Uscita</button></div><button className="quick-main" onClick={()=>setActions(x=>!x)}><AppIcon name={actions?"close":"plus"} size={23}/></button></div>
      {repay&&<CardRepayModal card={detail} due={due} accounts={accounts} close={()=>setRepay(false)} refresh={refresh}/>} {editor&&<CardModal card={editor==="new"?undefined:editor} accounts={accounts} close={()=>setEditor(null)} refresh={refresh}/>}</section>;
  }
  const totalDue = visibleCards.reduce((sum,card)=>sum+Math.max(0,debtFor(card)),0);
  return <section className="section-page"><div className="cards-total"><span>AMMONTARE DOVUTO · CICLO CORRENTE</span><strong>{money(totalDue)}</strong></div>{visibleCards.length?visibleCards.map(card=>{const due=Math.max(0,debtFor(card));const limit=card.creditLimit||0;const percent=limit?Math.min(100,Math.round(due/limit*100)):0;return <button className="credit-card-panel" key={card.id} onClick={()=>{setDetailId(card.id);setCycleMonth(currentCycleMonth)}}><div><small>{card.name.toUpperCase()}</small><h3>{money(due)}</h3><span>Debito ciclo corrente</span></div><div className="credit-period"><span>{card.periodType==="monthly"?`Ciclo dal ${card.cycleStartDay??1}`:"Senza ciclo"}</span><b>{percent}%</b><span>{card.paymentDay?`Pag. ${card.paymentDay}`:""}</span><div className="progress"><i style={{width:`${percent}%`}}/></div><p>{limit?`Limite ${money(limit)} · Residuo ${money(Math.max(0,limit-due))}`:"Nessun limite impostato"}</p></div><i>›</i></button>}):<div className="empty panel">Nessuna carta di credito. Aggiungine una con il pulsante +.</div>}<button className="quick-main quick-standalone" onClick={()=>setEditor("new")}><AppIcon name="plus" size={22}/></button>{editor&&<CardModal card={editor==="new"?undefined:editor} accounts={accounts} close={()=>setEditor(null)} refresh={refresh}/>}</section>;
}

function CardModal({ card, accounts, close, refresh }: { card?: MoneyCard; accounts: MoneyAccount[]; close: () => void; refresh: () => Promise<void> }) {
  const [saving,setSaving]=useState(false);
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setSaving(true);const fd=new FormData(event.currentTarget);const {data:{user}}=await getSupabaseBrowserClient().auth.getUser();if(!user){setSaving(false);return;}const payload={user_id:user.id,name:String(fd.get("name")||"").trim(),linked_account_id:String(fd.get("account")||"")||null,credit_limit:parseItalianAmount(fd.get("limit")),period_type:fd.get("period")==="no_period"?"no_period":"monthly",cycle_start_day:Number(fd.get("cycle"))||1,payment_day:Number(fd.get("payment"))||1,automatic_payment:fd.get("automatic")==="on"};const result=card?await getSupabaseBrowserClient().from("cards").update(payload).eq("id",card.id):await getSupabaseBrowserClient().from("cards").insert(payload);if(result.error){alert(result.error.message);setSaving(false);return;}await refresh();close();};
  return <div className="modal-backdrop"><form className="modal entity-modal" onSubmit={save}><div className="modal-title"><div><small>{card?"MODIFICA CARTA":"NUOVA CARTA"}</small><h2>{card?card.name:"Crea una carta di credito"}</h2></div></div><label>Nome<input name="name" required defaultValue={card?.name??""} placeholder="Es. Carta Elite"/></label><label>Conto associato<select name="account" required defaultValue={card?.linkedAccountId??accounts.find(a=>!a.archived)?.id}>{accounts.filter(a=>!a.archived).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Limite<input name="limit" type="text" inputMode="decimal" defaultValue={amountInput(card?.creditLimit)} placeholder="5.000,00"/></label><label>Tipo di carta<select name="period" defaultValue={card?.periodType??"monthly"}><option value="monthly">Mensile</option><option value="no_period">Senza periodo</option></select></label><div className="form-grid"><label>Giorno inizio ciclo<select name="cycle" defaultValue={card?.cycleStartDay??1}>{Array.from({length:31},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label><label>Giorno addebito<select name="payment" defaultValue={card?.paymentDay??1}>{Array.from({length:31},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label></div><label className="checkbox-line"><input name="automatic" type="checkbox" defaultChecked={card?.automaticPayment??false}/> Addebito automatico</label><div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer" disabled={saving}>{saving?"Salvataggio…":"Salva"}</button></div></form></div>;
}

function CardRepayModal({ card, due, accounts, close, refresh }: { card: MoneyCard; due: number; accounts: MoneyAccount[]; close: () => void; refresh: () => Promise<void> }) {
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const fd=new FormData(event.currentTarget);const accountId=String(fd.get("account"));const {data:{user}}=await getSupabaseBrowserClient().auth.getUser();if(!user)return;const {error}=await getSupabaseBrowserClient().from("transactions").insert({user_id:user.id,kind:"card_repayment",account_id:accountId,card_id:card.id,amount:parseItalianAmount(fd.get("amount")),transaction_date:toIsoDate(new Date()),confirmed_at:new Date().toISOString(),accounted_at:new Date().toISOString(),notes:`Pagamento ${card.name}`});if(error){alert(error.message);return;}await refresh();close();};
  return <div className="modal-backdrop"><form className="modal entity-modal" onSubmit={save}><div className="modal-title"><div><small>PAGAMENTO CARTA</small><h2>Ripaga {card.name}</h2></div></div><div className="repay-due"><span>Ammontare dovuto</span><strong>{money(due)}</strong></div><label>Valore<input name="amount" type="text" inputMode="decimal" defaultValue={amountInput(due)} required/></label><label>Conto di pagamento<select name="account">{accounts.filter(a=>!a.archived).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer">Salva pagamento</button></div></form></div>;
}

function SimpleEntityModal({ title, close, type }: { title: string; close: () => void; type: "account" | "card" }) {
  const [accountType, setAccountType] = useState("Normale");
  const [voucherValue, setVoucherValue] = useState(8);
  const [voucherCount, setVoucherCount] = useState(0);
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal entity-modal" onMouseDown={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();close()}}>
    <div className="modal-title"><div><small>{type==="account"?"NUOVO CONTO":"NUOVA CARTA"}</small><h2>{title}</h2></div><button type="button" onClick={close}>×</button></div>
    <label>Nome<input required placeholder={type==="account"?"Es. Conto principale":"Es. Carta Elite"}/></label>
    {type==="account"?<><label>Tipo di conto<select value={accountType} onChange={e=>setAccountType(e.target.value)}><option>Normale</option><option>Conto deposito</option><option>Buoni pasto</option></select></label>{accountType==="Buoni pasto"?<div className="voucher-fields"><div className="voucher-explainer"><span className="real-icon"><AppIcon name="voucher" size={21}/></span><div><b>Conto Buoni pasto</b><small>Gestisci quantità e controvalore come un normale conto.</small></div></div><label>Valore di ogni buono<div className="amount-input"><span>€</span><input type="number" min=".01" step=".01" value={voucherValue} onChange={e=>setVoucherValue(Number(e.target.value))}/></div></label><label>Numero iniziale di buoni<input type="number" min="0" step="1" value={voucherCount} onChange={e=>setVoucherCount(Number(e.target.value))}/></label><div className="voucher-preview"><span>Saldo iniziale</span><strong>{voucherCount} buoni · {money(voucherValue*voucherCount)}</strong></div></div>:<><label>Valuta<select><option>EUR — €</option><option>USD — $</option></select></label><label>Importo iniziale<input type="number" step=".01" placeholder="0,00"/></label></>}</>:<>
      <label>Conto associato<select><option>Conto principale</option><option>Contanti</option></select></label>
      <label>Limite<input type="number" step=".01" placeholder="5.000,00"/></label>
      <label>Tipo di carta<select><option>Mensile</option><option>Senza periodo</option></select></label>
      <label>Giorno di inizio ciclo<select>{Array.from({length:31},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label>
      <div className="modal-toggle"><div><b>Pagamenti automatici</b><span>Ripaga automaticamente a fine ciclo</span></div><button type="button"><i/></button></div>
    </>}
    <label>Note<input placeholder="Opzionale"/></label><div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer">Salva</button></div>
  </form></div>
}

function RepayModal({ close }: { close: () => void }) {
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal entity-modal" onMouseDown={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();close()}}><div className="modal-title"><div><small>PAGAMENTO CARTA</small><h2>Ripaga Carta Elite</h2></div><button type="button" onClick={close}>×</button></div><div className="repay-due"><span>Ammontare dovuto</span><strong>€ 1.146,30</strong><small>Periodo 21/07/26 — 20/08/26</small></div><label>Valore<input type="number" step=".01" placeholder="0,00"/></label><label>Tasso di interesse<input type="number" step=".01" placeholder="0,00%"/></label><label>Conto di pagamento<select><option>Conto principale</option><option>Contanti</option></select></label><label>Data<button type="button" className="date-wheel-trigger"><span>◫</span><b>29 Luglio 2026</b><i>›</i></button></label><div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer">Salva pagamento</button></div></form></div>
}

function BalanceHistorySection({ onAdd, transactions, accounts, primaryCurrency, openTransaction }: { onAdd: (kind: ActionKind) => void; transactions: Transaction[]; accounts:MoneyAccount[]; primaryCurrency:string; openTransaction: (transaction: Transaction) => void }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [detail, setDetail] = useState<"transactions" | "income" | "expense" | "incomeTransactions" | "expenseTransactions" | null>(null);
  const effective=transactions.filter(isEffectiveTransaction);
  const currentMonth=monthKeyFromDate(new Date());
  const monthKeys=Array.from(new Set([currentMonth,...effective.map(item=>item.dateISO?.slice(0,7)).filter((value):value is string=>Boolean(value))])).sort().reverse();
  const converted=(item:Transaction)=>Math.abs(item.amount)/Math.max(accounts.find(account=>account.id===item.accountId||account.name===item.account)?.exchangeRate||1,.00000001);
  const months=monthKeys.map(key=>{const rows=effective.filter(item=>dateInMonth(item.dateISO,key));const income=rows.filter(item=>item.kind==="income").reduce((sum,item)=>sum+converted(item),0);const expense=Math.max(0,rows.filter(item=>item.kind==="expense").reduce((sum,item)=>sum+converted(item),0)-rows.filter(item=>item.kind==="refund"||item.isRefund).reduce((sum,item)=>sum+converted(item),0));return {key,label:monthLabel(key),income,expense};});
  const selectedRows=selectedMonth?effective.filter(item=>dateInMonth(item.dateISO,selectedMonth)):[];
  if (selectedMonth && detail) {
    const transactionPage = detail === "transactions" || detail === "incomeTransactions" || detail === "expenseTransactions";
    return <section className="section-page balance-page"><div className="inner-page-header"><button onClick={()=>setDetail(null)}>←</button><div><small>BILANCIO</small><h2>{detail==="transactions"?"Transazioni":detail==="incomeTransactions"?"Entrate del mese":detail==="expenseTransactions"?"Uscite del mese":detail==="income"?"Entrate":"Uscite"}</h2><p>{monthLabel(selectedMonth)} · {primaryCurrency}</p></div></div>{transactionPage?<BalanceTransactionPage filter={detail} transactions={selectedRows} openTransaction={openTransaction}/>:<InteractiveCategoryBalance detail={detail} transactions={selectedRows} accounts={accounts} primaryCurrency={primaryCurrency} openTransaction={openTransaction}/>}<QuickActions allowTransfer={false} openAction={onAdd}/></section>;
  }
  return <section className="section-page"><div className="section-toolbar"><button className="outline">↓ Esporta bilancio</button></div>
    <div className="history-list">{months.map(({key,label,income,expense})=>{const total=income-expense;const share=income+expense>0?Math.round(income/(income+expense)*100):50;return <button className="history-row" key={key} onClick={()=>setSelectedMonth(key)}><div className="mini-donut" style={{background:`conic-gradient(#559476 0 ${share}%,#c96360 ${share}% 100%)`}}/><div><h3>{label}</h3><span>Apri dettagli del mese →</span></div><div className="history-values"><span>Entrate <b className="positive">+ {accountMoney(income,primaryCurrency)}</b></span><span>Uscite <b>− {accountMoney(expense,primaryCurrency)}</b></span><strong className={total>=0?"positive":""}>Totale {total>=0?"+ ":"− "}{accountMoney(Math.abs(total),primaryCurrency)}</strong></div></button>})}</div>
    {selectedMonth && <div className="modal-backdrop balance-overlay" onMouseDown={()=>setSelectedMonth(null)}><div className="balance-dialog" onMouseDown={e=>e.stopPropagation()}><div className="balance-dialog-title"><div><small>BILANCIO</small><h2>{monthLabel(selectedMonth)}</h2></div><button onClick={()=>setSelectedMonth(null)}>×</button></div><p>Scegli cosa vuoi consultare</p><div className="balance-options"><button onClick={()=>setDetail("transactions")}><span>☷</span><div><b>Transazioni</b><small>Tutti i movimenti del mese</small></div><i>→</i></button><button onClick={()=>setDetail("income")}><span className="green-ring">◐</span><div><b>Entrate</b><small>Totale e categorie delle entrate</small></div><i>→</i></button><button onClick={()=>setDetail("expense")}><span className="red-ring">◐</span><div><b>Uscite</b><small>Totale netto e categorie delle uscite</small></div><i>→</i></button></div></div></div>}
  </section>
}

function BalanceTransactionPage({ filter, transactions, openTransaction }: { filter: "transactions" | "incomeTransactions" | "expenseTransactions"; transactions: Transaction[]; openTransaction: (transaction: Transaction) => void }) {
  const rows = filter === "incomeTransactions" ? transactions.filter(t=>t.kind==="income") : filter === "expenseTransactions" ? transactions.filter(t=>t.kind==="expense"||t.kind==="refund") : transactions;
  const total = rows.reduce((sum,t)=>sum+t.amount,0);
  return <article className="panel month-transactions"><div className="month-total">Totale <strong className={total>=0?"positive":""}>{total>=0?"+ ":"− "}{money(Math.abs(total))}</strong></div>{rows.map(t=><TransactionRow key={t.id} t={t} onOpen={openTransaction}/>)}{!rows.length&&<div className="empty">Nessun movimento nel mese selezionato.</div>}</article>;
}

function BalanceMonthDetail({ detail, transactions }: { detail: "income" | "expense"; transactions: Transaction[] }) {
  const income = detail === "income";
  const relevant=transactions.filter(item=>income?item.kind==="income":item.kind==="expense"||item.kind==="refund");
  const grouped=new Map<string,number>();
  relevant.forEach(item=>{const name=item.category||"Senza categoria";const value=income?Math.abs(item.amount):item.kind==="refund"?-Math.abs(item.amount):Math.abs(item.amount);grouped.set(name,(grouped.get(name)||0)+value);});
  const rows=Array.from(grouped.entries()).filter(([,value])=>value>0).sort((a,b)=>b[1]-a[1]);
  const total=income?relevant.reduce((sum,item)=>sum+Math.abs(item.amount),0):netExpenses(relevant);
  return <div className="category-detail"><div className={`large-donut ${income?"income":"expense"}`}><div><strong>{money(total)}</strong><span>{income?"Entrate":"Uscite nette"}</span></div></div>{rows.map(([name,value],i)=><div className="legend-row" key={name}><i className={`legend-c${i%4}`}/><b>{name}</b><span>{total>0?`${Math.round(value/total*100)}%`:"0%"}</span><strong>{money(value)}</strong></div>)}{!rows.length&&<div className="empty">Nessun movimento nel mese selezionato.</div>}</div>
}

function InteractiveCategoryBalance({detail,transactions,accounts,primaryCurrency,openTransaction}:{detail:"income"|"expense";transactions:Transaction[];accounts:MoneyAccount[];primaryCurrency:string;openTransaction:(transaction:Transaction)=>void}){
  const [level,setLevel]=useState<"root"|"child">("root");
  const [selectedRoot,setSelectedRoot]=useState<string|null>(null);
  const [selectedSlice,setSelectedSlice]=useState<string|null>(null);
  const [listMode,setListMode]=useState(false);
  const relevant=transactions.filter(item=>detail==="income"?item.kind==="income":item.kind==="expense"||item.kind==="refund");
  const converted=(item:Transaction)=>Math.abs(item.amount)/Math.max(accounts.find(account=>account.id===item.accountId||account.name===item.account)?.exchangeRate||1,.00000001);
  const rootName=(item:Transaction)=>item.category.replace(/^Rimborso\s*[·:-]?\s*/i,"").split("›")[0]?.trim()||"Senza categoria";
  const childName=(item:Transaction)=>item.category.replace(/^Rimborso\s*[·:-]?\s*/i,"").split("›").at(-1)?.trim()||"Senza sottocategoria";
  const value=(item:Transaction)=>detail==="expense"&&(item.kind==="refund"||item.isRefund)?-converted(item):converted(item);
  const scoped=level==="child"&&selectedRoot?relevant.filter(item=>rootName(item)===selectedRoot):relevant;
  const grouped=new Map<string,number>();scoped.forEach(item=>{const name=level==="root"?rootName(item):childName(item);grouped.set(name,(grouped.get(name)||0)+value(item))});
  const palette=["#ef5350","#1da7df","#4caf58","#ff9800","#f4d835","#8e63ce","#3b9b91","#d46f9d"];
  const rows=Array.from(grouped.entries()).filter(([,amount])=>amount>0).sort((a,b)=>b[1]-a[1]).map(([name,amount],index)=>({name,amount,color:palette[index%palette.length]}));
  const total=rows.reduce((sum,row)=>sum+row.amount,0);const circumference=2*Math.PI*42;let running=0;
  const selected=selectedSlice?rows.find(row=>row.name===selectedSlice):null;
  const listed=listMode?scoped.filter(item=>(level==="root"?rootName(item):childName(item))===selectedSlice):[];
  if(listMode)return <div className="balance-drill-list"><div className="balance-drill-heading"><button onClick={()=>setListMode(false)}><AppIcon name="back"/></button><div><small>{level==="root"?"CATEGORIA":"SOTTOCATEGORIA"}</small><h3>{selectedSlice}</h3></div><strong>{accountMoney(selected?.amount||0,primaryCurrency)}</strong></div><article className="panel month-transactions">{listed.map(item=><TransactionRow key={item.id} t={item} onOpen={openTransaction}/>)}{!listed.length&&<div className="empty">Nessuna transazione.</div>}</article></div>;
  return <div className="interactive-category-balance"><div className="balance-drill-heading">{level==="child"&&<button onClick={()=>{setLevel("root");setSelectedSlice(selectedRoot);setSelectedRoot(null)}}><AppIcon name="back"/></button>}<div><small>{detail==="income"?"GUADAGNI":"SPESE"}</small><h3>{level==="root"?"Categorie principali":selectedRoot}</h3></div><strong>{accountMoney(total,primaryCurrency)}</strong></div><div className="interactive-donut-card"><svg viewBox="0 0 100 100" className="interactive-donut" aria-label="Grafico categorie"><circle cx="50" cy="50" r="42" fill="none" stroke="#ecebea" strokeWidth="14"/>{rows.map(row=>{const portion=total?row.amount/total:0;const offset=running;running+=portion;return <circle key={row.name} cx="50" cy="50" r="42" fill="none" stroke={row.color} strokeWidth={selectedSlice===row.name?18:14} strokeDasharray={`${portion*circumference} ${circumference}`} strokeDashoffset={-offset*circumference} transform="rotate(-90 50 50)" onClick={()=>setSelectedSlice(row.name)} className="donut-segment"/>})}</svg><div className="donut-center">{selected?<><b>{selected.name}</b><strong>{accountMoney(selected.amount,primaryCurrency)}</strong></>:<><b>Totale</b><strong>{accountMoney(total,primaryCurrency)}</strong></>}</div>{selected&&<div className="donut-actions">{level==="root"&&<button title="Apri sottocategorie" onClick={()=>{setSelectedRoot(selected.name);setLevel("child");setSelectedSlice(null)}}><AppIcon name="search"/></button>}<button title="Mostra transazioni" onClick={()=>setListMode(true)}><AppIcon name="list"/></button></div>}</div><div className="interactive-legend">{rows.map(row=><button key={row.name} className={selectedSlice===row.name?"selected":""} onClick={()=>setSelectedSlice(row.name)}><i style={{background:row.color}}/><b>{row.name}</b><span>{total?Math.round(row.amount/total*100):0}%</span><strong>{accountMoney(row.amount,primaryCurrency)}</strong></button>)}</div></div>;
}

function PlannedSection({recurrences,accounts,cards,categories,refresh,onEdit,onDuplicate}:{recurrences:MoneyRecurrence[];accounts:MoneyAccount[];cards:MoneyCard[];categories:MoneyCategory[];refresh:()=>Promise<void>;onEdit:(recurrence:MoneyRecurrence)=>void;onDuplicate:(recurrence:MoneyRecurrence)=>void}) {
  const [selected,setSelected]=useState<MoneyRecurrence|null>(null);
  const [working,setWorking]=useState(false);
  const [showPaused,setShowPaused]=useState(false);
  const plannedRecurrences=recurrences;
  const pausedCount=plannedRecurrences.filter(item=>!item.active).length;
  const items=plannedRecurrences.filter(item=>item.active||showPaused).sort((a,b)=>a.nextDate.localeCompare(b.nextDate));
  const currentMonth=monthKeyFromDate(new Date());
  const signed=(item:MoneyRecurrence)=>item.kind==="expense"?-item.amount:item.amount;
  const monthTotal=items.filter(item=>item.active&&item.nextDate.startsWith(currentMonth)).reduce((sum,item)=>sum+signed(item),0);
  const labelFor=(item:MoneyRecurrence)=>{const category=categories.find(c=>c.id===item.categoryId);const parent=category?.parentId?categories.find(c=>c.id===category.parentId):null;if(item.notes)return item.notes;return category?(parent?`${parent.name} › ${category.name}`:category.name):"Pianificata"};
  const accountFor=(item:MoneyRecurrence)=>cards.find(c=>c.id===item.cardId)?.name||accounts.find(a=>a.id===item.accountId)?.name||"Conto";
  const run=async(action:()=>Promise<void>)=>{setWorking(true);try{await action();await refresh();setSelected(null);}catch(error){alert(error instanceof Error?error.message:"Operazione non riuscita.");}finally{setWorking(false);}};
  const repeatNow=(item:MoneyRecurrence)=>run(async()=>{if(!item.accountId)throw new Error("La pianificata non ha un conto valido.");const supabase=getSupabaseBrowserClient();const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sessione non disponibile.");const today=toIsoDate(new Date());const {data:existing,error:lookupError}=await supabase.from("transactions").select("id").eq("recurrence_id",item.id).eq("due_date",today).is("confirmed_at",null).limit(1).maybeSingle();if(lookupError)throw lookupError;if(existing)return;const {error}=await supabase.from("transactions").insert({user_id:user.id,kind:item.kind,account_id:item.accountId,destination_account_id:item.kind==="transfer"?item.destinationAccountId:null,card_id:item.cardId,category_id:item.kind==="transfer"?null:item.categoryId,recurrence_id:item.id,transfer_group_id:item.kind==="transfer"?crypto.randomUUID():null,amount:Math.abs(item.amount),transaction_date:today,due_date:today,confirmed_at:null,accounted_at:null,notes:item.notes?.trim()||null});if(error)throw error;});
  const skip=(item:MoneyRecurrence)=>run(async()=>{const nextDate=nextRecurrenceDate(item);if(!window.confirm(`Saltare la ripetizione del ${formatItalianDate(item.nextDate)}? La nuova scadenza sarà ${formatItalianDate(nextDate)}.`))return;const {error}=await getSupabaseBrowserClient().from("recurrences").update({next_date:nextDate}).eq("id",item.id).eq("next_date",item.nextDate);if(error)throw error;});
  const togglePause=(item:MoneyRecurrence)=>run(async()=>{const {error}=await getSupabaseBrowserClient().from("recurrences").update({active:!item.active}).eq("id",item.id);if(error)throw error;});
  const remove=(item:MoneyRecurrence)=>run(async()=>{if(!window.confirm("Eliminare definitivamente questa transazione pianificata?"))return;const {error}=await getSupabaseBrowserClient().from("recurrences").delete().eq("id",item.id);if(error)throw error;});
  return <section className="section-page">{pausedCount>0&&<div className="paused-recurrences-toggle"><button className={showPaused?"active":""} onClick={()=>setShowPaused(value=>!value)}><AppIcon name={showPaused?"eyeOff":"eye"} size={17}/>{showPaused?"Nascondi in pausa":`Mostra in pausa (${pausedCount})`}</button></div>}<article className="panel schedule-list">{items.length?items.map(item=>{const category=categories.find(c=>c.id===item.categoryId);const amount=signed(item);return <button className={`schedule-row planned-recurrence-row ${item.active?"":"paused"}`} key={item.id} onClick={()=>setSelected(item)}><div className="schedule-icon" style={{color:category?.color||"#7c65b5",background:`${category?.color||"#7c65b5"}18`}}><AppIcon name={item.kind==="transfer"?"transfer":category?.icon||item.kind}/></div><div className="planned-main"><b>{labelFor(item)}</b><span>{accountFor(item)} · {item.active?(item.frequency==="monthly"?"Mensile":item.frequency):"In pausa"}</span></div><div><strong className={amount>0?"positive":""}>{amount>0?"+":""}{money(amount)}</strong><span>{formatItalianDate(item.nextDate)}</span></div><AppIcon name="more" size={18}/><i className={item.kind==="transfer"?"transfer-line":amount>0?"income-line":"expense-line"}/></button>}):<div className="empty">Nessuna transazione pianificata.</div>}</article><div className="schedule-summary"><span>Questo mese <b className={monthTotal>=0?"positive":""}>{money(monthTotal)}</b></span></div>{selected&&<div className="modal-backdrop planned-menu-backdrop" onMouseDown={()=>!working&&setSelected(null)}><div className="planned-action-menu" onMouseDown={event=>event.stopPropagation()}><div><small>TRANSAZIONE PIANIFICATA</small><h3>{labelFor(selected)}</h3><button onClick={()=>setSelected(null)} aria-label="Chiudi"><AppIcon name="close"/></button></div><button disabled={working||!selected.active} onClick={()=>void repeatNow(selected)}><AppIcon name="repeat"/> Ripeti ora</button><button disabled={working||!selected.active} onClick={()=>void skip(selected)}><AppIcon name="planned"/> Salta questa ripetizione</button><button disabled={working} onClick={()=>{setSelected(null);onEdit(selected)}}><AppIcon name="edit"/> Modifica</button><button disabled={working} onClick={()=>{setSelected(null);onDuplicate(selected)}}><AppIcon name="copy"/> Duplica</button><button disabled={working} onClick={()=>void togglePause(selected)}><AppIcon name={selected.active?"pause":"play"}/> {selected.active?"Metti in pausa":"Riattiva"}</button><button className="danger" disabled={working} onClick={()=>void remove(selected)}><AppIcon name="trash"/> Elimina</button></div></div>}</section>
}

function SubscriptionsSection({ recurrences, categories, refresh, onEdit }: { recurrences: MoneyRecurrence[]; categories: MoneyCategory[]; refresh: () => Promise<void>; onEdit: (recurrence: MoneyRecurrence) => void }) {
  const subscriptions=recurrences.filter(item=>item.isSubscription&&item.active);
  const totalMonth=subscriptions.reduce((sum,item)=>sum+item.amount,0);
  const remove=async(id:string)=>{if(!window.confirm("Eliminare questo abbonamento?"))return;const {error}=await getSupabaseBrowserClient().from("recurrences").update({active:false}).eq("id",id);if(error){alert(error.message);return;}await refresh();};
  return <section className="section-page"><div className="subscription-summary"><div><small>PROSSIMI 30 GIORNI</small><strong>{money(totalMonth)}</strong></div><div><small>PROSSIMI 365 GIORNI</small><strong>{money(totalMonth*12)}</strong></div><div><small>MEDIA MENSILE</small><strong>{money(totalMonth)}</strong></div></div><article className="panel subscription-list">{subscriptions.length?subscriptions.map(item=>{const category=categories.find(c=>c.id===item.categoryId);const note=item.notes.toLocaleLowerCase("it");const inferredChild=category&&!category.parentId?categories.filter(child=>child.parentId===category.id).find(child=>child.name.toLocaleLowerCase("it").split(/\s+/).some(word=>word.length>3&&note.includes(word))):null;const visualCategory=inferredChild||category;const visual=visualCategory?categoryVisual(visualCategory):{icon:"subscriptions",color:"#7651C6"};return <div className="subscription-row" key={item.id}><div className="subscription-icon" style={{color:visual.color,background:`${visual.color}18`}}><AppIcon name={visual.icon}/></div><div className="subscription-body subscription-edit-area" role="button" tabIndex={0} onClick={()=>onEdit(item)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" ")onEdit(item)}}><h3>{item.notes||category?.name||"Abbonamento"}</h3><div className="subscription-dates"><span>Prossima data</span><b>{formatItalianDate(item.nextDate)}</b><span>{item.frequency==="monthly"?"Ogni mese":item.frequency}</span></div><div className="progress"><i style={{width:"45%",background:visual.color}}/></div><strong>{money(item.amount)} ogni {item.frequency==="monthly"?"mese":item.frequency}</strong><small>{visualCategory?.name||"Senza categoria"}</small></div><button type="button" onClick={()=>onEdit(item)} aria-label="Modifica abbonamento"><AppIcon name="edit"/></button><button type="button" onClick={()=>void remove(item.id)} aria-label="Elimina abbonamento"><AppIcon name="trash"/></button></div>}):<div className="empty">Nessun abbonamento. Usa il + per aggiungere una spesa pianificata come abbonamento.</div>}</article></section>;
}

function BudgetSection({ budgets, categories, transactions, refresh }: { budgets: MoneyBudget[]; categories: MoneyCategory[]; transactions: Transaction[]; refresh: () => Promise<void> }) {
  const [newBudget,setNewBudget]=useState(false);
  const month=toIsoDate(new Date()).slice(0,7);
  const visible=budgets.filter(item=>item.month.startsWith(month));
  const details=visible.map(item=>{const category=categories.find(c=>c.id===item.categoryId);const spent=transactions.filter(t=>isEffectiveTransaction(t)&&t.categoryId===item.categoryId&&t.amount<0&&t.dateISO?.startsWith(month)).reduce((sum,t)=>sum+Math.abs(t.amount),0);return {item,category,spent};});
  const total=details.reduce((sum,item)=>sum+item.item.amount,0);const spent=details.reduce((sum,item)=>sum+item.spent,0);
  const remove=async(id:string)=>{if(!window.confirm("Eliminare questo budget?"))return;const {error}=await getSupabaseBrowserClient().from("budgets").delete().eq("id",id);if(error){alert(error.message);return;}await refresh();};
  return <section className="section-page"><div className="budget-month-row"><label>Mese<select value={month} disabled><option>{new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date())}</option></select></label><button className="outline" onClick={()=>setNewBudget(true)}>＋ Crea budget</button></div><div className="big-budget"><div><small>BUDGET TOTALI</small><h2>{money(total)}</h2></div><div><small>SPESO</small><h2>{money(spent)}</h2></div><div><small>DISPONIBILE</small><h2 className="positive">{money(total-spent)}</h2></div></div><div className="item-grid">{details.length?details.map(({item,category,spent})=><article className="item-card budget-card" key={item.id}><div className="item-body"><small>BUDGET MENSILE</small><h3>{category?.name||"Categoria"}</h3><div className="progress"><i style={{width:`${Math.min(100,spent/item.amount*100)}%`,background:category?.color||"#7c65b5"}}/></div><strong>{money(spent)} <span>di {money(item.amount)}</span></strong></div><button onClick={()=>void remove(item.id)} aria-label="Elimina budget"><AppIcon name="trash"/></button></article>):<div className="empty panel">Nessun budget per questo mese.</div>}</div>{newBudget&&<BudgetModal categories={categories} month={`${month}-01`} close={()=>setNewBudget(false)} refresh={refresh}/>}</section>;
}

function BudgetModal({ categories, month, close, refresh }: { categories: MoneyCategory[]; month: string; close: () => void; refresh: () => Promise<void> }) {
  const leaves=categories.filter(c=>c.kind==="expense"&&!categories.some(parent=>parent.parentId===c.id));
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const fd=new FormData(event.currentTarget);const {data:{user}}=await getSupabaseBrowserClient().auth.getUser();if(!user)return;const {error}=await getSupabaseBrowserClient().from("budgets").insert({user_id:user.id,category_id:String(fd.get("category")),amount:parseItalianAmount(fd.get("amount")),month});if(error){alert(error.message);return;}await refresh();close();};
  return <div className="modal-backdrop"><form className="modal entity-modal" onSubmit={save}><div className="modal-title"><div><small>NUOVO BUDGET</small><h2>Crea budget</h2></div></div><label>Categoria<select name="category" required>{leaves.map(c=>{const parent=c.parentId?categories.find(p=>p.id===c.parentId):null;return <option key={c.id} value={c.id}>{parent?`${parent.name} › `:""}{c.name}</option>})}</select></label><label>Ammontare<input name="amount" type="text" inputMode="decimal" placeholder="0,00" required/></label><div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer">Salva</button></div></form></div>;
}

function ReportSection({transactions,accounts,categories,recurrences,primaryCurrency}:{transactions:Transaction[];accounts:MoneyAccount[];categories:MoneyCategory[];recurrences:MoneyRecurrence[];primaryCurrency:string}) {
  const [view,setView]=useState<"overview"|"future">("overview");
  const converted=(amount:number,accountId?:string)=>Math.abs(amount)/Math.max(accounts.find(account=>account.id===accountId)?.exchangeRate||1,.00000001);
  const effective=transactions.filter(isEffectiveTransaction);
  const monthKeys=Array.from({length:6},(_,index)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-5+index);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`});
  const monthly=monthKeys.map(key=>{const rows=effective.filter(item=>item.dateISO?.startsWith(key));return {key,label:monthLabel(key).split(" ")[0].slice(0,3),income:rows.filter(item=>item.kind==="income"||item.kind==="refund").reduce((sum,item)=>sum+converted(item.amount,item.accountId),0),expense:rows.filter(item=>item.kind==="expense").reduce((sum,item)=>sum+converted(item.amount,item.accountId),0)}});
  const maximum=Math.max(1,...monthly.flatMap(item=>[item.income,item.expense]));
  const currentMonth=monthKeys.at(-1)!;const currentExpenses=effective.filter(item=>item.kind==="expense"&&item.dateISO?.startsWith(currentMonth));
  const categoryTotals=Array.from(currentExpenses.reduce((map,item)=>{const category=categories.find(value=>value.id===item.categoryId);const root=category?.parentId?categories.find(value=>value.id===category.parentId):category;const name=root?.name||"Senza categoria";map.set(name,(map.get(name)||0)+converted(item.amount,item.accountId));return map},new Map<string,number>()).entries()).sort((a,b)=>b[1]-a[1]);
  const futureLimit=new Date();futureLimit.setMonth(futureLimit.getMonth()+12);const futureLimitIso=toIsoDate(futureLimit);const today=toIsoDate(new Date());
  const futureRows=recurrences.filter(item=>item.active).flatMap(recurrence=>{const rows:{date:string;name:string;kind:string;amount:number;accountId:string|null}[]=[];let cursor=recurrence.nextDate;let count=recurrence.occurrenceCount;while(cursor<=futureLimitIso&&rows.length<370){if(cursor>=today)rows.push({date:cursor,name:categories.find(category=>category.id===recurrence.categoryId)?.name||recurrence.notes||"Pianificata",kind:recurrence.kind,amount:converted(recurrence.amount,recurrence.accountId||undefined),accountId:recurrence.accountId});count++;if(recurrence.occurrenceLimit!==null&&count>=recurrence.occurrenceLimit)break;const next=nextRecurrenceDate({...recurrence,nextDate:cursor});if(next===cursor||recurrence.endDate&&next>recurrence.endDate)break;cursor=next}return rows}).sort((a,b)=>a.date.localeCompare(b.date));
  const futureMonths=Array.from({length:12},(_,index)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()+index);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;const rows=futureRows.filter(item=>item.date.startsWith(key));const income=rows.filter(item=>item.kind==="income").reduce((sum,item)=>sum+item.amount,0);const expense=rows.filter(item=>item.kind==="expense").reduce((sum,item)=>sum+item.amount,0);return {key,label:monthLabel(key),income,expense,balance:income-expense}});
  const exportReport=()=>{const content={generatedAt:new Date().toISOString(),currency:primaryCurrency,monthly,future:futureMonths,futureTransactions:futureRows};const blob=new Blob([JSON.stringify(content,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`Money_Elite_report_${toIsoDate(new Date())}.json`;link.click();URL.revokeObjectURL(url)};
  return <section className="section-page report-real"><div className="section-toolbar"><div className="report-tabs"><button className={view==="overview"?"active":""} onClick={()=>setView("overview")}>Analisi</button><button className={view==="future"?"active":""} onClick={()=>setView("future")}>Futuro</button></div><button className="outline" onClick={exportReport}>↓ Esporta report</button></div>{view==="overview"?<div className="report-grid"><article className="panel report-chart"><div className="panel-title"><div><h3>Entrate e uscite</h3><p>Ultimi 6 mesi · {primaryCurrency}</p></div></div><div className="bars">{monthly.map(item=><div key={item.key}><i className="report-income" style={{height:`${item.income/maximum*100}%`}}/><i className="report-expense" style={{height:`${item.expense/maximum*100}%`}}/><span>{item.label}</span></div>)}</div><div className="report-legend"><span>● Entrate</span><span>● Uscite</span></div></article><article className="panel category-report"><h3>Uscite per categoria</h3><p className="report-period">{monthLabel(currentMonth)}</p><div className="report-category-list">{categoryTotals.map(([name,value])=><div key={name}><span>{name}</span><b>{accountMoney(value,primaryCurrency)}</b></div>)}{!categoryTotals.length&&<div className="empty">Nessuna uscita nel mese.</div>}</div></article></div>:<><article className="panel future-summary"><div><small>PREVISIONE 12 MESI</small><h3>{futureRows.length} movimenti pianificati</h3></div><div><span>Entrate previste</span><b className="positive">{accountMoney(futureMonths.reduce((sum,item)=>sum+item.income,0),primaryCurrency)}</b></div><div><span>Uscite previste</span><b>{accountMoney(-futureMonths.reduce((sum,item)=>sum+item.expense,0),primaryCurrency)}</b></div></article><article className="panel future-table"><div className="future-row future-head"><b>Mese</b><b>Entrate</b><b>Uscite</b><b>Saldo</b></div>{futureMonths.map(item=><div className="future-row" key={item.key}><b>{item.label}</b><span className="positive">{accountMoney(item.income,primaryCurrency)}</span><span>{accountMoney(-item.expense,primaryCurrency)}</span><strong className={item.balance>=0?"positive":""}>{accountMoney(item.balance,primaryCurrency)}</strong></div>)}</article></>}</section>;
}

function ReportSectionInteractive({transactions,accounts,categories,recurrences,primaryCurrency}:{transactions:Transaction[];accounts:MoneyAccount[];categories:MoneyCategory[];recurrences:MoneyRecurrence[];primaryCurrency:string}) {
  const [view,setView]=useState<"analysis"|"future">("analysis");
  const [period,setPeriod]=useState<1|3|6|12>(6);
  const [movement,setMovement]=useState<"all"|"income"|"expense">("all");
  const converted=(amount:number,accountId?:string|null)=>Math.abs(amount)/Math.max(accounts.find(account=>account.id===accountId)?.exchangeRate||1,.00000001);
  const effective=transactions.filter(isEffectiveTransaction);
  const monthKeys=Array.from({length:period},(_,index)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-(period-1)+index);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`});
  const monthly=monthKeys.map(key=>{const rows=effective.filter(item=>item.dateISO?.startsWith(key));const income=rows.filter(item=>item.kind==="income"||item.kind==="refund").reduce((sum,item)=>sum+converted(item.amount,item.accountId),0);const expense=rows.filter(item=>item.kind==="expense").reduce((sum,item)=>sum+converted(item.amount,item.accountId),0);return {key,label:monthLabel(key),income,expense,balance:income-expense}});
  const filteredRows=effective.filter(item=>monthKeys.some(key=>item.dateISO?.startsWith(key))&&(movement==="all"||movement==="income"&&(item.kind==="income"||item.kind==="refund")||movement==="expense"&&item.kind==="expense"));
  const totalIncome=monthly.reduce((sum,item)=>sum+item.income,0);const totalExpense=monthly.reduce((sum,item)=>sum+item.expense,0);const totalBalance=totalIncome-totalExpense;
  const chartMaximum=Math.max(1,...monthly.flatMap(item=>movement==="income"?[item.income]:movement==="expense"?[item.expense]:[item.income,item.expense]));
  const categorySource=movement==="income"?filteredRows.filter(item=>item.kind==="income"||item.kind==="refund"):filteredRows.filter(item=>item.kind==="expense");
  const categoryRows=Array.from(categorySource.reduce((map,item)=>{const category=categories.find(value=>value.id===item.categoryId);const root=category?.parentId?categories.find(value=>value.id===category.parentId):category;const name=root?.name||"Senza categoria";const value=converted(item.amount,item.accountId);map.set(name,(map.get(name)||0)+value);return map},new Map<string,number>()).entries()).sort((a,b)=>b[1]-a[1]);
  const currentWealth=accounts.filter(account=>!account.archived&&!account.hidden&&!account.isContainer).reduce((sum,account)=>sum+account.balance/Math.max(account.exchangeRate||1,.00000001),0);
  const futureLimit=new Date();futureLimit.setMonth(futureLimit.getMonth()+12);const futureLimitIso=toIsoDate(futureLimit);const today=toIsoDate(new Date());
  const futureTransactions=recurrences.filter(item=>item.active).flatMap(recurrence=>{const rows:{date:string;name:string;kind:MoneyRecurrence["kind"];amount:number}[]=[];let cursor=recurrence.nextDate;let count=recurrence.occurrenceCount;while(cursor<=futureLimitIso&&rows.length<370){if(cursor>=today)rows.push({date:cursor,name:categories.find(category=>category.id===recurrence.categoryId)?.name||recurrence.notes||"Pianificata",kind:recurrence.kind,amount:converted(recurrence.amount,recurrence.accountId)});count++;if(recurrence.occurrenceLimit!==null&&count>=recurrence.occurrenceLimit)break;const next=nextRecurrenceDate({...recurrence,nextDate:cursor});if(next===cursor||Boolean(recurrence.endDate&&next>recurrence.endDate))break;cursor=next}return rows});
  let projectedWealth=currentWealth;
  const futureMonths=Array.from({length:12},(_,index)=>{const date=new Date();date.setDate(1);date.setMonth(date.getMonth()+index);const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;const rows=futureTransactions.filter(item=>item.date.startsWith(key));const income=rows.filter(item=>item.kind==="income").reduce((sum,item)=>sum+item.amount,0);const expense=rows.filter(item=>item.kind==="expense").reduce((sum,item)=>sum+item.amount,0);projectedWealth+=income-expense;return {key,label:new Intl.DateTimeFormat("it-IT",{month:"short"}).format(date).replace(".",""),income,expense,balance:income-expense,wealth:projectedWealth}});
  const wealthValues=[currentWealth,...futureMonths.map(item=>item.wealth)];const wealthMin=Math.min(...wealthValues);const wealthMax=Math.max(...wealthValues);const wealthRange=Math.max(wealthMax-wealthMin,1);const wealthPoints=wealthValues.map((value,index)=>`${index/(wealthValues.length-1)*100},${36-(value-wealthMin)/wealthRange*30}`).join(" ");
  return <section className="section-page report-explorer">
    <div className="report-main-switch"><button className={view==="analysis"?"active":""} onClick={()=>setView("analysis")}>Analisi</button><button className={view==="future"?"active":""} onClick={()=>setView("future")}>Futuro</button></div>
    {view==="analysis"?<>
      <div className="report-controls panel"><label>Periodo<select value={period} onChange={event=>setPeriod(Number(event.target.value) as 1|3|6|12)}><option value="1">Questo mese</option><option value="3">Ultimi 3 mesi</option><option value="6">Ultimi 6 mesi</option><option value="12">Ultimi 12 mesi</option></select></label><div className="movement-filter"><button className={movement==="all"?"active":""} onClick={()=>setMovement("all")}>Tutto</button><button className={movement==="income"?"active":""} onClick={()=>setMovement("income")}>Entrate</button><button className={movement==="expense"?"active":""} onClick={()=>setMovement("expense")}>Uscite</button></div></div>
      <div className="report-kpis"><article><span>Entrate</span><b className="positive">{accountMoney(totalIncome,primaryCurrency)}</b></article><article><span>Uscite</span><b>{accountMoney(-totalExpense,primaryCurrency)}</b></article><article><span>Risultato</span><b className={totalBalance>=0?"positive":""}>{accountMoney(totalBalance,primaryCurrency)}</b></article><article><span>Media mensile</span><b>{accountMoney((movement==="income"?totalIncome:movement==="expense"?totalExpense:Math.abs(totalBalance))/period,primaryCurrency)}</b></article></div>
      <div className="report-grid"><article className="panel report-chart"><div className="panel-title"><div><h3>Andamento mensile</h3><p>{movement==="all"?"Entrate e uscite":movement==="income"?"Solo entrate":"Solo uscite"}</p></div></div><div className="bars interactive-bars">{monthly.map(item=><div key={item.key}>{movement!=="expense"&&<i className="report-income" title={accountMoney(item.income,primaryCurrency)} style={{height:`${item.income/chartMaximum*100}%`}}/>}{movement!=="income"&&<i className="report-expense" title={accountMoney(item.expense,primaryCurrency)} style={{height:`${item.expense/chartMaximum*100}%`}}/>}<span>{item.label.slice(0,3)}</span></div>)}</div></article><article className="panel category-report"><h3>{movement==="income"?"Entrate":"Uscite"} per categoria</h3><div className="report-category-list">{categoryRows.slice(0,10).map(([name,value])=><div key={name}><span>{name}</span><b>{accountMoney(value,primaryCurrency)}</b></div>)}{!categoryRows.length&&<div className="empty">Nessun movimento nel periodo.</div>}</div></article></div>
    </>:<>
      <div className="future-kpis report-kpis"><article><span>Patrimonio attuale</span><b>{accountMoney(currentWealth,primaryCurrency)}</b></article><article><span>Patrimonio tra 12 mesi</span><b className={projectedWealth>=currentWealth?"positive":""}>{accountMoney(projectedWealth,primaryCurrency)}</b></article><article><span>Variazione prevista</span><b className={projectedWealth-currentWealth>=0?"positive":""}>{accountMoney(projectedWealth-currentWealth,primaryCurrency)}</b></article><article><span>Pianificate considerate</span><b>{futureTransactions.length}</b></article></div>
      <article className="panel future-wealth-chart"><div className="panel-title"><div><h3>Patrimonio futuro</h3><p>Proiezione dei prossimi 12 mesi basata sulle sole pianificate</p></div></div><div className="future-chart-stage"><svg viewBox="0 0 100 42" preserveAspectRatio="none" aria-label="Andamento futuro del patrimonio"><defs><linearGradient id="future-wealth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0787f5" stopOpacity=".36"/><stop offset="100%" stopColor="#0787f5" stopOpacity=".04"/></linearGradient></defs><polygon points={`0,42 ${wealthPoints} 100,42`} fill="url(#future-wealth-fill)"/><polyline points={wealthPoints} fill="none" stroke="#0787f5" strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg><div className="future-chart-labels"><span>Oggi</span>{futureMonths.map(item=><span key={item.key}>{item.label}</span>)}</div></div></article>
      <article className="panel future-table"><div className="future-row future-head"><b>Mese</b><b>Entrate</b><b>Uscite</b><b>Patrimonio</b></div>{futureMonths.map(item=><div className="future-row" key={item.key}><b>{monthLabel(item.key)}</b><span className="positive">{accountMoney(item.income,primaryCurrency)}</span><span>{accountMoney(-item.expense,primaryCurrency)}</span><strong className={item.wealth>=currentWealth?"positive":""}>{accountMoney(item.wealth,primaryCurrency)}</strong></div>)}</article>
    </>}
  </section>;
}

function InformationSection() {
  return <section className="section-page information-page"><div className="information-hero"><img src={assetPath("/money-elite-icon.png")} alt="Money Elite"/><div><small>VERSIONE ATTUALE</small><h2>Money Elite v5.0</h2><p>Gestione personale di conti, transazioni, pianificate, abbonamenti, carte e budget.</p></div></div><div className="information-grid"><article className="panel"><AppIcon name="check"/><div><h3>Dati protetti</h3><p>I dati personali sono separati per utente e sincronizzati tramite Supabase.</p></div></article><article className="panel"><AppIcon name="cloud"/><div><h3>Sincronizzazione</h3><p>L'app aggiorna automaticamente movimenti, conti, ricorrenze e modelli tra i dispositivi.</p></div></article><article className="panel"><AppIcon name="technology"/><div><h3>Compatibilità</h3><p>Interfaccia ottimizzata per iPhone, desktop e installazione come web app.</p></div></article><article className="panel"><AppIcon name="info"/><div><h3>Note sulla versione</h3><p>Report interattivi e proiezione grafica del patrimonio futuro basata sulle pianificate.</p></div></article><article className="panel copyright-card"><AppIcon name="info"/><div><h3>Copyright</h3><p>© 2026 Marco D'Agostino. Tutti i diritti riservati.</p></div></article></div></section>;
}

type ManagedCategory = { id: string; name: string; type: "Entrata" | "Uscita"; children: string[] };

const startingManagedCategories: ManagedCategory[] = [
  {id:"income-1",name:"Guadagni",type:"Entrata",children:["Regalo","Rimborso"]},
  {id:"income-2",name:"Proventi Finanziari",type:"Entrata",children:[]},
  {id:"income-3",name:"Reddito",type:"Entrata",children:["730","Altri lavori","Buoni pasto","Stipendio","Straordinari"]},
  {id:"expense-1",name:"Abbonamenti",type:"Uscita",children:["App Store","Finanziamenti","iCloud","Sky e Netflix","Spotify"]},
  {id:"expense-2",name:"Alimenti",type:"Uscita",children:["Bar","Buoni pasto","Drink","Pranzi/Cene","Supermercato"]},
  {id:"expense-3",name:"Casa",type:"Uscita",children:["Arredamento","Condominio","Gas","Giardino","Lavori","Luce","Luce e Gas","Prodotti Casa","Pulizie","Riscaldamento","Rifiuti","Vodafone"]},
  {id:"expense-4",name:"Divertimento",type:"Uscita",children:["Cinema","Discoteca","Divertimento","Mare"]},
  {id:"expense-5",name:"Salute",type:"Uscita",children:["Farmacia","Lenti a contatto","Medici","Sport"]},
  {id:"expense-6",name:"Spese Personali",type:"Uscita",children:["Abbigliamento","Amazon","Cosmesi","Cura Personale","Regali","Scommesse","Tabacchi","Tecnologia"]},
  {id:"expense-7",name:"Tasse",type:"Uscita",children:["Multe","Tasse"]},
  {id:"expense-8",name:"Trasporti",type:"Uscita",children:["Automobile","Box","Carburante","Noleggio","Parcheggio","Scooter","Telepass","Trasporti pubblici"]},
  {id:"expense-9",name:"Viaggi",type:"Uscita",children:["Divertimento Viaggi","Hotel","Pranzi/Cene Viaggi","Trasporti Viaggi"]},
];

function CategoryManagement() {
  const [categories, setCategories] = useState(startingManagedCategories);
  const [styles, setStyles] = useState<Record<string,{icon:string;color:string}>>({});
  const [tab, setTab] = useState<"Entrata"|"Uscita">("Uscita");
  const [expanded, setExpanded] = useState<string | null>("expense-2");
  const [editor, setEditor] = useState<{mode:"category"|"subcategory"; categoryId?:string; oldName?:string} | null>(null);
  const [draft, setDraft] = useState("");
  const [draftIcon, setDraftIcon] = useState("circle");
  const [draftColor, setDraftColor] = useState("#678098");
  const iconChoices = ["home","groceries","health","stethoscope","income","finance","gift","travel","car","telepass","subscriptions","technology","food","sport","work","voucher","music","fun"];
  const visible = categories.filter(c=>c.type===tab).sort((a,b)=>a.name.localeCompare(b.name,"it"));
  const styleFor = (name:string) => styles[name] || {icon:categoryIcon(name),color:categoryColor(name)};
  const openEditor = (next: NonNullable<typeof editor>, value="") => {const current=styleFor(value);setDraft(value);setDraftIcon(current.icon);setDraftColor(current.color);setEditor(next)};
  const save = () => {
    const name=draft.trim(); if(!name||!editor)return;
    if(editor.mode==="category"){
      if(editor.categoryId) setCategories(items=>items.map(c=>c.id===editor.categoryId?{...c,name}:c));
      else setCategories(items=>[...items,{id:`category-${Date.now()}`,name,type:tab,children:[]}]);
    } else if(editor.categoryId) {
      setCategories(items=>items.map(c=>c.id!==editor.categoryId?c:{...c,children:editor.oldName?c.children.map(x=>x===editor.oldName?name:x):[...c.children,name].sort((a,b)=>a.localeCompare(b,"it"))}));
    }
    setStyles(current=>({...current,[name]:{icon:draftIcon,color:draftColor}}));
    setEditor(null);setDraft("");
  };
  const removeCategory = (id:string) => setCategories(items=>items.filter(c=>c.id!==id));
  const removeSubcategory = (id:string,name:string) => setCategories(items=>items.map(c=>c.id===id?{...c,children:c.children.filter(x=>x!==name)}:c));
  return <article className="panel settings-card category-management">
    <div className="category-management-heading"><div><h3>Gestione categorie</h3><p>Aggiungi, rinomina o elimina categorie e sottocategorie.</p></div><button className="primary compact" onClick={()=>openEditor({mode:"category"})}><AppIcon name="plus" size={16}/> Categoria</button></div>
    <div className="category-tabs"><button className={tab==="Entrata"?"active income":""} onClick={()=>setTab("Entrata")}>Entrate</button><button className={tab==="Uscita"?"active expense":""} onClick={()=>setTab("Uscita")}>Uscite</button></div>
    <div className="managed-category-list">{visible.map(category=><div className="managed-category" key={category.id}>
      <div className="managed-category-row"><button className="category-expand" onClick={()=>setExpanded(expanded===category.id?null:category.id)}><span className="managed-category-icon" style={{color:styleFor(category.name).color,background:`${styleFor(category.name).color}18`}}><AppIcon name={styleFor(category.name).icon} size={17}/></span><div><b>{category.name}</b><small>{category.children.length} sottocategorie</small></div><AppIcon name={expanded===category.id?"up":"down"} size={15}/></button><button title="Aggiungi sottocategoria" onClick={()=>openEditor({mode:"subcategory",categoryId:category.id})}><AppIcon name="plus" size={16}/></button><button title="Modifica categoria" onClick={()=>openEditor({mode:"category",categoryId:category.id},category.name)}><AppIcon name="edit" size={16}/></button><button className="danger" title="Elimina categoria" onClick={()=>removeCategory(category.id)}><AppIcon name="trash" size={16}/></button></div>
      {expanded===category.id&&<div className="managed-subcategories">{category.children.map(child=><div key={child}><span className="managed-category-icon small" style={{color:styleFor(child).color,background:`${styleFor(child).color}18`}}><AppIcon name={styleFor(child).icon} size={15}/></span><b>{child}</b><button title="Modifica sottocategoria" onClick={()=>openEditor({mode:"subcategory",categoryId:category.id,oldName:child},child)}><AppIcon name="edit" size={15}/></button><button className="danger" title="Elimina sottocategoria" onClick={()=>removeSubcategory(category.id,child)}><AppIcon name="trash" size={15}/></button></div>)}{!category.children.length&&<p>Nessuna sottocategoria.</p>}</div>}
    </div>)}</div>
    {editor&&<div className="modal-backdrop" onMouseDown={()=>setEditor(null)}><div className="modal category-editor" onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><small>GESTIONE CATEGORIE</small><h2>{editor.mode==="category"?(editor.categoryId?"Modifica":"Aggiungi"):(editor.oldName?"Modifica":"Aggiungi")} {editor.mode==="category"?"categoria":"sottocategoria"}</h2></div><button onClick={()=>setEditor(null)}><AppIcon name="close"/></button></div><label>Nome<input value={draft} onChange={e=>setDraft(e.target.value)} autoFocus placeholder={editor.mode==="category"?"Es. Istruzione":"Es. Libri"}/></label><div className="style-editor"><div><span>Simbolo</span><div className="icon-choice-grid">{iconChoices.map(icon=><button className={draftIcon===icon?"selected":""} key={icon} onClick={()=>setDraftIcon(icon)} style={draftIcon===icon?{color:draftColor,borderColor:draftColor}:{}}><AppIcon name={icon} size={18}/></button>)}</div></div><label>Colore<div className="color-editor"><input type="color" value={draftColor} onChange={e=>setDraftColor(e.target.value)}/><span style={{background:draftColor}}/><b>{draftColor.toUpperCase()}</b></div></label><div className="category-style-preview"><span style={{color:draftColor,background:`${draftColor}18`}}><AppIcon name={draftIcon} size={20}/></span><div><small>ANTEPRIMA</small><b>{draft||"Nome categoria"}</b></div></div></div><div className="modal-actions"><button className="cancel" onClick={()=>setEditor(null)}>Annulla</button><button className="save-action transfer" onClick={save}>Salva</button></div></div></div>}
  </article>;
}

function TemplateManagement({ accounts, categories }: { accounts: MoneyAccount[]; categories: MoneyCategory[] }) {
  const [templates,setTemplates]=useState<TransactionTemplate[]>([]);
  const [editing,setEditing]=useState<TransactionTemplate|null>(null);
  useEffect(()=>setTemplates(loadTransactionTemplates()),[]);
  const persist=(next:TransactionTemplate[])=>{setTemplates(next);saveTransactionTemplates(next)};
  const create=()=>setEditing({id:crypto.randomUUID(),name:"",kind:"expense",amount:0,category:"",account:accounts.find(a=>!a.archived)?.name||"",notes:""});
  const roots=categories.filter(category=>!category.parentId);
  const categoryOptions=roots.flatMap(root=>[root.name,...categories.filter(child=>child.parentId===root.id).map(child=>`${root.name} › ${child.name}`)]);
  return <article className="panel settings-card template-management"><div className="template-heading"><div><h3>Modelli di transazione</h3><p>Salva le operazioni frequenti per compilare automaticamente entrate e uscite.</p></div><button className="primary compact" onClick={create}><AppIcon name="plus" size={16}/> Modello</button></div><div className="template-settings-list">{templates.map(template=><div key={template.id}><span className={`template-star ${template.kind}`}><AppIcon name="star" size={17}/></span><div><b>{template.name}</b><small>{template.category} · {template.account}</small></div><strong className={template.kind==="income"?"positive":""}>{template.kind==="income"?"+":"−"}{money(template.amount)}</strong><button onClick={()=>setEditing(template)} aria-label="Modifica modello"><AppIcon name="edit" size={16}/></button><button className="danger" onClick={()=>persist(templates.filter(item=>item.id!==template.id))} aria-label="Elimina modello"><AppIcon name="trash" size={16}/></button></div>)}{!templates.length&&<div className="empty">Nessun modello salvato.</div>}</div>{editing&&<div className="modal-backdrop" onMouseDown={()=>setEditing(null)}><div className="modal template-editor" onMouseDown={event=>event.stopPropagation()}><div className="modal-title"><div><small>MODELLI</small><h2>{templates.some(item=>item.id===editing.id)?"Modifica modello":"Nuovo modello"}</h2></div><button onClick={()=>setEditing(null)}><AppIcon name="close"/></button></div><label>Nome<input autoFocus value={editing.name} onChange={event=>setEditing({...editing,name:event.target.value})} placeholder="Es. Carburante"/></label><label>Tipo<select value={editing.kind} onChange={event=>setEditing({...editing,kind:event.target.value as TransactionTemplate["kind"]})}><option value="expense">Uscita</option><option value="income">Entrata</option></select></label><label>Valore<input type="text" inputMode="decimal" value={amountInput(editing.amount)} onChange={event=>setEditing({...editing,amount:Math.abs(parseItalianAmount(event.target.value))})}/></label><label>Categoria<select value={editing.category} onChange={event=>setEditing({...editing,category:event.target.value})}><option value="">Seleziona categoria</option>{categoryOptions.map(value=><option key={value}>{value}</option>)}</select></label><label>Conto<select value={editing.account} onChange={event=>setEditing({...editing,account:event.target.value})}>{accounts.filter(account=>!account.archived).map(account=><option key={account.id}>{account.name}</option>)}</select></label><label>Note<input value={editing.notes} onChange={event=>setEditing({...editing,notes:event.target.value})} placeholder="Opzionale"/></label><div className="modal-actions"><button className="cancel" onClick={()=>setEditing(null)}>Annulla</button><button className="save-action transfer" disabled={!editing.name.trim()||!editing.category||editing.amount<=0} onClick={()=>{persist([...templates.filter(item=>item.id!==editing.id),editing]);setEditing(null)}}>Salva modello</button></div></div></div>}</article>;
}

function TemplateManagementVisual({accounts,categories}:{accounts:MoneyAccount[];categories:MoneyCategory[]}){
  const [templates,setTemplates]=useState<TransactionTemplate[]>([]);
  const [editing,setEditing]=useState<TransactionTemplate|null>(null);
  const [amount,setAmount]=useState("");
  const [categoryOpen,setCategoryOpen]=useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
  useEffect(()=>setTemplates(loadTransactionTemplates()),[]);
  const persist=(next:TransactionTemplate[])=>{setTemplates(next);saveTransactionTemplates(next)};
  const open=(template?:TransactionTemplate)=>{const next=template||{id:crypto.randomUUID(),name:"",kind:"expense" as const,amount:0,category:"",account:accounts.find(item=>!item.archived)?.name||"",notes:""};setEditing(next);setAmount(next.amount?amountInput(next.amount):"")};
  const roots=categories.filter(category=>!category.parentId);
  return <article className="panel settings-card template-management"><div className="template-heading"><div><h3>Modelli di transazione</h3><p>Compila rapidamente le operazioni che usi più spesso.</p></div><button className="primary compact" onClick={()=>open()}><AppIcon name="plus" size={16}/> Modello</button></div><div className="template-settings-list">{templates.map(template=><div key={template.id}><span className={`template-star ${template.kind}`}><AppIcon name="star" size={17}/></span><div><b>{template.name}</b><small>{template.category} · {template.account}</small></div><strong className={template.kind==="income"?"positive":""}>{template.kind==="income"?"+":"−"}{money(template.amount)}</strong><button onClick={()=>open(template)}><AppIcon name="edit" size={16}/></button><button className="danger" onClick={()=>persist(templates.filter(item=>item.id!==template.id))}><AppIcon name="trash" size={16}/></button></div>)}{!templates.length&&<div className="empty">Nessun modello salvato.</div>}</div>{editing&&<div className="modal-backdrop" onMouseDown={()=>setEditing(null)}><div className="modal template-editor visual-template-editor" onMouseDown={event=>event.stopPropagation()}><div className="modal-title"><div><small>MODELLI</small><h2>{templates.some(item=>item.id===editing.id)?"Modifica modello":"Nuovo modello"}</h2></div><button onClick={()=>setEditing(null)}><AppIcon name="close"/></button></div><label>Nome<input autoFocus value={editing.name} onChange={event=>setEditing({...editing,name:event.target.value})} placeholder="Es. Carburante"/></label><label>Tipo<select value={editing.kind} onChange={event=>setEditing({...editing,kind:event.target.value as TransactionTemplate["kind"],category:""})}><option value="expense">Uscita</option><option value="income">Entrata</option></select></label><label>Valore<input type="text" inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="0,00"/></label><label>Categoria e sottocategoria<button type="button" className="category-select" onClick={()=>setCategoryOpen(true)}><span><AppIcon name="transactions" size={16}/></span><b>{editing.category||"Seleziona categoria"}</b><i>⌄</i></button></label><label>Conto<button type="button" className="category-select" onClick={()=>setAccountOpen(true)}><span><AppIcon name="accounts" size={16}/></span><b>{editing.account||"Seleziona conto"}</b><i>⌄</i></button></label><label>Note<input value={editing.notes} onChange={event=>setEditing({...editing,notes:event.target.value})} placeholder="Opzionale"/></label><div className="modal-actions"><button className="cancel" onClick={()=>setEditing(null)}>Annulla</button><button className="save-action transfer" disabled={!editing.name.trim()||!editing.category||!editing.account||parseItalianAmount(amount)<=0} onClick={()=>{persist([...templates.filter(item=>item.id!==editing.id),{...editing,amount:Math.abs(parseItalianAmount(amount))}]);setEditing(null)}}>Salva modello</button></div>{categoryOpen&&<div className="picker-dim-layer" onMouseDown={()=>setCategoryOpen(false)}><div className="category-picker template-category-picker" onMouseDown={event=>event.stopPropagation()}><div className="category-picker-title"><div><small>MODELLO</small><h3>Categoria e sottocategoria</h3></div><button onClick={()=>setCategoryOpen(false)}><AppIcon name="close"/></button></div><div className="category-tree">{roots.filter(root=>root.kind===editing.kind).map(root=>{const rootVisual=categoryVisual(root);const children=categories.filter(child=>child.parentId===root.id);return <div className="category-group" key={root.id}><button type="button" onClick={()=>{if(!children.length){setEditing({...editing,category:root.name});setCategoryOpen(false)}}}><span style={{color:rootVisual.color,background:`${rootVisual.color}18`}}><AppIcon name={rootVisual.icon} size={16}/></span><b>{root.name}</b></button>{children.length>0&&<div className="subcategory-list">{children.map(child=>{const visual=categoryVisual(child);return <button type="button" className="subcategory-choice" key={child.id} onClick={()=>{setEditing({...editing,category:`${root.name} › ${child.name}`});setCategoryOpen(false)}}><span className="sub-symbol" style={{color:visual.color,background:`${visual.color}18`}}><AppIcon name={visual.icon} size={16}/></span><div><b>{child.name}</b></div></button>})}</div>}</div>})}</div></div></div>}{accountOpen&&<div className="account-picker-layer" onMouseDown={()=>setAccountOpen(false)}><div className="account-picker-card" onMouseDown={event=>event.stopPropagation()}><h3>Seleziona conto</h3>{accounts.filter(account=>!account.archived).map(account=><button type="button" key={account.id} onClick={()=>{setEditing({...editing,account:account.name});setAccountOpen(false)}}><span><AppIcon name={account.icon} size={18}/></span><b>{account.name}</b><strong>{accountMoney(account.balance,account.currency)}</strong></button>)}</div></div>}</div></div>}</article>;
}

function SettingsSection({ accounts, categories, primaryCurrency, onChangePrimaryCurrency, dashboardAccountIds, onChangeDashboardAccounts }: { accounts: MoneyAccount[]; categories: MoneyCategory[]; primaryCurrency:string; onChangePrimaryCurrency:(currency:string)=>Promise<void>; dashboardAccountIds: string[]; onChangeDashboardAccounts: (ids: string[]) => void }) {
  const [exporting,setExporting]=useState(false);
  const [budgetNotifications,setBudgetNotifications]=useState(()=>typeof window==="undefined"||window.localStorage.getItem(BUDGET_NOTIFICATIONS_KEY)!=="false");
  const exportAllData=async()=>{
    setExporting(true);
    try{
      const supabase=getSupabaseBrowserClient();
      const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sessione non disponibile");
      const tableNames=["profiles","accounts","cards","categories","recurrences","transactions","budgets","debts","transaction_templates"] as const;
      const entries=await Promise.all(tableNames.map(async table=>{const {data,error}=await supabase.from(table).select("*").eq(table==="profiles"?"id":"user_id",user.id);if(error)throw error;return [table,data||[]] as const}));
      const backup={application:"Money Elite",version:"4.8",exportedAt:new Date().toISOString(),userId:user.id,data:Object.fromEntries(entries),localPreferences:{dashboard:window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY),accountOrder:window.localStorage.getItem(ACCOUNT_ORDER_KEY),primaryCurrency:window.localStorage.getItem(PRIMARY_CURRENCY_KEY),budgetNotifications:window.localStorage.getItem(BUDGET_NOTIFICATIONS_KEY)}};
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`Money_Elite_backup_${toIsoDate(new Date())}.json`;link.click();URL.revokeObjectURL(url);
    }catch(error){alert(error instanceof Error?error.message:"Impossibile esportare il backup.")}finally{setExporting(false)}
  };
  const selectableAccounts = accounts.filter(account=>!account.archived&&!account.hidden&&!account.isContainer);
  const toggleDashboardAccount = (accountId:string) => {
    const next = dashboardAccountIds.includes(accountId)
      ? dashboardAccountIds.filter(id=>id!==accountId)
      : [...dashboardAccountIds,accountId];
    onChangeDashboardAccounts(next);
  };
  return (
    <section className="section-page settings-page">
      <div className="section-toolbar"><button className="primary">Salva modifiche</button></div>
      <article className="panel settings-card">
        <h3>Preferenze generali</h3>
        <label>Nome profilo<input defaultValue="Marco" /></label>
        <label>Valuta principale<select value={primaryCurrency} onChange={event=>void onChangePrimaryCurrency(event.target.value)}>{ISO_CURRENCIES.map(value=><option key={value}>{value}</option>)}</select><small>Usata per patrimonio, Dashboard, grafici, budget e statistiche.</small></label>
        <label>Inizio del mese<select><option>Giorno 1</option><option>Giorno 27</option></select></label>
        <div className="toggle-row"><div><b>Notifiche budget</b><span>Avvisami quando raggiungo o supero il limite</span></div><input type="checkbox" checked={budgetNotifications} onChange={event=>{const enabled=event.target.checked;setBudgetNotifications(enabled);window.localStorage.setItem(BUDGET_NOTIFICATIONS_KEY,String(enabled));if(enabled&&"Notification" in window&&Notification.permission==="default")void Notification.requestPermission()}} /></div>
      </article>

      <article className="panel settings-card dashboard-preferences">
        <div className="dashboard-preferences-heading"><div><h3>Dashboard</h3><p>Scegli i conti da mostrare nella card Conti. Il totale resta visibile solo nel Patrimonio.</p></div><span>{dashboardAccountIds.length} selezionati</span></div>
        <div className="dashboard-account-preferences">
          {selectableAccounts.map(account=><label key={account.id}>
            <span className="dashboard-preference-icon"><AppIcon name={account.icon} size={18}/></span>
            <span><b>{account.name}</b><small>{money(account.balance)}</small></span>
            <input type="checkbox" checked={dashboardAccountIds.includes(account.id)} onChange={()=>toggleDashboardAccount(account.id)}/>
          </label>)}
          {!selectableAccounts.length&&<div className="empty">Nessun conto disponibile.</div>}
        </div>
      </article>

      <TemplateManagementVisual accounts={accounts} categories={categories}/>
      <CategoryManagement />
      <article className="panel settings-card"><h3>Dati e sicurezza</h3><p className="setting-note">Scarica un backup JSON completo di profilo, conti, transazioni, pianificate, categorie, budget, carte e modelli.</p><button className="outline" disabled={exporting} onClick={()=>void exportAllData()}>{exporting?"Preparazione backup…":"↓ Esporta tutti i dati"}</button></article>
    </section>
  );
}

function TransactionsSection({ transactions, openTransaction }: { transactions: Transaction[]; openTransaction: (t: Transaction) => void }) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [month, setMonth] = useState(monthKeyFromDate(new Date()));
  const visibleTransactions=useMemo(()=>transactions.filter(t=>t.kind!=="transfer"),[transactions]);
  const filtered = useMemo(() => visibleTransactions.filter(t => {
    const text=`${t.label} ${t.category} ${t.account} ${t.notes ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && dateInMonth(t.dateISO,month);
  }), [visibleTransactions, query, month]);
  return <section className="section-page"><article className="panel full-list compact-transaction-list"><div className="transactions-toolbar"><div className={`compact-search ${searchOpen?"is-open":""}`}><button aria-label={searchOpen?"Chiudi ricerca":"Cerca transazione"} title={searchOpen?"Chiudi ricerca":"Cerca transazione"} onClick={()=>{setSearchOpen(value=>!value);if(searchOpen)setQuery("")}}><AppIcon name={searchOpen?"close":"search"} size={18}/></button>{searchOpen&&<input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca..." />}</div><div className="period-nav icon-period-nav"><button aria-label="Mese precedente" title="Mese precedente" onClick={()=>setMonth(value=>shiftMonthKey(value,-1))}><AppIcon name="back" size={18}/></button><strong>{monthLabel(month)}</strong><button aria-label="Mese successivo" title="Mese successivo" onClick={()=>setMonth(value=>shiftMonthKey(value,1))}><AppIcon name="forward" size={18}/></button></div></div>{filtered.map(t=><TransactionRow t={t} key={t.id} onOpen={openTransaction}/>)}{!filtered.length && <div className="empty">Nessuna transazione trovata in {monthLabel(month)}.</div>}</article></section>;
}

function TransactionModal({ kind, close, add, accounts, cards, categories, preset = "normal", defaultAccount, cardId, initial, editing = false, refundSource }: { kind: ActionKind; close: () => void; add: (t: Transaction) => void | Promise<void>; accounts: MoneyAccount[]; cards: MoneyCard[]; categories: MoneyCategory[]; preset?: "normal" | "planned" | "subscription"; defaultAccount?: string; cardId?: string; initial?: Transaction; editing?: boolean; refundSource?: Transaction }) {
  const usableAccounts = accounts.filter(account => !account.archived&&!account.isContainer);
  const accountDisplayName=(account:MoneyAccount)=>{const parent=accounts.find(item=>item.id===account.parentAccountId);return parent?`${parent.name} › ${account.name}`:account.name};
  const [from, setFrom] = useState((defaultAccount&&usableAccounts.some(account=>account.name===defaultAccount)?defaultAccount:"") || initial?.account || usableAccounts[0]?.name || "");
  const [to, setTo] = useState(initial?.destinationAccountName || initial?.destinationAccountId || usableAccounts.find(account => account.name !== (defaultAccount || initial?.account || usableAccounts[0]?.name))?.name || "");
  const [selectedAccount, setSelectedAccount] = useState((defaultAccount&&usableAccounts.some(account=>account.name===defaultAccount)?defaultAccount:"") || initial?.account || "");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cardId || initial?.cardId || null);
  const [accounted, setAccounted] = useState(initial?.accounted ?? false);
  const [planned, setPlanned] = useState(initial?.planned ?? (preset !== "normal"));
  const [subscription, setSubscription] = useState(initial?.subscription ?? (preset === "subscription"));
  const [autoAccounted, setAutoAccounted] = useState(initial?.automaticAccounting ?? true);
  const [categoryOpen, setCategoryOpen] = useState(!initial && !refundSource && kind !== "transfer");
  const [templateOpen,setTemplateOpen]=useState(false);
  const [templates,setTemplates]=useState<TransactionTemplate[]>([]);
  const [amountValue,setAmountValue]=useState(initial?amountInput(Math.abs(initial.amount)):"");
  const [receivedValue,setReceivedValue]=useState(initial?.destinationAmount?amountInput(initial.destinationAmount):"");
  const [notesValue,setNotesValue]=useState(initial?.notes ?? "");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [categoryViewport,setCategoryViewport]=useState<{top:number;height:number}|null>(null);
  const [amountPadTarget,setAmountPadTarget]=useState<"amount"|"received"|null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDateISO, setSelectedDateISO] = useState(initial?.dateISO || toIsoDate(new Date()));
  const [expandedCategory, setExpandedCategory] = useState(kind === "income" ? "Reddito" : "Alimenti");
  const [selectedCategory, setSelectedCategory] = useState(initial?.category || (kind === "income" ? "Reddito › Stipendio" : "Alimenti › Pranzi/Cene"));
  const mealVoucherAccount = accounts.find(account => account.type === "meal_vouchers");
  const voucherValue = mealVoucherAccount?.voucherUnitValue || 8;
  const [voucherCount, setVoucherCount] = useState(() => String(initial?.voucherCount ?? Math.max(1, Math.round(Math.abs(initial?.amount ?? voucherValue) / voucherValue))));
  const parsedVoucherCount = Number.parseInt(voucherCount, 10);
  const validVoucherCount = Number.isFinite(parsedVoucherCount) && parsedVoucherCount > 0 ? parsedVoucherCount : 0;
  const [frequency, setFrequency] = useState<Transaction["frequency"]>(initial?.frequency ?? "monthly");
  const [intervalCount, setIntervalCount] = useState(initial?.intervalCount ?? 1);
  const [occurrenceLimit, setOccurrenceLimit] = useState(initial?.occurrenceLimit ?? 0);
  useEffect(()=>{const refreshTemplates=()=>setTemplates(loadTransactionTemplates());refreshTemplates();window.addEventListener("money-elite-templates-changed",refreshTemplates);return()=>window.removeEventListener("money-elite-templates-changed",refreshTemplates)},[]);
  useEffect(()=>{if(!categoryOpen||typeof window==="undefined"||!window.visualViewport)return;const viewport=window.visualViewport;const sync=()=>setCategoryViewport({top:viewport.offsetTop,height:viewport.height});sync();viewport.addEventListener("resize",sync);viewport.addEventListener("scroll",sync);return()=>{viewport.removeEventListener("resize",sync);viewport.removeEventListener("scroll",sync)}},[categoryOpen]);
  const isTransfer = kind === "transfer";
  const selectedCard = cards.find(card => card.id === selectedCardId);
  const sourceAccount=usableAccounts.find(account=>account.name===from);
  const destinationAccount=usableAccounts.find(account=>account.name===to);
  const transactionAccount=selectedCard?usableAccounts.find(account=>account.id===selectedCard.linkedAccountId):usableAccounts.find(account=>account.name===selectedAccount);
  const amountCurrency=isTransfer?sourceAccount?.currency||"EUR":transactionAccount?.currency||"EUR";
  const proposedReceived=(raw:string,source=sourceAccount,destination=destinationAccount)=>{const sent=Math.abs(parseItalianAmount(raw));if(!source||!destination)return sent;return sent/Math.max(source.exchangeRate||1,.00000001)*Math.max(destination.exchangeRate||1,.00000001)};
  const setSentAmount=(value:string)=>{setAmountValue(value);if(isTransfer)setReceivedValue(amountInput(proposedReceived(value)))};
  const openAmountPad=(target:"amount"|"received",event:React.PointerEvent<HTMLInputElement>)=>{if(typeof window!=="undefined"&&window.matchMedia("(max-width: 620px)").matches){event.preventDefault();event.currentTarget.blur();setAmountPadTarget(target)}};
  const pressAmountKey=(key:string)=>{if(!amountPadTarget)return;const current=amountPadTarget==="amount"?amountValue:receivedValue;let next=current;if(key==="backspace")next=current.slice(0,-1);else if(key==="comma"){if(!current.includes(",")&&!current.includes("."))next=`${current||"0"},`}else if(/^\d$/.test(key)){const decimal=(current.split(/[,.]/)[1]||"");if(!current.includes(",")&&!current.includes(".")||decimal.length<2)next=current==="0"?key:`${current}${key}`}if(amountPadTarget==="amount")setSentAmount(next);else setReceivedValue(next)};
  useEffect(()=>{if(isTransfer&&!initial?.destinationAmount)setReceivedValue(amountInput(proposedReceived(amountValue)))},[from,to]);
  const isMealVoucher = mealVoucherLeaf(selectedCategory);
  const pickerKind = refundSource ? "expense" : kind === "income" ? "income" : "expense";
  const categoryGroups = categories.filter(category => category.kind === pickerKind && !category.parentId).sort((a,b)=>a.name.localeCompare(b.name,"it")).map(root => ({
    root,
    children: categories.filter(category => category.parentId === root.id).sort((a,b)=>a.name.localeCompare(b.name,"it")),
  }));
  const normalizedCategoryQuery=categoryQuery.trim().toLocaleLowerCase("it");
  const visibleCategoryGroups=categoryGroups.map(group=>{const rootMatches=group.root.name.toLocaleLowerCase("it").includes(normalizedCategoryQuery);return {...group,children:normalizedCategoryQuery&&!rootMatches?group.children.filter(child=>child.name.toLocaleLowerCase("it").includes(normalizedCategoryQuery)):group.children};}).filter(group=>!normalizedCategoryQuery||group.root.name.toLocaleLowerCase("it").includes(normalizedCategoryQuery)||group.children.length>0);
  const labels = kind === "expense"
    ? { eyebrow: "NUOVA USCITA", title: "Registra un’uscita", save: "Salva uscita", planned: "Uscita pianificata" }
    : kind === "income"
    ? { eyebrow: "NUOVA ENTRATA", title: "Registra un’entrata", save: "Salva entrata", planned: "Entrata pianificata" }
    : { eyebrow: "GIROCONTO", title: "Trasferisci fondi", save: "Trasferisci", planned: "Trasferimento pianificato" };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = isMealVoucher ? validVoucherCount * voucherValue : parseItalianAmount(fd.get("amount"));
    if (isMealVoucher && validVoucherCount < 1) {
      alert("Inserisci il numero dei buoni pasto.");
      return;
    }
    const notes = notesValue.trim();
    const category = isTransfer ? "Trasferimento tra conti" : selectedCategory;
    const categoryTitle = selectedCategory.split("›").at(-1)?.trim() || selectedCategory;
    const destinationAmount=isTransfer?Math.abs(parseItalianAmount(receivedValue)):null;
    void add({ id: editing && initial ? initial.id : crypto.randomUUID(), label: isTransfer ? "Giroconto" : `${categoryTitle}${refundSource ? " (Rimborso)" : ""}`, category, account: isTransfer ? from : selectedAccount, notes, cardId: isTransfer ? null : selectedCardId, destinationAccountId: isTransfer ? to : null, destinationAccountName: isTransfer ? to : null, date: formatItalianDate(selectedDateISO), dateISO: selectedDateISO, amount: kind === "expense" ? -Math.abs(raw) : Math.abs(raw), destinationAmount, exchangeRate:isTransfer&&Math.abs(raw)>0&&destinationAmount?destinationAmount/Math.abs(raw):null, currency:amountCurrency,destinationCurrency:destinationAccount?.currency, icon: refundSource ? "refund" : isTransfer ? "transfer" : kind === "expense" ? "expense" : "income", color: refundSource ? "green" : isTransfer ? "blue" : kind === "expense" ? "orange" : "green", accounted: planned ? false : accounted, isRefund: Boolean(refundSource), refundOf: refundSource?.id, kind: isTransfer ? "transfer" : refundSource ? "refund" : kind, voucherCount: isMealVoucher ? validVoucherCount : null, planned, subscription, automaticAccounting: autoAccounted, frequency, intervalCount, occurrenceLimit: occurrenceLimit > 0 ? occurrenceLimit : null });
  };
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}>
    <div className={`modal-accent ${kind}`} />
    <div className="modal-title"><div><small>{refundSource?"NUOVO RIMBORSO":editing&&subscription?"MODIFICA ABBONAMENTO":editing&&planned?"MODIFICA PIANIFICATA":editing?"MODIFICA TRANSAZIONE":initial?"DUPLICA TRANSAZIONE":preset==="subscription"?"NUOVO ABBONAMENTO":preset==="planned"?"NUOVA PIANIFICATA":labels.eyebrow}</small><h2>{refundSource?"Registra il rimborso":editing&&subscription?"Modifica l’abbonamento":editing&&planned?"Modifica la transazione pianificata":editing?"Modifica la transazione":initial?"Controlla la copia":preset==="subscription"?"Crea un abbonamento":preset==="planned"?"Crea una transazione pianificata":labels.title}</h2></div></div>
    {refundSource&&<div className="refund-source"><span>Spesa originale</span><b>{refundSource.label}</b><small>{money(Math.abs(refundSource.amount))} · {refundSource.account} · {refundSource.date}</small></div>}
    {isMealVoucher ? <div className="transaction-voucher-box">
      <div className="voucher-explainer"><span className="real-icon"><AppIcon name="voucher" size={21}/></span><div><b>{kind==="income"?"Carica buoni pasto":"Utilizza buoni pasto"}</b><small>Il valore unitario impostato nel conto è {money(voucherValue)}.</small></div></div>
      <label>Numero di buoni<input name="voucherCount" type="text" inputMode="numeric" value={voucherCount} onChange={e=>setVoucherCount(e.target.value.replace(/\D/g,""))} required/></label>
      <input name="amount" type="hidden" value={validVoucherCount*voucherValue}/>
      <div className="voucher-calculation"><span>{voucherCount || "0"} × {money(voucherValue)}</span><strong>{money(validVoucherCount*voucherValue)}</strong></div>
    </div> : <label>{isTransfer?"Importo inviato":"Valore"}<div className="amount-input"><span>{amountCurrency}</span><input name="amount" type="text" inputMode="none" required placeholder="0,00" value={amountValue} onPointerDown={event=>openAmountPad("amount",event)} onChange={event=>setSentAmount(event.target.value)}/></div></label>}
    {isTransfer ? <div className="transfer-fields">
      <label>Da<select className="hierarchical-account-select" value={from} onChange={e=>{setFrom(e.target.value);if(e.target.value===to)setTo(usableAccounts.find(account=>account.name!==e.target.value)?.name||"")}}>{usableAccounts.map(account=><option key={account.id} value={account.name}>{accountDisplayName(account)}</option>)}</select><small>Disponibile: {accountMoney(usableAccounts.find(account=>account.name===from)?.balance||0,usableAccounts.find(account=>account.name===from)?.currency)}</small></label>
      <div className="transfer-arrow">↓</div>
      <label>A<select className="hierarchical-account-select" value={to} onChange={e=>setTo(e.target.value)}>{usableAccounts.map(account=><option key={account.id} value={account.name} disabled={account.name===from}>{accountDisplayName(account)}</option>)}</select><small>Saldo: {accountMoney(usableAccounts.find(account=>account.name===to)?.balance||0,usableAccounts.find(account=>account.name===to)?.currency)}</small></label>
      {sourceAccount&&destinationAccount&&sourceAccount.currency!==destinationAccount.currency&&<><label>Importo ricevuto<div className="amount-input received"><span>{destinationAccount.currency}</span><input type="text" inputMode="none" required value={receivedValue} onPointerDown={event=>openAmountPad("received",event)} onChange={event=>setReceivedValue(event.target.value)}/></div></label><div className="effective-exchange-rate"><span>Cambio applicato</span><b>1 {sourceAccount.currency} = {Math.abs(parseItalianAmount(amountValue))>0?(Math.abs(parseItalianAmount(receivedValue))/Math.abs(parseItalianAmount(amountValue))).toLocaleString("it-IT",{maximumFractionDigits:6}):"—"} {destinationAccount.currency}</b></div></>}
    </div> : <>
      <label><span className="field-label-heading"><span>Categoria e sottocategoria</span></span><button type="button" className="category-select" onClick={()=>setCategoryOpen(true)}><span>⌘</span><b>{refundSource?`Rimborso · ${selectedCategory}`:selectedCategory}</b><i>⌄</i></button></label>
      <label>Conto<button type="button" className="category-select account-select" disabled={isMealVoucher} onClick={()=>setAccountOpen(true)}><span><AppIcon name="accounts" size={16}/></span><b>{selectedCard?.name || selectedAccount || "Seleziona conto"}</b><i>⌄</i></button>{isMealVoucher&&<small className="auto-account-note">{mealVoucherAccount?.name || "Buoni pasto"} selezionato automaticamente</small>}</label>
    </>}
    <label>Data<button type="button" className="date-wheel-trigger" onClick={()=>setDateOpen(true)}><span>◫</span><b>{formatItalianDate(selectedDateISO)}</b><i>›</i></button></label>
    {!planned && <div className="modal-toggle"><div><b>Contabilizzata</b><span>Disattivala se il movimento deve ancora essere verificato</span></div><button type="button" className={accounted?"on":""} onClick={()=>setAccounted(x=>!x)}><i/></button></div>}
    {!refundSource&&preset==="normal"&&<div className="modal-toggle"><div><b>{labels.planned}</b><span>Programma il movimento per una data futura</span></div><button type="button" className={planned?"on":""} onClick={()=>setPlanned(x=>!x)}><i/></button></div>}
    {planned && <div className="planning-details">
      <p>A partire dalla data selezionata</p>
      <div className="form-grid"><label>Ripeti ogni<input type="number" min="1" value={intervalCount} onChange={event=>setIntervalCount(Math.max(1,Number(event.target.value)||1))}/></label><label>Frequenza<select value={frequency} onChange={event=>setFrequency(event.target.value as Transaction["frequency"])}><option value="daily">Giorno</option><option value="weekly">Settimana</option><option value="monthly">Mese</option><option value="yearly">Anno</option></select></label></div>
      <label>Numero di volte<input type="number" min="0" value={occurrenceLimit} onChange={event=>setOccurrenceLimit(Math.max(0,Number(event.target.value)||0))} placeholder="0 significa senza limiti"/></label>
      <div className="modal-toggle"><div><b>Contabilizzazione automatica</b><span>Il movimento sarà contabilizzato alla scadenza</span></div><button type="button" className={autoAccounted?"on":""} onClick={()=>setAutoAccounted(x=>!x)}><i/></button></div>
      {kind==="expense" && preset!=="subscription" && <div className="modal-toggle"><div><b>È un abbonamento?</b><span>Mostralo nella pagina Abbonamenti</span></div><button type="button" className={subscription?"on":""} onClick={()=>setSubscription(x=>!x)}><i/></button></div>}
      <label>Promemoria<select defaultValue="Nessun promemoria"><option>Nessun promemoria</option><option>Il giorno prima</option><option>3 giorni prima</option><option>7 giorni prima</option></select></label>
    </div>}
    {!isTransfer&&<label>Note<textarea name="notes" rows={3} value={notesValue} onChange={event=>setNotesValue(event.target.value)} placeholder="Aggiungi una nota (opzionale)"/></label>}
    <div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className={`save-action ${kind}`}>{refundSource?"Salva rimborso":labels.save}</button></div>
    {categoryOpen && <div className="picker-dim-layer keyboard-aware-picker" style={categoryViewport?{"--picker-vv-top":`${categoryViewport.top}px`,"--picker-vv-height":`${categoryViewport.height}px`} as CSSProperties:undefined} onMouseDown={()=>setCategoryOpen(false)}><div className="category-picker" onMouseDown={event=>event.stopPropagation()}>
      <div className="category-picker-title"><div><small>SELEZIONA CATEGORIA</small><h3>Categoria e sottocategoria</h3></div><div className="category-picker-actions">{!refundSource&&<button type="button" className="template-trigger picker-template-trigger" onClick={()=>{setCategoryOpen(false);setTemplateOpen(true)}} aria-label="Apri modelli" title="Modelli"><AppIcon name="star" size={21}/></button>}<button type="button" onClick={()=>setCategoryOpen(false)} aria-label="Chiudi"><AppIcon name="close" size={21}/></button></div></div>
      <div className="category-search"><AppIcon name="search" size={15}/><input enterKeyHint="search" value={categoryQuery} onChange={event=>setCategoryQuery(event.target.value)} placeholder="Cerca categoria..." /></div>
      <div className="category-tree">
        {visibleCategoryGroups.map(({root,children})=>{const rootStyle=categoryVisual(root);const expanded=Boolean(normalizedCategoryQuery)||expandedCategory===root.name;return <div className="category-group" key={root.id}><button type="button" onClick={()=>{if(!children.length){setSelectedCategory(root.name);setCategoryOpen(false);if(!selectedAccount)setAccountOpen(true)}else setExpandedCategory(expandedCategory===root.name?"":root.name)}}><span className="real-icon" style={{color:rootStyle.color,background:`${rootStyle.color}18`}}><AppIcon name={rootStyle.icon} size={16}/></span><b>{root.name}</b><i><AppIcon name={!children.length?"forward":expanded?"up":"down"} size={15}/></i></button>{expanded&&children.length>0&&<div className="subcategory-list">{children.map(child=>{const childStyle=categoryVisual(child);const voucher=mealVoucherLeaf(child.name);return <button type="button" className="subcategory-choice" key={child.id} onClick={()=>{setSelectedCategory(`${root.name} › ${child.name}`);if(voucher){setSelectedAccount(mealVoucherAccount?.name || "Buoni pasto");setSelectedCardId(null)};setCategoryOpen(false);if(!voucher)setAccountOpen(true)}}><span className="sub-symbol real-icon" style={{color:childStyle.color,background:`${childStyle.color}18`}}><AppIcon name={childStyle.icon} size={16}/></span><div><b>{child.name}</b></div><i><AppIcon name="forward" size={14}/></i></button>})}</div>}</div>})}
        {!visibleCategoryGroups.length&&<div className="empty">Nessuna categoria trovata.</div>}
      </div>
    </div></div>}
    {templateOpen&&<div className="template-picker-layer" onMouseDown={()=>setTemplateOpen(false)}><div className="template-picker-card" onMouseDown={event=>event.stopPropagation()}><div className="template-picker-title"><div><small>COMPILAZIONE AUTOMATICA</small><h3>Seleziona un modello</h3></div><button type="button" onClick={()=>setTemplateOpen(false)}><AppIcon name="close"/></button></div><div className="template-picker-list">{templates.filter(template=>template.kind===kind).map(template=>{const visual=categoryVisualByName(template.category,categories);return <button type="button" key={template.id} onClick={()=>{setAmountValue(amountInput(template.amount));setSelectedCategory(template.category);setSelectedAccount(template.account);setSelectedCardId(null);setNotesValue(template.notes);setTemplateOpen(false);setCategoryOpen(false)}}><span style={{color:visual.color,background:`${visual.color}18`}}><AppIcon name={visual.icon} size={18}/></span><div><b>{template.name}</b><small>{template.category} · {template.account}</small></div><strong>{money(template.amount)}</strong></button>})}{!templates.some(template=>template.kind===kind)&&<div className="empty">Nessun modello per questa operazione.</div>}</div><button type="button" className="new-template-from-transaction" onClick={()=>{const name=window.prompt("Nome del nuovo modello");if(!name?.trim())return;const amount=Math.abs(parseItalianAmount(amountValue));if(!amount){alert("Inserisci prima il valore della transazione.");return;}const next=[...templates,{id:crypto.randomUUID(),name:name.trim(),kind:kind as "income"|"expense",amount,category:selectedCategory,account:selectedAccount,notes:notesValue}];setTemplates(next);saveTransactionTemplates(next);setTemplateOpen(false)}}><AppIcon name="plus" size={16}/> Salva i dati attuali come nuovo modello</button></div></div>}
    {accountOpen && <div className="account-picker-layer"><div className="account-picker-card"><h3>Seleziona conto</h3>{usableAccounts.map(account=><button type="button" key={account.id} onClick={()=>{setSelectedAccount(account.name);setSelectedCardId(null);setAccountOpen(false)}}><span><AppIcon name={account.icon} size={18}/></span><b>{account.name}</b><strong>{money(account.balance)}</strong></button>)}{cards.filter(card=>!card.archived).map(card=>{const linked=usableAccounts.find(account=>account.id===card.linkedAccountId);return <button type="button" key={card.id} onClick={()=>{setSelectedAccount(linked?.name||"");setSelectedCardId(card.id);setAccountOpen(false)}}><span><AppIcon name="card" size={18}/></span><b>{card.name}</b><strong>Carta di credito</strong></button>})}<button type="button" className="cancel-picker" onClick={()=>setAccountOpen(false)}>Annulla</button></div></div>}
    {dateOpen && <div className="date-picker-layer"><div className="date-picker-card"><h3>Seleziona data</h3><input className="native-date-input" type="date" value={selectedDateISO} onChange={event=>setSelectedDateISO(event.target.value)}/><div className="date-picker-actions"><button type="button" onClick={()=>setDateOpen(false)}>Annulla</button><button type="button" onClick={()=>setDateOpen(false)}>Conferma</button></div></div></div>}
    {amountPadTarget&&<div className="money-keypad-layer" onMouseDown={()=>setAmountPadTarget(null)}><div className="money-keypad" onMouseDown={event=>event.stopPropagation()}><div className="money-keypad-head"><span>{amountPadTarget==="received"?destinationAccount?.currency:amountCurrency}</span><strong>{amountPadTarget==="received"?(receivedValue||"0,00"):(amountValue||"0,00")}</strong><button type="button" onClick={()=>pressAmountKey("backspace")} aria-label="Cancella ultima cifra"><AppIcon name="back" size={22}/></button></div><div className="money-keypad-grid">{["1","2","3","4","5","6","7","8","9",",","0"].map(key=><button type="button" key={key} onClick={()=>pressAmountKey(key)}>{key}</button>)}<button type="button" className={`money-keypad-confirm ${kind}`} onClick={()=>setAmountPadTarget(null)} aria-label="Conferma valore"><AppIcon name="check" size={28}/></button></div></div></div>}
  </form></div>
}

function TransactionDetail({ transaction, close, account, duplicate, edit, remove, refund, skip, repeatNow }: {
  transaction: Transaction;
  close: () => void;
  account: () => void;
  duplicate: () => void;
  edit: () => void;
  remove: () => void;
  refund: () => void;
  skip?: () => void;
  repeatNow?: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const canRefund = transaction.amount < 0 && !transaction.isRefund;
  const isPlanned = Boolean(transaction.dueDate && !transaction.confirmedAt);
  return <div className="modal-backdrop">
    <article className="transaction-detail">
      <div className="transaction-detail-head">
        <button onClick={close} aria-label="Chiudi"><AppIcon name="back"/></button>
        <div><small>TRANSAZIONE</small><h2>{transaction.kind==="transfer"?"Giroconto":transaction.label}</h2></div>
        <button onClick={()=>setMenu(x=>!x)} aria-label="Altre azioni"><AppIcon name="more"/></button>
        {menu&&<div className="transaction-detail-menu">
          {isPlanned&&skip&&<button onClick={skip}><AppIcon name="planned" size={16}/> Salta ripetizione</button>}
          {isPlanned&&repeatNow&&<button onClick={repeatNow}><AppIcon name="repeat" size={16}/> Ripeti ora</button>}
          {canRefund&&!isPlanned&&<button onClick={refund}><AppIcon name="refund" size={16}/> Rimborso</button>}
          <button onClick={duplicate}><AppIcon name="plus" size={16}/> Duplica transazione</button>
          <button onClick={edit}><AppIcon name="edit" size={16}/> Modifica transazione</button>
          <button className="danger" onClick={remove}><AppIcon name="trash" size={16}/> Elimina transazione</button>
        </div>}
      </div>
      <div className={`transaction-detail-icon ${transaction.color}`}><AppIcon name={transaction.isRefund?"refund":transaction.icon} size={26}/></div>
      <strong className={`transaction-detail-amount ${transaction.amount>0?"positive":""}`}>{transaction.amount>0?"+":""}{accountMoney(transaction.amount,transaction.currency)}</strong>
      {transaction.isRefund&&<span className="refund-badge">Rimborso collegato alla spesa originale</span>}
      <div className="transaction-detail-data">
        <div><span>Categoria</span><b>{transaction.kind==="transfer"?"Giroconto":transaction.category}</b></div>
        <div><span>Conto</span><b>{transaction.account}</b></div>
        {transaction.kind==="transfer"&&<div><span>Trasferimento</span><b>{transaction.account} → {transaction.destinationAccountName||"Conto destinazione"}</b></div>}
        {transaction.kind==="transfer"&&transaction.destinationAmount&&<div><span>Importo ricevuto</span><b>{accountMoney(transaction.destinationAmount,transaction.destinationCurrency)}</b></div>}
        {transaction.kind==="transfer"&&transaction.exchangeRate&&<div><span>Cambio storico</span><b>1 {transaction.currency} = {transaction.exchangeRate.toLocaleString("it-IT",{maximumFractionDigits:6})} {transaction.destinationCurrency}</b></div>}
        {transaction.kind!=="transfer"&&transaction.notes?.trim()&&<div><span>Note</span><b>{transaction.notes}</b></div>}
        <div><span>Data</span><b>{transaction.date}</b></div>
        <div><span>Stato</span><b>{transaction.accounted===false?"Da contabilizzare":"Contabilizzata"}</b></div>
      </div>
      {transaction.accounted===false&&!isPlanned&&<button className="account-transaction" onClick={account}><AppIcon name="check" size={17}/> Contabilizza</button>}
      {transaction.isRefund&&<p className="refund-note">Questo movimento riduce il totale delle spese e non viene conteggiato tra le entrate.</p>}
    </article>
  </div>;
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState<Section>("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<{ kind: ActionKind; preset: "normal" | "planned" | "subscription"; defaultAccount?: string; cardId?: string; initial?: Transaction; editing?: boolean; refundSource?: Transaction; recurrenceEditId?: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [primaryCurrency,setPrimaryCurrency]=useState("EUR");
  const [dashboardAccountIds, setDashboardAccountIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = JSON.parse(window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY) || "{}") as DashboardPreferences;
      return Array.isArray(saved.accountIds) ? saved.accountIds : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [cards, setCards] = useState<MoneyCard[]>([]);
  const [budgets, setBudgets] = useState<MoneyBudget[]>([]);
  const [recurrences, setRecurrences] = useState<MoneyRecurrence[]>([]);
  const confirmingRecurrences = useRef(new Set<string>());
  const [dataBusy, setDataBusy] = useState(true);
  const [dataError, setDataError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  useEffect(()=>{if(user)void syncTransactionTemplates()},[user?.id]);
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>{
      window.scrollTo({top:0,left:0,behavior:"instant"});
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      document.querySelector("main")?.scrollTo({top:0,left:0,behavior:"instant"});
    });
    return()=>window.cancelAnimationFrame(frame);
  },[active]);
  const refreshSequence = useRef(0);
  const accrueDailyInterest = async (data:Awaited<ReturnType<typeof loadMoneyData>>,activeUser:User) => {
    const deposits=data.accounts.filter(account=>!account.archived&&!account.isContainer&&account.accountRole==="deposit"&&account.annualInterestRate>0);
    if(!deposits.length)return false;
    const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const cutoff=toIsoDate(yesterday);
    let changed=false;
    for(const account of deposits){
      const last=account.interestLastAccrualDate||cutoff;
      const cursor=new Date(`${last}T12:00:00`);cursor.setDate(cursor.getDate()+1);
      let generated=0;
      while(toIsoDate(cursor)<=cutoff){
        const date=toIsoDate(cursor);
        const balanceAtDate=account.openingBalance+data.transactions.filter(transaction=>(transaction.accountId===account.id||transaction.destinationAccountId===account.id)&&(!transaction.dueDate||transaction.confirmedAt)&&transaction.transactionDate<=date).reduce((sum,transaction)=>{
          if(transaction.kind==="transfer")return transaction.accountId===account.id?sum-transaction.amount:sum+(transaction.destinationAmount??transaction.amount);
          if(transaction.accountId!==account.id)return sum;
          return sum+(transaction.kind==="expense"||transaction.kind==="card_repayment"?-transaction.amount:transaction.amount);
        },0)+generated;
        const interest=Math.round(Math.max(0,balanceAtDate)*account.annualInterestRate/100/365*100)/100;
        if(interest>0){
          const interestCategory=data.categories.find(category=>category.kind==="income"&&category.name.toLocaleLowerCase("it-IT")==="interessi maturati");
          const {error}=await getSupabaseBrowserClient().from("transactions").insert({user_id:activeUser.id,kind:"income",account_id:account.id,category_id:interestCategory?.id??null,amount:interest,transaction_date:date,confirmed_at:new Date().toISOString(),accounted_at:new Date().toISOString(),notes:"Interesse giornaliero automatico"});
          if(!error){generated+=interest;changed=true}else if(error.code!=="23505")throw error;
        }
        cursor.setDate(cursor.getDate()+1);
      }
      if(!account.interestLastAccrualDate||last<cutoff){const {error}=await getSupabaseBrowserClient().from("accounts").update({interest_last_accrual_date:cutoff}).eq("id",account.id);if(error)throw error;changed=true;}
    }
    return changed;
  };
  const refreshData = async (activeUser = user) => {
    if (!activeUser) return;
    const sequence = ++refreshSequence.current;
    try {
      let data = await loadMoneyData(getSupabaseBrowserClient(), activeUser.id);
      if(await accrueDailyInterest(data,activeUser))data=await loadMoneyData(getSupabaseBrowserClient(), activeUser.id);

      // Saving a transaction triggers both the explicit refresh below and a
      // Supabase realtime event. Never let an older/slower refresh overwrite a
      // newer snapshot, otherwise balances can temporarily revert or jump.
      if (sequence !== refreshSequence.current) return;

      const orderedAccounts=data.accounts;
      setAccounts(orderedAccounts);
      setPrimaryCurrency(data.primaryCurrency);window.localStorage.setItem(PRIMARY_CURRENCY_KEY,data.primaryCurrency);
      setCategories(data.categories);
      setCards(data.cards);
      setBudgets(data.budgets);
      setRecurrences(data.recurrences);
      setTransactions(data.transactions.map(row => transactionFromDatabase(row, orderedAccounts, data.categories, data.cards)));
      setDataError("");
    } catch (error) {
      if (sequence !== refreshSequence.current) return;
      console.error(error);
      const message = typeof error === "object" && error && "message" in error ? String(error.message) : "Errore sconosciuto";
      setDataError(`Sincronizzazione non completata: ${message}`);
    } finally {
      if (sequence === refreshSequence.current) setDataBusy(false);
    }
  };
  const saveTransaction = async (transaction: Transaction) => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const account = accounts.find(item => item.name === transaction.account);
    const destinationAccount = accounts.find(item => item.name === transaction.destinationAccountId || item.id === transaction.destinationAccountId);
    const leafName = transaction.category.replace("Rimborso · ", "").split("›").at(-1)?.trim();
    const category = categories.find(item => item.name === leafName && item.kind === (transaction.amount < 0 ? "expense" : transaction.isRefund ? "expense" : "income"));
    if (!account) {
      setDataError("Seleziona un conto valido prima di salvare.");
      return;
    }
    if(transaction.amount<0&&!transaction.planned&&category){
      const month=(transaction.dateISO??toIsoDate(new Date())).slice(0,7);
      const budget=budgets.find(item=>item.categoryId===category.id&&item.month.startsWith(month));
      if(budget){
        const alreadySpent=transactions.filter(item=>item.id!==transaction.id&&isEffectiveTransaction(item)&&item.categoryId===category.id&&item.kind==="expense"&&item.dateISO?.startsWith(month)).reduce((sum,item)=>sum+Math.abs(item.amount),0);
        const projected=alreadySpent+Math.abs(transaction.amount);
        if(projected>=budget.amount){
          const exceeded=projected>budget.amount;
          const message=`Hai ${exceeded?"superato":"raggiunto"} il budget “${transaction.category}” (${accountMoney(projected,primaryCurrency)} su ${accountMoney(budget.amount,primaryCurrency)}). Continuare?`;
          if(!window.confirm(message))return;
          if(window.localStorage.getItem(BUDGET_NOTIFICATIONS_KEY)!=="false"&&"Notification" in window){
            if(Notification.permission==="granted")new Notification("Budget raggiunto",{body:message.replace(" Continuare?","")});
            else if(Notification.permission==="default")void Notification.requestPermission().then(permission=>{if(permission==="granted")new Notification("Budget raggiunto",{body:message.replace(" Continuare?","")})});
          }
        }
      }
    }
    let recurrenceId: string | null = transaction.recurrenceId ?? null;
    if (modal?.recurrenceEditId) {
      const { error } = await supabase.from("recurrences").update({
        account_id: account.id,
        card_id: transaction.cardId ?? null,
        destination_account_id: transaction.kind === "transfer" ? destinationAccount?.id ?? null : null,
        category_id: transaction.kind === "transfer" ? null : category?.id ?? null,
        kind: transaction.kind === "transfer" ? "transfer" : transaction.amount < 0 ? "expense" : "income",
        amount: Math.abs(transaction.amount),
        frequency: transaction.frequency ?? "monthly",
        interval_count: transaction.intervalCount ?? 1,
        occurrence_limit: transaction.occurrenceLimit ?? null,
        next_date: transaction.dateISO ?? toIsoDate(new Date()),
        automatic_accounting: transaction.automaticAccounting ?? false,
        is_subscription: transaction.subscription ?? false,
        notes: transaction.notes?.trim() || transaction.label,
      }).eq("id", modal.recurrenceEditId);
      if (error) { setDataError(error.message); return; }
      setModal(null);
      await refreshData(user);
      return;
    }
    if (transaction.planned && !recurrenceId) {
      const { data: recurrence, error } = await supabase.from("recurrences").insert({
        user_id: user.id,
        account_id: account.id,
        card_id: transaction.cardId ?? null,
        destination_account_id: transaction.kind === "transfer" ? destinationAccount?.id : null,
        category_id: category?.id ?? null,
        kind: transaction.kind === "transfer" ? "transfer" : transaction.amount < 0 ? "expense" : "income",
        amount: Math.abs(transaction.amount),
        frequency: transaction.frequency ?? "monthly",
        interval_count: transaction.intervalCount ?? 1,
        occurrence_limit: transaction.occurrenceLimit ?? null,
        next_date: transaction.dateISO ?? toIsoDate(new Date()),
        automatic_accounting: transaction.automaticAccounting ?? false,
        is_subscription: transaction.subscription ?? false,
        notes: transaction.notes?.trim() || transaction.label,
      }).select("id").single();
      if (error) { setDataError(error.message); return; }
      recurrenceId = recurrence?.id ?? null;
    }
    const payload = {
      user_id: user.id,
      kind: transaction.isRefund ? "refund" : transaction.kind === "transfer" ? "transfer" : transaction.amount < 0 ? "expense" : "income",
      account_id: account.id,
      card_id: transaction.cardId ?? null,
      destination_account_id: transaction.kind === "transfer" ? destinationAccount?.id ?? null : null,
      category_id: category?.id ?? null,
      recurrence_id: recurrenceId,
      refund_of_id: transaction.isRefund ? transaction.refundOf ?? null : null,
      transfer_group_id: transaction.kind === "transfer" ? crypto.randomUUID() : null,
      amount: Math.abs(transaction.amount),
      destination_amount: transaction.kind === "transfer" ? transaction.destinationAmount || Math.abs(transaction.amount) : null,
      exchange_rate: transaction.kind === "transfer" ? transaction.exchangeRate || 1 : null,
      voucher_count: transaction.voucherCount ?? null,
      transaction_date: transaction.dateISO ?? toIsoDate(new Date()),
      due_date: transaction.planned ? transaction.dateISO ?? toIsoDate(new Date()) : null,
      confirmed_at: transaction.planned ? null : new Date().toISOString(),
      accounted_at: transaction.accounted ? new Date().toISOString() : null,
      notes: transaction.notes?.trim() || null,
    };
    const optimisticTransaction:Transaction={...transaction,accountId:account.id,categoryId:category?.id??null,dateISO:transaction.dateISO??toIsoDate(new Date()),date:formatItalianDate(transaction.dateISO??toIsoDate(new Date())),confirmedAt:transaction.planned?null:new Date().toISOString(),dueDate:transaction.planned?(transaction.dateISO??toIsoDate(new Date())):null,accounted:Boolean(transaction.accounted)};
    setTransactions(current=>modal?.editing?current.map(item=>item.id===transaction.id?optimisticTransaction:item):[optimisticTransaction,...current]);
    setModal(null);
    const result = modal?.editing
      ? await supabase.from("transactions").update(payload).eq("id", transaction.id)
      : await supabase.from("transactions").insert(payload);
    if (result.error) { setDataError(result.error.message); await refreshData(user); return; }
    await refreshData(user);
  };
  const moveAccount = async(accountId:string,direction:-1|1) => {
    const active=accounts.filter(account=>!account.archived);
    const index=active.findIndex(account=>account.id===accountId);const target=index+direction;
    if(index<0||target<0||target>=active.length)return;
    [active[index],active[target]]=[active[target],active[index]];
    setAccounts(current=>[...active,...current.filter(account=>account.archived)]);
    const results=await Promise.all(active.map((account,position)=>getSupabaseBrowserClient().from("accounts").update({sort_order:position}).eq("id",account.id)));
    const error=results.find(result=>result.error)?.error;if(error){setDataError(error.message);await refreshData(user);return;}
    await refreshData(user);
  };
  const openRecurrenceEditor = (recurrence: MoneyRecurrence, duplicate = false) => {
    const category = categories.find(item => item.id === recurrence.categoryId);
    const parent = category?.parentId ? categories.find(item => item.id === category.parentId) : null;
    const categoryLabel = category ? (parent ? `${parent.name} › ${category.name}` : category.name) : recurrence.kind === "transfer" ? "Trasferimento tra conti" : "Senza categoria";
    const account = accounts.find(item => item.id === recurrence.accountId);
    const destination = accounts.find(item => item.id === recurrence.destinationAccountId);
    const card = cards.find(item => item.id === recurrence.cardId);
    const voucherValue = accounts.find(item => item.type === "meal_vouchers")?.voucherUnitValue || 8;
    const isVoucher = category?.name === "Buoni pasto";
    const initial: Transaction = {
      id: duplicate ? crypto.randomUUID() : recurrence.id,
      label: recurrence.notes || category?.name || (recurrence.kind === "transfer" ? "Giroconto" : "Pianificata"),
      category: categoryLabel,
      account: account?.name || "",
      notes: recurrence.notes,
      destinationAccountId: destination?.name || null,
      destinationAccountName: destination?.name || null,
      date: formatItalianDate(recurrence.nextDate),
      dateISO: recurrence.nextDate,
      amount: recurrence.kind === "expense" ? -Math.abs(recurrence.amount) : Math.abs(recurrence.amount),
      icon: category?.icon || recurrence.kind,
      color: category?.color || "#7c65b5",
      accounted: false,
      accountId: recurrence.accountId ?? undefined,
      cardId: card?.id ?? null,
      categoryId: recurrence.categoryId,
      recurrenceId: duplicate ? null : recurrence.id,
      kind: recurrence.kind,
      voucherCount: isVoucher ? Math.max(1, Math.round(recurrence.amount / voucherValue)) : null,
      planned: true,
      subscription: recurrence.isSubscription,
      automaticAccounting: recurrence.automaticAccounting,
      frequency: recurrence.frequency,
      intervalCount: recurrence.intervalCount,
      occurrenceLimit: recurrence.occurrenceLimit,
    };
    setModal({
      kind: recurrence.kind,
      preset: recurrence.isSubscription ? "subscription" : "planned",
      defaultAccount: account?.name,
      cardId: card?.id,
      initial,
      editing: !duplicate,
      recurrenceEditId: duplicate ? undefined : recurrence.id,
    });
  };
  const accountTransaction = async () => {
    if(!selectedTransaction) return;
    const transactionId=selectedTransaction.id;
    setTransactions(current=>current.map(item=>item.id===transactionId?{...item,accounted:true}:item));
    setSelectedTransaction(null);
    const { error } = await getSupabaseBrowserClient().from("transactions").update({ accounted_at: new Date().toISOString() }).eq("id", selectedTransaction.id);
    if (error) { setDataError(error.message); await refreshData(); return; }
    await refreshData();
  };
  const beginRefund = () => {
    if(!selectedTransaction) return;
    const original = selectedTransaction;
    setSelectedTransaction(null);
    setModal({kind:"income",preset:"normal",defaultAccount:original.account,initial:{...original,id:crypto.randomUUID(),amount:Math.abs(original.amount),accounted:false},refundSource:original});
  };
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setDataBusy(true);
    void refreshData(user);
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`money-elite-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${user.id}` }, () => void refreshData(user))
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, () => void refreshData(user))
      .on("postgres_changes", { event: "*", schema: "public", table: "recurrences", filter: `user_id=eq.${user.id}` }, () => void refreshData(user))
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets", filter: `user_id=eq.${user.id}` }, () => void refreshData(user))
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_templates", filter: `user_id=eq.${user.id}` }, () => void syncTransactionTemplates())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    setUser(null);
  };

  const saveAccount = async (draft: AccountDraft, account?: MoneyAccount) => {
    if(!user) return;
    const payload = {
      user_id: user.id,
      name: draft.name,
      type: draft.type,
      opening_balance: draft.openingBalance,
      voucher_unit_value: draft.type === "meal_vouchers" ? draft.voucherUnitValue : null,
      notes: draft.notes || null,
      icon: draft.icon,
      currency: draft.currency,
      exchange_rate: draft.type === "meal_vouchers" ? 1 : draft.exchangeRate,
      is_container: draft.isContainer,
      parent_account_id: draft.parentAccountId,
      account_role: draft.accountRole,
      annual_interest_rate: draft.annualInterestRate,
      interest_last_accrual_date: account?.interestLastAccrualDate ?? (draft.accountRole==="deposit"?toIsoDate(new Date(Date.now()-86400000)):null),
      sort_order: account?.sortOrder ?? Math.max(-1,...accounts.map(item=>item.sortOrder||0))+1,
      color: draft.type === "meal_vouchers" ? "#7051bf" : "#4f9d82",
    };
    const result = account
      ? await getSupabaseBrowserClient().from("accounts").update(payload).eq("id",account.id)
      : await getSupabaseBrowserClient().from("accounts").insert(payload);
    if(result.error){setDataError(result.error.message);return;}
    await refreshData(user);
  };
  const changePrimaryCurrency=async(currency:string)=>{if(!user)return;const {error}=await getSupabaseBrowserClient().from("profiles").update({currency}).eq("id",user.id);if(error){setDataError(error.message);return;}setPrimaryCurrency(currency);window.localStorage.setItem(PRIMARY_CURRENCY_KEY,currency);await refreshData(user)};
  const toggleAccount = async (account: MoneyAccount) => {
    const {error}=await getSupabaseBrowserClient().from("accounts").update({hidden_from_totals:!account.hidden}).eq("id",account.id);
    if(error){setDataError(error.message);return;}
    await refreshData();
  };
  const archiveAccount = async (account: MoneyAccount) => {
    if(account.isContainer&&accounts.some(item=>item.parentAccountId===account.id&&!item.archived)){setDataError("Prima di archiviare un contenitore, sposta o archivia tutti i conti che contiene.");return;}
    if(!window.confirm(`Archiviare il conto “${account.name}”? Le transazioni resteranno nei bilanci e non sarà più possibile aggiungerne di nuove.`)) return;
    const {error}=await getSupabaseBrowserClient().from("accounts").update({archived_at:new Date().toISOString()}).eq("id",account.id);
    if(error){setDataError(error.message);return;}
    await refreshData();
  };
  const deleteAccount = async (account: MoneyAccount) => {
    if(account.isContainer&&accounts.some(item=>item.parentAccountId===account.id)){setDataError("Il contenitore non può essere eliminato finché contiene dei conti.");return;}
    if(account.archived){setDataError("Un conto archiviato resta disponibile in sola consultazione e non può essere eliminato.");return;}
    if(!window.confirm(`Eliminare definitivamente “${account.name}” e tutte le transazioni associate? Questa operazione non può essere annullata.`)) return;
    const supabase=getSupabaseBrowserClient();
    const recurrenceResult=await supabase.from("recurrences").delete().or(`account_id.eq.${account.id},destination_account_id.eq.${account.id}`);
    if(recurrenceResult.error){setDataError(recurrenceResult.error.message);return;}
    const transactionResult=await supabase.from("transactions").delete().or(`account_id.eq.${account.id},destination_account_id.eq.${account.id}`);
    if(transactionResult.error){setDataError(transactionResult.error.message);return;}
    const {error}=await supabase.from("accounts").delete().eq("id",account.id);
    if(error){setDataError(error.message);return;}
    await refreshData();
  };
  const removeTransaction = async (transaction: Transaction) => {
    if(!window.confirm("Eliminare definitivamente questa transazione?")) return;
    const {error}=await getSupabaseBrowserClient().from("transactions").delete().eq("id",transaction.id);
    if(error){setDataError(error.message);return;}
    setSelectedTransaction(null);
    await refreshData();
  };
  const confirmPlannedTransaction = async (transaction: Transaction) => {
    const supabase=getSupabaseBrowserClient();
    const recurrence=recurrences.find(item=>item.id===transaction.recurrenceId);
    if(!user||!recurrence||!transaction.accountId) return;
    const confirmationKey=`${recurrence.id}:${recurrence.nextDate}`;
    if(confirmingRecurrences.current.has(confirmationKey)) return;
    confirmingRecurrences.current.add(confirmationKey);
    setDataError("");
    const optimisticNextDate=nextRecurrenceDate(recurrence);
    const optimisticCount=recurrence.occurrenceCount+1;
    setRecurrences(current=>current.map(item=>item.id===recurrence.id?{...item,nextDate:optimisticNextDate,occurrenceCount:optimisticCount}:item));
    setTransactions(current=>[{...transaction,id:transaction.recurrencePlaceholder?`optimistic:${confirmationKey}`:transaction.id,confirmedAt:new Date().toISOString(),accounted:recurrence.automaticAccounting,dueDate:recurrence.nextDate,recurrencePlaceholder:false},...current.filter(item=>item.id!==transaction.id)]);
    try {
      const {data:existing,error:lookupError}=await supabase.from("transactions")
        .select("id")
        .eq("recurrence_id",recurrence.id)
        .eq("due_date",recurrence.nextDate)
        .is("confirmed_at",null)
        .order("created_at",{ascending:true})
        .limit(1)
        .maybeSingle();
      if(lookupError) throw lookupError;
      let transactionId=existing?.id ?? (transaction.recurrencePlaceholder ? null : transaction.id);
      if(!transactionId){
        const {data:created,error:insertError}=await supabase.from("transactions").insert({
          user_id:user.id,
          kind:recurrence.kind,
          account_id:recurrence.accountId,
          destination_account_id:recurrence.kind==="transfer"?recurrence.destinationAccountId:null,
          card_id:recurrence.cardId,
          category_id:recurrence.kind==="transfer"?null:recurrence.categoryId,
          recurrence_id:recurrence.id,
          transfer_group_id:recurrence.kind==="transfer"?crypto.randomUUID():null,
          amount:Math.abs(recurrence.amount),
          transaction_date:recurrence.nextDate,
          due_date:recurrence.nextDate,
          confirmed_at:null,
          accounted_at:null,
          notes:recurrence.notes?.trim()||null,
        }).select("id").single();
        if(insertError) throw insertError;
        transactionId=created.id;
      }
      const now=new Date().toISOString();
      const updates: { confirmed_at: string; accounted_at?: string } = { confirmed_at: now };
      if(recurrence.automaticAccounting) updates.accounted_at = now;
      const {error:confirmError}=await supabase.from("transactions").update(updates).eq("id",transactionId).is("confirmed_at",null);
      if(confirmError) throw confirmError;
      const occurrenceCount=recurrence.occurrenceCount+1;
      const nextDate=nextRecurrenceDate(recurrence);
      const completedByLimit=recurrence.occurrenceLimit!==null&&occurrenceCount>=recurrence.occurrenceLimit;
      const completedByEndDate=Boolean(recurrence.endDate&&nextDate>recurrence.endDate);
      const {error:recurrenceError}=await supabase.from("recurrences").update({
        occurrence_count:occurrenceCount,
        next_date:nextDate,
        active:!(completedByLimit||completedByEndDate),
      }).eq("id",recurrence.id).eq("next_date",recurrence.nextDate);
      if(recurrenceError) throw recurrenceError;
      await refreshData(user);
    } catch(error) {
      setDataError(error instanceof Error?error.message:"Impossibile confermare la transazione pianificata.");
      await refreshData(user);
    } finally {
      confirmingRecurrences.current.delete(confirmationKey);
    }
  };
  const skipPlannedTransaction = async (transaction: Transaction) => {
    if(!transaction.dueDate) return;
    const nextDate=addOneMonth(transaction.dueDate);
    if(!window.confirm(`Saltare la prossima ripetizione del ${formatItalianDate(transaction.dueDate)}? La nuova scadenza sarà ${formatItalianDate(nextDate)}.`)) return;
    const supabase=getSupabaseBrowserClient();
    const {error}=await supabase.from("transactions").update({transaction_date:nextDate,due_date:nextDate}).eq("id",transaction.id);
    if(error){setDataError(error.message);return;}
    if(transaction.recurrenceId) await supabase.from("recurrences").update({next_date:nextDate}).eq("id",transaction.recurrenceId);
    setSelectedTransaction(null);
    await refreshData();
  };
  const repeatPlannedNow = async (transaction: Transaction) => {
    if(!user||!transaction.dueDate||!transaction.accountId) return;
    const today=toIsoDate(new Date());
    if(!window.confirm(`Anticipare la ripetizione dal ${formatItalianDate(transaction.dueDate)} a oggi, ${formatItalianDate(today)}?`)) return;
    const supabase=getSupabaseBrowserClient();
    const nextDate=addOneMonth(transaction.dueDate);
    const {error}=await supabase.from("transactions").update({transaction_date:today,due_date:today,confirmed_at:new Date().toISOString()}).eq("id",transaction.id);
    if(error){setDataError(error.message);return;}
    await supabase.from("transactions").insert({user_id:user.id,kind:transaction.kind|| (transaction.amount<0?"expense":"income"),account_id:transaction.accountId,destination_account_id:transaction.destinationAccountId||null,category_id:transaction.categoryId||null,recurrence_id:transaction.recurrenceId||null,transfer_group_id:transaction.kind==="transfer"?crypto.randomUUID():null,amount:Math.abs(transaction.amount),voucher_count:transaction.voucherCount||null,transaction_date:nextDate,due_date:nextDate,confirmed_at:null,accounted_at:null,notes:transaction.notes?.trim()||null});
    if(transaction.recurrenceId) await supabase.from("recurrences").update({next_date:nextDate}).eq("id",transaction.recurrenceId);
    setSelectedTransaction(null);
    await refreshData();
  };


  useEffect(() => {
    if (!accounts.length || dashboardAccountIds.length) return;
    const defaults = accounts.filter(account=>!account.archived&&!account.hidden&&!account.isContainer).slice(0,4).map(account=>account.id);
    if (!defaults.length) return;
    setDashboardAccountIds(defaults);
    window.localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify({accountIds:defaults} satisfies DashboardPreferences));
  }, [accounts, dashboardAccountIds.length]);

  const updateDashboardAccounts = (ids:string[]) => {
    setDashboardAccountIds(ids);
    window.localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify({accountIds:ids} satisfies DashboardPreferences));
  };

  const choose = (s: Section) => { setActive(s); setMobileNav(false); };
  if (!authReady) {
    return <main className="auth-loading"><img src={assetPath("/money-elite-icon.png")} alt="Money Elite"/><span>Caricamento sicuro…</span></main>;
  }
  if (!user) return <LoginScreen onSignedIn={setUser}/>;
  if (dataBusy) return <main className="auth-loading"><img src={assetPath("/money-elite-icon.png")} alt="Money Elite"/><span>Sincronizzazione dati…</span></main>;

  return (
    <div className="app-shell">
      <div className={mobileNav ? "mobile-overlay show" : "mobile-overlay"} onClick={()=>setMobileNav(false)} />
      <div className={mobileNav ? "sidebar-wrap open" : "sidebar-wrap"}><Sidebar active={active} setActive={choose} email={user.email ?? ""} signOut={signOut}/></div>
      <main>
        <button className="mobile-menu" onClick={()=>setMobileNav(true)}>☰</button>
        <Header active={active} />
        <div className="page-content">
          {dataError && <div className="data-error" role="alert">{dataError}<button onClick={()=>void refreshData()}>Riprova</button></div>}
          {active === "Dashboard" ? <Dashboard transactions={transactions} accounts={accounts} cards={cards} budgets={budgets} categories={categories} recurrences={recurrences} primaryCurrency={primaryCurrency} dashboardAccountIds={dashboardAccountIds} setActive={setActive} confirmTransaction={confirmPlannedTransaction} openTransaction={setSelectedTransaction}/> : active === "Transazioni" ? <TransactionsSection transactions={transactions.filter(transaction=>!transaction.dueDate||Boolean(transaction.confirmedAt))} openTransaction={setSelectedTransaction}/> : <GenericSection section={active} accounts={accounts} cards={cards} budgets={budgets} recurrences={recurrences} categories={categories} transactions={transactions} primaryCurrency={primaryCurrency} onChangePrimaryCurrency={changePrimaryCurrency} dashboardAccountIds={dashboardAccountIds} onChangeDashboardAccounts={updateDashboardAccounts} onSaveAccount={saveAccount} onToggleAccount={toggleAccount} onArchiveAccount={archiveAccount} onDeleteAccount={deleteAccount} onMoveAccount={moveAccount} openTransaction={setSelectedTransaction} editRecurrence={openRecurrenceEditor} duplicateRecurrence={recurrence=>openRecurrenceEditor(recurrence,true)} refresh={()=>refreshData(user)} onAdd={(kind,defaultAccount,cardId)=>setModal({kind,preset:"normal",defaultAccount,cardId})}/>} 
        </div>
      </main>
      {(["Dashboard","Transazioni","Pianificate"] as Section[]).includes(active) && <QuickActions plannedLabels={active==="Pianificate"} allowTransfer={active !== "Transazioni"} openAction={kind=>setModal({kind,preset:active==="Pianificate"?"planned":"normal"})} />}
      {active === "Abbonamenti" && <button className="quick-main quick-standalone" onClick={()=>setModal({kind:"expense",preset:"subscription"})}>+</button>}
      {selectedTransaction&&<TransactionDetail transaction={selectedTransaction} close={()=>setSelectedTransaction(null)} account={accountTransaction} refund={beginRefund} skip={()=>void skipPlannedTransaction(selectedTransaction)} repeatNow={()=>void repeatPlannedNow(selectedTransaction)} duplicate={()=>{const t=selectedTransaction;setSelectedTransaction(null);setModal({kind:t.kind==="transfer"?"transfer":t.amount<0?"expense":"income",preset:"normal",defaultAccount:t.account,initial:{...t,id:crypto.randomUUID()}})}} edit={()=>{const t=selectedTransaction;setSelectedTransaction(null);const stillPending=Boolean(t.dueDate&&!t.confirmedAt);setModal({kind:t.kind==="transfer"?"transfer":t.amount<0?"expense":"income",preset:stillPending?"planned":"normal",defaultAccount:t.account,initial:{...t,planned:stillPending},editing:true})}} remove={()=>void removeTransaction(selectedTransaction)}/>} 
      {modal && <TransactionModal kind={modal.kind} preset={modal.preset} defaultAccount={modal.defaultAccount} cardId={modal.cardId} initial={modal.initial} editing={modal.editing} refundSource={modal.refundSource} accounts={accounts} cards={cards} categories={categories} close={()=>setModal(null)} add={saveTransaction}/>}
    </div>
  );
}
