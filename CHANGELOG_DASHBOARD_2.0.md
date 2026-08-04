# Money Elite — Dashboard 2.0

Base: `Money_Elite_v3.1_UI_READABILITY`

## Nuovo ordine della Dashboard

1. Da confermare, solo quando sono presenti elementi.
2. Bilancio del mese a sinistra e Conti preferiti a destra.
3. Patrimonio totale.
4. Grafici delle spese.
5. Budget.
6. Transazioni recenti.
7. Transazioni pianificate.

## Conti preferiti

- La card Conti non mostra alcun totale.
- In Impostazioni > Dashboard si scelgono i conti da mostrare.
- La preferenza viene conservata localmente nel browser.
- Alla prima apertura vengono proposti automaticamente i primi quattro conti visibili.

## Interventi grafici

- Leggermente ridotte le dimensioni introdotte nella v3.1, mantenendo la maggiore leggibilità.
- Nuove card Bilancio del mese e Conti.
- Grafici dedicati esclusivamente alle spese degli ultimi 7 e 30 giorni.
- Layout responsive: due colonne su desktop, una colonna su iPhone.

## Compatibilità

Non sono state modificate:
- logica dei saldi;
- query Supabase;
- patrimonio;
- transazioni pianificate;
- conferme;
- categorie;
- dati esistenti.
