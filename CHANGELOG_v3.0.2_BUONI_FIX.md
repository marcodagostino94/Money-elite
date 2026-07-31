# Money Elite v3.0.2 — Buoni pasto fix

Correzioni mirate:

- Il campo **Numero di buoni** parte da `1`, ma ora può essere svuotato completamente durante la modifica.
- Il valore `1` non viene più reinserito automaticamente durante `onChange`.
- Il numero di buoni viene validato solo al salvataggio; se è vuoto o non valido, il salvataggio viene bloccato con un messaggio.
- Il totale dei buoni viene ricalcolato in tempo reale usando il valore unitario del conto Buoni pasto.
- Riparazione automatica per i database esistenti: **Entrate → Buoni pasto** viene collocato sotto **Reddito**, non sotto **Guadagni**.
- Se esiste una vecchia sottocategoria Buoni pasto sotto Guadagni, le transazioni e le ricorrenze collegate vengono riassegnate alla voce corretta prima della rimozione del duplicato.
- La sottocategoria **Buoni pasto** mantiene sempre l'icona dedicata `voucher` e il suo colore canonico, sia in Entrata sia in Uscita.
- Nessuna modifica al fix dei saldi, agli abbonamenti o alle altre categorie.
