# Ripristino menu Transazioni pianificate

Data: 5 agosto 2026

## Intervento eseguito

- Il clic o tap su una transazione pianificata apre nuovamente il menu delle azioni, invece di entrare direttamente in modifica.
- Il menu contiene: **Ripeti ora**, **Salta questa ripetizione**, **Modifica**, **Duplica**, **Metti in pausa/Riattiva** ed **Elimina**.
- **Ripeti ora** crea una voce da confermare con data odierna senza modificare la pianificazione futura e senza duplicare una pending già presente per oggi.
- **Salta questa ripetizione** calcola la nuova data rispettando frequenza e intervallo configurati.
- **Modifica** apre l'editor della ricorrenza selezionata.
- **Duplica** apre una nuova pianificata precompilata senza sovrascrivere l'originale.
- Le ricorrenze in pausa restano visibili nell'elenco, sono riconoscibili dallo stato e possono essere riattivate.
- **Elimina** rimuove la ricorrenza; l'eventuale voce collegata scompare anche da **Da confermare**.
- La Dashboard riconosce anche le pending generate da **Ripeti ora**, continuando a evitare duplicati per ricorrenza e data.

## Ambito preservato

Non sono stati modificati i calcoli di saldi, patrimonio, bilanci o budget.

## Verifica

- Build di produzione Next.js completata correttamente con Webpack.
- Controllo TypeScript completato senza errori.
- Il lint conserva soltanto le quattro segnalazioni già presenti nella base ricevuta.
