# Spese nette nei grafici e Bilanci reali

Data: 5 agosto 2026

## Grafici delle spese

- Gli importi degli ultimi 7 e 30 giorni ora rappresentano le spese effettive nette.
- I rimborsi ricevuti nello stesso intervallo vengono sottratti dalle uscite.
- Giroconti e pagamenti delle carte non vengono conteggiati come nuove spese.
- Anche la media giornaliera degli ultimi 7 giorni utilizza il totale netto.

## Sezione Bilancio

- Rimossi i mesi e gli importi dimostrativi precedentemente fissi.
- L'elenco viene generato dalle transazioni reali e include sempre il mese corrente.
- Entrate, uscite nette e saldo mensile seguono la stessa logica della Dashboard.
- Aprendo agosto dalla Dashboard, agosto è ora disponibile anche nella sezione Bilancio.
- I dettagli del mese, le transazioni e i riepiloghi per categoria utilizzano i dati reali.
- Nei dettagli delle uscite, i rimborsi riducono il totale e la categoria collegata.

## Ambito preservato

Non è stata modificata la logica dei saldi dei conti o del patrimonio.

## Verifica

- Build di produzione Next.js completata correttamente.
- Controllo TypeScript completato senza errori.
