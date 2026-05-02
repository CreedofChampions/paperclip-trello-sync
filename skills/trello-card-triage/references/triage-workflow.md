<!-- created by AI -->
# Triage Workflow Reference

## Finding Synced Cards

Cards synced from Paperclip follow the naming pattern:
```
{IDENTIFIER} {TITLE}
```

For example:
- "CRE-61 Trello app"
- "ENG-42 Fix login bug"

The Paperclip issue ID is embedded in the card description as an HTML comment:
```html
<!-- paperclip-issue-id: 550e8400-e29b-41d4-a716-446655440000 -->
```

## Triage Operations

### Moving Cards Between Lists

Moving a card between lists triggers a status update in Paperclip:

| From List | To List | Paperclip Status Change |
|-----------|---------|------------------------|
| Any | Backlog | → `backlog` |
| Any | To Do | → `todo` |
| Any | In Progress | → `in_progress` |
| Any | In Review | → `in_review` |
| Any | Done | → `done` |
| Any | Blocked | → `blocked` |
| Any | (archive) | → `cancelled` |

### Updating Card Priority

Priority labels are synced bidirectionally:

| Action | Paperclip Effect |
|--------|-----------------|
| Add red "Critical" label | Priority → `critical` |
| Add orange "High" label | Priority → `high` |
| Add yellow "Medium" label | Priority → `medium` |
| Add green "Low" label | Priority → `low` |
| Remove all priority labels | Priority → `medium` (default) |

### Adding Comments

- Comments added in Trello are synced to Paperclip
- Comments added in Paperclip are synced to Trello
- Each synced comment includes a marker `[tr:actionId]` or `[pc:commentId]` to prevent duplicates
- Comment author attribution is preserved: "John (via Trello):" or "Agent (via Paperclip):"

### Archiving Cards

Archiving a Trello card sets the Paperclip issue status to `cancelled`.
Unarchiving sets it back to `todo`.

## Error Handling

If a sync fails:
1. Check the `/health` endpoint for service status
2. Trigger a manual sync via `POST /sync`
3. Check the webhook status via the Trello API
4. Review logs for specific error messages