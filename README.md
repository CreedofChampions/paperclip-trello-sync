<!-- created by AI -->
# Paperclip-Trello Sync

Bidirectional sync between [Paperclip AI](https://github.com/anthropics/paperclip) issues and [Trello](https://trello.com) boards.

## Features

- **Bidirectional sync** — Changes in Paperclip appear in Trello and vice versa
- **Status mapping** — Paperclip statuses map to Trello lists (Backlog, To Do, In Progress, etc.)
- **Priority labels** — Paperclip priorities become color-coded Trello labels
- **Comment sync** — Comments sync bidirectionally with deduplication markers
- **Real-time webhooks** — Trello changes are pushed to Paperclip immediately via webhooks
- **Periodic sync fallback** — Polls every 30 seconds as a backup for webhook failures
- **Origin tracking** — Prevents infinite sync loops with `originKind` and `originFingerprint`
- **Manual sync trigger** — `POST /sync` endpoint for on-demand resync

## Architecture

```
┌─────────────┐     Webhooks      ┌─────────────────┐
│   Trello     │ ──────────────►  │  Webhook Server  │
│   Board      │                  │  (Express.js)     │
└─────────────┘                   │                   │
       ▲                          │  ┌─────────────┐  │
       │                          │  │ Sync Engine  │  │
       │   API Calls             │  │  (bidir.)    │  │
       │                          │  └─────────────┘  │
       │                          │                   │
       │                          │  ┌─────────────┐  │
       │                          │  │  Trello API  │  │
       │                          │  │  Client      │  │
       │                          │  └─────────────┘  │
       │                          │                   │
       │                          │  ┌─────────────┐  │
       └──────────────────────────│  │  Paperclip   │  │
                                  │  │  API Client  │  │
                                  │  └─────────────┘  │
                                  └─────────────────┘
                                          │
                                          ▼
                                  ┌─────────────────┐
                                  │  Paperclip API   │
                                  │  (localhost:3100)│
                                  └─────────────────┘
```

## Data Mapping

### Issue ↔ Card

| Paperclip | Trello |
|-----------|--------|
| Issue | Card |
| Status | List position |
| Priority | Label (color) |
| Comment | Action (commentCard) |
| Identifier | Card name prefix (e.g., "CRE-61 Trello app") |

### Status → List Mapping

| Paperclip Status | Trello List |
|-----------------|-------------|
| backlog | Backlog |
| todo | To Do |
| in_progress | In Progress |
| in_review | In Review |
| done | Done |
| blocked | Blocked |
| cancelled | Archived |

### Priority → Label Mapping

| Paperclip Priority | Trello Label |
|-------------------|--------------|
| critical | Red "Critical" |
| high | Orange "High" |
| medium | Yellow "Medium" |
| low | Green "Low" |

## Setup

### Prerequisites

- Node.js 18+
- A Trello account with API access
- A running Paperclip instance

### Installation

```bash
git clone https://github.com/creed-ai/paperclip-trello-sync.git
cd paperclip-trello-sync
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `PAPERCLIP_API_URL` | Paperclip API URL (default: `http://localhost:3100/api`) |
| `PAPERCLIP_COMPANY_ID` | Your Paperclip company ID |
| `PAPERCLIP_API_KEY` | Paperclip API key |
| `TRELLO_API_KEY` | Trello API key |
| `TRELLO_API_SECRET` | Trello API secret (for webhook verification) |
| `TRELLO_API_TOKEN` | Trello API token |
| `TRELLO_BOARD_ID` | Trello board ID (leave empty to create a new board) |
| `TRELLO_ORG_ID` | Trello organization ID (required when creating boards) |
| `WEBHOOK_BASE_URL` | Public URL for receiving Trello webhooks |

Optional:

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_INTERVAL_MS` | `30000` | Polling interval in milliseconds |
| `WEBHOOK_PORT` | `3101` | Port for webhook server |

### Running

```bash
# Build
npm run build

# Start sync service
npm start

# Development mode
npm run dev

# Manual sync only (no webhook server)
npm run sync
```

### Trello API Key

To get your Trello API credentials:

1. Go to https://trello.com/app-key
2. Copy your API key
3. Click "Show API Secret" and copy the secret
4. Generate a token: `https://trello.com/1/authorize?key=YOUR_KEY&scope=read,write,account&expiration=never&response_type=token`

### Webhook Setup

For real-time sync, Trello needs to reach your webhook server:

1. The webhook server must be accessible from the internet
2. Trello sends a HEAD request to verify the endpoint before creating webhooks
3. Use ngrok for local development: `ngrok http 3101`
4. Set `WEBHOOK_BASE_URL` to your public URL

## API Endpoints

### Health Check

```
GET /health
```

Returns sync service status.

### Manual Sync

```
POST /sync
```

Triggers a full bidirectional sync. Returns sync results.

## Project Structure

```
paperclip-trello-sync/
├── .codex-plugin/
│   └── plugin.json          # Paperclip plugin manifest
├── .app.json                # Trello app connector registration
├── skills/
│   ├── trello-sync/         # Bidirectional sync skill
│   ├── trello-board-management/  # Board management skill
│   └── trello-card-triage/  # Card triage skill
├── src/
│   ├── api/
│   │   ├── trello-client.ts # Trello API client
│   │   └── paperclip-client.ts  # Paperclip API client
│   ├── sync/
│   │   ├── mapping.ts       # Data mapping (status, priority, etc.)
│   │   ├── paperclip-to-trello.ts  # Push sync
│   │   ├── trello-to-paperclip.ts  # Pull sync
│   │   └── sync-engine.ts  # Bidirectional sync orchestrator
│   ├── webhook/
│   │   └── webhook-server.ts  # Express server for Trello webhooks
│   ├── config.ts            # Configuration management
│   └── index.ts             # Main entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Conflict Resolution

- **Last-write-wins**: If both systems update the same field, the most recent `updatedAt` timestamp wins.
- **Origin tracking**: Issues created from Trello are marked with `originKind: "plugin:trello"` to prevent sync loops.
- **Deduplication**: Comments include markers (`[pc:id]` or `[tr:id]`) to prevent duplicate syncing.

## Rate Limits

The sync service respects Trello's rate limits:
- 300 requests per 10 seconds per API key
- 100 requests per 10 seconds per API token

If you hit rate limits, increase `SYNC_INTERVAL_MS` or batch operations.

## License

MIT