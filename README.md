# Project Manager Bot

Bot per la gestione automatica dei progetti su **Mattermost + Outline + Trello**.

> **Nota**: Questo bot è un progetto sibling di `mattermost-knowledge-bot`. Entrambi possono condividere lo stesso database PostgreSQL usato da Mattermost (invece di SQLite). Il knowledge-bot usa attualmente SQLite, ma il Project Manager Bot è progettato per usare PostgreSQL condiviso.

## Funzionalità

- **Creazione automatica progetto** quando il bot viene aggiunto a un canale Mattermost
- **Board Trello** creata automaticamente con liste di default
- **Collection Outline** creata per ogni progetto
- **Scheda Progetto** generata con template strutturato (informazioni, team, obiettivi, rischi, ecc.)
- **Dashboard "Progetti Attivi"** aggiornata automaticamente:
  - Tabella con tutti i progetti
  - Link diretti a Collection Outline e Board Trello
  - Stato, deadline e cliente
- Estensione della tabella `channels` del knowledge-bot (condivisa su Postgres)

## Setup

1. Copia `.env.example` in `.env`
2. Compila le variabili (incluso `DATABASE_URL` per PostgreSQL)
3. `npm run dev`

## Variabili d'ambiente richieste

| Variabile              | Descrizione                          |
|------------------------|--------------------------------------|
| `MM_URL`               | URL Mattermost                       |
| `MM_BOT_TOKEN`         | Token del bot Mattermost             |
| `OUTLINE_URL`          | URL Outline self-hosted              |
| `OUTLINE_API_TOKEN`    | Token API Outline                    |
| `TRELLO_API_KEY`       | Trello API Key                       |
| `TRELLO_API_TOKEN`     | Trello API Token                     |
| `DATABASE_URL`         | PostgreSQL connection string (condiviso) |

## Flusso automatico

1. Bot aggiunto al canale Mattermost
2. Creazione Board Trello
3. Creazione Collection su Outline
4. Creazione pagina "Scheda Progetto"
5. Salvataggio nel database PostgreSQL condiviso
6. **Aggiornamento automatico** della dashboard "Progetti Attivi"

## Prossimi sviluppi pianificati

- Comando `/pm status` per aggiornare manualmente lo stato
- Estrazione task da riassunti Fathom
- Integrazione con knowledge-bot per creazione task da thread
- Notifiche Mattermost su scadenze vicine
- Comando `@pm-bot activate` per marcare manualmente un progetto come attivo

## Struttura

```
src/
├── index.ts
├── config.ts
├── logger.ts
├── db/
│   └── repositories/channels.ts
├── mattermost/
│   ├── client.ts
│   ├── websocket.ts
│   └── handlers/
│       └── userAdded.ts
├── outline/
│   ├── client.ts
│   ├── projectPage.ts
│   └── dashboard.ts
├── services/
│   └── projectService.ts
└── trello/
    └── client.ts
```