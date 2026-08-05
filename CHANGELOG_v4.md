# Money Elite v4.0

## Aggiornamento v4.3

- I conti archiviati sono chiusi per impostazione predefinita e si espandono tramite freccia.
- Aggiunta la scelta e la modifica dell’icona del conto.
- Aggiunta una valuta per ogni conto: EUR, USD, GBP, CHF, JPY, CAD e AUD.
- I saldi dei singoli conti vengono formattati nella relativa valuta; i totali generali in euro non sommano importi esteri senza conversione.
- I modelli ora usano selettori visuali per categoria, sottocategoria e conto.
- La stella dei modelli è stata spostata in alto a destra accanto al titolo Categoria.
- Il selettore categorie si chiude toccando lo sfondo, ora oscurato come nel selettore dei conti.
- Aggiunta la migrazione Supabase per la valuta dei conti.

## Aggiornamento v4.2

- Aggiunta la gestione dei modelli di entrata e uscita nelle Impostazioni.
- Aggiunto il pulsante a stella nel modulo delle transazioni per richiamare i modelli.
- La scelta di un modello compila automaticamente valore, categoria, conto e note.
- È possibile salvare i dati correnti come nuovo modello direttamente durante l’inserimento.
- Il pannello categorie ora è più piccolo e sovrapposto, così il modulo sottostante rimane visibile.
- Corretti gli ingombri dei testi nei Conti e ridotto il valore centrale del grafico mensile in Dashboard.
- Aumentata la leggibilità dei valori nella sezione Bilancio.

## Aggiornamento v4.1

- Esteso il bordo colorato delle categorie a transazioni, pianificate, abbonamenti e movimenti dei conti.
- Compattata la navigazione mensile: sole frecce, senza menu a tendina né testi superflui.
- La ricerca delle transazioni ora si apre tramite una piccola lente.
- Rimossi il filtro “Tutte le categorie” e il selettore mensile dalla lista transazioni.
- Compattato il dettaglio conto: eliminata la grande card riepilogativa e sostituita con saldo e conteggio movimenti in formato ridotto.
- Ricalibrati i caratteri su iPhone per mantenere leggibilità e maggiore spazio utile.

Data: 5 agosto 2026

## Categorie e abbonamenti

- Gli abbonamenti mostrano il simbolo della sottocategoria; per i dati storici l'app prova a riconoscerla anche dal nome dell'abbonamento.
- Sostituiti i simboli generici con icone più significative, tra cui sigaretta per Tabacchi, bicchiere per Drink, profumo per Cosmesi, dadi per Scommesse, bilancia per Tasse e garage per Box.
- Mare usa un simbolo di viaggio al posto dell'ombrello.
- Ogni gruppo principale ha un colore più acceso e chiaramente distinguibile.
- Tutte le sottocategorie ereditano il colore della propria categoria principale, conservando un simbolo specifico.

## Interfaccia compatta

- Ridotti spazi e altezze negli elenchi di conti, transazioni e abbonamenti.
- I tre comandi dei conti restano sulla stessa riga anche su schermi stretti.
- Su iPhone la card Da confermare è più compatta; data, titolo, importo e Conferma sono sulla stessa riga.
- Ridotti header, margini e spazi verticali su iPhone per mostrare più contenuto.

## Azioni rapide

- Il pulsante + apre le azioni verticalmente sopra il pulsante, con simbolo e descrizione affiancati, in stile Fast Budget.
- Il comportamento è uniforme nelle pagine Dashboard, Transazioni, Pianificate, Conti e Carte.

## Informazioni e pulizia

- Rimossa la campanella delle notifiche da tutte le pagine.
- Aggiunta la sezione Informazioni con versione, tecnologia, sincronizzazione e compatibilità.
- Versione del progetto aggiornata a 4.0.0.
- Distribuzione rinominata `Money Elite v4` e ripulita da build, dipendenze installate, vecchi changelog e file temporanei.

## Verifica

- Build di produzione Next.js completata correttamente.
- Controllo TypeScript completato senza errori.
