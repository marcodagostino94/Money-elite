# Money Elite FIX v2 — 31/07/2026

- Corretto il limite Supabase di 1.000 transazioni: ora `loadMoneyData` carica tutte le transazioni a pagine da 1.000 record fino a esaurimento.
- I saldi dei conti vengono quindi calcolati sull'intero storico, inclusi trasferimenti in uscita e in entrata.
- Nel dettaglio conto il mese/anno centrale è ora un selettore: si può saltare direttamente a un mese/anno precedente senza premere decine di volte “Mese precedente”.
- Le frecce mese precedente/successivo restano disponibili.

Nota multi-valuta: non inclusa in questa build perché richiede una modifica dati/schema separata; vedi conversazione per il piano EUR/GBP/EGP.
