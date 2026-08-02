"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  | "Impostazioni";

type Transaction = {
  id: string;
  label: string;
  category: string;
  account: string;
  date: string;
  amount: number;
  icon: string;
  color: string;
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
};

type AccountDraft = {
  name: string;
  type: MoneyAccount["type"];
  openingBalance: number;
  voucherUnitValue: number | null;
  notes: string;
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
  { label: "Debiti", icon: "debts" },
  { label: "Report", icon: "report" },
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

const transactionFromDatabase = (row: MoneyTransaction, accounts: MoneyAccount[], categories: MoneyCategory[], cards: MoneyCard[]): Transaction => {
  const account = accounts.find(item => item.id === row.accountId);
  const card = cards.find(item => item.id === row.cardId);
  const category = categories.find(item => item.id === row.categoryId);
  const parent = category?.parentId ? categories.find(item => item.id === category.parentId) : null;
  const categoryLabel = category ? (parent ? `${parent.name} › ${category.name}` : category.name) : row.kind === "transfer" ? "Trasferimento tra conti" : "Senza categoria";
  const signedAmount = row.kind === "expense" || row.kind === "card_repayment" ? -row.amount : row.amount;
  return {
    id: row.id,
    label: row.notes || (row.kind === "refund" ? `Rimborso ${category?.name ?? "spesa"}` : category?.name ?? (row.kind === "transfer" ? "Trasferimento fondi" : "Transazione")),
    category: row.kind === "refund" ? `Rimborso · ${categoryLabel}` : categoryLabel,
    account: card?.name ?? account?.name ?? "Conto archiviato",
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
    icon: category?.icon || (row.kind === "transfer" ? "transfer" : row.kind === "refund" ? "refund" : row.kind === "income" ? "income" : "expense"),
    color: row.kind === "income" || row.kind === "refund" ? "green" : row.kind === "transfer" ? "blue" : "orange",
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
  eye:L.Eye,eyeOff:L.EyeOff,check:L.Check,down:L.ChevronDown,up:L.ChevronUp,clock:L.Clock3,stethoscope:L.Stethoscope,
};

function AppIcon({name,size=18}: {name:string;size?:number}) {
  if(name==="telepass") return <span className="letter-icon" style={{fontSize:Math.max(11,size-3)}}>T</span>;
  const Icon = iconMap[name] || L.Circle;
  return <Icon size={size} strokeWidth={1.8}/>;
}

const categoryIcon = (name: string) => {
  const icons: Record<string, string> = {
    "730":"document","Abbigliamento":"clothes","Abbonamenti":"subscriptions","Alimenti":"groceries",
    "Altri lavori":"work","Amazon":"package","App Store":"technology","Arredamento":"furniture",
    "Automobile":"car","Bar":"coffee","Box":"home","Buoni pasto":"voucher","Carburante":"fuel",
    "Casa":"home","Cinema":"cinema","Condominio":"building","Cosmesi":"health","Cura Personale":"health",
    "Discoteca":"music","Divertimento":"fun","Divertimento Viaggi":"fun","Drink":"coffee",
    "Farmacia":"medical","Finanziamenti":"finance","Gas":"flame","Giardino":"home","Guadagni":"income",
    "Hotel":"building","iCloud":"cloud","Lavori":"hammer","Lenti a contatto":"eye","Luce":"light",
    "Luce e Gas":"energy","Mare":"beach","Medici":"stethoscope","Multe":"tax","Noleggio":"car",
    "Parcheggio":"parking","Pranzi/Cene":"food","Pranzi/Cene Viaggi":"food","Prodotti Casa":"home",
    "Proventi Finanziari":"finance","Pulizie":"cleaning","Reddito":"income","Regali":"gift","Regalo":"gift",
    "Rifiuti":"trash","Rimborso":"refund","Riscaldamento":"flame","Salute":"health","Scommesse":"fun",
    "Scooter":"bike","Sky e Netflix":"streaming","Spese Personali":"clothes","Spotify":"music","Sport":"sport",
    "Stipendio":"finance","Straordinari":"clock","Supermercato":"groceries","Tabacchi":"circle",
    "Tasse":"tax","Tecnologia":"technology","Telepass":"telepass","Trasporti":"car","Trasporti pubblici":"bus",
    "Trasporti Viaggi":"travel","Viaggi":"travel","Vodafone":"technology",
  };
  return icons[name] || "circle";
};

const categoryColor = (name: string) => {
  const colors: Record<string,string> = {
    "Reddito":"#43a66f","Stipendio":"#43a66f","Straordinari":"#348d5c","730":"#6bb98b","Altri lavori":"#527e67","Buoni pasto":"#d39a2f",
    "Guadagni":"#26745a","Regalo":"#397c64","Rimborso":"#4f967c","Proventi Finanziari":"#e18a32",
    "Alimenti":"#35a8c8","Bar":"#4fb5cf","Drink":"#279bbd","Pranzi/Cene":"#3b9bb6","Supermercato":"#62bdd4",
    "Salute":"#dc5b61","Farmacia":"#e26b70","Medici":"#c94c53","Sport":"#d86b62","Lenti a contatto":"#c76578",
    "Casa":"#547fa8","Abbonamenti":"#7c65b5","Spese Personali":"#bd6e9b","Trasporti":"#4f8ca8","Viaggi":"#df9d43",
    "Divertimento":"#a067bc","Tasse":"#7e8792",
  };
  return colors[name] || "#678098";
};

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
          <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => setActive(item.label)}>
            <span><AppIcon name={item.icon}/></span>{item.label}
          </button>
        ))}
        <p className="nav-title menu-group">TRANSAZIONI PIANIFICATE</p>
        {nav.slice(3, 5).map((item) => (
          <button key={item.label} className={`nested ${active === item.label ? "active" : ""}`} onClick={() => setActive(item.label)}>
            <span><AppIcon name={item.icon}/></span>{item.label === "Pianificate" ? "Transazioni pianificate" : item.label}
          </button>
        ))}
        <p className="nav-title">GESTIONE</p>
        {nav.slice(5, 9).map((item) => (
          <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => setActive(item.label)}>
            <span><AppIcon name={item.icon}/></span>{item.label}{item.label === "Debiti" && <em>Opzionale</em>}
          </button>
        ))}
        <p className="nav-title">ANALISI</p>
        {nav.slice(9).map((item) => (
          <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => setActive(item.label)}>
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
      <div className="header-actions">
        <button className="round" aria-label="Notifiche"><AppIcon name="notification" size={17}/><i /></button>
      </div>
    </header>
  );
}

