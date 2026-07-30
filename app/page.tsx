"use client";

import { useMemo, useState } from "react";
import * as L from "lucide-react";

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
  id: number;
  label: string;
  category: string;
  account: string;
  date: string;
  amount: number;
  icon: string;
  color: string;
  accounted?: boolean;
  isRefund?: boolean;
  refundOf?: number;
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
  { id: 1, label: "Stipendio", category: "Entrate", account: "Conto principale", date: "28 Lug 2026", amount: 2450, icon: "income", color: "green" },
  { id: 2, label: "Esselunga", category: "Spesa alimentare", account: "Carta Elite", date: "27 Lug 2026", amount: -86.4, icon: "groceries", color: "orange" },
  { id: 3, label: "Netflix", category: "Abbonamenti", account: "Carta Elite", date: "26 Lug 2026", amount: -17.99, icon: "streaming", color: "purple" },
  { id: 4, label: "Eni Plenitude", category: "Casa e utenze", account: "Conto principale", date: "25 Lug 2026", amount: -64.8, icon: "energy", color: "blue" },
  { id: 5, label: "Pranzo", category: "Ristoranti", account: "Contanti", date: "24 Lug 2026", amount: -24.5, icon: "food", color: "red", accounted: false },
  { id: 6, label: "Amazon", category: "Spese Personali › Amazon", account: "Revolut", date: "23 Lug 2026", amount: -50.99, icon: "package", color: "orange" },
  { id: 7, label: "Carburante", category: "Trasporti › Carburante", account: "Carta Elite", date: "22 Lug 2026", amount: -62, icon: "fuel", color: "blue" },
  { id: 8, label: "Farmacia", category: "Salute › Farmacia", account: "Conto principale", date: "21 Lug 2026", amount: -18.7, icon: "medical", color: "red" },
  { id: 9, label: "Rimborso farmacia", category: "Rimborso · Salute › Farmacia", account: "Conto principale", date: "21 Lug 2026", amount: 10, icon: "refund", color: "green", isRefund: true, refundOf: 8 },
  { id: 10, label: "Vodafone", category: "Casa › Vodafone", account: "Conto principale", date: "20 Lug 2026", amount: -29.9, icon: "technology", color: "blue" },
  { id: 11, label: "Cinema", category: "Divertimento › Cinema", account: "Contanti", date: "19 Lug 2026", amount: -12, icon: "cinema", color: "purple" },
  { id: 12, label: "Supermercato", category: "Alimenti › Supermercato", account: "Carta Elite", date: "18 Lug 2026", amount: -74.35, icon: "groceries", color: "orange" },
  { id: 13, label: "Parcheggio", category: "Trasporti › Parcheggio", account: "Contanti", date: "17 Lug 2026", amount: -4.5, icon: "parking", color: "blue" },
  { id: 14, label: "Spotify", category: "Abbonamenti › Spotify", account: "Revolut", date: "16 Lug 2026", amount: -10.99, icon: "music", color: "purple" },
];

const budgets = [
  { name: "Spesa alimentare", spent: 286, limit: 400, color: "#e6a35b" },
  { name: "Ristoranti", spent: 142, limit: 250, color: "#7859ce" },
  { name: "Trasporti", spent: 96, limit: 180, color: "#4a89b7" },
  { name: "Tempo libero", spent: 118, limit: 200, color: "#4f9d82" },
];

const money = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const iconMap: Record<string, L.LucideIcon> = {
  dashboard:L.LayoutDashboard,balance:L.Scale,transactions:L.ArrowUpDown,planned:L.CalendarClock,
  subscriptions:L.Repeat2,accounts:L.WalletCards,card:L.CreditCard,budget:L.ChartNoAxesColumnIncreasing,
  debts:L.HandCoins,report:L.ChartPie,settings:L.Settings,notification:L.Bell,income:L.ArrowDownLeft,
  expense:L.ArrowUpRight,transfer:L.ArrowLeftRight,groceries:L.ShoppingCart,streaming:L.MonitorPlay,
  energy:L.Zap,food:L.Utensils,bank:L.Landmark,cash:L.Banknote,savings:L.PiggyBank,voucher:L.Ticket,
  home:L.House,gift:L.Gift,refund:L.RotateCcw,document:L.FileText,work:L.BriefcaseBusiness,cloud:L.Cloud,
  music:L.Music2,furniture:L.Sofa,car:L.CarFront,coffee:L.Coffee,package:L.Package,hammer:L.Hammer,
  health:L.HeartPulse,medical:L.Pill,travel:L.Plane,fuel:L.Fuel,clothes:L.Shirt,technology:L.Smartphone,
  finance:L.BadgeEuro,trash:L.Trash2,archive:L.Archive,edit:L.Pencil,building:L.Building2,parking:L.CircleParking,
  flame:L.Flame,light:L.Lightbulb,cleaning:L.SprayCan,bike:L.Bike,bus:L.BusFront,beach:L.Umbrella,
  cinema:L.Clapperboard,fun:L.Sparkles,tax:L.ReceiptText,sport:L.Dumbbell,more:L.MoreHorizontal,
  plus:L.Plus,close:L.X,back:L.ArrowLeft,forward:L.ChevronRight,search:L.Search,calendar:L.CalendarDays,
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
      <img className="brand-mark" src="/money-elite-icon.png" alt="Money Elite" />
      <div><strong>Money Elite</strong><small>Il tuo denaro, con stile.</small></div>
    </div>
  );
}

