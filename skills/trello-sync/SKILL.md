---
name: trello-sync
description: Bidirectional sync between Paperclip issues and Trello boards. Automatically syncs status, comments, and priorities.
metadata:
  short-description: Sync Paperclip issues to Trello bidirectionally
---

# Trello Sync

Bidirectional synchronization between Paperclip issues and Trello boards.

## Prerequisites

- Trello app must be connected (authentication happens on first use)
- A Trello board must be configured or will be created automatically

## How Sync Works

### Data Mapping

| Paperclip | Trello | Direction |
|-----------|--------|-----------|
| Issue | Card | Bidirectional |
| Status | List position | Bidirectional |
| Priority | Label (color) | Bidirectional |
| Comment | Comment (Action) | Bidirectional |
| Identifier | Card name prefix | Paperclip → Trello |

### Status → List Mapping

| Paperclip Status | Trello List |
|-----------------|-------------|
| backlog | Backlog |
| todo | To Do |
| in_progress | In Progress |
| in_review | In Review |
| done | Done |
| blocked | Blocked |
| cancelled | Cancelled (archived) |

### Priority → Label Mapping

| Paperclip Priority | Trello Label |
|-------------------|--------------|
| critical | Red "Critical" |
| high | Orange "High" |
| medium | Yellow "Medium" |
| low | Green "Low" |

## Sync Triggers

1. **Real-time**: Trello webhooks push changes to Paperclip immediately
2. **Periodic**: Polling every 30 seconds as a fallback
3. **On-demand**: Manual sync via the `/sync` endpoint or skill invocation

## Conflict Resolution

- **Last-write-wins**: If both systems update the same field, the most recent `updatedAt` timestamp wins.
- **Origin tracking**: Issues created from Trello are marked with `originKind: "plugin:trello"` to prevent sync loops.
- **Deduplication**: Comments include markers (`[pc:id]` or `[tr:id]`) to prevent duplicate syncing.

## Step-by-Step

1. Ensure the Trello sync service is running and the board is initialized
2. Invoke this skill when you need to check sync status or trigger a manual sync
3. Use `Trello:trello-sync` to verify sync health or force a resync
4. Check the `/health` endpoint for sync status

## References

- [Sync Mapping Reference](references/sync-mapping.md)