function Sparkline({ mode = "wealth" }: { mode?: "wealth" | "week" | "month" }) {
  if (mode === "week") {
    const days = [["23/07",29.50,14],["24/07",24.50,12],["25/07",86.75,42],["26/07",86.85,42],["27/07",14.88,7],["28/07",207.88,100],["29/07",109.94,53]] as const;
    return <div className="weekly-bars" aria-label="Spese degli ultimi sette giorni">
      {days.map(([date,value,height])=><div className="week-bar" key={date}><b>{money(value)}</b><i style={{height:`${height}%`}}/><span>{date}</span></div>)}
    </div>;
  }
  const months = mode === "wealth" ? ["Ago","Ott","Dic","Feb","Apr","Giu","Lug"] : ["1","5","10","15","20","25","29"];
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

function Dashboard({ transactions, accounts, cards, budgets, categories, setActive, confirmTransaction, openTransaction }: { transactions: Transaction[]; accounts: MoneyAccount[]; cards: MoneyCard[]; budgets: MoneyBudget[]; categories: MoneyCategory[]; setActive: (s: Section) => void; confirmTransaction: (t: Transaction) => void | Promise<void>; openTransaction: (t: Transaction) => void }) {
  const [chart, setChart] = useState<"wealth" | "week" | "month">("wealth");
  const today = toIsoDate(new Date());
  const currentMonth = today.slice(0,7);
  const monthTransactions = transactions.filter(transaction=>transaction.dateISO?.startsWith(currentMonth) && (!transaction.dueDate || transaction.confirmedAt));
  const refunds = monthTransactions.filter(transaction=>transaction.isRefund).reduce((sum,transaction)=>sum+Math.abs(transaction.amount),0);
  const income = monthTransactions.filter(transaction=>transaction.amount>0&&!transaction.isRefund&&transaction.kind!=="transfer").reduce((sum,transaction)=>sum+transaction.amount,0);
  const expenses = Math.max(0,Math.abs(monthTransactions.filter(transaction=>transaction.amount<0&&transaction.kind!=="transfer").reduce((sum,transaction)=>sum+transaction.amount,0))-refunds);
  const balance = income-expenses;
  const visibleAccounts = accounts.filter(account=>!account.archived&&!account.hidden);
  const savings = visibleAccounts.filter(account=>account.type==="savings").reduce((sum,account)=>sum+account.balance,0);
  const liquidity = visibleAccounts.filter(account=>account.type!=="savings").reduce((sum,account)=>sum+account.balance,0);
  const wealth = liquidity+savings;
  const cardDebt = cards.filter(card=>!card.archived).reduce((sum,card)=>sum+Math.max(0,transactions.filter(t=>t.cardId===card.id).reduce((subtotal,t)=>subtotal+(t.kind==="card_repayment"?-Math.abs(t.amount):t.amount<0?Math.abs(t.amount):0),0)),0);
  const dashboardBudgets = budgets.filter(item=>item.month.startsWith(currentMonth)).map(item=>{const category=categories.find(c=>c.id===item.categoryId);const spent=transactions.filter(t=>t.categoryId===item.categoryId&&t.amount<0&&t.dateISO?.startsWith(currentMonth)).reduce((sum,t)=>sum+Math.abs(t.amount),0);return {name:category?.name||"Categoria",spent,limit:item.amount,color:category?.color||"#7c65b5"};});
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate()-6);
  const weekExpenses = transactions.filter(transaction=>transaction.amount<0&&transaction.dateISO&&transaction.dateISO>=toIsoDate(sevenDaysAgo)&&transaction.dateISO<=today).reduce((sum,transaction)=>sum+Math.abs(transaction.amount),0);
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-29);
  const monthExpenses = transactions.filter(transaction=>transaction.amount<0&&transaction.dateISO&&transaction.dateISO>=toIsoDate(thirtyDaysAgo)&&transaction.dateISO<=today).reduce((sum,transaction)=>sum+Math.abs(transaction.amount),0);
  const duePending = transactions.filter(item=>item.dueDate&&item.dueDate<=today&&!item.confirmedAt);
  const futurePlanned = transactions.filter(item=>item.dueDate&&!item.confirmedAt&&item.dueDate>today).slice(0,3);
  const recent = transactions.filter(item=>!item.dueDate||item.confirmedAt).slice(0,5);
  return (
    <>
      {duePending.length > 0 && <section className="pending-confirmations panel">
        <div className="pending-heading"><div><span className="pending-badge">●</span><div><h3>Da confermare</h3><p>{duePending.length} {duePending.length === 1 ? "transazione pianificata richiede" : "transazioni pianificate richiedono"} la tua conferma</p></div></div><button onClick={()=>setActive("Pianificate")}>Vedi pianificate →</button></div>
        <div className="pending-items">
          {duePending.map(item=><div className="pending-item" key={item.id}><div className="pending-date"><b>{item.date.split(" ")[0]}</b><span>{item.date.split(" ")[1]}</span></div><div><b>{item.label}</b><span>{item.category} · {item.account}</span></div><strong>{money(item.amount)}</strong><button onClick={()=>void confirmTransaction(item)}>Conferma</button></div>)}
        </div>
      </section>}

      <section className="hero-grid">
        <button className="balance-card dark heritage-link" onClick={()=>setActive("Conti")}>
          <div className="card-heading"><span>Patrimonio totale dei conti</span><AppIcon name="forward" size={18}/></div>
          <h2>{money(wealth)}</h2>
          <div className="balance-breakdown">
            <div><small>LIQUIDITÀ</small><b>{money(liquidity)}</b></div>
            <div><small>CARTA DI CREDITO</small><b className="card-debt">{money(-cardDebt)}</b></div>
            <div><small>RISPARMI</small><b>{money(savings)}</b></div>
          </div>
        </button>
        <article className="balance-card balance-summary">
          <div className="balance-visual"><div className="balance-ring"><div><strong>{money(balance)}</strong><span>BILANCIO</span></div></div><small>{new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date()).toUpperCase()}</small></div>
          <div className="balance-numbers">
            <div><span><i className="income-dot"/>Entrate</span><strong>{money(income)}</strong></div>
            <div><span><i className="expense-dot"/>Uscite</span><strong>{money(-expenses)}</strong></div>
            <div className="total"><span>Totale</span><strong>{money(balance)}</strong></div>
          </div>
        </article>
      </section>

      <section className="panel insight-panel">
        <div className="chart-tabs">
          <button className={chart==="wealth"?"active":""} onClick={()=>setChart("wealth")}><span>Andamento patrimonio</span><b>{money(wealth)}</b></button>
          <button className={chart==="week"?"active":""} onClick={()=>setChart("week")}><span>Spese ultimi 7 giorni</span><b>{money(weekExpenses)}</b></button>
          <button className={chart==="month"?"active":""} onClick={()=>setChart("month")}><span>Spese ultimi 30 giorni</span><b>{money(monthExpenses)}</b></button>
        </div>
        <div className="insight-chart"><div><small>{chart==="wealth"?"PATRIMONIO ATTUALE":chart==="week"?"ULTIMI 7 GIORNI":"ULTIMI 30 GIORNI"}</small><h3>{chart==="wealth"?money(wealth):chart==="week"?`Media ${money(weekExpenses/7)} al giorno`:money(monthExpenses)}</h3></div><Sparkline mode={chart}/></div>
      </section>

      <section className="dashboard-stack">
        <article className="panel transactions dashboard-list">
          <div className="panel-title"><div><h3>Transazioni recenti</h3><p>Gli ultimi movimenti registrati</p></div><button className="text-button" onClick={() => setActive("Transazioni")}>Vedi tutte →</button></div>
          <div className="transaction-list">
            {recent.map((t) => <TransactionRow key={t.id} t={t} onOpen={openTransaction} />)}
          </div>
        </article>
        <article className="panel planned-panel">
          <div className="panel-title"><div><h3>Transazioni pianificate</h3><p>I prossimi movimenti previsti</p></div><button className="text-button" onClick={() => setActive("Pianificate")}>Gestisci →</button></div>
          <div className="planned-grid">
            {futurePlanned.map(item=><button className="planned-item" key={item.id} onClick={()=>openTransaction(item)}><div className="planned-date"><b>{item.date.split(" ")[0]}</b><span>{item.date.split(" ")[1]}</span></div><div><b>{item.label}</b><span>{item.category} · {item.account}</span></div><strong>{money(item.amount)}</strong></button>)}
          </div>
        </article>
        <article className="panel budget-panel dashboard-budget">
          <div className="panel-title"><div><h3>Budget mensili</h3><p>Luglio 2026</p></div><button className="text-button" onClick={() => setActive("Budget")}>Gestisci →</button></div>
          <div className="dashboard-budget-grid">{dashboardBudgets.map((b) => (
            <div className="budget-row" key={b.name}>
              <div><b>{b.name}</b><span>{money(b.spent)} di {money(b.limit)}</span></div>
              <div className="progress"><i style={{ width: `${(b.spent / b.limit) * 100}%`, background: b.color }} /></div>
              <small>{Math.round((b.spent / b.limit) * 100)}%</small>
            </div>
          ))}{!dashboardBudgets.length&&<div className="empty">Nessun budget creato per questo mese.</div>}</div>
          {dashboardBudgets.length>0&&<div className="budget-footer"><span>Budget disponibile</span><strong>{money(dashboardBudgets.reduce((sum,item)=>sum+item.limit-item.spent,0))}</strong></div>}
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
  return (
    <button type="button" className={`transaction-row ${onOpen?"clickable":""}`} onClick={()=>onOpen?.(t)}>
      <div className={`transaction-icon ${t.color}`}><AppIcon name={t.icon}/>{t.accounted === false && <i className="unaccounted" title="Non contabilizzata"><AppIcon name="check" size={9}/></i>}</div>
      <div className="transaction-info"><b>{t.label}</b><span>{t.isRefund?"Rimborso spesa · ":`${t.category} · `}{t.account}</span></div>
      <div className="transaction-amount"><b className={t.amount > 0 ? "positive" : ""}>{t.amount > 0 ? "+" : ""}{money(t.amount)}</b><span>{t.date}</span></div>
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
  Impostazioni: { title: "Impostazioni", intro: "Personalizza Money Elite e gestisci i tuoi dati.", action: "Salva modifiche" },
};

