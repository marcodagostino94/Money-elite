# Money Elite v4.7.3 — Changelog

Data: 6 agosto 2026

## Interfaccia iPhone

- Corretto il contenitore nella sezione Conti: nome, icona, saldo e freccia hanno ora spazi separati.
- I nomi lunghi vengono abbreviati visivamente senza sovrapporsi all’icona.

## Stato di contabilizzazione

- La precedente spunta è stata sostituita da un pallino blu acceso con punto interrogativo.
- Il nuovo indicatore identifica chiaramente una transazione ancora da contabilizzare.

## Interessi maturati

- Gli accrediti automatici dei conti deposito utilizzano la categoria entrata `Proventi Finanziari › Interessi maturati`.
- La migrazione collega alla categoria anche gli interessi automatici già creati e ancora privi di categoria.

## Reattività

- Inserimento, modifica e contabilizzazione delle transazioni aggiornano immediatamente l’interfaccia.
- Anche la conferma delle pianificate scompare subito dalla Dashboard.
- La sincronizzazione con Supabase continua in background; in caso di errore i dati vengono riallineati automaticamente.

## Migrazione richiesta

Eseguire una sola volta `supabase/migrations/20260806_accrued_interest_category.sql`.
