# Money Elite 12.2.0

## Correzioni 12.2

- Il consuntivo già inserito può essere modificato dal pulsante della gestione e direttamente dal riepilogo finale.
- Aggiunta una copia visibile del workflow GitHub Pages per facilitare la sostituzione del vecchio file nel repository.

## Correzioni 12.1

- Importi di preventivo e saldo iniziale inseribili correttamente anche su iPhone.
- Modificando una rata, quelle successive vengono ricalcolate per conservare il totale del preventivo.
- Riepilogo preventivo con rata originaria, credito applicato e importo effettivo.
- Anteprima completa e selettiva delle pianificate prima della creazione.
- Debito precedente trasformato in una rata collegata `Saldo consuntivo`.
- La gestione corrente è indicata come `In corso`; le rate azzerate dal credito risultano saldate.
- Riepilogo Fondo pensione riordinato e saldo reale rimosso.
- I trasferimenti TFR dall’azienda concorrono ai totali e possono essere annullati.

## Condominio

- Nuovo gruppo autonomo nel menu, tra Gestione e Analisi.
- Gestione ordinaria gennaio-dicembre e riscaldamento novembre-giugno.
- Preventivi, rate modificabili, rate straordinarie e consuntivi.
- Scadenze standard configurate per entrambe le gestioni.
- Saldo iniziale a debito o credito con tab storico semplificato.
- Crediti precedenti scalati progressivamente dalle nuove rate.
- Collegamento facoltativo e selettivo alle transazioni pianificate.
- Categorie automatiche Casa › Condominio e Casa › Riscaldamento.
- Conferma della pianificata sincronizzata con lo stato verde della rata.
- Pagamento manuale interno senza effetti sui conti.
- Eliminazione delle sole pianificate future; storico confermato preservato.

## Fondo pensione

- Barra azioni compatta su iPhone con tre pulsanti affiancati.
- Azioni delle mensilità ridisposte accanto all'importo.

## Pubblicazione GitHub Pages

- Runner fissato a Ubuntu 24.04.
- Actions aggiornate al runtime Node.js 24.
- Archivio Pages caricato con `actions/upload-artifact@v6`.

## Database

Eseguire `SQL_CONDOMINIO_V12.sql` nel SQL Editor di Supabase prima di usare la nuova sezione.
