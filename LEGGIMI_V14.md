# Money Elite 14.0

Aggiornamento dalla versione 13.3. I file sono pronti per il tuo normale caricamento su GitHub; non è stata effettuata alcuna pubblicazione né modifica al tuo database.

## Installazione, in questo ordine

1. Conserva la cartella della 13.3 e un backup dei dati Supabase.
2. Nel progetto Supabase usato da Money Elite, apri **SQL Editor**, incolla tutto `SQL_AGGIORNAMENTO_V14.sql` ed eseguilo. Lo script è ripetibile e non cancella i dati esistenti. Se segnala un errore, non pubblicare ancora: conserva il messaggio completo.
3. Sostituisci i sorgenti del progetto GitHub con quelli di questo ZIP, mantenendo la configurazione e gli eventuali file locali `.env.local`. Non eliminare la cartella `.git` del tuo repository. Includi anche la cartella `.github` presente nello ZIP (sul Mac: Command + Shift + punto per mostrare i file nascosti).
4. Esegui il commit e attendi il completamento di **build** e **deploy** nelle Actions. Chiudi e riapri l'app dopo la pubblicazione; nella sezione Informazioni verifica la versione 14.0.

Non servono nuove chiavi o modifiche ai secret GitHub. Le impostazioni del workflow sono quelle della 13.3.

## TFR e Fondo

- La sezione è stata rinominata. Conti, patrimonio e report restano separati.
- **Situazione al 31 dicembre** mostra i totali cumulativi TFR in azienda e destinati al fondo, per ogni anno concluso.
- La prima volta usa **Imposta dato di partenza**: scegli un anno concluso e inserisci i due totali noti a quella data, ad esempio dicembre 2025. Sono importi storici, già comprensivi di quanto maturato/trasferito fino a quella data: non vengono sommati di nuovo ai saldi attuali.
- Le mensilità successive sono aggiunte in base al mese di competenza, anche se non ancora incassate. I trasferimenti azienda → fondo vengono considerati alla loro data e spostano il TFR da una colonna all'altra.
- Contributi personali, contributi del datore, rendimenti e versamenti manuali generici non sono TFR e non entrano in questa tabella.
- L'anno in corso comparirà quando sarà concluso. Le nuove mensilità non alterano gli anni precedenti; correggere una mensilità o un trasferimento storico ricalcola coerentemente i riepiloghi interessati.
- Non vengono inventati importi per periodi precedenti al dato iniziale. La tabella serve a confrontare i dati registrati con i documenti ricevuti, non a certificare gli importi della CU.

## Condominio: gestione straordinaria

- Terza area dedicata, separata dalle singole rate straordinarie già disponibili nelle altre gestioni.
- Scegli il nome (es. **Rifacimento facciata**), la tua quota personale, il numero di rate, la prima scadenza e il conto. Sono proposte 4 rate mensili, modificabili singolarmente.
- La gestione non ha un anno o una data finale obbligatoria. Sono le singole rate ad avere una scadenza.
- Prima di salvare compare l'elenco delle rate: scegli quali creare anche come pianificate. La categoria iniziale è Casa → Condominio; per il riscaldamento resta Casa → Riscaldamento.
- Il collegamento rata → pianificata → transazione usa gli identificativi, non un confronto per importo. La conferma di pagamento segue il funzionamento attuale; contabilizzazione e conferma restano distinte.
- **Rinomina** cambia il nome; **Termina e chiudi gestione** archivia senza eliminare lo storico. La chiusura richiede rate pagate e saldo regolare: non paga o cancella nulla automaticamente.
- È prevista una gestione straordinaria attiva per volta. Dopo averla chiusa puoi aprirne una nuova. Puoi riaprire quella archiviata, purché non ce ne sia già un'altra attiva.

## Aggiorna preventivo e rate

Disponibile nelle gestioni ordinaria, riscaldamento e straordinaria. È un'operazione facoltativa, distinta dal vecchio **Modifica** che cambia soltanto l'importo del preventivo.

1. Inserisci il **nuovo totale complessivo della tua quota**, comprensivo di quanto già pagato. Non inserire soltanto l'aumento.
2. Le rate pagate conservano importi, date e collegamenti, anche se le transazioni non sono ancora contabilizzate. Anche le rate coperte parzialmente da credito vengono conservate.
3. Puoi mantenere le rate ancora da pagare e aggiungere solo la differenza, oppure scegliere esplicitamente di ridistribuire le sole rate non pagate e senza credito.
4. Calcola le nuove rate, modifica importi/scadenze se necessario, poi controlla l'anteprima e seleziona le nuove pianificate.
5. Se sostituisci rate non pagate, devi approvare la rimozione delle relative pianificate e delle eventuali transazioni ancora in attesa di conferma. I pagamenti confermati non vengono eliminati.

Esempio: preventivo personale iniziale 1.000 €, quattro rate da 250 € già pagate, nuovo totale 5.000 €. Le quattro rate restano invariate e si creano nuove rate per **4.000 €**.

Rate straordinarie e saldi provenienti da altre gestioni restano separati dal ricalcolo. Gli arrotondamenti residui sono attribuiti alla prima nuova rata. Eventuali anticipi oltre il nuovo totale vengono segnalati senza inventare rate negative o rimborsi.

Il salvataggio della revisione è unico: aggiornamento, sostituzioni, nuove rate, pianificate e storico riescono tutti insieme oppure non viene applicato nulla. Un doppio clic o una richiesta ripetuta non duplica le rate.

## Contenuto dello ZIP

Sorgenti, risorse, configurazione GitHub, dipendenze dichiarate, test e unico SQL di aggiornamento. Esclusi dipendenze installate, esportazioni generate, cache, file del Mac, dati personali, credenziali e schermate di prova. GitHub ricostruisce l'app con `npm ci` e `npm run build`.

## Verifiche

Test di arrotondamenti, date, revisione rate e storico TFR; prove PostgreSQL isolate su dati fittizi per conservazione pagamenti, salvataggi atomici, richieste ripetute, chiusura e isolamento utenti. Build di produzione e verifica visiva su desktop e viewport mobile. Il tuo progetto Supabase reale non è stato usato per questi test.
