# Money Elite v4

Applicazione personale per gestire conti, transazioni, ricorrenze, abbonamenti, carte di credito e budget.

## Requisiti

- Node.js 22.13 o successivo
- Un progetto Supabase configurato

## Avvio locale

1. Copia `.env.example` in `.env.local` e inserisci URL e chiave pubblica di Supabase.
2. Installa le dipendenze con `npm install`.
3. Avvia l'app con `npm run dev`.
4. Apri `http://localhost:3000`.

## Database

Lo schema completo si trova in `supabase/schema.sql`. Le migrazioni aggiuntive sono nella cartella `supabase/migrations`.

## Verifica

- `npm run build` crea la build di produzione.
- `npm run lint` esegue i controlli statici configurati nel progetto.

## Versione

Money Elite versione 7.0.0 — 11 agosto 2026.

Per attivare il sistema multivaluta completo su un database esistente, eseguire nel SQL Editor di Supabase `supabase/migrations/20260805_multicurrency_complete.sql` una sola volta.

Per sincronizzare l’ordine dei conti tra dispositivi, eseguire anche `supabase/migrations/20260805_account_order_sync.sql` una sola volta.

Per attivare contenitori, Pocket, conti deposito e accrediti giornalieri, eseguire `supabase/migrations/20260805_account_containers_and_interest.sql` una sola volta.

Per aggiungere la categoria degli interessi maturati, eseguire `supabase/migrations/20260806_accrued_interest_category.sql` una sola volta.

Per sincronizzare i modelli tra dispositivi, eseguire `supabase/migrations/20260806_synced_transaction_templates.sql` una sola volta.
