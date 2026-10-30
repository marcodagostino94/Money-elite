# Money Elite 13.2.2

- Le transazioni condominiali vengono lette direttamente dal database usando l'identificativo della pianificata collegata alla rata.
- Una transazione confermata resta visibile anche quando la ricorrenza monorata è ormai conclusa.
- `Mostra transazioni` spiega sempre perché una rata è verde.
- Se la rata è stata segnata manualmente, viene mostrata la data e l'assenza di una transazione collegata.
- Se la rata è stata azzerata da un credito precedente, viene indicato che non esiste alcun movimento economico.
- Rimossa l'associazione approssimativa basata sulla somiglianza di importo e data.

Questa versione non richiede nuove query SQL.
