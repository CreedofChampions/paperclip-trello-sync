---
name: trello-board-management
description: Create and manage Trello boards for project tracking. Set up boards with status lists and priority labels.
metadata:
  short-description: Create and configure Trello boards for Paperclip sync
---

# Trello Board Management

Create and configure Trello boards that sync with Paperclip issues.

## Prerequisites

- Trello app must be connected
- API key and token must be configured

## Board Setup

When you create a sync board, the following lists are automatically created:

- **Backlog** — maps to Paperclip `backlog` status
- **To Do** — maps to Paperclip `todo` status
- **In Progress** — maps to Paperclip `in_progress` status
- **In Review** — maps to Paperclip `in_review` status
- **Done** — maps to Paperclip `done` status
- **Blocked** — maps to Paperclip `blocked` status
- **Cancelled** — archived cards map to Paperclip `cancelled` status

Priority labels are also created:
- 🔴 Critical (red)
- 🟠 High (orange)
- 🟡 Medium (yellow)
- 🟢 Low (green)

## Step-by-Step

1. Connect the Trello app if not already connected
2. Use `Trello:trello-board-management` to create a new board or configure an existing one
3. The board will be set up with the correct lists and labels for Paperclip sync
4. Share the board URL with your team

## Board Configuration

To use an existing Trello board:
1. Set `TRELLO_BOARD_ID` in your environment
2. The sync engine will create missing lists and labels on first run

To create a new board:
1. Leave `TRELLO_BOARD_ID` empty
2. Set `TRELLO_ORG_ID` to your Trello organization/workspace ID
3. The sync engine will create a new board named "Paperclip Sync"

## References

- [Trello API Reference](references/trello-api.md)