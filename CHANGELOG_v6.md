# Money Elite v6.2.0

Versione 6 basata sulla versione 5.0.7 approvata.

## Aggiornamento 6.2.0

- Aggiunta la modifica dei budget esistenti.
- È possibile cambiare categoria e importo del budget mensile.
- Ogni card budget apre ora il dettaglio del mese.
- Il dettaglio mostra tutte le uscite e tutti i rimborsi usati per calcolare la spesa netta.
- Aggiunti pulsanti diretti per modificare, eliminare o consultare le transazioni del budget.

## Aggiornamento 6.1.3

- Aggiunta l’azione “Estingui carta” nel menu della carta di credito.
- L’estinzione è consentita soltanto quando il debito residuo è pari a zero.
- Le carte estinte spariscono dall’elenco attivo ma conservano tutte le operazioni storiche.
- Aggiunto l’elenco richiudibile “Carte estinte” per consultare lo storico in sola lettura.
- Rimborsi e accrediti sulla carta riducono correttamente il debito residuo.

## Aggiornamento 6.1.2

- Le spese delle carte di credito sono visibili soltanto nella sezione Carte e nel dettaglio della relativa carta.
- Le spese delle carte non compaiono nelle transazioni recenti della Dashboard né nell’elenco generale Transazioni.
- Il conto collegato mostra soltanto il pagamento effettivo del debito della carta.
- I budget calcolano ora la spesa netta sottraendo i rimborsi.
- Il ricalcolo vale anche per i budget assegnati a una categoria principale con relative sottocategorie.
- Gli avvisi di raggiungimento e superamento budget considerano anch’essi i rimborsi già registrati.

## Aggiornamento 6.1.1

- Le spese effettuate con carta di credito non compaiono più nei movimenti del conto bancario collegato.
- Le spese della carta non modificano direttamente il saldo del conto collegato.
- Il conto viene movimentato soltanto quando viene registrato il pagamento della carta.
- Corretto il calcolo del ciclo corrente quando la data odierna precede il giorno di inizio ciclo.
- La percentuale di utilizzo considera ora le spese del ciclo realmente in corso.

## Aggiornamento 6.1.0

- Aggiunto in Report il nuovo pannello “Per categoria”.
- Selezione visuale di categorie e sottocategorie con simboli e colori, senza menu a tendina.
- Periodi disponibili: mese corrente, ultimi 3, 6 o 12 mesi.
- Filtri per tutti i movimenti, entrate oppure uscite.
- Riepilogo di entrate, uscite, saldo e numero di transazioni.
- Grafico mensile e pulsante per visualizzare tutte le transazioni della categoria nel periodo scelto.
- Nessuna modifica a saldi, patrimonio, transazioni o database.

## Aggiornamento 6.0.2

- Corretto il pulsante Salva modello.
- La finestra si chiude dopo il salvataggio riuscito.
- Se manca un dato obbligatorio viene mostrato un messaggio preciso.
- Gestiti gli eventuali errori della memoria locale senza lasciare la finestra bloccata.

## Aggiornamento 6.0.1

- I loghi Revolut e Mediolanum sono selezionabili anche per i conti operativi.
- I loghi sono disponibili sia durante la creazione sia durante la modifica del conto.
- Migliorata la visualizzazione dei loghi negli elenchi e nella Dashboard.

## Operazioni eseguite

- Nessuna modifica alle funzioni o alla grafica approvate.
- Versione applicazione aggiornata a 6.0.0.
- Cartella principale rinominata in `Money Elite v6`.
- Rimossi cache di compilazione, build esportate e copie di versioni precedenti.
- Rimosse le icone dimostrative di Next.js non utilizzate dall'app.
- Conservati codice sorgente, loghi bancari, icona dell'app, immagine social, configurazione GitHub e file Supabase.

© 2026 Marco D'Agostino. Tutti i diritti riservati.
