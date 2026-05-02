// <!-- created by AI -->
import { config } from '../config';
import { fullSyncPaperclipToTrello } from './paperclip-to-trello';
import { fullSyncTrelloToPaperclip } from './trello-to-paperclip';
import { getBoard, createBoard, ensureStatusLists, listWebhooks, createWebhook, deleteWebhook } from '../api/trello-client';
import { STATUS_TO_LIST } from './mapping';

export interface SyncResult {
  direction: string;
  created: number;
  updated: number;
  skipped?: number;
  errors: number;
  timestamp: string;
}

/**
 * BidirectionalSyncEngine manages the sync between Paperclip and Trello.
 *
 * It can:
 * - Run a full bidirectional sync
 * - Set up Trello webhooks for real-time updates
 * - Tear down webhooks
 * - Run periodic sync as a fallback
 */
export class BidirectionalSyncEngine {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private boardId: string;
  private webhookId: string | null = null;

  constructor(boardId?: string) {
    this.boardId = boardId || config.trello.boardId;
  }

  /**
   * Initialize or find the sync board.
   * If no board ID is configured, creates a new one.
   */
  async initializeBoard(): Promise<string> {
    if (this.boardId) {
      // Verify board exists
      try {
        await getBoard(this.boardId);
        return this.boardId;
      } catch {
        console.warn(`Configured board ${this.boardId} not found, creating new board.`);
      }
    }

    // Create a new board for sync
    const orgId = config.trello.orgId;
    const board = await createBoard('Paperclip Sync', orgId, 'Synced from Paperclip AI');
    this.boardId = board.id;

    // Create status lists
    await ensureStatusLists(board.id, STATUS_TO_LIST);

    console.log(`Created Trello board: ${board.name} (${board.id})`);
    console.log(`Board URL: ${board.url}`);
    return board.id;
  }

  /**
   * Run a full bidirectional sync.
   * First syncs Trello → Paperclip (pull), then Paperclip → Trello (push).
   * Pull first so we don't overwrite Trello changes that haven't been pulled yet.
   */
  async fullSync(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const timestamp = new Date().toISOString();

    // Phase 1: Pull from Trello
    console.log('Starting Trello → Paperclip sync...');
    const pullResult = await fullSyncTrelloToPaperclip(this.boardId);
    results.push({
      direction: 'trello-to-paperclip',
      ...pullResult,
      timestamp,
    });
    console.log(`Trello → Paperclip: ${pullResult.created} created, ${pullResult.updated} updated, ${pullResult.skipped} skipped, ${pullResult.errors} errors`);

    // Phase 2: Push to Trello
    console.log('Starting Paperclip → Trello sync...');
    const pushResult = await fullSyncPaperclipToTrello(this.boardId);
    results.push({
      direction: 'paperclip-to-trello',
      ...pushResult,
      timestamp,
    });
    console.log(`Paperclip → Trello: ${pushResult.created} created, ${pushResult.updated} updated, ${pushResult.errors} errors`);

    return results;
  }

  /**
   * Set up a Trello webhook for real-time updates.
   */
  async setupWebhook(): Promise<string> {
    const callbackUrl = `${config.webhook.baseUrl}/trello/webhook`;

    // Check for existing webhooks
    const existing = await listWebhooks();
    const existingForBoard = existing.filter((w) => w.idModel === this.boardId);

    // Remove stale webhooks
    for (const wh of existingForBoard) {
      if (wh.callbackURL !== callbackUrl) {
        console.log(`Removing stale webhook: ${wh.id}`);
        await deleteWebhook(wh.id);
      } else {
        // Webhook already exists and points to our callback
        this.webhookId = wh.id;
        console.log(`Webhook already exists: ${wh.id}`);
        return wh.id;
      }
    }

    // Create new webhook
    const webhook = await createWebhook(callbackUrl, this.boardId, 'Paperclip-Trello sync');
    this.webhookId = webhook.id;
    console.log(`Created Trello webhook: ${webhook.id}`);
    return webhook.id;
  }

  /**
   * Remove Trello webhooks created by this engine.
   */
  async teardownWebhook(): Promise<void> {
    if (this.webhookId) {
      await deleteWebhook(this.webhookId);
      console.log(`Deleted Trello webhook: ${this.webhookId}`);
      this.webhookId = null;
    }
  }

  /**
   * Start periodic sync as a fallback/supplement to webhooks.
   */
  startPeriodicSync(intervalMs?: number): void {
    const interval = intervalMs || config.sync.intervalMs;
    console.log(`Starting periodic sync every ${interval}ms`);
    this.intervalHandle = setInterval(() => {
      this.fullSync().catch((err) => {
        console.error('Periodic sync failed:', err);
      });
    }, interval);
  }

  /**
   * Stop periodic sync.
   */
  stopPeriodicSync(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('Stopped periodic sync');
    }
  }

  /**
   * Get the current board ID.
   */
  getBoardId(): string {
    return this.boardId;
  }
}