# Money Elite 13.2.3

- Corretto il riconoscimento delle transazioni realmente associate alle rate segnate come pagate.
- Resta prioritario il collegamento tecnico diretto con la pianificata.
- Se il vecchio collegamento tecnico manca, la transazione viene riconosciuta solo quando coincidono categoria e importo e la data è entro sette giorni dalla data di pagamento della rata.
- Il conto viene usato come criterio di preferenza, senza escludere i pagamenti effettuati da un conto diverso da quello inizialmente previsto.
- Le transazioni riconosciute vengono mostrate al posto dell'errata dicitura `non esiste una transazione collegata`.

Questa versione non richiede nuove query SQL.
