# Money Elite versione 9.0.0

Release principale che consolida tutte le funzioni e le correzioni approvate fino alla versione 9.0.0.

## Versione 9.0.0

- Confermando dalla Dashboard una pianificata o un abbonamento scaduto, la transazione reale viene ora registrata con la data odierna.
- La scadenza originaria resta conservata come riferimento della ricorrenza e il calendario delle occorrenze successive continua ad avanzare dalla data prevista.
- Corretto il calcolo degli interessi giornalieri: l'accredito viene sempre troncato al centesimo inferiore, senza arrotondamenti per eccesso.
- I millesimi non accreditati vengono conservati e sommati al giorno successivo, anche cambiando dispositivo o riaprendo l'app.
- L'ammontare dovuto generale delle carte include tutti i cicli non ancora ripagati.
- La card di ogni carta continua a mostrare separatamente il debito e l'utilizzo del ciclo corrente.
- Il dettaglio del ciclo conserva la navigazione e il totale del periodo selezionato.
- L'azione “Ripaga” propone il debito complessivo residuo della carta, inclusi i cicli precedenti.
- Rimborsi e ripagamenti già registrati riducono il debito complessivo una sola volta.
- Nuova release pulita denominata `Money Elite versione 9`.
- L'ammontare dovuto generale comprende soltanto i cicli conclusi e non ancora ripagati, calcolati usando il giorno di inizio configurato per ciascuna carta.
- Il giorno di pagamento resta specifico per ogni carta e non è fissato a una data predefinita.
- Il ripagamento è registrato come trasferimento verso la carta: riduce il conto e il debito senza creare una nuova spesa nei grafici, nei budget o nei report.
- “Ripaga” esclude sempre il ciclo ancora aperto e permette di usare soltanto conti correnti principali.
- Esclusi dal ripagamento contenitori, Pocket, conti deposito e buoni pasto.

## Versione 8.0.0

- Uniformati i colori delle transazioni alle rispettive categorie principali.
- Ogni sottocategoria conserva in tutti gli elenchi lo stesso colore della propria categoria.
- Corretta la visualizzazione delle transazioni già salvate, comprese quelle della sottocategoria Bar.
- Aggiunto il filtro `NC` nelle Transazioni generali.
- Aggiunto il filtro `NC` nei movimenti di ogni singolo conto.
- Il filtro è disattivo per impostazione predefinita e mostra soltanto le transazioni non contabilizzate quando viene attivato.
- Una transazione contabilizzata scompare immediatamente dall’elenco filtrato.
- Nuova release pulita denominata `Money Elite versione 8`.

## Versione 7.0.1

- Corretta l’icona della categoria “Mare”.
- Sostituito l’aereo con il simbolo delle onde del mare in tutte le sezioni dell’app.

## Versione 7.0.0

- Nuova release pulita denominata `Money Elite versione 7`.
- Conservate tutte le funzioni approvate di conti, carte, budget, report, modelli, pianificate e multivaluta.
- Inclusi gli ultimi interventi su carte di credito, rimborsi, budget netti e report per categoria.
- Aggiornati numero di versione, Informazioni, README, changelog e metadati del progetto.
- Escluse dal pacchetto finale cache, build locali, dipendenze e file non necessari.

## Aggiornamento 6.2.1

- Un nuovo rimborso usa automaticamente la data odierna invece della data della spesa originale.
- La data resta modificabile manualmente prima del salvataggio.
- Categoria, conto, importo e collegamento alla spesa originale restano precompilati come prima.

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
- La precedente cartella principale era denominata `Money Elite v6`.
- Rimossi cache di compilazione, build esportate e copie di versioni precedenti.
- Rimosse le icone dimostrative di Next.js non utilizzate dall'app.
- Conservati codice sorgente, loghi bancari, icona dell'app, immagine social, configurazione GitHub e file Supabase.

© 2026 Marco D'Agostino. Tutti i diritti riservati.
