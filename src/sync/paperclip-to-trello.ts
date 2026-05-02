// created by AI
import * as trello from '../api/trello-client';
import * as paperclip from '../api/paperclip-client';
import {
  STATUS_TO_LIST,
  TRELLO_ORIGIN_KIND,
  formatCardName,
  formatCardDescription,
  priorityToLabelName,
  paperclipIssueFingerprint,
  getTrelloCardId,
  saveMapping,
} from './mapping';

interface SyncState {
  listMap: Record<string, trello.TrelloList>; // Paperclip status -> Trello list
  labelMap: Record<string, string>; // Priority name -> Trello label ID
  syncedCards: Map<string, trello.TrelloCard>; // issueId -> card
}

const PRIORITY_LABELS: Record<string, { name: string; color: string }> = {
  critical: { name: 'Critical', color: 'red' },
  high: { name: 'High', color: 'orange' },
  medium: { name: 'Medium', color: 'yellow' },
  low: { name: 'Low', color: 'green' },
};

/**
 * Initialize a board for Paperclip sync.
 * Creates status lists and priority labels if they don't exist.
 */
export async function initializeBoard(boardId: string): Promise<SyncState> {
  // Create status lists
  const listMap = await trello.ensureStatusLists(boardId, STATUS_TO_LIST);

  // Create or find priority labels
  const existingLabels = await trello.getBoardLabels(boardId);
  const labelMap: Record<string, string> = {};

  for (const [, labelInfo] of Object.entries(PRIORITY_LABELS)) {
    const existing = existingLabels.find(
      (l) => l.name.toLowerCase() === labelInfo.name.toLowerCase()
    );
    if (existing) {
      labelMap[labelInfo.name.toLowerCase()] = existing.id;
    } else {
      const created = await trello.createLabel(boardId, labelInfo.name, labelInfo.color);
      labelMap[labelInfo.name.toLowerCase()] = created.id;
    }
  }

  // Load existing cards for dedup
  const cards = await trello.getBoardCards(boardId);
  const syncedCards = new Map<string, trello.TrelloCard>();
  for (const card of cards) {
    // Cards synced from Paperclip have the issue ID in their description
    const issueId = extractIssueId(card.desc);
    if (issueId) {
      syncedCards.set(issueId, card);
    }
  }

  return { listMap, labelMap, syncedCards };
}

function extractIssueId(desc: string): string | null {
  const match = desc.match(/<!-- paperclip-issue-id: ([^ ]+) -->/);
  return match ? match[1] : null;
}

/**
 * Sync a single Paperclip issue to Trello.
 * Creates or updates the corresponding Trello card.
 */
export async function syncIssueToTrello(
  issue: paperclip.PaperclipIssue,
  state: SyncState,
  boardId: string
): Promise<{ card: trello.TrelloCard; created: boolean }> {
  // Check local mapping first
  const mappedCardId = getTrelloCardId(issue.id);
  if (mappedCardId) {
    // Find the mapped card in the synced cards
    const mappedCard = state.syncedCards.get(issue.id);
    if (mappedCard && mappedCard.id === mappedCardId) {
      // Update existing card
      const targetList = state.listMap[issue.status] || state.listMap['todo'];
      const cardName = formatCardName(issue);
      const cardDesc = formatCardDescription(issue);
      const priorityLabelKey = priorityToLabelName(issue.status === 'cancelled' ? 'medium' : issue.priority).toLowerCase();
      const priorityLabel = state.labelMap[priorityLabelKey];
      const idLabels = priorityLabel ? [priorityLabel] : undefined;

      const updates: Record<string, unknown> = {
        name: cardName,
        desc: cardDesc,
        idList: targetList.id,
      };
      if (idLabels) {
        updates.idLabels = idLabels.join(',');
      }
      if (issue.status === 'cancelled') {
        updates.closed = true;
      } else if (mappedCard.closed) {
        updates.closed = false;
      }

      const updated = await trello.updateCard(mappedCard.id, updates);
      state.syncedCards.set(issue.id, updated);
      return { card: updated, created: false };
    }
  }

  // Check description metadata for existing card
  const existingCard = state.syncedCards.get(issue.id);

  // Determine target list based on status
  const targetList = state.listMap[issue.status] || state.listMap['todo'];
  if (!targetList) {
    throw new Error(`No Trello list found for status: ${issue.status}`);
  }

  const cardName = formatCardName(issue);
  const cardDesc = formatCardDescription(issue);
  const priorityLabelKey = priorityToLabelName(issue.status === 'cancelled' ? 'medium' : issue.priority).toLowerCase();
  const priorityLabel = state.labelMap[priorityLabelKey];
  const idLabels = priorityLabel ? [priorityLabel] : undefined;

  if (existingCard) {
    // Update existing card
    const updates: Record<string, unknown> = {
      name: cardName,
      desc: cardDesc,
      idList: targetList.id,
    };
    if (idLabels) {
      updates.idLabels = idLabels.join(',');
    }
    if (issue.status === 'cancelled') {
      updates.closed = true;
    } else if (existingCard.closed) {
      updates.closed = false;
    }

    const updated = await trello.updateCard(existingCard.id, updates);
    state.syncedCards.set(issue.id, updated);

    // Update local mapping
    saveMapping(updated.id, issue.id);
    return { card: updated, created: false };
  } else {
    // Create new card
    const card = await trello.createCard(targetList.id, cardName, cardDesc, {
      idLabels,
    });

    // Add a comment linking back to Paperclip
    await trello.addComment(card.id, `Synced from Paperclip issue ${issue.identifier || issue.id}`);

    state.syncedCards.set(issue.id, card);

    // Save local mapping
    saveMapping(card.id, issue.id);
    return { card, created: true };
  }
}

/**
 * Full sync: push all Paperclip issues to Trello.
 */
export async function fullSyncPaperclipToTrello(
  boardId: string
): Promise<{ created: number; updated: number; errors: number }> {
  const state = await initializeBoard(boardId);
  const issues = await paperclip.listIssues();

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const issue of issues) {
    // Skip issues already synced from Trello (avoid infinite loop)
    if (issue.originKind === TRELLO_ORIGIN_KIND) continue;
    // Skip hidden/cancelled issues if they weren't already synced
    if (issue.hiddenAt) continue;

    try {
      const result = await syncIssueToTrello(issue, state, boardId);
      if (result.created) {
        created++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Error syncing issue ${issue.identifier || issue.id} to Trello:`, err);
      errors++;
    }
  }

  return { created, updated, errors };
}

/**
 * Sync comments from Paperclip issue to Trello card.
 */
export async function syncCommentsToTrello(
  issueId: string,
  cardId: string
): Promise<void> {
  const comments = await paperclip.listComments(issueId);
  const existingActions = await trello.getComments(cardId);

  for (const comment of comments) {
    // Check if this comment was already synced (by looking for Paperclip comment ID in text)
    const marker = `[pc:${comment.id}]`;
    const alreadySynced = existingActions.some(
      (a) => (a.data as Record<string, unknown>).text?.toString().includes(marker)
    );
    if (alreadySynced) continue;

    const author = comment.authorUserId || comment.authorAgentId || 'Paperclip';
    const text = `${marker}\n**${author}** (via Paperclip):\n${comment.body}`;
    await trello.addComment(cardId, text);
  }
}

export { SyncState };