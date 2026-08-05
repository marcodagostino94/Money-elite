# Conti, ricerca categorie, modifica transazioni e grafici

Data: 5 agosto 2026

## Menu

- Rimossa la sezione **Debiti** dal menu principale.

## Ordinamento dei conti

- Nel menu di ogni conto sono disponibili **Sposta più in alto** e **Sposta più in basso**.
- L'ordine scelto viene salvato nelle preferenze locali dell'app.
- Lo stesso ordine viene utilizzato nella sezione Conti e nei selettori conto di Entrata, Uscita e Giroconto.
- L'ordinamento non modifica saldi, transazioni o dati finanziari.

## Ricerca delle categorie

- Il campo **Cerca categoria** filtra realmente categorie e sottocategorie durante la digitazione.
- Le sottocategorie corrispondenti vengono aperte automaticamente.
- Se non esistono risultati viene mostrato un messaggio dedicato.

## Modifica di una pianificata confermata

- Una transazione pianificata già confermata viene modificata come normale transazione.
- Cambiando importo, conto, categoria o data viene aggiornata soltanto la registrazione selezionata.
- La modifica non crea una nuova ricorrenza e non riporta la transazione tra le pianificate.
- Le pianificate ancora da confermare mantengono invece il loro comportamento specifico.

## Dashboard

- Rimossa la scheda **Ultimi 30 giorni** dai grafici.
- **Andamento patrimonio** è stato spostato nello stesso riquadro della spesa degli ultimi 7 giorni.
- Rimosso il precedente grafico patrimonio duplicato.

## Verifica

- Build di produzione Next.js completata correttamente.
- Controllo TypeScript completato senza errori.
