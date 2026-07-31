# Money Elite - Fix 31/07/2026

Modifiche incluse:

- Conti: dettaglio navigabile mese per mese; mostra trasferimenti sia in uscita sia in entrata e con segno corretto nel conto consultato.
- Transazioni: ricerca, filtro categoria e filtro mese/anno ora funzionanti; aggiunta navigazione mese precedente/successivo.
- Carte di credito: dettaglio filtrato per ciclo della carta (es. giorno 21 -> giorno 20 del mese successivo), navigazione ciclo precedente/successivo, ammontare dovuto calcolato sul ciclo selezionato.
- Carte di credito: aggiunta modifica della carta esistente (nome, conto collegato, limite, tipo, giorno inizio ciclo, giorno addebito, addebito automatico).
- Transazioni pianificate: la pagina ora legge direttamente i record attivi della tabella `recurrences`, inclusi quelli importati; aggiunta modifica e disattivazione della pianificata.
- Modello ricorrenze: caricati anche tipo, conto destinazione, intervallo e limite occorrenze necessari alla visualizzazione/modifica.

Nota test: il controllo sintattico TypeScript/TSX e' stato eseguito con TypeScript 5.8.3 ed e' risultato OK. Il build Next.js completo non e' stato eseguibile nell'ambiente per un pacchetto npm non disponibile nel registry interno (`zod-validation-error@4.0.2`).
