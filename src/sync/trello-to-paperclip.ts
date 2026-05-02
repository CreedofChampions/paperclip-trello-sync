// created by AI
import * as trello from '../api/trello-client';
import * as paperclip from '../api/paperclip-client';
import {
  TRELLO_ORIGIN_KIND,
  listNameToStatus,
  parseCardName,
  labelNameToPriority,
  trelloCardFingerprint,
  getPaperclipIssueId,
  saveMapping,
} from './mapping';

/**
 * Build a set of card title suffixes from synced cards (cards with Paperclip metadata).
 * Used to skip pre-existing Trello cards that duplicate Paperclip-synced cards.
 */
function buildSyncedTitleSet(cards: trello.TrelloCard[]): Set<string> {
  const syncedTitles = new Set<string>();
  for (const card of cards) {
    // Cards with Paperclip metadata in their description are synced from Paperclip
    if (card.desc && card.desc.includes('<!-- paperclip-issue-id:')) {
      const { title } = parseCardName(card.name);
      if (title) {
        syncedTitles.add(title.toLowerCase().trim());
      }
    }
  }
  return syncedTitles;
}

/**
 * Sync a Trello card to Paperclip.
 * Creates or updates the corresponding Paperclip issue.
 * Returns null if the card should be skipped (duplicate of a synced card).
 */
export async function syncCardToPaperclip(
  card: trello.TrelloCard,
  listMap: Record<string, trello.TrelloList>,
  boardId: string,
  syncedTitleSet?: Set<string>
): Promise<{ issue: paperclip.PaperclipIssue; created: boolean } | null> {
  // Skip cards that are duplicates of Paperclip-synced cards
  // A card like "REP-02: Downvote Reason Capture" is a duplicate of
  // a synced card like "CRE-69 REP-02: Downvote Reason Capture"
  if (syncedTitleSet) {
    const { title } = parseCardName(card.name);
    const normalizedTitle = (title || card.name).toLowerCase().trim();
    if (syncedTitleSet.has(normalizedTitle) && !card.desc.includes('<!-- paperclip-issue-id:')) {
      // This is a pre-existing Trello card that duplicates a Paperclip-synced card
      // Map it to the same Paperclip issue instead of creating a new one
      return null;
    }
  }

  // Check if this card was already synced from Paperclip (via metadata in description)
  const issueId = extractIssueId(card.desc);
  if (issueId) {
    // Update existing Paperclip issue
    const { title } = parseCardName(card.name);
    const status = listNameToStatus(
      Object.entries(listMap).find(([, l]) => l.id === card.idList)?.[0] || 'todo'
    );
    const priority = card.labels.length > 0
      ? labelNameToPriority(card.labels[0].name)
      : 'medium';

    try {
      const updated = await paperclip.updateIssue(issueId, {
        title: title || card.name,
        description: cleanDescription(card.desc),
        status,
        priority,
      });
      return { issue: updated, created: false };
    } catch (err) {
      if (err instanceof Error && (err.message.includes('409') || err.message.includes('checked out'))) {
        console.log(`Skipping update for checked-out issue ${issueId}`);
        return null;
      }
      throw err;
    }
  }

  // Check if we already have an issue for this Trello card (via local mapping)
  const mappedIssueId = getPaperclipIssueId(card.id);
  if (mappedIssueId) {
    // Update the existing issue
    const { title } = parseCardName(card.name);
    const status = card.closed ? 'cancelled' : listNameToStatus(
      Object.entries(listMap).find(([, l]) => l.id === card.idList)?.[0] || 'todo'
    );
    const priority = card.labels.length > 0
      ? labelNameToPriority(card.labels[0].name)
      : 'medium';

    try {
      const updated = await paperclip.updateIssue(mappedIssueId, {
        title: title || card.name,
        description: cleanDescription(card.desc),
        status,
        priority,
      });
      return { issue: updated, created: false };
    } catch (err) {
      if (err instanceof Error && (err.message.includes('409') || err.message.includes('checked out'))) {
        console.log(`Skipping update for checked-out issue ${mappedIssueId}`);
        return null;
      }
      // Issue may have been deleted, create a new one
    }
  }

  // Create a new Paperclip issue from this Trello card
  const { identifier, title } = parseCardName(card.name);
  // Paperclip requires an assignee for in_progress issues, so fall back to todo
  let status = card.closed ? 'cancelled' : listNameToStatus(
    Object.entries(listMap).find(([, l]) => l.id === card.idList)?.[0] || 'todo'
  );
  if (status === 'in_progress') {
    status = 'todo'; // Fall back to todo since we don't have assignee info from Trello
  }
  const priority = card.labels.length > 0
    ? labelNameToPriority(card.labels[0].name)
    : 'medium';

  const issue = await paperclip.createIssue({
    title: title || card.name,
    description: cleanDescription(card.desc) || undefined,
    status,
    priority,
    originKind: TRELLO_ORIGIN_KIND,
    originId: card.id,
    originFingerprint: trelloCardFingerprint(card.id),
  });

  // Save the mapping for future dedup
  saveMapping(card.id, issue.id);

  // Add a comment linking to the Trello card
  await paperclip.addComment(issue.id, `[trello-card:${card.id}] Synced from Trello: ${card.shortUrl}`);

  return { issue, created: true };
}

/**
 * Sync Trello comments to a Paperclip issue.
 */
export async function syncCommentsToPaperclip(
  cardId: string,
  issueId: string
): Promise<void> {
  const actions = await trello.getComments(cardId);
  const existingComments = await paperclip.listComments(issueId);

  for (const action of actions) {
    const text = (action.data as Record<string, unknown>).text?.toString() || '';
    // Skip comments that originated from Paperclip (contain [pc: marker)
    if (text.includes('[pc:')) continue;

    const marker = `[tr:${action.id}]`;
    // Check if already synced
    const alreadySynced = existingComments.some((c) => c.body.includes(marker));
    if (alreadySynced) continue;

    const author = action.memberCreator?.fullName || 'Trello User';
    const body = `${marker}\n**${author}** (via Trello):\n${text}`;
    await paperclip.addComment(issueId, body);
  }
}

/**
 * Full sync: pull all Trello cards into Paperclip.
 * Skips cards that duplicate Paperclip-synced cards.
 */
export async function fullSyncTrelloToPaperclip(
  boardId: string
): Promise<{ created: number; updated: number; skipped: number; errors: number }> {
  const cards = await trello.getBoardCards(boardId);
  const lists = await trello.getBoardLists(boardId);
  const listMap: Record<string, trello.TrelloList> = {};
  for (const list of lists) {
    listMap[list.name.toLowerCase()] = list;
  }

  // Build a set of titles from Paperclip-synced cards to skip duplicates
  const syncedTitleSet = buildSyncedTitleSet(cards);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const card of cards) {
    try {
      const result = await syncCardToPaperclip(card, listMap, boardId, syncedTitleSet);
      if (result === null) {
        skipped++;
        continue;
      }
      if (result.created) {
        created++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`Error syncing Trello card "${card.name}" to Paperclip:`, err);
      errors++;
    }
  }

  return { created, updated, skipped, errors };
}

function extractIssueId(desc: string): string | null {
  const match = desc.match(/<!-- paperclip-issue-id: ([^ ]+) -->/);
  return match ? match[1] : null;
}

function cleanDescription(desc: string): string {
  // Remove the Paperclip metadata block from the description
  return desc
    .replace(/<!-- paperclip-issue-id: [^ ]+ -->\n*/g, '')
    .replace(/\n---\n\*Priority:.*\*.*$/s, '')
    .trim();
}