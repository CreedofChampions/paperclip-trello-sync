<!-- created by AI -->
# Sync Mapping Reference

## Paperclip ↔ Trello Field Mapping

### Issue ↔ Card

| Paperclip Field | Trello Field | Sync Direction |
|----------------|-------------|----------------|
| `identifier` + `title` | `name` | Paperclip → Trello writes `{identifier} {title}` |
| `description` | `desc` | Bidirectional (metadata stripped on pull) |
| `status` | `idList` (list position) | Bidirectional |
| `priority` | `labels` (color-coded) | Bidirectional |
| `comments` | `actions` (commentCard) | Bidirectional |
| N/A | `due` | Trello → Paperclip (future) |
| `originId` | `card.id` | Paperclip tracks Trello card ID |
| `originFingerprint` | `card.id` | Dedup key format: `trello:card:{cardId}` |
| `originKind` | N/A | Set to `plugin:trello` for Trello-originated issues |

### Status ↔ List

| Paperclip Status | Trello List |
|-----------------|-------------|
| `backlog` | Backlog |
| `todo` | To Do |
| `in_progress` | In Progress |
| `in_review` | In Review |
| `done` | Done |
| `blocked` | Blocked |
| `cancelled` | Archived card |

### Priority ↔ Label

| Paperclip Priority | Trello Label Name | Color |
|-------------------|------------------|-------|
| `critical` | Critical | Red |
| `high` | High | Orange |
| `medium` | Medium | Yellow |
| `low` | Low | Green |

## Deduplication

### Comment Markers

- Paperclip comments pushed to Trello include: `[pc:{commentId}]`
- Trello comments pulled to Paperclip include: `[tr:{actionId}]`
- These markers are checked before syncing to prevent duplicates.

### Origin Tracking

- Issues created from Trello cards have:
  - `originKind`: `"plugin:trello"`
  - `originId`: The Trello card ID
  - `originFingerprint`: `"trello:card:{cardId}"`

- Cards created from Paperclip issues include in their description:
  - `<!-- paperclip-issue-id: {issueId} -->`

## Sync Loop Prevention

1. Issues with `originKind === "plugin:trello"` are skipped during Paperclip → Trello push
2. Cards with the `<!-- paperclip-issue-id: -->` marker are updated (not duplicated) during Trello → Paperclip pull
3. Comments containing sync markers (`[pc:]` or `[tr:]`) are not synced again