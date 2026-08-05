# Money Elite v4.8 — Changelog

Data: 6 agosto 2026

## Budget e notifiche

- Prima di salvare una spesa che raggiunge o supera il budget appare una conferma con spesa prevista e limite.
- Scegliendo Annulla la transazione non viene salvata.
- Quando le notifiche sono abilitate e autorizzate, viene inviata anche una notifica del dispositivo.
- Il controllo Notifiche budget nelle Impostazioni ora richiede il permesso e memorizza la preferenza.

## Modelli sincronizzati

- I modelli di transazione sono salvati in Supabase e sincronizzati tra Mac, iPhone e altri dispositivi.
- I modelli locali già presenti vengono migrati automaticamente al primo accesso dopo l’aggiornamento.
- Creazione, modifica ed eliminazione vengono propagate agli altri dispositivi.

## Backup completo

- Il pulsante Esporta tutti i dati genera ora un backup JSON reale.
- Include profilo, conti, carte, categorie, transazioni, pianificate, budget, debiti, modelli e preferenze locali.
- Il file contiene data di esportazione e versione dell’app.

## Report

- Il grafico Entrate e uscite usa i movimenti reali degli ultimi sei mesi.
- Le uscite del mese sono raggruppate per categoria principale.
- Aggiunto il report Futuro con entrate, uscite e saldo previsto per i prossimi dodici mesi.
- La previsione usa esclusivamente le ricorrenze attive e rispetta frequenza, limite e data finale.
- Il report completo può essere esportato in JSON.

## Migrazione richiesta

Eseguire una sola volta `supabase/migrations/20260806_synced_transaction_templates.sql`.