function Sidebar({ active, setActive }: { active: Section; setActive: (s: Section) => void }) {
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
      <div className="profile"><div className="avatar">MD</div><div><b>Marco</b><small>Profilo personale</small></div><button>•••</button></div>
    </aside>
  );
}

function Header({ active }: { active: Section }) {
  const title = active === "Pianificate" ? "Transazioni pianificate" : active === "Debiti" ? "Debiti e crediti" : active;
  return (
    <header>
      <div><p>Mercoledì, 29 luglio 2026</p><h1>{title}</h1></div>
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
  const months = mode === "wealth" ? ["Ago","Ott","Dic","Feb","Apr","Giu","Lug"] : mode === "week" ? ["Mer","Gio","Ven","Sab","Dom","Lun","Oggi"] : ["1","5","10","15","20","25","29"];
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

function Dashboard({ transactions, setActive, confirmTransaction, openTransaction }: { transactions: Transaction[]; setActive: (s: Section) => void; confirmTransaction: (t: Transaction) => void; openTransaction: (t: Transaction) => void }) {
  const [chart, setChart] = useState<"wealth" | "week" | "month">("wealth");
  const today = "2026-07-29";
  const [pending, setPending] = useState([
    { id: 1, label: "Pranzi/Cene", category: "Alimenti", account: "Conto principale", info: "Alimenti · Conto principale", date: "29 Lug", fullDate: "29 Lug 2026", dueDate: "2026-07-29", amount: -42.5, accounted: false },
    { id: 2, label: "Amazon", category: "Spese Personali", account: "Revolut", info: "Spese Personali · Revolut", date: "30 Lug", fullDate: "30 Lug 2026", dueDate: "2026-07-30", amount: -51.9, accounted: false },
    { id: 3, label: "Assicurazione", category: "Trasporti", account: "Conto principale", info: "Trasporti · Conto principale", date: "31 Lug", fullDate: "31 Lug 2026", dueDate: "2026-07-31", amount: -39.25, accounted: true },
  ]);
  const duePending = pending.filter(item => item.dueDate <= today);
  const confirmPending = (item: typeof pending[number]) => {
    confirmTransaction({id:Date.now(),label:item.label,category:item.category,account:item.account,date:item.fullDate,amount:item.amount,icon:item.accounted?"check":"planned",color:item.amount<0?"orange":"green",accounted:item.accounted});
    setPending(x => x.filter(p => p.id !== item.id));
  };
  return (
    <>
      {duePending.length > 0 && <section className="pending-confirmations panel">
        <div className="pending-heading"><div><span className="pending-badge">●</span><div><h3>Da confermare</h3><p>{duePending.length} {duePending.length === 1 ? "transazione pianificata richiede" : "transazioni pianificate richiedono"} la tua conferma</p></div></div><button onClick={()=>setActive("Pianificate")}>Vedi pianificate →</button></div>
        <div className="pending-items">
          {duePending.map(item=><div className="pending-item" key={item.id}><div className="pending-date"><b>{item.date.split(" ")[0]}</b><span>{item.date.split(" ")[1]}</span></div><div><b>{item.label}</b><span>{item.info} · {item.accounted?"contabilizzazione automatica":"da contabilizzare"}</span></div><strong>{money(item.amount)}</strong><button onClick={()=>confirmPending(item)}>Conferma</button></div>)}
        </div>
      </section>}

      <section className="hero-grid">
        <button className="balance-card dark heritage-link" onClick={()=>setActive("Conti")}>
          <div className="card-heading"><span>Patrimonio totale dei conti</span><AppIcon name="forward" size={18}/></div>
          <h2>€ 12.840,65</h2>
          <p className="up">↗ 4,2% <span>rispetto al mese scorso</span></p>
          <div className="balance-breakdown">
            <div><small>LIQUIDITÀ</small><b>€ 9.460,65</b></div>
            <div><small>CARTA DI CREDITO</small><b className="card-debt">− € 1.146,30</b><em>Addebito 20 agosto</em></div>
            <div><small>RISPARMI</small><b>€ 3.380,00</b></div>
          </div>
        </button>
        <article className="balance-card balance-summary">
          <div className="balance-visual"><div className="balance-ring"><div><strong>€ 1.763,70</strong><span>BILANCIO</span></div></div><small>LUGLIO 2026</small></div>
          <div className="balance-numbers">
            <div><span><i className="income-dot"/>Entrate</span><strong>+ € 3.250,00</strong></div>
            <div><span><i className="expense-dot"/>Uscite</span><strong>− € 1.486,30</strong></div>
            <div className="total"><span>Totale</span><strong>+ € 1.763,70</strong></div>
          </div>
        </article>
      </section>

      <section className="panel insight-panel">
        <div className="chart-tabs">
          <button className={chart==="wealth"?"active":""} onClick={()=>setChart("wealth")}><span>Andamento patrimonio</span><b>€ 12.840,65</b></button>
          <button className={chart==="week"?"active":""} onClick={()=>setChart("week")}><span>Spese ultimi 7 giorni</span><b>€ 278,49</b></button>
          <button className={chart==="month"?"active":""} onClick={()=>setChart("month")}><span>Spese ultimi 30 giorni</span><b>€ 1.486,30</b></button>
        </div>
        <div className="insight-chart"><div><small>{chart==="wealth"?"ULTIMI 12 MESI":chart==="week"?"ULTIMI 7 GIORNI":"ULTIMI 30 GIORNI"}</small><h3>{chart==="wealth"?"+ € 1.840,65":chart==="week"?"Media € 39,78 al giorno":"− 3,1% rispetto a giugno"}</h3></div><Sparkline mode={chart}/></div>
      </section>

      <section className="dashboard-stack">
        <article className="panel transactions dashboard-list">
          <div className="panel-title"><div><h3>Transazioni recenti</h3><p>Gli ultimi movimenti registrati</p></div><button className="text-button" onClick={() => setActive("Transazioni")}>Vedi tutte →</button></div>
          <div className="transaction-list">
            {transactions.slice(0, 5).map((t) => <TransactionRow key={t.id} t={t} onOpen={openTransaction} />)}
          </div>
        </article>
        <article className="panel planned-panel">
          <div className="panel-title"><div><h3>Transazioni pianificate</h3><p>I prossimi movimenti previsti</p></div><button className="text-button" onClick={() => setActive("Pianificate")}>Gestisci →</button></div>
          <div className="planned-grid">
            {[["01","AGO","Affitto","Casa · Conto principale","− € 850,00"],["03","AGO","Fibra casa","Utenze · Carta Elite","− € 29,90"],["20","AGO","Addebito Carta Elite","Carta di credito","− € 1.146,30"]].map(x=><div className="planned-item" key={x[2]}><div className="planned-date"><b>{x[0]}</b><span>{x[1]}</span></div><div><b>{x[2]}</b><span>{x[3]}</span></div><strong>{x[4]}</strong></div>)}
          </div>
        </article>
        <article className="panel budget-panel dashboard-budget">
          <div className="panel-title"><div><h3>Budget mensili</h3><p>Luglio 2026</p></div><button className="text-button" onClick={() => setActive("Budget")}>Gestisci →</button></div>
          <div className="dashboard-budget-grid">{budgets.map((b) => (
            <div className="budget-row" key={b.name}>
              <div><b>{b.name}</b><span>{money(b.spent)} di {money(b.limit)}</span></div>
              <div className="progress"><i style={{ width: `${(b.spent / b.limit) * 100}%`, background: b.color }} /></div>
              <small>{Math.round((b.spent / b.limit) * 100)}%</small>
            </div>
          ))}</div>
          <div className="budget-footer"><span>Budget disponibile</span><strong>€ 388,00</strong></div>
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

function GenericSection({ section, onAdd }: { section: Exclude<Section, "Dashboard" | "Transazioni">; onAdd: (kind: ActionKind, defaultAccount?: string) => void }) {
  const cards: Record<string, { name: string; sub: string; value: string; icon: string }[]> = {
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
  if (section === "Budget") return <BudgetSection />;
  if (section === "Report") return <ReportSection />;
  if (section === "Impostazioni") return <SettingsSection />;
  if (section === "Bilancio") return <BalanceHistorySection onAdd={onAdd} />;
  if (section === "Pianificate") return <PlannedSection />;
  if (section === "Abbonamenti") return <SubscriptionsSection />;
  if (section === "Conti") return <AccountsSection onAdd={onAdd}/>;
  if (section === "Carte di credito") return <CreditCardsSection onAdd={onAdd}/>;
  const info = sectionData[section];
  return (
    <section className="section-page">
      <div className="section-toolbar"><button className="outline">＋ {info.action}</button></div>
      <div className="item-grid">
        {(cards[section] || []).map((item) => (
          <article className="item-card" key={item.name}>
            <div className="item-icon">{item.icon}</div><div className="item-body"><small>{item.sub}</small><h3>{item.name}</h3><strong>{item.value}</strong></div><button>•••</button>
          </article>
        ))}
        <button className="add-card"><span>＋</span>{info.action}</button>
      </div>
    </section>
  );
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
  const toggleHidden = (name:string) => setHiddenAccounts(current=>{const next=new Set(current);next.has(name)?next.delete(name):next.add(name);return next});
  const archive = (name:string) => {setArchivedAccounts(current=>new Set(current).add(name));setMenu(null)};
  if (detailAccount) {
    const account = accounts.find(a=>a.name===detailAccount)!;
    const monthEndDelta = detailAccount==="Conto principale" ? -679.9 : detailAccount==="Carta Elite" ? -29.9 : detailAccount==="Buoni pasto" ? 24 : 0;
    const rows = detailAccount==="Buoni pasto"
      ? [{id:91,label:"Ricarica buoni pasto",category:"Reddito › Buoni pasto",account:"Buoni pasto",date:"29 Lug 2026",amount:160,icon:"voucher",color:"green"} as Transaction,{id:92,label:"Pranzi/Cene",category:"Alimenti › Buoni pasto",account:"Buoni pasto",date:"28 Lug 2026",amount:-16,icon:"food",color:"orange"} as Transaction]
      : initialTransactions.filter(t=>t.account===detailAccount);
    return <section className="section-page"><div className="inner-page-header"><button onClick={()=>setDetailAccount(null)}><AppIcon name="back"/></button><div><small>CONTO · LUGLIO 2026</small><h2>{detailAccount}</h2><p>Transazioni del mese corrente</p></div></div><div className="account-detail-summary"><div className="item-icon real-icon"><AppIcon name={account.icon}/></div><div className="account-balance-pair"><div><small>SALDO ALLA DATA DI OGGI</small><strong>{money(account.balance)}</strong></div><div><small>SALDO PREVISTO AL 31 LUGLIO</small><strong>{money(account.balance+monthEndDelta)}</strong></div>{account.voucher&&<span>18 buoni da {money(8)}</span>}</div></div><div className="future-balance-note"><AppIcon name="planned" size={16}/><span>Il saldo previsto comprende anche le transazioni inserite con una data futura entro la fine del mese.</span></div><article className="panel month-transactions">{rows.length?rows.map(t=><TransactionRow key={t.id} t={t}/>):<div className="empty">Nessuna transazione per questo conto nel mese corrente.</div>}</article><QuickActions openAction={kind=>onAdd(kind,detailAccount)}/></section>;
  }
  return <section className="section-page"><p className="section-help">Tocca un conto per vedere le transazioni del mese corrente.</p><div className="accounts-total"><div><small>TOTALE DEI CONTI VISIBILI</small><span>I conti nascosti non sono inclusi</span></div><strong>{money(visibleTotal)}</strong></div><div className="accounts-list">{activeAccounts.map(a=>{const hidden=hiddenAccounts.has(a.name);return <article className={`account-row ${a.voucher?"voucher-account":""} ${hidden?"hidden-account":""}`} key={a.name} onClick={()=>setDetailAccount(a.name)}><div className="item-icon real-icon"><AppIcon name={a.icon}/></div><div><small>{a.sub}</small><h3>{a.name}</h3><strong>{hidden?"Saldo nascosto":money(a.balance)}</strong>{a.voucher&&!hidden&&<div className="voucher-meter"><i style={{width:"60%"}}/><span>18 buoni</span></div>}</div><button className="eye-button modern" title={hidden?"Mostra conto":"Nascondi conto"} onClick={e=>{e.stopPropagation();toggleHidden(a.name)}}><AppIcon name={hidden?"eyeOff":"eye"} size={17}/></button><button title="Trasferisci fondi" onClick={e=>{e.stopPropagation();onAdd("transfer",a.name)}}><AppIcon name="transfer" size={17}/></button><button onClick={e=>{e.stopPropagation();setMenu(menu===a.name?null:a.name)}}><AppIcon name="more" size={18}/></button>{menu===a.name&&<div className="account-menu" onClick={e=>e.stopPropagation()}>{a.voucher&&<button onClick={()=>onAdd("income",a.name)}><AppIcon name="voucher" size={14}/> Ricarica buoni</button>}<button onClick={()=>onAdd("income",a.name)}><AppIcon name="income" size={14}/> Aggiungi entrata</button><button onClick={()=>onAdd("expense",a.name)}><AppIcon name="expense" size={14}/> Aggiungi uscita</button><button><AppIcon name="edit" size={14}/> Modifica conto</button><button onClick={()=>archive(a.name)}><AppIcon name="archive" size={14}/> Archivia conto</button><button className="danger"><AppIcon name="trash" size={14}/> Elimina conto</button></div>}</article>})}</div>{archived.length>0&&<div className="archived-accounts"><div><b>Conti archiviati</b><span>Le transazioni passate restano in bilanci e report.</span></div>{archived.map(a=><button key={a.name} onClick={()=>setDetailAccount(a.name)}><span><AppIcon name={a.icon}/></span><div><b>{a.name}</b><small>Archiviato · sola consultazione</small></div><strong><AppIcon name="forward" size={16}/></strong></button>)}</div>}<button className="quick-main quick-standalone" onClick={()=>setNewAccount(true)}><AppIcon name="plus" size={22}/></button>{newAccount&&<SimpleEntityModal title="Crea nuovo conto" close={()=>setNewAccount(false)} type="account"/>}</section>
}

function CreditCardsSection({ onAdd }: { onAdd: (kind: ActionKind, defaultAccount?: string) => void }) {
  const [newCard, setNewCard] = useState(false);
  const [detail, setDetail] = useState(false);
  const [actions, setActions] = useState(false);
  const [repay, setRepay] = useState(false);
  if (detail) return <section className="section-page"><div className="inner-page-header"><button onClick={()=>setDetail(false)}><AppIcon name="back"/></button><div><small>CARTA DI CREDITO</small><h2>Carta Elite</h2><p>Periodo 21/07/26 — 20/08/26</p></div></div><div className="card-due-summary"><span>Ammontare dovuto</span><strong>€ 1.146,30</strong></div><article className="panel month-transactions">{initialTransactions.filter(t=>t.account==="Carta Elite").map(t=><TransactionRow key={t.id} t={t}/>)}</article><div className={actions?"card-actions open":"card-actions"}><div><button onClick={()=>setRepay(true)}><span><AppIcon name="card"/></span>Ripaga</button><button onClick={()=>onAdd("transfer","Carta Elite")}><span><AppIcon name="transfer"/></span>Trasferisci fondi</button><button onClick={()=>onAdd("income","Carta Elite")}><span><AppIcon name="income"/></span>Entrata</button><button onClick={()=>onAdd("expense","Carta Elite")}><span><AppIcon name="expense"/></span>Uscita</button></div><button className="quick-main" onClick={()=>setActions(x=>!x)}><AppIcon name={actions?"close":"plus"} size={23}/></button></div>{repay&&<RepayModal close={()=>setRepay(false)}/>}</section>;
  return <section className="section-page"><div className="cards-total"><span>AMMONTARE DOVUTO</span><strong>€ 1.146,30</strong></div><button className="credit-card-panel" onClick={()=>setDetail(true)}><div><small>CARTA ELITE</small><h3>€ 1.146,30</h3><span>Debito corrente</span></div><div className="credit-period"><span>21 LUG</span><b>23%</b><span>20 AGO</span><div className="progress"><i style={{width:"23%"}}/></div><p>Limite € 5.000,00 · Residuo € 3.853,70</p></div><i>›</i></button><button className="quick-main quick-standalone" onClick={()=>setNewCard(true)}>+</button>{newCard&&<SimpleEntityModal title="Crea una carta di credito" close={()=>setNewCard(false)} type="card"/>}</section>
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

function PlannedSection() {
  const items = [["30 LUG","Bolletta condominio","Casa","Casa · Conto principale","− € 49,09"],["31 LUG","Assicurazione moto","Trasporti","Trasporti · Conto principale","− € 39,25"],["31 LUG","Trasferimento risparmi","Trasferimento","Giroconto","€ 200,00"],["04 AGO","Bolletta energetica","Luce e Gas","Casa · Conto principale","− € 173,02"],["06 AGO","Stipendio","Reddito","Reddito · Conto principale","+ € 2.450,00"]] as const;
  return <section className="section-page"><article className="panel schedule-list">{items.map((x)=><div className="schedule-row" key={x[1]}><div className="schedule-icon" style={{color:x[2]==="Trasferimento"?"#4f8ca8":categoryColor(x[2]),background:`${x[2]==="Trasferimento"?"#4f8ca8":categoryColor(x[2])}18`}}><AppIcon name={x[2]==="Trasferimento"?"transfer":categoryIcon(x[2])}/></div><div><b>{x[1]}</b><span>{x[3]}</span></div><div><strong>{x[4]}</strong><span>{x[0]}</span></div><i className={x[2]==="Trasferimento"?"transfer-line":x[2]==="Reddito"?"income-line":"expense-line"}/></div>)}</article><div className="schedule-summary"><span>Questo mese <b>− € 348,34</b></span><span>Mese prossimo <b className="positive">+ € 1.010,43</b></span></div></section>
}

function SubscriptionsSection() {
  const items = [["Assicurazione moto","39,25","Trasporti","30/06/26","31/07/26",95],["Garage","260,00","Casa","05/07/26","05/08/26",79],["Netflix e Sky","14,89","Sky e Netflix","28/07/26","28/08/26",24],["Fibra casa","29,90","Vodafone","08/07/26","08/08/26",68]] as const;
  return <section className="section-page"><div className="subscription-summary"><div><small>PROSSIMI 30 GIORNI</small><strong>€ 492,07</strong></div><div><small>PROSSIMI 365 GIORNI</small><strong>€ 5.100,84</strong></div><div><small>MEDIA MENSILE</small><strong>€ 425,40</strong></div></div><article className="panel subscription-list">{items.map((x)=><div className="subscription-row" key={x[0]}><div className="subscription-icon" style={{color:categoryColor(x[2]),background:`${categoryColor(x[2])}18`}}><AppIcon name={categoryIcon(x[2])}/></div><div className="subscription-body"><h3>{x[0]}</h3><div className="subscription-dates"><span>{x[3]}</span><b>{x[5]}%</b><span>{x[4]}</span></div><div className="progress"><i style={{width:`${x[5]}%`,background:x[5]>85?"#c96360":x[5]>60?"#e0a04e":"#559476"}}/></div><strong>€ {x[1]} ogni mese</strong><small>{x[2]} · € {x[1]} / mese</small></div><button><AppIcon name="more"/></button></div>)}</article></section>
}

function BudgetSection() {
  const [month, setMonth] = useState("Luglio 2026");
  return (
    <section className="section-page">
      <div className="budget-month-row"><label>Mese<select value={month} onChange={e=>setMonth(e.target.value)}><option>Giugno 2026</option><option>Luglio 2026</option><option>Agosto 2026</option></select></label><button className="outline">＋ Crea budget</button></div>
      <div className="big-budget"><div><small>BUDGET TOTALI</small><h2>€ 1.030,00</h2></div><div><small>SPESO</small><h2>€ 642,00</h2></div><div><small>DISPONIBILE</small><h2 className="positive">€ 388,00</h2></div></div>
      <div className="item-grid">{budgets.map(b => <article className="item-card budget-card" key={b.name}><div className="item-body"><small>BUDGET MENSILE</small><h3>{b.name}</h3><div className="progress"><i style={{ width: `${b.spent / b.limit * 100}%`, background: b.color }} /></div><strong>{money(b.spent)} <span>di {money(b.limit)}</span></strong></div></article>)}</div>
    </section>
  );
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

function TransactionModal({ kind, close, add, preset = "normal", defaultAccount, initial, editing = false, refundSource }: { kind: ActionKind; close: () => void; add: (t: Transaction) => void; preset?: "normal" | "planned" | "subscription"; defaultAccount?: string; initial?: Transaction; editing?: boolean; refundSource?: Transaction }) {
  const [from, setFrom] = useState(defaultAccount || "Contanti");
  const [to, setTo] = useState("Conto principale");
  const [selectedAccount, setSelectedAccount] = useState(defaultAccount || initial?.account || "");
  const [accounted, setAccounted] = useState(initial?.accounted ?? false);
  const [planned, setPlanned] = useState(preset !== "normal");
  const [subscription, setSubscription] = useState(preset === "subscription");
  const [autoAccounted, setAutoAccounted] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initial?.date || "29 Luglio 2026");
  const [expandedCategory, setExpandedCategory] = useState(kind === "income" ? "Reddito" : "Alimenti");
  const [selectedCategory, setSelectedCategory] = useState(initial?.category || (kind === "income" ? "Reddito › Stipendio" : "Alimenti › Pranzi/Cene"));
  const [voucherCount, setVoucherCount] = useState(1);
  const voucherValue = 8;
  const isTransfer = kind === "transfer";
  const isMealVoucher = selectedCategory.endsWith("› Buoni pasto");
  const labels = kind === "expense"
    ? { eyebrow: "NUOVA USCITA", title: "Registra un’uscita", save: "Salva uscita", planned: "Uscita pianificata" }
    : kind === "income"
    ? { eyebrow: "NUOVA ENTRATA", title: "Registra un’entrata", save: "Salva entrata", planned: "Entrata pianificata" }
    : { eyebrow: "GIROCONTO", title: "Trasferisci fondi", save: "Trasferisci", planned: "Trasferimento pianificato" };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Number(fd.get("amount"));
    const category = isTransfer ? "Trasferimento tra conti" : selectedCategory;
    add({ id: editing && initial ? initial.id : Date.now(), label: refundSource ? `Rimborso ${refundSource.label}` : isTransfer ? `Trasferimento: ${from} → ${to}` : selectedCategory.split("›").at(-1)?.trim() || selectedCategory, category: refundSource ? `Rimborso · ${refundSource.category}` : category, account: isTransfer ? from : String(fd.get("account")), date: selectedDate.replace("Luglio","Lug"), amount: kind === "expense" ? -Math.abs(raw) : Math.abs(raw), icon: refundSource ? "refund" : isTransfer ? "transfer" : kind === "expense" ? "expense" : "income", color: refundSource ? "green" : isTransfer ? "blue" : kind === "expense" ? "orange" : "green", accounted, isRefund: Boolean(refundSource), refundOf: refundSource?.id });
    close();
  };
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <div className={`modal-accent ${kind}`} />
    <div className="modal-title"><div><small>{refundSource?"NUOVO RIMBORSO":editing?"MODIFICA TRANSAZIONE":initial?"DUPLICA TRANSAZIONE":labels.eyebrow}</small><h2>{refundSource?"Registra il rimborso":editing?"Modifica la transazione":initial?"Controlla la copia":labels.title}</h2></div><button type="button" onClick={close}>×</button></div>
    {refundSource&&<div className="refund-source"><span>Spesa originale</span><b>{refundSource.label}</b><small>{money(Math.abs(refundSource.amount))} · {refundSource.account} · {refundSource.date}</small></div>}
    {isMealVoucher ? <div className="transaction-voucher-box">
      <div className="voucher-explainer"><span className="real-icon"><AppIcon name="voucher" size={21}/></span><div><b>{kind==="income"?"Carica buoni pasto":"Utilizza buoni pasto"}</b><small>Il valore unitario impostato nel conto è {money(voucherValue)}.</small></div></div>
      <label>Numero di buoni<input name="voucherCount" type="number" min="1" step="1" value={voucherCount} onChange={e=>setVoucherCount(Math.max(1,Number(e.target.value)))} autoFocus/></label>
      <input name="amount" type="hidden" value={voucherCount*voucherValue}/>
      <div className="voucher-calculation"><span>{voucherCount} × {money(voucherValue)}</span><strong>{money(voucherCount*voucherValue)}</strong></div>
    </div> : <label>Valore<div className="amount-input"><span>€</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" defaultValue={initial?Math.abs(initial.amount):undefined} autoFocus/></div></label>}
    {isTransfer ? <div className="transfer-fields">
      <label>Da<select value={from} onChange={e=>{setFrom(e.target.value);if(e.target.value===to)setTo(e.target.value==="Contanti"?"Conto principale":"Contanti")}}><option>Contanti</option><option>Conto principale</option><option>Risparmi</option></select><small>Disponibile: {from==="Contanti"?"€ 520,00":from==="Risparmi"?"€ 3.380,00":"€ 8.940,65"}</small></label>
      <div className="transfer-arrow">↓</div>
      <label>A<select value={to} onChange={e=>setTo(e.target.value)}><option disabled={from==="Contanti"}>Contanti</option><option disabled={from==="Conto principale"}>Conto principale</option><option disabled={from==="Risparmi"}>Risparmi</option></select><small>Saldo: {to==="Contanti"?"€ 520,00":to==="Risparmi"?"€ 3.380,00":"€ 8.940,65"}</small></label>
      <p className="transfer-note">Il giroconto non modifica entrate, uscite o budget.</p>
    </div> : <>
      <label>Categoria e sottocategoria<button type="button" className="category-select" onClick={()=>!refundSource&&setCategoryOpen(true)} disabled={Boolean(refundSource)}><span>⌘</span><b>{refundSource?`Rimborso · ${refundSource.category}`:selectedCategory}</b><i>{refundSource?"":"⌄"}</i></button></label>
      <label>Conto{isMealVoucher&&<input type="hidden" name="account" value="Buoni pasto"/>}<select name={isMealVoucher?undefined:"account"} value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)} disabled={isMealVoucher}><option value="" disabled>Seleziona conto</option><option>Conto principale</option><option>Carta Elite</option><option>Contanti</option><option>Risparmi</option><option>Buoni pasto</option></select>{isMealVoucher&&<small className="auto-account-note">Selezionato automaticamente in base alla categoria</small>}</label>
    </>}
    <label>Data<button type="button" className="date-wheel-trigger" onClick={()=>setDateOpen(true)}><span>◫</span><b>{selectedDate}</b><i>›</i></button></label>
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
        {(kind==="income" ? [
          ["Guadagni",["Regalo","Rimborso"]],["Proventi Finanziari",[]],["Reddito",["730","Altri lavori","Buoni pasto","Stipendio","Straordinari"]],
        ] : [
          ["Abbonamenti",["App Store","Finanziamenti","iCloud","Sky e Netflix","Spotify"]],
          ["Alimenti",["Bar","Buoni pasto","Drink","Pranzi/Cene","Supermercato"]],
          ["Casa",["Arredamento","Condominio","Gas","Giardino","Lavori","Luce","Luce e Gas","Prodotti Casa","Pulizie","Riscaldamento","Rifiuti","Vodafone"]],
          ["Divertimento",["Cinema","Discoteca","Divertimento","Mare"]],
          ["Salute",["Farmacia","Lenti a contatto","Medici","Sport"]],
          ["Spese Personali",["Abbigliamento","Amazon","Cosmesi","Cura Personale","Regali","Scommesse","Tabacchi","Tecnologia"]],
          ["Tasse",["Multe","Tasse"]],
          ["Trasporti",["Automobile","Box","Carburante","Noleggio","Parcheggio","Scooter","Telepass","Trasporti pubblici"]],
          ["Viaggi",["Divertimento Viaggi","Hotel","Pranzi/Cene Viaggi","Trasporti Viaggi"]],
        ]).map(([group,children])=><div className="category-group" key={group as string}><button type="button" onClick={()=>{if((children as string[]).length===0){setSelectedCategory(group as string);setCategoryOpen(false)}else setExpandedCategory(expandedCategory===group?"":group as string)}}><span className="real-icon" style={{color:categoryColor(group as string),background:`${categoryColor(group as string)}18`}}><AppIcon name={categoryIcon(group as string)} size={16}/></span><b>{group}</b><i><AppIcon name={(children as string[]).length===0?"forward":expandedCategory===group?"up":"down"} size={15}/></i></button>{expandedCategory===group&&(children as string[]).length>0&&<div className="subcategory-list">{(children as string[]).map((child)=><button type="button" className="subcategory-choice" key={child} onClick={()=>{setSelectedCategory(`${group} › ${child}`);if(child==="Buoni pasto")setSelectedAccount("Buoni pasto");setCategoryOpen(false)}}><span className="sub-symbol real-icon" style={{color:categoryColor(child),background:`${categoryColor(child)}18`}}><AppIcon name={categoryIcon(child)} size={16}/></span><div><b>{child}</b><small>Sottocategoria di {group}</small></div><i><AppIcon name="forward" size={14}/></i></button>)}</div>}</div>)}
      </div>
    </div>}
    {dateOpen && <div className="date-picker-layer"><div className="date-picker-card"><h3>Seleziona data</h3><div className="date-wheels"><div>{["27","28","29","30","31"].map(x=><span className={x==="29"?"selected":""} key={x}>{x}</span>)}</div><div>{["Maggio","Giugno","Luglio","Agosto","Settembre"].map(x=><span className={x==="Luglio"?"selected":""} key={x}>{x}</span>)}</div><div>{["2024","2025","2026","2027","2028"].map(x=><span className={x==="2026"?"selected":""} key={x}>{x}</span>)}</div></div><div className="date-picker-actions"><button type="button" onClick={()=>setDateOpen(false)}>Annulla</button><button type="button" onClick={()=>{setSelectedDate("29 Luglio 2026");setDateOpen(false)}}>Conferma</button></div></div></div>}
  </form></div>
}

function TransactionDetail({ transaction, close, account, duplicate, edit, remove, refund }: {
  transaction: Transaction;
  close: () => void;
  account: () => void;
  duplicate: () => void;
  edit: () => void;
  remove: () => void;
  refund: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const canRefund = transaction.amount < 0 && !transaction.isRefund;
  return <div className="modal-backdrop" onMouseDown={close}>
    <article className="transaction-detail" onMouseDown={e=>e.stopPropagation()}>
      <div className="transaction-detail-head">
        <button onClick={close} aria-label="Chiudi"><AppIcon name="back"/></button>
        <div><small>TRANSAZIONE</small><h2>{transaction.label}</h2></div>
        <button onClick={()=>setMenu(x=>!x)} aria-label="Altre azioni"><AppIcon name="more"/></button>
        {menu&&<div className="transaction-detail-menu">
          {canRefund&&<button onClick={refund}><AppIcon name="refund" size={16}/> Rimborso</button>}
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
      {transaction.accounted===false&&<button className="account-transaction" onClick={account}><AppIcon name="check" size={17}/> Contabilizza</button>}
      {transaction.isRefund&&<p className="refund-note">Questo movimento riduce il totale delle spese e non viene conteggiato tra le entrate.</p>}
    </article>
  </div>;
}

export default function Home() {
  const [active, setActive] = useState<Section>("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<{ kind: ActionKind; preset: "normal" | "planned" | "subscription"; defaultAccount?: string; initial?: Transaction; editing?: boolean; refundSource?: Transaction } | null>(null);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const saveTransaction = (transaction: Transaction) => {
    setTransactions(rows => modal?.editing ? rows.map(row=>row.id===transaction.id?transaction:row) : [transaction,...rows]);
  };
  const accountTransaction = () => {
    if(!selectedTransaction) return;
    setTransactions(rows=>rows.map(row=>row.id===selectedTransaction.id?{...row,accounted:true}:row));
    setSelectedTransaction({...selectedTransaction,accounted:true});
  };
  const beginRefund = () => {
    if(!selectedTransaction) return;
    const original = selectedTransaction;
    setSelectedTransaction(null);
    setModal({kind:"income",preset:"normal",defaultAccount:original.account,initial:{...original,id:Date.now(),amount:Math.abs(original.amount),accounted:false},refundSource:original});
  };
  const choose = (s: Section) => { setActive(s); setMobileNav(false); };
  return (
    <div className="app-shell">
      <div className={mobileNav ? "mobile-overlay show" : "mobile-overlay"} onClick={()=>setMobileNav(false)} />
      <div className={mobileNav ? "sidebar-wrap open" : "sidebar-wrap"}><Sidebar active={active} setActive={choose}/></div>
      <main>
        <button className="mobile-menu" onClick={()=>setMobileNav(true)}>☰</button>
        <Header active={active} />
        <div className="page-content">
          {active === "Dashboard" ? <Dashboard transactions={transactions} setActive={setActive} confirmTransaction={t=>setTransactions(x=>[t,...x])} openTransaction={setSelectedTransaction}/> : active === "Transazioni" ? <TransactionsSection transactions={transactions} openTransaction={setSelectedTransaction}/> : <GenericSection section={active} onAdd={(kind,defaultAccount)=>setModal({kind,preset:"normal",defaultAccount})}/>}
        </div>
      </main>
      {(["Dashboard","Transazioni","Pianificate"] as Section[]).includes(active) && <QuickActions plannedLabels={active==="Pianificate"} allowTransfer={active !== "Transazioni"} openAction={kind=>setModal({kind,preset:active==="Pianificate"?"planned":"normal"})} />}
      {active === "Abbonamenti" && <button className="quick-main quick-standalone" onClick={()=>setModal({kind:"expense",preset:"subscription"})}>+</button>}
      {selectedTransaction&&<TransactionDetail transaction={selectedTransaction} close={()=>setSelectedTransaction(null)} account={accountTransaction} refund={beginRefund} duplicate={()=>{const t=selectedTransaction;setSelectedTransaction(null);setModal({kind:t.amount<0?"expense":"income",preset:"normal",defaultAccount:t.account,initial:t})}} edit={()=>{const t=selectedTransaction;setSelectedTransaction(null);setModal({kind:t.amount<0?"expense":"income",preset:"normal",defaultAccount:t.account,initial:t,editing:true})}} remove={()=>{setTransactions(rows=>rows.filter(row=>row.id!==selectedTransaction.id));setSelectedTransaction(null)}}/>}
      {modal && <TransactionModal kind={modal.kind} preset={modal.preset} defaultAccount={modal.defaultAccount} initial={modal.initial} editing={modal.editing} refundSource={modal.refundSource} close={()=>setModal(null)} add={saveTransaction}/>}
    </div>
  );
}
