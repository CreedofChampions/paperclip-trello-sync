---
name: trello-card-triage
description: Triage and manage Trello cards that correspond to Paperclip issues. Move cards, update priorities, and sync comments.
metadata:
  short-description: Triage Trello cards synced with Paperclip issues
---

# Trello Card Triage

Manage and triage Trello cards that are synced with Paperclip issues.

## Prerequisites

- Trello app must be connected
- Board must be initialized for sync (use `trello-board-management` skill first)

## Card Operations

### Move a Card (Change Status)

Moving a Trello card to a different list changes the Paperclip issue status:

| Trello List | Paperclip Status |
|-------------|-----------------|
| Backlog | `backlog` |
| To Do | `todo` |
| In Progress | `in_progress` |
| In Review | `in_review` |
| Done | `done` |
| Blocked | `blocked` |

Conversely, changing a Paperclip issue status moves the card to the corresponding list.

### Update Priority

Adding or removing priority labels on a Trello card updates the Paperclip issue priority:
- Red "Critical" label → Paperclip `critical`
- Orange "High" label → Paperclip `high`
- Yellow "Medium" label → Paperclip `medium`
- Green "Low" label → Paperclip `low`

### Comments

Comments sync bidirectionally:
- Trello comments appear in Paperclip with `[tr:actionId]` markers
- Paperclip comments appear in Trello with `[pc:commentId]` markers
- These markers prevent duplicate syncing

## Step-by-Step

1. Use `Trello:trello-card-triage` when you need to manage synced cards
2. To find a specific card, search by Paperclip identifier (e.g., "CRE-61")
3. Card names follow the pattern: `{IDENTIFIER} {TITLE}` (e.g., "CRE-61 Trello app")
4. Changes made in Trello will sync to Paperclip via webhooks (or on the next periodic sync)

## Tips

- Archiving a card in Trello sets the Paperclip issue to `cancelled`
- Moving a card between lists triggers a status change in Paperclip
- Adding a comment in Trello creates a comment in Paperclip (and vice versa)