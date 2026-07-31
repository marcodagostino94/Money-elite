# Money Elite v3.0 — editor transazioni unificato

Prima fase della v3.0, costruita sulla v2.1.1 SALDI FIX.

## Modifiche
- Eliminato il vecchio editor separato delle transazioni pianificate.
- Le transazioni pianificate vengono ora modificate con lo stesso `TransactionModal` usato dalle transazioni normali.
- Gli abbonamenti sono ora modificabili e aprono lo stesso editor unificato.
- Il selettore categoria/sottocategoria è quindi lo stesso per transazioni, pianificate e abbonamenti.
- La logica speciale `Buoni pasto` viene riutilizzata anche per pianificate e abbonamenti: selezione automatica del conto Buoni pasto, campo numero buoni e calcolo tramite valore unitario del conto.
- Frequenza, intervallo, numero massimo di ricorrenze e contabilizzazione automatica sono ora campi realmente collegati allo stato dell'editor (non più valori fissi del form).
- La modifica di una ricorrenza aggiorna direttamente la riga `recurrences` senza creare o alterare per errore una transazione ordinaria.
- Gli abbonamenti mantengono forzatamente la natura pianificata quando vengono aperti dalla sezione Abbonamenti.
- Migliorata l'inizializzazione dei giroconti ricorrenti in modifica (conto origine/destinazione).

## Base mantenuta
- Conservato integralmente il fix saldi della v2.1.1 (paginazione stabile + protezione refresh concorrenti).

## Test consigliati
1. Aprire un abbonamento esistente, modificarne importo/data/categoria e salvare.
2. Creare una pianificata Entrata > Reddito > Buoni pasto e verificare che compaia il numero dei buoni e venga selezionato automaticamente il conto Buoni pasto.
3. Creare una pianificata Uscita > Alimenti > Buoni pasto e verificare lo stesso comportamento.
4. Modificare una pianificata esistente e verificare che categoria, conto, frequenza e numero ricorrenze restino valorizzati.
5. Controllare dopo ogni prova che i saldi dei conti ordinari non cambino finché la pianificata non viene contabilizzata/confermata.
