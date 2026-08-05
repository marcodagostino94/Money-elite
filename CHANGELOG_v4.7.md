# Money Elite v4.7 — Changelog

Data: 5 agosto 2026

## Conti contenitore

- È possibile creare un conto contenitore per raggruppare conti dello stesso istituto.
- Ogni conto operativo può essere associato a un contenitore come conto principale, Pocket, deposito o altro.
- Il contenitore mostra il saldo aggregato dei conti collegati, ma non viene conteggiato nuovamente nel patrimonio.
- Un contenitore non compare tra i conti utilizzabili per transazioni e trasferimenti.
- I conti collegati restano invece pienamente selezionabili in entrata, uscita e trasferimento.
- Non è possibile archiviare o eliminare un contenitore finché contiene conti attivi.

## Conti deposito

- Per un conto classificato come deposito si può impostare il tasso percentuale annuo.
- L’app calcola l’interesse con la formula `saldo × tasso annuo / 365`.
- Gli interessi vengono registrati come transazioni di entrata contabilizzate, una per ogni giornata maturata.
- Il vincolo nel database impedisce di accreditare due volte l’interesse dello stesso giorno sullo stesso conto.
- La modifica del tasso vale per gli accrediti futuri e non altera le transazioni già registrate.

## Migrazione richiesta

Eseguire una sola volta nel SQL Editor di Supabase:

`supabase/migrations/20260805_account_containers_and_interest.sql`

La migrazione non modifica saldi o transazioni esistenti.
