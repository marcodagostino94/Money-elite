# Money Elite 13.0.0

## Modalità offline

- L'app può riaprirsi senza connessione dopo almeno un accesso online sul dispositivo.
- Viene mostrata l'ultima copia dei dati sincronizzati, comprese pianificate e rate note.
- Offline si possono aggiungere nuove entrate, uscite e giroconti semplici.
- Le operazioni locali sono contrassegnate come `Da sincronizzare` e aggiornano subito i saldi mostrati.
- Al ritorno della connessione la coda viene inviata automaticamente a Supabase.
- Ogni operazione conserva un UUID stabile per evitare doppi inserimenti durante nuovi tentativi.
- Modifiche, eliminazioni, conferme di pianificate e gestioni complesse restano disponibili online.
- Il primo accesso su un dispositivo richiede ancora Internet.

## Database

Questa versione non richiede nuove query SQL.
