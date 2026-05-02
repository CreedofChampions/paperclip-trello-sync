// created by AI

/**
 * Data mapping between Paperclip and Trello.
 *
 * Paperclip Issue  <->  Trello Card
 * Paperclip Status <->  Trello List
 * Paperclip Priority <-> Trello Label
 * Paperclip Comment <-> Trello Comment (Action)
 */

import * as fs from 'fs';
import * as path from 'path';

// Paperclip statuses mapped to Trello list names
export const STATUS_TO_LIST: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
};

// Reverse: Trello list name -> Paperclip status
export const LIST_TO_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TO_LIST).map(([k, v]) => [v.toLowerCase(), k])
);

// Paperclip priorities mapped to Trello label colors
export const PRIORITY_TO_LABEL: Record<string, { name: string; color: string }> = {
  critical: { name: 'Critical', color: 'red' },
  high: { name: 'High', color: 'orange' },
  medium: { name: 'Medium', color: 'yellow' },
  low: { name: 'Low', color: 'green' },
};

export const LABEL_TO_PRIORITY: Record<string, string> = Object.fromEntries(
  Object.entries(PRIORITY_TO_LABEL).map(([, v]) => [v.name.toLowerCase(), v.color])
);

// Origin tracking for Paperclip issues created from Trello
export const TRELLO_ORIGIN_KIND = 'plugin:trello';

/**
 * Build a fingerprint for deduplication.
 * Format: trello:card:{cardId}
 */
export function trelloCardFingerprint(cardId: string): string {
  return `trello:card:${cardId}`;
}

/**
 * Build a fingerprint for Paperclip issues synced to Trello.
 * Format: paperclip:issue:{issueId}
 */
export function paperclipIssueFingerprint(issueId: string): string {
  return `paperclip:issue:${issueId}`;
}

/**
 * Format a Paperclip issue as a Trello card name.
 * E.g. "CRE-61 Trello app"
 */
export function formatCardName(issue: { identifier?: string | null; title: string }): string {
  if (issue.identifier) {
    return `${issue.identifier} ${issue.title}`;
  }
  return issue.title;
}

/**
 * Parse a Trello card name back into (identifier, title).
 * E.g. "CRE-61 Trello app" -> { identifier: "CRE-61", title: "Trello app" }
 */
export function parseCardName(cardName: string): { identifier: string | null; title: string } {
  const match = cardName.match(/^([A-Z]+-\d+)\s+(.+)$/);
  if (match) {
    return { identifier: match[1], title: match[2] };
  }
  return { identifier: null, title: cardName };
}

/**
 * Format a Paperclip issue description as Trello card description.
 * Includes metadata for round-tripping.
 */
export function formatCardDescription(issue: {
  id: string;
  description?: string | null;
  priority?: string;
  status?: string;
}): string {
  const lines: string[] = [];
  lines.push(`<!-- paperclip-issue-id: ${issue.id} -->`);
  lines.push('');
  if (issue.description) {
    lines.push(issue.description);
    lines.push('');
  }
  lines.push('---');
  lines.push(`*Priority: ${issue.priority || 'medium'}* | *Status: ${issue.status || 'todo'}*`);
  return lines.join('\n');
}

/**
 * Extract Paperclip issue ID from a Trello card description.
 */
export function extractIssueIdFromDescription(desc: string): string | null {
  const match = desc.match(/<!-- paperclip-issue-id: ([^ ]+) -->/);
  return match ? match[1] : null;
}

/**
 * Convert a Paperclip priority to a Trello label name.
 */
export function priorityToLabelName(priority: string): string {
  return PRIORITY_TO_LABEL[priority]?.name || 'Medium';
}

/**
 * Convert a Trello label name to a Paperclip priority.
 */
export function labelNameToPriority(labelName: string): string {
  const lower = labelName.toLowerCase();
  for (const [priority, label] of Object.entries(PRIORITY_TO_LABEL)) {
    if (label.name.toLowerCase() === lower) {
      return priority;
    }
  }
  return 'medium';
}

/**
 * Convert a Paperclip status to a Trello list name.
 */
export function statusToListName(status: string): string {
  return STATUS_TO_LIST[status] || 'To Do';
}

/**
 * Convert a Trello list name to a Paperclip status.
 */
export function listNameToStatus(listName: string): string {
  return LIST_TO_STATUS[listName.toLowerCase()] || 'todo';
}

/**
 * Local file-based mapping for Trello card <-> Paperclip issue dedup.
 * The Paperclip API doesn't support originKind/originId fields,
 * so we track the mapping locally.
 */
const MAPPING_FILE = path.resolve(__dirname, '../../sync-mapping.json');

export interface SyncMapping {
  trelloToPaperclip: Record<string, string>; // trelloCardId -> paperclipIssueId
  paperclipToTrello: Record<string, string>;  // paperclipIssueId -> trelloCardId
  lastSyncAt: string;
}

function readMapping(): SyncMapping {
  try {
    if (fs.existsSync(MAPPING_FILE)) {
      const data = fs.readFileSync(MAPPING_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch {
    // Return empty mapping on read error
  }
  return { trelloToPaperclip: {}, paperclipToTrello: {}, lastSyncAt: new Date().toISOString() };
}

function writeMapping(mapping: SyncMapping): void {
  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2), 'utf8');
}

export function getPaperclipIssueId(trelloCardId: string): string | null {
  const mapping = readMapping();
  return mapping.trelloToPaperclip[trelloCardId] || null;
}

export function getTrelloCardId(paperclipIssueId: string): string | null {
  const mapping = readMapping();
  return mapping.paperclipToTrello[paperclipIssueId] || null;
}

export function saveMapping(trelloCardId: string, paperclipIssueId: string): void {
  const mapping = readMapping();
  mapping.trelloToPaperclip[trelloCardId] = paperclipIssueId;
  mapping.paperclipToTrello[paperclipIssueId] = trelloCardId;
  mapping.lastSyncAt = new Date().toISOString();
  writeMapping(mapping);
}

export function removeMapping(trelloCardId?: string, paperclipIssueId?: string): void {
  const mapping = readMapping();
  if (trelloCardId) {
    const pcId = mapping.trelloToPaperclip[trelloCardId];
    delete mapping.trelloToPaperclip[trelloCardId];
    if (pcId) delete mapping.paperclipToTrello[pcId];
  }
  if (paperclipIssueId) {
    const tcId = mapping.paperclipToTrello[paperclipIssueId];
    delete mapping.paperclipToTrello[paperclipIssueId];
    if (tcId) delete mapping.trelloToPaperclip[tcId];
  }
  mapping.lastSyncAt = new Date().toISOString();
  writeMapping(mapping);
}

export function getAllMappings(): SyncMapping {
  return readMapping();
}