function GenericSection({ section, onAdd, accounts, cards, budgets, recurrences, categories, transactions, onSaveAccount, onToggleAccount, onArchiveAccount, onDeleteAccount, openTransaction, refresh }: { section: Exclude<Section, "Dashboard" | "Transazioni">; onAdd: (kind: ActionKind, defaultAccount?: string, cardId?: string) => void; accounts: MoneyAccount[]; cards: MoneyCard[]; budgets: MoneyBudget[]; recurrences: MoneyRecurrence[]; categories: MoneyCategory[]; transactions: Transaction[]; onSaveAccount: (draft: AccountDraft, account?: MoneyAccount) => Promise<void>; onToggleAccount: (account: MoneyAccount) => Promise<void>; onArchiveAccount: (account: MoneyAccount) => Promise<void>; onDeleteAccount: (account: MoneyAccount) => Promise<void>; openTransaction: (transaction: Transaction) => void; refresh: () => Promise<void> }) {
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
  if (section === "Report") return <ReportSection />;
  if (section === "Impostazioni") return <SettingsSection />;
  if (section === "Bilancio") return <BalanceHistorySection onAdd={onAdd} />;
  if (section === "Pianificate") return <PlannedSection transactions={transactions} openTransaction={openTransaction}/>;
  if (section === "Abbonamenti") return <SubscriptionsSection recurrences={recurrences} categories={categories} refresh={refresh}/>;
  if (section === "Conti") return <AccountsSectionReal onAdd={onAdd} accounts={accounts} transactions={transactions} onSaveAccount={onSaveAccount} onToggleAccount={onToggleAccount} onArchiveAccount={onArchiveAccount} onDeleteAccount={onDeleteAccount} openTransaction={openTransaction}/>;
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

function AccountModal({ account, close, save }: { account?: MoneyAccount; close: () => void; save: (draft: AccountDraft, account?: MoneyAccount) => Promise<void> }) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<MoneyAccount["type"]>(account?.type ?? "bank");
  const [openingBalance, setOpeningBalance] = useState(account ? amountInput(account.openingBalance) : "");
  const [voucherUnitValue, setVoucherUnitValue] = useState(amountInput(account?.voucherUnitValue ?? 8));
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const parsedVoucherValue = parseItalianAmount(voucherUnitValue) || 8;
  return <div className="modal-backdrop"><form className="modal entity-modal" onSubmit={async event=>{event.preventDefault();setBusy(true);await save({name:name.trim(),type,openingBalance:parseItalianAmount(openingBalance),voucherUnitValue:type==="meal_vouchers"?parsedVoucherValue:null,notes},account);setBusy(false)}}>
    <div className="modal-title"><div><small>{account?"MODIFICA CONTO":"NUOVO CONTO"}</small><h2>{account?account.name:"Crea nuovo conto"}</h2></div></div>
    <label>Nome<input required value={name} onChange={event=>setName(event.target.value)} placeholder="Es. Conto principale"/></label>
    <label>Tipo di conto<select value={type} onChange={event=>setType(event.target.value as MoneyAccount["type"])} disabled={Boolean(account)}><option value="bank">Conto corrente</option><option value="cash">Contanti</option><option value="savings">Conto deposito</option><option value="meal_vouchers">Buoni pasto</option><option value="other">Altro</option></select></label>
    {type==="meal_vouchers"?<><label>Valore di ogni buono<div className="amount-input"><span>€</span><input type="text" inputMode="decimal" value={voucherUnitValue} onChange={event=>setVoucherUnitValue(event.target.value)} placeholder="8,00"/></div></label><label>Numero iniziale di buoni<input type="text" inputMode="numeric" value={openingBalance ? String(Math.round(parseItalianAmount(openingBalance)/parsedVoucherValue)) : ""} onChange={event=>setOpeningBalance(String(Math.max(0, Number(event.target.value)||0)*parsedVoucherValue).replace(".",","))} placeholder="0"/></label></>:<label>Importo iniziale<input type="text" inputMode="decimal" value={openingBalance} onChange={event=>setOpeningBalance(event.target.value)} placeholder="0,00"/></label>}
    <label>Note<input value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Opzionale"/></label>
    <div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer" disabled={busy}>{busy?"Salvataggio…":"Salva"}</button></div>
  </form></div>;
}

