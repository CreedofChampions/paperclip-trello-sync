// created by AI
import { BidirectionalSyncEngine } from './sync-engine';
import * as trello from '../api/trello-client';
import * as paperclip from '../api/paperclip-client';
import { STATUS_TO_LIST } from './mapping';

// Mock dependencies
jest.mock('../api/trello-client');
jest.mock('../api/paperclip-client');
jest.mock('./mapping', () => {
  const actual = jest.requireActual('./mapping');
  return {
    ...actual,
    getTrelloCardId: jest.fn(),
    getPaperclipIssueId: jest.fn(),
    saveMapping: jest.fn(),
    removeMapping: jest.fn(),
  };
});

// Re-import mocked modules
import { getTrelloCardId, getPaperclipIssueId, saveMapping } from './mapping';

const mockGetBoard = trello.getBoard as jest.Mock;
const mockCreateBoard = trello.createBoard as jest.Mock;
const mockGetBoardCards = trello.getBoardCards as jest.Mock;
const mockGetBoardLists = trello.getBoardLists as jest.Mock;
const mockGetBoardLabels = trello.getBoardLabels as jest.Mock;
const mockEnsureStatusLists = trello.ensureStatusLists as jest.Mock;
const mockListIssues = paperclip.listIssues as jest.Mock;
const mockCreateIssue = paperclip.createIssue as jest.Mock;
const mockAddComment = paperclip.addComment as jest.Mock;
const mockListComments = paperclip.listComments as jest.Mock;
const mockListWebhooks = trello.listWebhooks as jest.Mock;
const mockCreateWebhook = trello.createWebhook as jest.Mock;
const mockDeleteWebhook = trello.deleteWebhook as jest.Mock;
const mockGetPaperclipIssueId = getPaperclipIssueId as jest.Mock;

// Sample data
const sampleBoard = { id: 'board-1', name: 'Test Board', desc: '', closed: false, idOrganization: 'org-1', url: 'https://trello.com/b/test', shortUrl: 'https://trello.com/b/test', labelNames: {} };

const sampleLists = [
  { id: 'l-backlog', name: 'Backlog', closed: false, pos: 1, idBoard: 'board-1' },
  { id: 'l-todo', name: 'To Do', closed: false, pos: 2, idBoard: 'board-1' },
  { id: 'l-progress', name: 'In Progress', closed: false, pos: 3, idBoard: 'board-1' },
  { id: 'l-review', name: 'In Review', closed: false, pos: 4, idBoard: 'board-1' },
  { id: 'l-done', name: 'Done', closed: false, pos: 5, idBoard: 'board-1' },
  { id: 'l-blocked', name: 'Blocked', closed: false, pos: 6, idBoard: 'board-1' },
  { id: 'l-cancelled', name: 'Cancelled', closed: false, pos: 7, idBoard: 'board-1' },
];

const sampleLabels = [
  { id: 'lb-critical', name: 'Critical', color: 'red', idBoard: 'board-1' },
  { id: 'lb-high', name: 'High', color: 'orange', idBoard: 'board-1' },
  { id: 'lb-medium', name: 'Medium', color: 'yellow', idBoard: 'board-1' },
  { id: 'lb-low', name: 'Low', color: 'green', idBoard: 'board-1' },
];

