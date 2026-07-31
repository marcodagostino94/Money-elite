# Money Elite v3.0.1 — Buoni pasto e categorie

- Ripristinata la visualizzazione canonica delle icone specifiche per le sottocategorie storiche (Bar, Buoni pasto, Pranzi/Cene, Farmacia, Parcheggio, ecc.) anche se nel database erano state salvate con l'icona della categoria padre.
- Le nuove installazioni salvano direttamente icona e, dove previsto, colore corretti per le sottocategorie iniziali.
- Rafforzato il riconoscimento della sottocategoria speciale **Buoni pasto** nell'editor condiviso.
- Selezionando Buoni pasto viene usato automaticamente il conto di tipo `meal_vouchers`, viene mostrato il pannello con numero buoni, valore unitario e totale calcolato, sia per Entrate sia per Uscite.
- La stessa logica resta disponibile per Transazioni, Transazioni pianificate e Abbonamenti tramite `TransactionModal` condiviso.
- Nessuna modifica al fix saldi della v2.1.1.
