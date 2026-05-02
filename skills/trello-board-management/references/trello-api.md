<!-- created by AI -->
# Trello API Reference

## Authentication

All Trello API requests require:
- `key`: Your Trello API key
- `token`: Your Trello API token

Passed as query parameters: `?key=...&token=...`

## Base URL

```
https://api.trello.com/1
```

## Rate Limits

- 300 requests per 10 seconds per API key
- 100 requests per 10 seconds per API token
- Monitor `X-Rate-Limit-Api-Token-Remaining` header

## Key Endpoints

### Boards

- `GET /1/boards/{id}` — Get board details
- `POST /1/boards` — Create board
- `PUT /1/boards/{id}` — Update board
- `GET /1/boards/{id}/lists` — Get lists
- `GET /1/boards/{id}/cards` — Get cards
- `GET /1/boards/{id}/labels` — Get labels
- `GET /1/boards/{id}/members` — Get members

### Lists

- `POST /1/lists` — Create list
- `PUT /1/lists/{id}` — Update list
- `GET /1/lists/{id}/cards` — Get cards in list

### Cards

- `POST /1/cards` — Create card
- `GET /1/cards/{id}` — Get card
- `PUT /1/cards/{id}` — Update card (move, rename, etc.)
- `DELETE /1/cards/{id}` — Delete card
- `POST /1/cards/{id}/actions/comments` — Add comment
- `GET /1/cards/{id}/actions?filter=commentCard` — Get comments

### Webhooks

- `POST /1/tokens/{token}/webhooks/` — Create webhook
- `GET /1/tokens/{token}/webhooks/` — List webhooks
- `DELETE /1/webhooks/{id}` — Delete webhook

### Webhook Signature Verification

Trello signs webhook POSTs with HMAC-SHA1 using the API secret:
- Header: `X-Trello-Webhook`
- Content: `JSON.stringify(req.body) + callbackURL`
- Algorithm: `crypto.createHmac('sha1', secret).update(content).digest('base64')`