function AccountsSectionReal({ onAdd, accounts, transactions, onSaveAccount, onToggleAccount, onArchiveAccount, onDeleteAccount, openTransaction }: { onAdd: (kind: ActionKind, defaultAccount?: string) => void; accounts: MoneyAccount[]; transactions: Transaction[]; onSaveAccount: (draft: AccountDraft, account?: MoneyAccount) => Promise<void>; onToggleAccount: (account: MoneyAccount) => Promise<void>; onArchiveAccount: (account: MoneyAccount) => Promise<void>; onDeleteAccount: (account: MoneyAccount) => Promise<void>; openTransaction: (transaction: Transaction) => void }) {
  const [editor, setEditor] = useState<MoneyAccount | "new" | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const activeAccounts = accounts.filter(account=>!account.archived);
  const archivedAccounts = accounts.filter(account=>account.archived);
  const visibleTotal = activeAccounts.filter(account=>!account.hidden).reduce((sum,account)=>sum+account.balance,0);
  const detail = accounts.find(account=>account.id===detailId);
  if(detail) {
    const rows = transactions.filter(transaction=>transaction.accountId===detail.id || transaction.account===detail.name);
    return <section className="section-page"><div className="inner-page-header"><button onClick={()=>setDetailId(null)}><AppIcon name="back"/></button><div><small>CONTO · {new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date())}</small><h2>{detail.name}</h2></div></div><div className="account-detail-summary"><div className="item-icon real-icon"><AppIcon name={detail.icon}/></div><div className="account-balance-pair"><div><small>SALDO ALLA DATA DI OGGI</small><strong>{money(detail.balance)}</strong></div><div><small>SALDO PREVISTO A FINE MESE</small><strong>{money(detail.balance)}</strong></div>{detail.type==="meal_vouchers"&&<span>{detail.voucherCount} buoni da {money(detail.voucherUnitValue||0)}</span>}</div></div><article className="panel month-transactions">{rows.length?rows.map(transaction=><TransactionRow key={transaction.id} t={transaction} onOpen={openTransaction}/>):<div className="empty">Nessuna transazione nel mese corrente.</div>}</article>{!detail.archived&&<QuickActions openAction={kind=>onAdd(kind,detail.name)}/>}</section>;
  }
  return <section className="section-page"><div className="accounts-total"><div><small>TOTALE DEI CONTI VISIBILI</small></div><strong>{money(visibleTotal)}</strong></div><div className="accounts-list">{activeAccounts.map(account=><article className={`account-row ${account.type==="meal_vouchers"?"voucher-account":""} ${account.hidden?"hidden-account":""}`} key={account.id} onClick={()=>setDetailId(account.id)}><div className="item-icon real-icon"><AppIcon name={account.icon}/></div><div><h3>{account.name}</h3><strong>{account.hidden?"Saldo nascosto":money(account.balance)}</strong>{account.type==="meal_vouchers"&&!account.hidden&&<div className="voucher-meter"><i style={{width:"60%"}}/><span>{account.voucherCount} buoni</span></div>}</div><button className="eye-button modern" onClick={event=>{event.stopPropagation();void onToggleAccount(account)}}><AppIcon name={account.hidden?"eyeOff":"eye"} size={18}/></button><button onClick={event=>{event.stopPropagation();onAdd("transfer",account.name)}}><AppIcon name="transfer" size={18}/></button><button onClick={event=>{event.stopPropagation();setMenu(menu===account.id?null:account.id)}}><AppIcon name="more" size={19}/></button>{menu===account.id&&<div className="account-menu" onClick={event=>event.stopPropagation()}><button onClick={()=>onAdd("income",account.name)}><AppIcon name="income"/> Aggiungi entrata</button><button onClick={()=>onAdd("expense",account.name)}><AppIcon name="expense"/> Aggiungi uscita</button><button onClick={()=>{setEditor(account);setMenu(null)}}><AppIcon name="edit"/> Modifica conto</button><button onClick={()=>void onArchiveAccount(account)}><AppIcon name="archive"/> Archivia conto</button><button className="danger" onClick={()=>void onDeleteAccount(account)}><AppIcon name="trash"/> Elimina conto</button></div>}</article>)}</div>{archivedAccounts.length>0&&<div className="archived-accounts"><div><b>Conti archiviati</b></div>{archivedAccounts.map(account=><button key={account.id} onClick={()=>setDetailId(account.id)}><span><AppIcon name={account.icon}/></span><div><b>{account.name}</b><small>Sola consultazione</small></div><strong>{money(account.balance)}</strong></button>)}</div>}<button className="quick-main quick-standalone" onClick={()=>setEditor("new")}><AppIcon name="plus" size={22}/></button>{editor&&<AccountModal account={editor==="new"?undefined:editor} close={()=>setEditor(null)} save={async(draft,account)=>{await onSaveAccount(draft,account);setEditor(null)}}/>}</section>;
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
  const [editor, setEditor] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actions, setActions] = useState(false);
  const [repay, setRepay] = useState(false);
  const visibleCards = cards.filter(card => !card.archived);
  const debtFor = (card: MoneyCard) => transactions.filter(t=>t.cardId===card.id).reduce((sum,t)=>sum+(t.kind==="card_repayment"?-Math.abs(t.amount):t.amount<0?Math.abs(t.amount):0),0);
  const detail = cards.find(card=>card.id===detailId);
  if (detail) {
    const due = Math.max(0,debtFor(detail));
    const rows = transactions.filter(t=>t.cardId===detail.id);
    const linked = accounts.find(account=>account.id===detail.linkedAccountId);
    return <section className="section-page"><div className="inner-page-header"><button onClick={()=>setDetailId(null)}><AppIcon name="back"/></button><div><small>CARTA DI CREDITO</small><h2>{detail.name}</h2><p>{detail.periodType==="monthly"?`Addebito il ${detail.paymentDay ?? detail.cycleStartDay ?? 1} del mese`:"Carta senza periodo"}</p></div></div><div className="card-due-summary"><span>Ammontare dovuto</span><strong>{money(due)}</strong></div><article className="panel month-transactions">{rows.length?rows.map(t=><TransactionRow key={t.id} t={t} onOpen={openTransaction}/>):<div className="empty">Nessun movimento su questa carta.</div>}</article><div className={actions?"card-actions open":"card-actions"}><div><button onClick={()=>setRepay(true)}><span><AppIcon name="card"/></span>Ripaga</button><button onClick={()=>onAdd("transfer",linked?.name)}><span><AppIcon name="transfer"/></span>Trasferisci fondi</button><button onClick={()=>onAdd("income",linked?.name,detail.id)}><span><AppIcon name="income"/></span>Entrata</button><button onClick={()=>onAdd("expense",linked?.name,detail.id)}><span><AppIcon name="expense"/></span>Uscita</button></div><button className="quick-main" onClick={()=>setActions(x=>!x)}><AppIcon name={actions?"close":"plus"} size={23}/></button></div>{repay&&<CardRepayModal card={detail} due={due} accounts={accounts} close={()=>setRepay(false)} refresh={refresh}/>}</section>;
  }
  const totalDue = visibleCards.reduce((sum,card)=>sum+Math.max(0,debtFor(card)),0);
  return <section className="section-page"><div className="cards-total"><span>AMMONTARE DOVUTO</span><strong>{money(totalDue)}</strong></div>{visibleCards.length?visibleCards.map(card=>{const due=Math.max(0,debtFor(card));const limit=card.creditLimit||0;const percent=limit?Math.min(100,Math.round(due/limit*100)):0;return <button className="credit-card-panel" key={card.id} onClick={()=>setDetailId(card.id)}><div><small>{card.name.toUpperCase()}</small><h3>{money(due)}</h3><span>Debito corrente</span></div><div className="credit-period"><span>{card.periodType==="monthly"?`Ciclo ${card.cycleStartDay ?? 1}`:"Senza ciclo"}</span><b>{percent}%</b><span>{card.paymentDay?`Pag. ${card.paymentDay}`:""}</span><div className="progress"><i style={{width:`${percent}%`}}/></div><p>{limit?`Limite ${money(limit)} · Residuo ${money(Math.max(0,limit-due))}`:"Nessun limite impostato"}</p></div><i>›</i></button>}):<div className="empty panel">Nessuna carta di credito. Aggiungine una con il pulsante +.</div>}<button className="quick-main quick-standalone" onClick={()=>setEditor(true)}><AppIcon name="plus" size={22}/></button>{editor&&<CardModal accounts={accounts} close={()=>setEditor(false)} refresh={refresh}/>}</section>
}

