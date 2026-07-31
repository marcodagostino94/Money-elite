# Money Elite v2.1.1 — Saldi Fix

## Correzione principale

- Sostituita la paginazione OFFSET/RANGE delle transazioni con paginazione keyset stabile basata sull'ID.
- Motivo: con oltre 1.000 movimenti, un INSERT ricevuto via realtime durante il caricamento poteva spostare i confini delle pagine. Il risultato poteva contenere una transazione duplicata e un'altra omessa, facendo variare il saldo di un conto non coinvolto nella nuova operazione.
- Dopo il caricamento completo, le transazioni vengono riordinate per data/creazione così l'ordine visivo resta invariato.

## Protezione sincronizzazione

- Aggiunta una sequenza di refresh in `app/page.tsx`.
- Se salvataggio manuale e evento Supabase realtime avviano due refresh contemporaneamente, solo il refresh più recente può aggiornare lo stato dell'app.
- Un caricamento più vecchio e lento non può più sovrascrivere saldi più recenti.

## Ambito

- Nessuna modifica a UI, categorie, carte o multi-valuta.
- Nessuna modifica allo schema Supabase.
- La logica matematica esistente dei saldi resta invariata; viene corretto il modo in cui l'intero storico viene caricato e applicato allo stato.
