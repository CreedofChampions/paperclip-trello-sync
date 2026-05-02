// created by AI
import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from '../config';
import { verifyWebhookSignature, getCard, getBoard, getBoardLists, TrelloAction } from '../api/trello-client';
import * as paperclip from '../api/paperclip-client';
import { BidirectionalSyncEngine } from '../sync/sync-engine';
import {
  TRELLO_ORIGIN_KIND,
  listNameToStatus,
  labelNameToPriority,
  trelloCardFingerprint,
  parseCardName,
  getPaperclipIssueId,
  saveMapping,
} from '../sync/mapping';

const app = express();

// Parse raw body for signature verification, then JSON
app.use(cors());
app.use(express.json({
  verify: (req: Request, _res: Response, buf: Buffer) => {
    (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
  },
}));

let syncEngine: BidirectionalSyncEngine;

/**
 * Handle Trello webhook verification (HEAD request).
 * Trello sends a HEAD request to verify the endpoint before creating a webhook.
 */
app.head('/trello/webhook', (_req: Request, res: Response) => {
  res.sendStatus(200);
});

/**
 * Handle Trello webhook events.
 * Processes card create, update, and comment actions.
 */
app.post('/trello/webhook', async (req: Request, res: Response) => {
  const callbackUrl = `${config.webhook.baseUrl}/trello/webhook`;

  // Verify webhook signature
  const signature = req.headers['x-trello-webhook'] as string | undefined;
  const rawBody = (req as Request & { rawBody?: string }).rawBody;

  if (rawBody && !verifyWebhookSignature(rawBody, signature, callbackUrl)) {
    console.warn('Invalid Trello webhook signature');
    res.sendStatus(403);
    return;
  }

  const body = req.body;
  const action: TrelloAction | undefined = body.action;

  if (!action) {
    res.sendStatus(200);
    return;
  }

  console.log(`Trello webhook: ${action.type} from ${action.memberCreator?.username || 'unknown'}`);

  try {
    switch (action.type) {
      case 'createCard':
        await handleCardCreate(action);
        break;
      case 'updateCard':
        await handleCardUpdate(action);
        break;
      case 'commentCard':
        await handleCommentCard(action);
        break;
      case 'deleteCard':
        await handleCardDelete(action);
        break;
      default:
        console.log(`Unhandled Trello action type: ${action.type}`);
    }
  } catch (err) {
    console.error(`Error processing Trello webhook action ${action.type}:`, err);
  }

  // Always return 200 to prevent Trello from retrying
  res.sendStatus(200);
});

interface CardData {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idList: string;
  idBoard: string;
  labels: { name: string; color: string; id: string }[];
}

async function handleCardCreate(action: TrelloAction): Promise<void> {
  const data = action.data as Record<string, unknown>;
  const cardPartial = data.card as CardData | undefined;
  if (!cardPartial?.id) return;

  const card = await getCard(cardPartial.id);
  const { title } = parseCardName(card.name);
  const priority = card.labels.length > 0
    ? labelNameToPriority(card.labels[0].name)
    : 'medium';

  // Get list name
  const lists = await getBoardLists(card.idBoard);
  const listName = lists.find(l => l.id === card.idList)?.name || 'To Do';
  // Paperclip requires assignee for in_progress, so fall back to todo
  let cardStatus = listNameToStatus(listName);
  if (cardStatus === 'in_progress') {
    cardStatus = 'todo';
  }

  // Check local mapping for existing Paperclip issue
  const mappedIssueId = getPaperclipIssueId(card.id);
  if (mappedIssueId) {
    // Already synced, update instead
    await paperclip.updateIssue(mappedIssueId, {
      title: title || card.name,
      description: card.desc?.replace(/<!-- paperclip-issue-id: [^ ]+ -->\n*/g, '').trim() || '',
      status: cardStatus,
      priority,
    });
    return;
  }

  const issue = await paperclip.createIssue({
    title: title || card.name,
    description: card.desc?.replace(/<!-- paperclip-issue-id: [^ ]+ -->\n*/g, '').trim() || undefined,
    status: cardStatus,
    priority,
    originKind: TRELLO_ORIGIN_KIND,
    originId: card.id,
    originFingerprint: trelloCardFingerprint(card.id),
  });

  // Save mapping for future dedup
  saveMapping(card.id, issue.id);
}

async function handleCardUpdate(action: TrelloAction): Promise<void> {
  const data = action.data as Record<string, unknown>;
  const cardData = data.card as CardData | undefined;
  if (!cardData?.id) return;

  const mappedIssueId = getPaperclipIssueId(cardData.id);
  if (!mappedIssueId) return;

  const updates: Partial<Pick<paperclip.PaperclipIssue, 'title' | 'description' | 'status' | 'priority'>> = {};

  // Check if list changed (status change)
  if (data.list && (data.old as Record<string, unknown>)?.idList) {
    const newListName = (data.list as Record<string, string>).name;
    updates.status = listNameToStatus(newListName);
  }

  // Check if name changed
  if ((data.old as Record<string, unknown>)?.name) {
    const { title } = parseCardName(cardData.name);
    updates.title = title || cardData.name;
  }

  // Check if description changed
  if ((data.old as Record<string, unknown>)?.desc !== undefined) {
    updates.description = (cardData.desc || '').replace(/<!-- paperclip-issue-id: [^ ]+ -->\n*/g, '').trim();
  }

  // Check if card was closed (archived = cancelled)
  if ((data.old as Record<string, unknown>)?.closed !== undefined) {
    updates.status = cardData.closed ? 'cancelled' : 'todo';
  }

  if (Object.keys(updates).length > 0) {
    await paperclip.updateIssue(mappedIssueId, updates);
  }
}

async function handleCommentCard(action: TrelloAction): Promise<void> {
  const data = action.data as Record<string, unknown>;
  const cardData = data.card as CardData | undefined;
  if (!cardData?.id) return;

  const text = data.text as string;
  // Skip comments that originated from Paperclip (contain [pc: marker)
  if (text?.includes('[pc:')) return;

  const mappedIssueId = getPaperclipIssueId(cardData.id);
  if (!mappedIssueId) return;

  const author = action.memberCreator?.fullName || 'Trello User';
  const marker = `[tr:${action.id}]`;

  // Check if already synced
  const comments = await paperclip.listComments(mappedIssueId);
  const alreadySynced = comments.some(c => c.body.includes(marker));
  if (alreadySynced) return;

  await paperclip.addComment(mappedIssueId, `${marker}\n**${author}** (via Trello):\n${text}`);
}

async function handleCardDelete(action: TrelloAction): Promise<void> {
  const data = action.data as Record<string, unknown>;
  const cardData = data.card as CardData | undefined;
  if (!cardData?.id) return;

  const mappedIssueId = getPaperclipIssueId(cardData.id);
  if (!mappedIssueId) return;

  // Cancel (archive) the Paperclip issue rather than deleting it
  await paperclip.updateIssue(mappedIssueId, { status: 'cancelled' });
}

/**
 * Health check endpoint.
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    boardId: syncEngine?.getBoardId(),
    uptime: process.uptime(),
  });
});

/**
 * Manual sync trigger endpoint.
 */
app.post('/sync', async (_req: Request, res: Response) => {
  try {
    const results = await syncEngine.fullSync();
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * Start the webhook server and sync engine.
 */
export async function startServer(): Promise<void> {
  syncEngine = new BidirectionalSyncEngine();

  // Initialize the Trello board
  const boardId = await syncEngine.initializeBoard();
  console.log(`Using Trello board: ${boardId}`);

  // Start the HTTP server
  const port = config.webhook.port;
  app.listen(port, () => {
    console.log(`Trello webhook server listening on port ${port}`);
  });

  // Set up Trello webhook
  try {
    await syncEngine.setupWebhook();
  } catch (err) {
    console.warn('Failed to set up Trello webhook (will use periodic sync):', err);
    syncEngine.startPeriodicSync();
  }

  // Run initial full sync
  console.log('Running initial full sync...');
  const results = await syncEngine.fullSync();
  for (const result of results) {
    console.log(`${result.direction}: ${result.created} created, ${result.updated} updated, ${result.errors} errors`);
  }
}

export { app, syncEngine };