function CardModal({ accounts, close, refresh }: { accounts: MoneyAccount[]; close: () => void; refresh: () => Promise<void> }) {
  const [saving,setSaving]=useState(false);
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setSaving(true);const fd=new FormData(event.currentTarget);const {data:{user}}=await getSupabaseBrowserClient().auth.getUser();if(!user)return;const {error}=await getSupabaseBrowserClient().from("cards").insert({user_id:user.id,name:String(fd.get("name")||"").trim(),linked_account_id:String(fd.get("account")||"")||null,credit_limit:parseItalianAmount(fd.get("limit")),period_type:fd.get("period")==="no_period"?"no_period":"monthly",cycle_start_day:Number(fd.get("cycle"))||1,payment_day:Number(fd.get("payment"))||1});if(error){alert(error.message);setSaving(false);return;}await refresh();close();};
  return <div className="modal-backdrop"><form className="modal entity-modal" onSubmit={save}><div className="modal-title"><div><small>NUOVA CARTA</small><h2>Crea una carta di credito</h2></div></div><label>Nome<input name="name" required placeholder="Es. Carta Elite"/></label><label>Conto associato<select name="account" required>{accounts.filter(a=>!a.archived).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Limite<input name="limit" type="text" inputMode="decimal" placeholder="5.000,00"/></label><label>Tipo di carta<select name="period"><option value="monthly">Mensile</option><option value="no_period">Senza periodo</option></select></label><div className="form-grid"><label>Giorno inizio ciclo<select name="cycle">{Array.from({length:31},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label><label>Giorno addebito<select name="payment">{Array.from({length:31},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer" disabled={saving}>{saving?"Salvataggio…":"Salva"}</button></div></form></div>;
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

function BalanceHistorySection({ onAdd }: { onAdd: (kind: ActionKind) => void }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [detail, setDetail] = useState<"transactions" | "income" | "expense" | "incomeTransactions" | "expenseTransactions" | null>(null);
  const months = [
    ["Luglio 2026",3250,1486.30],["Giugno 2026",2890,1764.40],["Maggio 2026",3040,2195.70],["Aprile 2026",2750,2924.30],["Marzo 2026",3100,2418.25],["Febbraio 2026",2680,2334.80],
  ] as const;
  if (selectedMonth && detail) {
    const transactionPage = detail === "transactions" || detail === "incomeTransactions" || detail === "expenseTransactions";
    return <section className="section-page balance-page"><div className="inner-page-header"><button onClick={()=>setDetail(null)}>←</button><div><small>BILANCIO</small><h2>{detail==="transactions"?"Transazioni":detail==="incomeTransactions"?"Entrate del mese":detail==="expenseTransactions"?"Uscite del mese":detail==="income"?"Entrate":"Uscite"}</h2><p>{selectedMonth}</p></div></div>{transactionPage?<BalanceTransactionPage filter={detail}/>:<><BalanceMonthDetail detail={detail}/><button className="view-month-transactions" onClick={()=>setDetail(detail==="income"?"incomeTransactions":"expenseTransactions")}>Vedi tutte le {detail==="income"?"entrate":"uscite"} del mese →</button></>}<QuickActions allowTransfer={false} openAction={onAdd}/></section>;
  }
  return <section className="section-page"><div className="section-toolbar"><button className="outline">↓ Esporta bilancio</button></div>
    <div className="history-list">{months.map(([month,income,expense])=>{const total=income-expense;const share=Math.round(income/(income+expense)*100);return <button className="history-row" key={month} onClick={()=>setSelectedMonth(month)}><div className="mini-donut" style={{background:`conic-gradient(#559476 0 ${share}%,#c96360 ${share}% 100%)`}}/><div><h3>{month}</h3><span>Apri dettagli del mese →</span></div><div className="history-values"><span>Entrate <b className="positive">+ {money(income)}</b></span><span>Uscite <b>− {money(expense)}</b></span><strong className={total>=0?"positive":""}>Totale {total>=0?"+ ":"− "}{money(Math.abs(total))}</strong></div></button>})}</div>
    {selectedMonth && <div className="modal-backdrop balance-overlay" onMouseDown={()=>setSelectedMonth(null)}><div className="balance-dialog" onMouseDown={e=>e.stopPropagation()}><div className="balance-dialog-title"><div><small>BILANCIO</small><h2>{selectedMonth}</h2></div><button onClick={()=>setSelectedMonth(null)}>×</button></div><p>Scegli cosa vuoi consultare</p><div className="balance-options"><button onClick={()=>setDetail("transactions")}><span>☷</span><div><b>Transazioni</b><small>Tutti i movimenti del mese</small></div><i>→</i></button><button onClick={()=>setDetail("income")}><span className="green-ring">◐</span><div><b>Entrate</b><small>Totale e categorie delle entrate</small></div><i>→</i></button><button onClick={()=>setDetail("expense")}><span className="red-ring">◐</span><div><b>Uscite</b><small>Totale e categorie delle uscite</small></div><i>→</i></button></div></div></div>}
  </section>
}

function BalanceTransactionPage({ filter }: { filter: "transactions" | "incomeTransactions" | "expenseTransactions" }) {
  const rows = filter === "incomeTransactions" ? initialTransactions.filter(t=>t.amount>0) : filter === "expenseTransactions" ? initialTransactions.filter(t=>t.amount<0) : initialTransactions;
  const total = rows.reduce((sum,t)=>sum+t.amount,0);
  return <article className="panel month-transactions"><div className="month-total">Totale <strong className={total>=0?"positive":""}>{total>=0?"+ ":"− "}{money(Math.abs(total))}</strong></div>{rows.map(t=><TransactionRow key={t.id} t={t}/>)}</article>;
}

function BalanceMonthDetail({ detail }: { detail: "income" | "expense" }) {
  const income = detail === "income";
  const rows = income ? [["Stipendio","€ 2.450,00","75%"],["Rimborsi","€ 520,00","16%"],["Altre entrate","€ 280,00","9%"]] : [["Casa","€ 461,30","31%"],["Cibo e bevande","€ 356,70","24%"],["Trasporti","€ 267,50","18%"],["Altro","€ 400,80","27%"]];
  return <div className="category-detail"><div className={`large-donut ${income?"income":"expense"}`}><div><strong>{income?"€ 3.250,00":"€ 1.486,30"}</strong><span>{income?"Entrate":"Uscite"}</span></div></div>{rows.map((r,i)=><div className="legend-row" key={r[0]}><i className={`legend-c${i}`}/><b>{r[0]}</b><span>{r[2]}</span><strong>{r[1]}</strong></div>)}</div>
}

function PlannedSection({transactions,openTransaction}:{transactions:Transaction[];openTransaction:(transaction:Transaction)=>void}) {
  const items=transactions.filter(transaction=>transaction.dueDate&&!transaction.confirmedAt).sort((a,b)=>(a.dueDate||"").localeCompare(b.dueDate||""));
  const currentMonth=toIsoDate(new Date()).slice(0,7);
  const monthTotal=items.filter(item=>item.dueDate?.startsWith(currentMonth)).reduce((sum,item)=>sum+item.amount,0);
  return <section className="section-page"><article className="panel schedule-list">{items.length?items.map(item=><button className="schedule-row" key={item.id} onClick={()=>openTransaction(item)}><div className="schedule-icon" style={{color:categoryColor(item.category),background:`${categoryColor(item.category)}18`}}><AppIcon name={item.icon}/></div><div><b>{item.label}</b><span>{item.category} · {item.account}</span></div><div><strong>{money(item.amount)}</strong><span>{item.date}</span></div><i className={item.kind==="transfer"?"transfer-line":item.amount>0?"income-line":"expense-line"}/></button>):<div className="empty">Nessuna transazione pianificata.</div>}</article><div className="schedule-summary"><span>Questo mese <b className={monthTotal>=0?"positive":""}>{money(monthTotal)}</b></span></div></section>
}

function SubscriptionsSection({ recurrences, categories, refresh }: { recurrences: MoneyRecurrence[]; categories: MoneyCategory[]; refresh: () => Promise<void> }) {
  const subscriptions=recurrences.filter(item=>item.isSubscription);
  const totalMonth=subscriptions.reduce((sum,item)=>sum+item.amount,0);
  const remove=async(id:string)=>{if(!window.confirm("Eliminare questo abbonamento?"))return;const {error}=await getSupabaseBrowserClient().from("recurrences").update({active:false}).eq("id",id);if(error){alert(error.message);return;}await refresh();};
  return <section className="section-page"><div className="subscription-summary"><div><small>PROSSIMI 30 GIORNI</small><strong>{money(totalMonth)}</strong></div><div><small>PROSSIMI 365 GIORNI</small><strong>{money(totalMonth*12)}</strong></div><div><small>MEDIA MENSILE</small><strong>{money(totalMonth)}</strong></div></div><article className="panel subscription-list">{subscriptions.length?subscriptions.map(item=>{const category=categories.find(c=>c.id===item.categoryId);return <div className="subscription-row" key={item.id}><div className="subscription-icon" style={{color:category?.color||"#7c65b5",background:`${category?.color||"#7c65b5"}18`}}><AppIcon name={category?.icon||"subscriptions"}/></div><div className="subscription-body"><h3>{item.notes||category?.name||"Abbonamento"}</h3><div className="subscription-dates"><span>Prossima data</span><b>{formatItalianDate(item.nextDate)}</b><span>{item.frequency==="monthly"?"Ogni mese":item.frequency}</span></div><div className="progress"><i style={{width:"45%",background:"#7c65b5"}}/></div><strong>{money(item.amount)} ogni {item.frequency==="monthly"?"mese":item.frequency}</strong><small>{category?.name||"Senza categoria"}</small></div><button onClick={()=>void remove(item.id)} aria-label="Elimina abbonamento"><AppIcon name="trash"/></button></div>}):<div className="empty">Nessun abbonamento. Usa il + per aggiungere una spesa pianificata come abbonamento.</div>}</article></section>;
}

function BudgetSection({ budgets, categories, transactions, refresh }: { budgets: MoneyBudget[]; categories: MoneyCategory[]; transactions: Transaction[]; refresh: () => Promise<void> }) {
  const [newBudget,setNewBudget]=useState(false);
  const month=toIsoDate(new Date()).slice(0,7);
  const visible=budgets.filter(item=>item.month.startsWith(month));
  const details=visible.map(item=>{const category=categories.find(c=>c.id===item.categoryId);const spent=transactions.filter(t=>t.categoryId===item.categoryId&&t.amount<0&&t.dateISO?.startsWith(month)).reduce((sum,t)=>sum+Math.abs(t.amount),0);return {item,category,spent};});
  const total=details.reduce((sum,item)=>sum+item.item.amount,0);const spent=details.reduce((sum,item)=>sum+item.spent,0);
  const remove=async(id:string)=>{if(!window.confirm("Eliminare questo budget?"))return;const {error}=await getSupabaseBrowserClient().from("budgets").delete().eq("id",id);if(error){alert(error.message);return;}await refresh();};
  return <section className="section-page"><div className="budget-month-row"><label>Mese<select value={month} disabled><option>{new Intl.DateTimeFormat("it-IT",{month:"long",year:"numeric"}).format(new Date())}</option></select></label><button className="outline" onClick={()=>setNewBudget(true)}>＋ Crea budget</button></div><div className="big-budget"><div><small>BUDGET TOTALI</small><h2>{money(total)}</h2></div><div><small>SPESO</small><h2>{money(spent)}</h2></div><div><small>DISPONIBILE</small><h2 className="positive">{money(total-spent)}</h2></div></div><div className="item-grid">{details.length?details.map(({item,category,spent})=><article className="item-card budget-card" key={item.id}><div className="item-body"><small>BUDGET MENSILE</small><h3>{category?.name||"Categoria"}</h3><div className="progress"><i style={{width:`${Math.min(100,spent/item.amount*100)}%`,background:category?.color||"#7c65b5"}}/></div><strong>{money(spent)} <span>di {money(item.amount)}</span></strong></div><button onClick={()=>void remove(item.id)} aria-label="Elimina budget"><AppIcon name="trash"/></button></article>):<div className="empty panel">Nessun budget per questo mese.</div>}</div>{newBudget&&<BudgetModal categories={categories} month={`${month}-01`} close={()=>setNewBudget(false)} refresh={refresh}/>}</section>;
}

function BudgetModal({ categories, month, close, refresh }: { categories: MoneyCategory[]; month: string; close: () => void; refresh: () => Promise<void> }) {
  const leaves=categories.filter(c=>c.kind==="expense"&&!categories.some(parent=>parent.parentId===c.id));
  const save=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const fd=new FormData(event.currentTarget);const {data:{user}}=await getSupabaseBrowserClient().auth.getUser();if(!user)return;const {error}=await getSupabaseBrowserClient().from("budgets").insert({user_id:user.id,category_id:String(fd.get("category")),amount:parseItalianAmount(fd.get("amount")),month});if(error){alert(error.message);return;}await refresh();close();};
  return <div className="modal-backdrop"><form className="modal entity-modal" onSubmit={save}><div className="modal-title"><div><small>NUOVO BUDGET</small><h2>Crea budget</h2></div></div><label>Categoria<select name="category" required>{leaves.map(c=>{const parent=c.parentId?categories.find(p=>p.id===c.parentId):null;return <option key={c.id} value={c.id}>{parent?`${parent.name} › `:""}{c.name}</option>})}</select></label><label>Ammontare<input name="amount" type="text" inputMode="decimal" placeholder="0,00" required/></label><div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className="save-action transfer">Salva</button></div></form></div>;
}

function ReportSection() {
  return (
    <section className="section-page">
      <div className="section-toolbar"><button className="outline">↓ Esporta report</button></div>
      <div className="report-grid">
        <article className="panel report-chart"><div className="panel-title"><div><h3>Entrate e uscite</h3><p>Ultimi 6 mesi</p></div></div><div className="bars">{[42,58,48,72,55,82].map((h,i)=><div key={i}><i style={{height:`${h}%`}}/><i style={{height:`${h*.55}%`}}/><span>{["Feb","Mar","Apr","Mag","Giu","Lug"][i]}</span></div>)}</div></article>
        <article className="panel category-report"><h3>Uscite per categoria</h3><div className="donut"><div><strong>€ 1.486</strong><span>Totale uscite</span></div></div>{["Casa 31%","Alimentari 24%","Tempo libero 18%","Altro 27%"].map((x,i)=><p key={x}><i className={`c${i}`}/>{x}</p>)}</article>
      </div>
    </section>
  );
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

function SettingsSection() {
  return (
    <section className="section-page settings-page">
      <div className="section-toolbar"><button className="primary">Salva modifiche</button></div>
      <article className="panel settings-card">
        <h3>Preferenze generali</h3>
        <label>Nome profilo<input defaultValue="Marco" /></label>
        <label>Valuta<select defaultValue="EUR"><option value="EUR">Euro (€)</option><option>USD ($)</option></select></label>
        <label>Inizio del mese<select><option>Giorno 1</option><option>Giorno 27</option></select></label>
        <div className="toggle-row"><div><b>Sezione debiti</b><span>Mostra debiti e crediti nel menu</span></div><input type="checkbox" defaultChecked /></div>
        <div className="toggle-row"><div><b>Notifiche budget</b><span>Avvisami quando raggiungo l’80%</span></div><input type="checkbox" defaultChecked /></div>
      </article>
      <CategoryManagement />
      <article className="panel settings-card"><h3>Dati e sicurezza</h3><p className="setting-note">La struttura è predisposta per Supabase. Configura le variabili del progetto per attivare sincronizzazione, backup e accesso protetto.</p><button className="outline">Esporta tutti i dati</button></article>
    </section>
  );
}

function TransactionsSection({ transactions, openTransaction }: { transactions: Transaction[]; openTransaction: (t: Transaction) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => transactions.filter(t => `${t.label} ${t.category} ${t.account}`.toLowerCase().includes(query.toLowerCase())), [transactions, query]);
  return (
    <section className="section-page">
      <article className="panel full-list">
        <div className="filter-row"><label><AppIcon name="search" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca una transazione..." /></label><button>Tutte le categorie <AppIcon name="down" size={14}/></button><button>Luglio 2026 <AppIcon name="down" size={14}/></button></div>
        {filtered.map(t=><TransactionRow t={t} key={t.id} onOpen={openTransaction}/>)}
        {!filtered.length && <div className="empty">Nessuna transazione trovata.</div>}
      </article>
    </section>
  );
}

function TransactionModal({ kind, close, add, accounts, cards, categories, preset = "normal", defaultAccount, cardId, initial, editing = false, refundSource }: { kind: ActionKind; close: () => void; add: (t: Transaction) => void | Promise<void>; accounts: MoneyAccount[]; cards: MoneyCard[]; categories: MoneyCategory[]; preset?: "normal" | "planned" | "subscription"; defaultAccount?: string; cardId?: string; initial?: Transaction; editing?: boolean; refundSource?: Transaction }) {
  const usableAccounts = accounts.filter(account => !account.archived);
  const [from, setFrom] = useState(defaultAccount || usableAccounts[0]?.name || "");
  const [to, setTo] = useState(usableAccounts.find(account => account.name !== (defaultAccount || usableAccounts[0]?.name))?.name || "");
  const [selectedAccount, setSelectedAccount] = useState(defaultAccount || initial?.account || "");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cardId || initial?.cardId || null);
  const [accounted, setAccounted] = useState(initial?.accounted ?? false);
  const [planned, setPlanned] = useState(preset !== "normal");
  const [subscription, setSubscription] = useState(preset === "subscription");
  const [autoAccounted, setAutoAccounted] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(!initial && !refundSource && kind !== "transfer");
  const [accountOpen, setAccountOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDateISO, setSelectedDateISO] = useState(initial?.dateISO || toIsoDate(new Date()));
  const [expandedCategory, setExpandedCategory] = useState(kind === "income" ? "Reddito" : "Alimenti");
  const [selectedCategory, setSelectedCategory] = useState(initial?.category || (kind === "income" ? "Reddito › Stipendio" : "Alimenti › Pranzi/Cene"));
  const [voucherCount, setVoucherCount] = useState(1);
  const voucherValue = accounts.find(account => account.type === "meal_vouchers")?.voucherUnitValue || 8;
  const isTransfer = kind === "transfer";
  const selectedCard = cards.find(card => card.id === selectedCardId);
  const isMealVoucher = selectedCategory.endsWith("› Buoni pasto");
  const pickerKind = refundSource ? "expense" : kind === "income" ? "income" : "expense";
  const categoryGroups = categories.filter(category => category.kind === pickerKind && !category.parentId).sort((a,b)=>a.name.localeCompare(b.name,"it")).map(root => ({
    root,
    children: categories.filter(category => category.parentId === root.id).sort((a,b)=>a.name.localeCompare(b.name,"it")),
  }));
  const labels = kind === "expense"
    ? { eyebrow: "NUOVA USCITA", title: "Registra un’uscita", save: "Salva uscita", planned: "Uscita pianificata" }
    : kind === "income"
    ? { eyebrow: "NUOVA ENTRATA", title: "Registra un’entrata", save: "Salva entrata", planned: "Entrata pianificata" }
    : { eyebrow: "GIROCONTO", title: "Trasferisci fondi", save: "Trasferisci", planned: "Trasferimento pianificato" };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = parseItalianAmount(fd.get("amount"));
    const category = isTransfer ? "Trasferimento tra conti" : selectedCategory;
    void add({ id: editing && initial ? initial.id : crypto.randomUUID(), label: refundSource ? `Rimborso ${refundSource.label}` : isTransfer ? `Trasferimento: ${from} → ${to}` : selectedCategory.split("›").at(-1)?.trim() || selectedCategory, category: refundSource ? `Rimborso · ${selectedCategory || refundSource.category}` : category, account: isTransfer ? from : selectedAccount, cardId: isTransfer ? null : selectedCardId, destinationAccountId: isTransfer ? to : null, date: formatItalianDate(selectedDateISO), dateISO: selectedDateISO, amount: kind === "expense" ? -Math.abs(raw) : Math.abs(raw), icon: refundSource ? "refund" : isTransfer ? "transfer" : kind === "expense" ? "expense" : "income", color: refundSource ? "green" : isTransfer ? "blue" : kind === "expense" ? "orange" : "green", accounted: planned ? false : accounted, isRefund: Boolean(refundSource), refundOf: refundSource?.id, kind: isTransfer ? "transfer" : refundSource ? "refund" : kind, voucherCount: isMealVoucher ? voucherCount : null, planned, subscription, automaticAccounting: autoAccounted, frequency: "monthly", intervalCount: 1 });
  };
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}>
    <div className={`modal-accent ${kind}`} />
    <div className="modal-title"><div><small>{refundSource?"NUOVO RIMBORSO":editing?"MODIFICA TRANSAZIONE":initial?"DUPLICA TRANSAZIONE":labels.eyebrow}</small><h2>{refundSource?"Registra il rimborso":editing?"Modifica la transazione":initial?"Controlla la copia":labels.title}</h2></div></div>
    {refundSource&&<div className="refund-source"><span>Spesa originale</span><b>{refundSource.label}</b><small>{money(Math.abs(refundSource.amount))} · {refundSource.account} · {refundSource.date}</small></div>}
    {isMealVoucher ? <div className="transaction-voucher-box">
      <div className="voucher-explainer"><span className="real-icon"><AppIcon name="voucher" size={21}/></span><div><b>{kind==="income"?"Carica buoni pasto":"Utilizza buoni pasto"}</b><small>Il valore unitario impostato nel conto è {money(voucherValue)}.</small></div></div>
      <label>Numero di buoni<input name="voucherCount" type="text" inputMode="numeric" value={voucherCount} onChange={e=>setVoucherCount(Math.max(1, Number(e.target.value) || 1))}/></label>
      <input name="amount" type="hidden" value={voucherCount*voucherValue}/>
      <div className="voucher-calculation"><span>{voucherCount} × {money(voucherValue)}</span><strong>{money(voucherCount*voucherValue)}</strong></div>
    </div> : <label>Valore<div className="amount-input"><span>€</span><input name="amount" type="text" inputMode="decimal" required placeholder="0,00" defaultValue={initial?amountInput(Math.abs(initial.amount)):undefined}/></div></label>}
    {isTransfer ? <div className="transfer-fields">
      <label>Da<select value={from} onChange={e=>{setFrom(e.target.value);if(e.target.value===to)setTo(usableAccounts.find(account=>account.name!==e.target.value)?.name||"")}}>{usableAccounts.map(account=><option key={account.id}>{account.name}</option>)}</select><small>Disponibile: {money(usableAccounts.find(account=>account.name===from)?.balance||0)}</small></label>
      <div className="transfer-arrow">↓</div>
      <label>A<select value={to} onChange={e=>setTo(e.target.value)}>{usableAccounts.map(account=><option key={account.id} disabled={account.name===from}>{account.name}</option>)}</select><small>Saldo: {money(usableAccounts.find(account=>account.name===to)?.balance||0)}</small></label>
    </div> : <>
      <label>Categoria e sottocategoria<button type="button" className="category-select" onClick={()=>setCategoryOpen(true)}><span>⌘</span><b>{refundSource?`Rimborso · ${selectedCategory}`:selectedCategory}</b><i>⌄</i></button></label>
      <label>Conto<button type="button" className="category-select account-select" disabled={isMealVoucher} onClick={()=>setAccountOpen(true)}><span><AppIcon name="accounts" size={16}/></span><b>{selectedCard?.name || selectedAccount || "Seleziona conto"}</b><i>⌄</i></button>{isMealVoucher&&<small className="auto-account-note">Buoni pasto selezionato automaticamente</small>}</label>
    </>}
    <label>Data<button type="button" className="date-wheel-trigger" onClick={()=>setDateOpen(true)}><span>◫</span><b>{formatItalianDate(selectedDateISO)}</b><i>›</i></button></label>
    {!planned && <div className="modal-toggle"><div><b>Contabilizzata</b><span>Disattivala se il movimento deve ancora essere verificato</span></div><button type="button" className={accounted?"on":""} onClick={()=>setAccounted(x=>!x)}><i/></button></div>}
    {!refundSource&&<div className="modal-toggle"><div><b>{labels.planned}</b><span>Programma il movimento per una data futura</span></div><button type="button" className={planned?"on":""} onClick={()=>setPlanned(x=>!x)}><i/></button></div>}
    {planned && <div className="planning-details">
      <p>A partire dalla data selezionata</p>
      <div className="form-grid"><label>Ripeti ogni<input type="number" min="1" defaultValue="1"/></label><label>Frequenza<select defaultValue="Mese"><option>Settimana</option><option>Mese</option><option>Anno</option></select></label></div>
      <label>Numero di volte<input type="number" min="0" placeholder="0 significa senza limiti"/></label>
      <div className="modal-toggle"><div><b>Contabilizzazione automatica</b><span>Il movimento sarà contabilizzato alla scadenza</span></div><button type="button" className={autoAccounted?"on":""} onClick={()=>setAutoAccounted(x=>!x)}><i/></button></div>
      {kind==="expense" && <div className="modal-toggle"><div><b>È un abbonamento?</b><span>Mostralo nella pagina Abbonamenti</span></div><button type="button" className={subscription?"on":""} onClick={()=>setSubscription(x=>!x)}><i/></button></div>}
      <label>Promemoria<select defaultValue="Nessun promemoria"><option>Nessun promemoria</option><option>Il giorno prima</option><option>3 giorni prima</option><option>7 giorni prima</option></select></label>
    </div>}
    <div className="modal-actions"><button type="button" className="cancel" onClick={close}>Annulla</button><button className={`save-action ${kind}`}>{refundSource?"Salva rimborso":labels.save}</button></div>
    {categoryOpen && <div className="category-picker">
      <div className="category-picker-title"><div><small>SELEZIONA CATEGORIA</small><h3>Categoria e sottocategoria</h3></div><button type="button" onClick={()=>setCategoryOpen(false)}>×</button></div>
      <div className="category-search"><AppIcon name="search" size={15}/><input placeholder="Cerca categoria..." /></div>
      <div className="category-tree">
        {categoryGroups.map(({root,children})=><div className="category-group" key={root.id}><button type="button" onClick={()=>{if(!children.length){setSelectedCategory(root.name);setCategoryOpen(false);if(!selectedAccount)setAccountOpen(true)}else setExpandedCategory(expandedCategory===root.name?"":root.name)}}><span className="real-icon" style={{color:root.color,background:`${root.color}18`}}><AppIcon name={root.icon} size={16}/></span><b>{root.name}</b><i><AppIcon name={!children.length?"forward":expandedCategory===root.name?"up":"down"} size={15}/></i></button>{expandedCategory===root.name&&children.length>0&&<div className="subcategory-list">{children.map(child=><button type="button" className="subcategory-choice" key={child.id} onClick={()=>{setSelectedCategory(`${root.name} › ${child.name}`);if(child.name==="Buoni pasto")setSelectedAccount("Buoni pasto");setCategoryOpen(false);if(child.name!=="Buoni pasto")setAccountOpen(true)}}><span className="sub-symbol real-icon" style={{color:child.color,background:`${child.color}18`}}><AppIcon name={child.icon} size={16}/></span><div><b>{child.name}</b></div><i><AppIcon name="forward" size={14}/></i></button>)}</div>}</div>)}
      </div>
    </div>}
    {accountOpen && <div className="account-picker-layer"><div className="account-picker-card"><h3>Seleziona conto</h3>{usableAccounts.map(account=><button type="button" key={account.id} onClick={()=>{setSelectedAccount(account.name);setSelectedCardId(null);setAccountOpen(false)}}><span><AppIcon name={account.icon} size={18}/></span><b>{account.name}</b><strong>{money(account.balance)}</strong></button>)}{cards.filter(card=>!card.archived).map(card=>{const linked=usableAccounts.find(account=>account.id===card.linkedAccountId);return <button type="button" key={card.id} onClick={()=>{setSelectedAccount(linked?.name||"");setSelectedCardId(card.id);setAccountOpen(false)}}><span><AppIcon name="card" size={18}/></span><b>{card.name}</b><strong>Carta di credito</strong></button>})}<button type="button" className="cancel-picker" onClick={()=>setAccountOpen(false)}>Annulla</button></div></div>}
    {dateOpen && <div className="date-picker-layer"><div className="date-picker-card"><h3>Seleziona data</h3><input className="native-date-input" type="date" value={selectedDateISO} onChange={event=>setSelectedDateISO(event.target.value)}/><div className="date-picker-actions"><button type="button" onClick={()=>setDateOpen(false)}>Annulla</button><button type="button" onClick={()=>setDateOpen(false)}>Conferma</button></div></div></div>}
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
        <div><small>TRANSAZIONE</small><h2>{transaction.label}</h2></div>
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
      <strong className={`transaction-detail-amount ${transaction.amount>0?"positive":""}`}>{transaction.amount>0?"+":""}{money(transaction.amount)}</strong>
      {transaction.isRefund&&<span className="refund-badge">Rimborso collegato alla spesa originale</span>}
      <div className="transaction-detail-data">
        <div><span>Categoria</span><b>{transaction.category}</b></div>
        <div><span>Conto</span><b>{transaction.account}</b></div>
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
  const [modal, setModal] = useState<{ kind: ActionKind; preset: "normal" | "planned" | "subscription"; defaultAccount?: string; cardId?: string; initial?: Transaction; editing?: boolean; refundSource?: Transaction } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccount[]>([]);
  const [categories, setCategories] = useState<MoneyCategory[]>([]);
  const [cards, setCards] = useState<MoneyCard[]>([]);
  const [budgets, setBudgets] = useState<MoneyBudget[]>([]);
  const [recurrences, setRecurrences] = useState<MoneyRecurrence[]>([]);
  const [dataBusy, setDataBusy] = useState(true);
  const [dataError, setDataError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const refreshData = async (activeUser = user) => {
    if (!activeUser) return;
    try {
      const data = await loadMoneyData(getSupabaseBrowserClient(), activeUser.id);
      setAccounts(data.accounts);
      setCategories(data.categories);
      setCards(data.cards);
      setBudgets(data.budgets);
      setRecurrences(data.recurrences);
      setTransactions(data.transactions.map(row => transactionFromDatabase(row, data.accounts, data.categories, data.cards)));
      setDataError("");
    } catch (error) {
      console.error(error);
      const message = typeof error === "object" && error && "message" in error ? String(error.message) : "Errore sconosciuto";
      setDataError(`Sincronizzazione non completata: ${message}`);
    } finally {
      setDataBusy(false);
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
    let recurrenceId: string | null = transaction.recurrenceId ?? null;
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
        notes: transaction.label,
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
      voucher_count: transaction.voucherCount ?? null,
      transaction_date: transaction.dateISO ?? toIsoDate(new Date()),
      due_date: transaction.planned ? transaction.dateISO ?? toIsoDate(new Date()) : null,
      confirmed_at: transaction.planned ? null : new Date().toISOString(),
      accounted_at: transaction.accounted ? new Date().toISOString() : null,
      notes: transaction.label,
    };
    const result = modal?.editing
      ? await supabase.from("transactions").update(payload).eq("id", transaction.id)
      : await supabase.from("transactions").insert(payload);
    if (result.error) { setDataError(result.error.message); return; }
    setModal(null);
    await refreshData(user);
  };
  const accountTransaction = async () => {
    if(!selectedTransaction) return;
    const { error } = await getSupabaseBrowserClient().from("transactions").update({ accounted_at: new Date().toISOString() }).eq("id", selectedTransaction.id);
    if (error) { setDataError(error.message); return; }
    setSelectedTransaction(null);
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
      icon: draft.type === "meal_vouchers" ? "voucher" : draft.type === "cash" ? "cash" : draft.type === "savings" ? "savings" : "bank",
      color: draft.type === "meal_vouchers" ? "#7051bf" : "#4f9d82",
    };
    const result = account
      ? await getSupabaseBrowserClient().from("accounts").update(payload).eq("id",account.id)
      : await getSupabaseBrowserClient().from("accounts").insert(payload);
    if(result.error){setDataError(result.error.message);return;}
    await refreshData(user);
  };
  const toggleAccount = async (account: MoneyAccount) => {
    const {error}=await getSupabaseBrowserClient().from("accounts").update({hidden_from_totals:!account.hidden}).eq("id",account.id);
    if(error){setDataError(error.message);return;}
    await refreshData();
  };
  const archiveAccount = async (account: MoneyAccount) => {
    if(!window.confirm(`Archiviare il conto “${account.name}”? Le transazioni resteranno nei bilanci e non sarà più possibile aggiungerne di nuove.`)) return;
    const {error}=await getSupabaseBrowserClient().from("accounts").update({archived_at:new Date().toISOString()}).eq("id",account.id);
    if(error){setDataError(error.message);return;}
    await refreshData();
  };
  const deleteAccount = async (account: MoneyAccount) => {
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
    let automaticAccounting=false;
    if(transaction.recurrenceId){
      const {data}=await supabase.from("recurrences").select("automatic_accounting").eq("id",transaction.recurrenceId).maybeSingle();
      automaticAccounting=Boolean(data?.automatic_accounting);
    }
    const now=new Date().toISOString();
    const updates: { confirmed_at: string; accounted_at?: string } = { confirmed_at: now };
    if(automaticAccounting) updates.accounted_at = now;
    const {error}=await supabase.from("transactions").update(updates).eq("id",transaction.id);
    if(error){setDataError(error.message);return;}
    await refreshData();
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
    await supabase.from("transactions").insert({user_id:user.id,kind:transaction.kind|| (transaction.amount<0?"expense":"income"),account_id:transaction.accountId,destination_account_id:transaction.destinationAccountId||null,category_id:transaction.categoryId||null,recurrence_id:transaction.recurrenceId||null,transfer_group_id:transaction.kind==="transfer"?crypto.randomUUID():null,amount:Math.abs(transaction.amount),voucher_count:transaction.voucherCount||null,transaction_date:nextDate,due_date:nextDate,confirmed_at:null,accounted_at:null,notes:transaction.label});
    if(transaction.recurrenceId) await supabase.from("recurrences").update({next_date:nextDate}).eq("id",transaction.recurrenceId);
    setSelectedTransaction(null);
    await refreshData();
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
          {active === "Dashboard" ? <Dashboard transactions={transactions} accounts={accounts} cards={cards} budgets={budgets} categories={categories} setActive={setActive} confirmTransaction={confirmPlannedTransaction} openTransaction={setSelectedTransaction}/> : active === "Transazioni" ? <TransactionsSection transactions={transactions.filter(transaction=>!transaction.dueDate||Boolean(transaction.confirmedAt))} openTransaction={setSelectedTransaction}/> : <GenericSection section={active} accounts={accounts} cards={cards} budgets={budgets} recurrences={recurrences} categories={categories} transactions={transactions} onSaveAccount={saveAccount} onToggleAccount={toggleAccount} onArchiveAccount={archiveAccount} onDeleteAccount={deleteAccount} openTransaction={setSelectedTransaction} refresh={()=>refreshData(user)} onAdd={(kind,defaultAccount,cardId)=>setModal({kind,preset:"normal",defaultAccount,cardId})}/>}
        </div>
      </main>
      {(["Dashboard","Transazioni","Pianificate"] as Section[]).includes(active) && <QuickActions plannedLabels={active==="Pianificate"} allowTransfer={active !== "Transazioni"} openAction={kind=>setModal({kind,preset:active==="Pianificate"?"planned":"normal"})} />}
      {active === "Abbonamenti" && <button className="quick-main quick-standalone" onClick={()=>setModal({kind:"expense",preset:"subscription"})}>+</button>}
      {selectedTransaction&&<TransactionDetail transaction={selectedTransaction} close={()=>setSelectedTransaction(null)} account={accountTransaction} refund={beginRefund} skip={()=>void skipPlannedTransaction(selectedTransaction)} repeatNow={()=>void repeatPlannedNow(selectedTransaction)} duplicate={()=>{const t=selectedTransaction;setSelectedTransaction(null);setModal({kind:t.amount<0?"expense":"income",preset:"normal",defaultAccount:t.account,initial:{...t,id:crypto.randomUUID()}})}} edit={()=>{const t=selectedTransaction;setSelectedTransaction(null);setModal({kind:t.amount<0?"expense":"income",preset:t.dueDate?"planned":"normal",defaultAccount:t.account,initial:t,editing:true})}} remove={()=>void removeTransaction(selectedTransaction)}/>}
      {modal && <TransactionModal kind={modal.kind} preset={modal.preset} defaultAccount={modal.defaultAccount} cardId={modal.cardId} initial={modal.initial} editing={modal.editing} refundSource={modal.refundSource} accounts={accounts} cards={cards} categories={categories} close={()=>setModal(null)} add={saveTransaction}/>}
    </div>
  );
}
