# Money Elite 14.1

## Aggiornamento

1. Conserva la versione precedente e una copia dei dati.
2. Nel SQL Editor del progetto Supabase di Money Elite esegui **SQL_AGGIORNAMENTO_V14_1.sql**. È cumulativo: basta questo file, anche se hai già eseguito il precedente V14. Lo script non elimina transazioni, mensilità, rate o gestioni. Se segnala un errore, fermati prima della pubblicazione.
3. Sostituisci i sorgenti del repository con questo ZIP, includendo `.github`; conserva `.git`, le tue configurazioni e gli eventuali `.env.local`. Commit e pubblicazione come al solito.
4. Attendi build e deploy riusciti; riapri l'app e verifica **14.1** in Informazioni.

Nessuna pubblicazione GitHub o modifica al database reale è stata effettuata durante la preparazione di questo aggiornamento.

## TFR e Fondo

- Testi più brevi e pulsante Dati di partenza compatto.
- Ogni anno concluso ha **Verifica CU**: modifica o conferma i due totali, quindi **OK, conferma**.
- Il totale confermato è la base degli anni successivi fino alla successiva conferma CU, che resta indipendente. Mensilità, versamenti, saldi correnti, conti e patrimonio non vengono modificati.
- **Modifica** permette di correggere una conferma. **Rimuovi conferma CU** ripristina il calcolo automatico di quell'anno e dei successivi non confermati.
- Le cifre calcolate al momento della conferma vengono conservate separatamente nel database. Il confronto nel modulo mostra il calcolo corrente, che può cambiare se correggi mensilità precedenti.
- L'anno in corso compare dopo la sua conclusione. La tabella contiene solo il TFR, non i contributi personali/datore o i rendimenti.

## Condominio

- Più gestioni straordinarie aperte insieme, ciascuna con nome, preventivo e rate indipendenti. Il riepilogo straordinarie somma tutte quelle aperte.
- **Termina e chiudi gestione / Riapri gestione** disponibili in tutte le tipologie.
- Consuntivo, pagamento delle rate e nuovo preventivo non chiudono automaticamente una gestione.
- La chiusura è una scelta organizzativa: non paga rate, non azzera saldi e non elimina pianificate. La conferma avvisa che le eventuali pianificate residue rimangono attive.
- Le gestioni chiuse rimangono consultabili; riaprile prima di correggerle. Le gestioni già archiviate nelle versioni precedenti non vengono riaperte automaticamente.
- All'interno restano descrizioni brevi. Le **nuove** pianificate includono la gestione (es. “Rata 1 · Ordinaria 2026” o “Rata 1 · Facciata”). I movimenti storici non vengono riscritti; i collegamenti restano basati sugli identificativi.

## Verifiche e contenuto

Test di calcolo TFR, arrotondamenti e conservazione rate; test PostgreSQL isolati per aggiornamento ripetibile, più gestioni aperte, chiusura manuale, permessi e isolamento delle conferme CU. Build di produzione. Nessun test sul database personale.

ZIP di soli sorgenti, risorse, configurazione, test e SQL corrente: niente dipendenze installate, cache, esportazioni, credenziali o dati personali.
