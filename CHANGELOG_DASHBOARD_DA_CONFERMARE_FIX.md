# Fix Dashboard — Da confermare

Data: 5 agosto 2026

## Intervento eseguito

- La sezione **Da confermare** ora include tutte le ricorrenze attive con `next_date` uguale o precedente alla data odierna.
- Le ricorrenze in pausa o disattivate sono escluse.
- Se la transazione pending della ricorrenza non esiste ancora, la Dashboard mostra una voce derivata direttamente dalla ricorrenza.
- Se una pending esiste già per la stessa ricorrenza e scadenza, viene riutilizzata e non viene mostrato un duplicato.
- La conferma crea la transazione soltanto quando manca, la conferma una sola volta e fa avanzare la ricorrenza rispettando frequenza e intervallo.
- Il contatore delle occorrenze viene aggiornato; la ricorrenza viene conclusa quando raggiunge il limite o supera la data finale.
- Dopo la conferma, la voce scompare dalla Dashboard; se la data successiva è già scaduta, viene mostrata la successiva occorrenza da confermare.
- Disattivando o eliminando una ricorrenza, l'eventuale voce collegata non compare più in **Da confermare**.

## Ambito preservato

Non sono stati modificati saldi, patrimonio, grafica, bilanci o altre sezioni dell'applicazione.

## Verifica

- Build di produzione Next.js completata correttamente.
- Controllo TypeScript completato correttamente.
- Il lint mantiene quattro segnalazioni già presenti nel progetto originale e non collegate a questo fix.