function makeListMap(): Record<string, trello.TrelloList> {
  const map: Record<string, trello.TrelloList> = {};
  for (const [status, listName] of Object.entries(STATUS_TO_LIST)) {
    const found = sampleLists.find(l => l.name === listName);
    if (found) map[status] = found;
  }
  return map;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// --- Sync Engine: initializeBoard ---

describe('BidirectionalSyncEngine: initializeBoard', () => {
  it('returns configured board ID when board exists', async () => {
    mockGetBoard.mockResolvedValue(sampleBoard);
    const engine = new BidirectionalSyncEngine('board-1');
    const boardId = await engine.initializeBoard();
    expect(boardId).toBe('board-1');
  });

  it('creates a new board when configured board is missing', async () => {
    mockGetBoard.mockRejectedValue(new Error('Not found'));
    mockCreateBoard.mockResolvedValue(sampleBoard);
    mockGetBoardLists.mockResolvedValue(sampleLists);
    mockEnsureStatusLists.mockResolvedValue(makeListMap());

    const engine = new BidirectionalSyncEngine('');
    const boardId = await engine.initializeBoard();
    expect(boardId).toBe('board-1');
    expect(mockCreateBoard).toHaveBeenCalled();
  });
});

// --- Sync Engine: fullSync ---

describe('BidirectionalSyncEngine: fullSync', () => {
  let engine: BidirectionalSyncEngine;

  beforeEach(() => {
    engine = new BidirectionalSyncEngine('board-1');
  });

  it('runs pull-then-push in order', async () => {
    // Mock pull (Trello -> Paperclip)
    mockGetBoardCards.mockResolvedValue([]);
    mockGetBoardLists.mockResolvedValue(sampleLists);
    mockGetBoardLabels.mockResolvedValue(sampleLabels);
    mockEnsureStatusLists.mockResolvedValue(makeListMap());

    // Mock push (Paperclip -> Trello)
    mockListIssues.mockResolvedValue([]);

    const results = await engine.fullSync();
    expect(results).toHaveLength(2);
    expect(results[0].direction).toBe('trello-to-paperclip');
    expect(results[1].direction).toBe('paperclip-to-trello');
  });

  it('reports created/updated counts from pull phase', async () => {
    const card1: trello.TrelloCard = {
      id: 'c1', name: 'New Card', desc: '', idList: 'l-todo', idBoard: 'board-1',
      closed: false, labels: [], idMembers: [], url: 'https://trello.com/c/c1', shortUrl: 'https://trello.com/c/c1',
      pos: 1, due: null, dueComplete: false, dateLastActivity: '2025-01-01',
    };
    mockGetBoardCards.mockResolvedValue([card1]);
    mockGetBoardLists.mockResolvedValue(sampleLists);
    mockGetPaperclipIssueId.mockReturnValue(null);
    (paperclip.createIssue as unknown as jest.Mock).mockResolvedValue({ id: 'new-issue-1', identifier: 'CRE-1' });
    (paperclip.addComment as unknown as jest.Mock).mockResolvedValue({});
    (paperclip.listComments as unknown as jest.Mock).mockResolvedValue([]);

    // Paperclip-to-Trello: no issues (empty list)
    mockListIssues.mockResolvedValue([]);
    mockGetBoardLabels.mockResolvedValue(sampleLabels);
    mockEnsureStatusLists.mockResolvedValue(makeListMap());

    const results = await engine.fullSync();
    expect(results[0].created).toBe(1);
    expect(results[0].updated).toBe(0);
  });
});

// --- Sync Engine: webhook management ---

describe('BidirectionalSyncEngine: webhooks', () => {
  it('creates a new webhook when none exist', async () => {
    mockListWebhooks.mockResolvedValue([]);
    mockCreateWebhook.mockResolvedValue({ id: 'wh-1', callbackURL: 'http://localhost:3101/trello/webhook', idModel: 'board-1', active: true, description: '' });

    const engine = new BidirectionalSyncEngine('board-1');
    const webhookId = await engine.setupWebhook();
    expect(webhookId).toBe('wh-1');
    expect(mockCreateWebhook).toHaveBeenCalledWith(
      expect.stringContaining('/trello/webhook'),
      'board-1',
      expect.any(String),
    );
  });

  it('reuses existing webhook with matching callback', async () => {
    mockListWebhooks.mockResolvedValue([{
      id: 'wh-existing',
      callbackURL: 'http://localhost:3101/trello/webhook',
      idModel: 'board-1',
      active: true,
      description: '',
    }]);

    const engine = new BidirectionalSyncEngine('board-1');
    const webhookId = await engine.setupWebhook();
    expect(webhookId).toBe('wh-existing');
    expect(mockCreateWebhook).not.toHaveBeenCalled();
  });

  it('removes stale webhooks before creating new one', async () => {
    mockListWebhooks.mockResolvedValue([{
      id: 'wh-stale',
      callbackURL: 'http://old-url.example.com/webhook',
      idModel: 'board-1',
      active: true,
      description: '',
    }]);
    mockDeleteWebhook.mockResolvedValue(undefined);
    mockCreateWebhook.mockResolvedValue({ id: 'wh-new', callbackURL: 'http://localhost:3101/trello/webhook', idModel: 'board-1', active: true, description: '' });

    const engine = new BidirectionalSyncEngine('board-1');
    const webhookId = await engine.setupWebhook();
    expect(webhookId).toBe('wh-new');
    expect(mockDeleteWebhook).toHaveBeenCalledWith('wh-stale');
    expect(mockCreateWebhook).toHaveBeenCalled();
  });

  it('teardown deletes the webhook', async () => {
    mockDeleteWebhook.mockResolvedValue(undefined);

    const engine = new BidirectionalSyncEngine('board-1');
    (engine as any).webhookId = 'wh-1';
    await engine.teardownWebhook();
    expect(mockDeleteWebhook).toHaveBeenCalledWith('wh-1');
  });
});

// --- Sync Engine: periodic sync ---

describe('BidirectionalSyncEngine: periodic sync', () => {
  jest.useFakeTimers();

  it('startPeriodicSync sets an interval', () => {
    const engine = new BidirectionalSyncEngine('board-1');
    engine.startPeriodicSync(1000);
    expect((engine as any).intervalHandle).not.toBeNull();
    engine.stopPeriodicSync();
  });

  it('stopPeriodicSync clears the interval', () => {
    const engine = new BidirectionalSyncEngine('board-1');
    engine.startPeriodicSync(1000);
    engine.stopPeriodicSync();
    expect((engine as any).intervalHandle).toBeNull();
  });

  jest.useRealTimers();
});

// --- Trello-to-Paperclip: dedup logic ---

describe('trello-to-paperclip: dedup skips cards that duplicate synced cards', () => {
  it('skips cards whose title matches a Paperclip-synced card', async () => {
    const dupeCard: trello.TrelloCard = {
      id: 'c-dupe', name: 'Build Trello app', desc: '',
      idList: 'l-todo', idBoard: 'board-1', closed: false,
      labels: [], idMembers: [],
      url: 'https://trello.com/c/c2', shortUrl: 'https://trello.com/c/c2',
      pos: 2, due: null, dueComplete: false, dateLastActivity: '2025-01-01',
    };

    const listMap: Record<string, trello.TrelloList> = {};
    for (const list of sampleLists) {
      listMap[list.name.toLowerCase()] = list;
    }

    const { syncCardToPaperclip } = await import('./trello-to-paperclip');
    const syncedTitleSet = new Set(['build trello app']);

    const result = await syncCardToPaperclip(dupeCard, listMap, 'board-1', syncedTitleSet);
    expect(result).toBeNull();
  });
});

// --- Paperclip-to-Trello: initializeBoard ---

describe('paperclip-to-trello: module structure', () => {
  it('exports initializeBoard function', async () => {
    const mod = await import('./paperclip-to-trello');
    expect(typeof mod.initializeBoard).toBe('function');
  });

  it('exports syncIssueToTrello function', async () => {
    const mod = await import('./paperclip-to-trello');
    expect(typeof mod.syncIssueToTrello).toBe('function');
  });

  it('exports fullSyncPaperclipToTrello function', async () => {
    const mod = await import('./paperclip-to-trello');
    expect(typeof mod.fullSyncPaperclipToTrello).toBe('function');
  });
});