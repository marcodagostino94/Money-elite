# Money Elite v3.0.3 — Pianificate pending fix

## Correzione principale
- Le transazioni pianificate non confermate sono ora considerate esclusivamente previsioni/promemoria.
- Finché `confirmed_at` è vuoto non modificano i saldi dei conti né il patrimonio totale.
- Non incidono su liquidità, risparmi, debito carta, entrate/uscite, spese 7/30 giorni o budget.
- Le viste reali di Conti e Carte di credito non includono movimenti pianificati ancora pendenti.
- La sezione Dashboard “Da confermare” continua a mostrarle normalmente.
- Premendo “Conferma”, la transazione entra nei conteggi una sola volta tramite il normale ricalcolo dai dati Supabase.

## Invariato
- Restano inclusi i fix v3.0.2 sui Buoni pasto (campo numero buoni, Reddito, icona dedicata e pannello speciale).
- Nessuna modifica allo schema Supabase.
