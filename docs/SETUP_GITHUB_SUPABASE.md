# Money Elite — configurazione iniziale

## GitHub

1. Aprire https://github.com/new.
2. Owner: il proprio account personale.
3. Repository name: `money-elite`.
4. Description: `Applicazione privata per la gestione delle finanze personali`.
5. Visibility: **Private**.
6. Non aggiungere README, `.gitignore` o licenza: il progetto locale li contiene già.
7. Creare il repository e copiarne l’indirizzo HTTPS.
8. In GitHub Desktop scegliere **Add an Existing Repository from your Hard Drive**.
9. Selezionare questa cartella del progetto.
10. In **Repository settings → Remote**, impostare l’indirizzo HTTPS copiato.
11. Pubblicare il branch `main`.

## Supabase

1. Aprire https://database.new.
2. Creare un progetto nell’organizzazione personale.
3. Project name: `money-elite`.
4. Database password: crearne una forte e salvarla nel portachiavi; non inserirla nel codice o su GitHub.
5. Region: scegliere una regione europea vicina, preferibilmente Frankfurt.
6. Attendere che il progetto sia pronto.
7. Aprire **SQL Editor → New query**.
8. Incollare tutto il contenuto di `supabase/schema.sql` ed eseguirlo.
9. Aprire **Authentication → Providers → Email** e lasciare attivo Email.
10. Creare il proprio utente personale in **Authentication → Users**.
11. Aprire **Connect** e copiare:
    - Project URL
    - Publishable key
12. Creare `.env.local` copiando `.env.example` e compilare i due valori.
13. Non usare mai la `service_role` key nel browser e non pubblicarla su GitHub.

## Verifica

1. Tutte le tabelle devono mostrare RLS attivo.
2. L’utente autenticato deve vedere soltanto i propri dati.
3. Creare un conto di prova e una transazione.
4. Ricaricare l’app: i dati devono rimanere.
5. Controllare giroconti, rimborsi, pianificate, contabilizzazione, carte e buoni pasto.
