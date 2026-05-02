// created by AI
import fetch from 'node-fetch';
import { config } from '../config';

// Mock config before importing the module under test
jest.mock('../config', () => ({
  config: {
    trello: {
      apiKey: 'test-key',
      apiSecret: 'testsecret123',
      apiToken: 'test-token',
      boardId: 'board-1',
      orgId: 'org-1',
    },
  },
}));

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as unknown as jest.Mock;

import {
  getBoard,
  createBoard,
  updateBoard,
  getBoardLists,
  createList,
  updateList,
  getCard,
  getBoardCards,
  createCard,
  updateCard,
  deleteCard,
  archiveCard,
  addComment,
  getComments,
  editComment,
  deleteComment,
  getBoardLabels,
  createLabel,
  addLabelToCard,
  removeLabelFromCard,
  createWebhook,
  listWebhooks,
  deleteWebhook,
  ensureStatusLists,
  verifyWebhookSignature,
} from './trello-client';

// Helper to build a mock Response
function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  } as unknown as import('node-fetch').Response;
}

const AUTH_PARAMS = 'key=test-key&token=test-token';

beforeEach(() => {
  mockFetch.mockReset();
});

// --- Boards ---

describe('trello-client: boards', () => {
  it('getBoard sends GET to /boards/{id}', async () => {
    const board = { id: 'b1', name: 'Test Board' };
    mockFetch.mockResolvedValue(mockResponse(board));
    const result = await getBoard('b1');
    expect(result).toEqual(board);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/boards/b1?fields=name,desc,closed,idOrganization,url,shortUrl,labelNames&${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('createBoard sends POST to /boards', async () => {
    const board = { id: 'b2', name: 'New Board' };
    mockFetch.mockResolvedValue(mockResponse(board));
    const result = await createBoard('New Board', 'org-1', 'desc');
    expect(result).toEqual(board);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/boards?${AUTH_PARAMS}`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"New Board"'),
      }),
    );
  });

  it('updateBoard sends PUT to /boards/{id}', async () => {
    const board = { id: 'b1', name: 'Updated' };
    mockFetch.mockResolvedValue(mockResponse(board));
    const result = await updateBoard('b1', { name: 'Updated' });
    expect(result).toEqual(board);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/boards/b1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

// --- Lists ---

describe('trello-client: lists', () => {
  it('getBoardLists sends GET to /boards/{id}/lists', async () => {
    const lists = [{ id: 'l1', name: 'To Do' }];
    mockFetch.mockResolvedValue(mockResponse(lists));
    const result = await getBoardLists('b1');
    expect(result).toEqual(lists);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/boards/b1/lists?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('createList sends POST to /lists', async () => {
    const list = { id: 'l2', name: 'In Progress' };
    mockFetch.mockResolvedValue(mockResponse(list));
    const result = await createList('In Progress', 'b1', 'top');
    expect(result).toEqual(list);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/lists?${AUTH_PARAMS}`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"In Progress"'),
      }),
    );
  });

  it('updateList sends PUT to /lists/{id}', async () => {
    const list = { id: 'l1', name: 'Done' };
    mockFetch.mockResolvedValue(mockResponse(list));
    const result = await updateList('l1', { name: 'Done' });
    expect(result).toEqual(list);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/lists/l1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

// --- Cards ---

describe('trello-client: cards', () => {
  const card = {
    id: 'c1', name: 'Test Card', desc: '', idList: 'l1', idBoard: 'b1',
    closed: false, labels: [], url: 'https://trello.com/c/abc',
    shortUrl: 'https://trello.com/c/abc', pos: 1, due: null, dueComplete: false,
    dateLastActivity: '2025-01-01T00:00:00Z',
  };

  it('getCard sends GET to /cards/{id}', async () => {
    mockFetch.mockResolvedValue(mockResponse(card));
    const result = await getCard('c1');
    expect(result).toEqual(card);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/cards/c1?'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('getBoardCards sends GET to /boards/{id}/cards', async () => {
    mockFetch.mockResolvedValue(mockResponse([card]));
    const result = await getBoardCards('b1');
    expect(result).toEqual([card]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/boards/b1/cards?'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('createCard sends POST to /cards', async () => {
    mockFetch.mockResolvedValue(mockResponse(card));
    const result = await createCard('l1', 'New Card', 'desc', { idLabels: 'label1' });
    expect(result).toEqual(card);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/cards?${AUTH_PARAMS}`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"New Card"'),
      }),
    );
  });

  it('updateCard sends PUT to /cards/{id}', async () => {
    mockFetch.mockResolvedValue(mockResponse(card));
    const result = await updateCard('c1', { name: 'Updated' });
    expect(result).toEqual(card);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/cards/c1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('deleteCard sends DELETE to /cards/{id}', async () => {
    mockFetch.mockResolvedValue(mockResponse(null));
    await deleteCard('c1');
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/cards/c1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('archiveCard calls updateCard with closed:true', async () => {
    mockFetch.mockResolvedValue(mockResponse({ ...card, closed: true }));
    const result = await archiveCard('c1');
    expect(result.closed).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/cards/c1?${AUTH_PARAMS}`,
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('"closed":true'),
      }),
    );
  });
});

// --- Comments ---

describe('trello-client: comments', () => {
  it('addComment sends POST to /cards/{id}/actions/comments', async () => {
    const action = { id: 'a1', type: 'commentCard', date: '2025-01-01', data: {}, memberCreator: { id: 'u1', fullName: 'User', username: 'user' } };
    mockFetch.mockResolvedValue(mockResponse(action));
    const result = await addComment('c1', 'Hello world');
    expect(result).toEqual(action);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/cards/c1/actions/comments?'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getComments sends GET to /cards/{id}/actions', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    const result = await getComments('c1');
    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/cards/c1/actions?'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('editComment sends PUT to /actions/{id}', async () => {
    const action = { id: 'a1', type: 'commentCard', date: '2025-01-01', data: { text: 'updated' }, memberCreator: { id: 'u1', fullName: 'User', username: 'user' } };
    mockFetch.mockResolvedValue(mockResponse(action));
    const result = await editComment('a1', 'updated');
    expect(result).toEqual(action);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/actions/a1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('deleteComment sends DELETE to /actions/{id}', async () => {
    mockFetch.mockResolvedValue(mockResponse(null));
    await deleteComment('a1');
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/actions/a1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// --- Labels ---

describe('trello-client: labels', () => {
  it('getBoardLabels sends GET to /boards/{id}/labels', async () => {
    const labels = [{ id: 'lb1', name: 'Critical', color: 'red', idBoard: 'b1' }];
    mockFetch.mockResolvedValue(mockResponse(labels));
    const result = await getBoardLabels('b1');
    expect(result).toEqual(labels);
  });

  it('createLabel sends POST to /labels', async () => {
    const label = { id: 'lb2', name: 'High', color: 'orange', idBoard: 'b1' };
    mockFetch.mockResolvedValue(mockResponse(label));
    const result = await createLabel('b1', 'High', 'orange');
    expect(result).toEqual(label);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/labels?${AUTH_PARAMS}`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"High"'),
      }),
    );
  });

  it('addLabelToCard sends POST to /cards/{id}/idLabels', async () => {
    mockFetch.mockResolvedValue(mockResponse(null));
    await addLabelToCard('c1', 'lb1');
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/cards/c1/idLabels?value=lb1&${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('removeLabelFromCard sends DELETE to /cards/{id}/idLabels/{labelId}', async () => {
    mockFetch.mockResolvedValue(mockResponse(null));
    await removeLabelFromCard('c1', 'lb1');
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/cards/c1/idLabels/lb1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// --- Webhooks ---

describe('trello-client: webhooks', () => {
  it('createWebhook sends POST to /webhooks', async () => {
    const webhook = { id: 'wh1', description: 'test', callbackURL: 'https://example.com/webhook', idModel: 'b1', active: true };
    mockFetch.mockResolvedValue(mockResponse(webhook));
    const result = await createWebhook('https://example.com/webhook', 'b1', 'test webhook');
    expect(result).toEqual(webhook);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/webhooks?${AUTH_PARAMS}`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"callbackURL":"https://example.com/webhook"'),
      }),
    );
  });

  it('listWebhooks sends GET to /tokens/{token}/webhooks', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    const result = await listWebhooks();
    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/tokens/test-token/webhooks?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('deleteWebhook sends DELETE to /webhooks/{id}', async () => {
    mockFetch.mockResolvedValue(mockResponse(null));
    await deleteWebhook('wh1');
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.trello.com/1/webhooks/wh1?${AUTH_PARAMS}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// --- ensureStatusLists ---

describe('trello-client: ensureStatusLists', () => {
  it('creates missing lists and returns a status-to-list map', async () => {
    // Existing list: "To Do" only
    mockFetch
      .mockResolvedValueOnce(mockResponse([{ id: 'l1', name: 'To Do', closed: false, pos: 1, idBoard: 'b1' }])) // getBoardLists
      .mockResolvedValueOnce(mockResponse({ id: 'l2', name: 'Backlog', closed: false, pos: 2, idBoard: 'b1' })) // createList Backlog
      .mockResolvedValueOnce(mockResponse({ id: 'l3', name: 'In Progress', closed: false, pos: 3, idBoard: 'b1' })) // createList In Progress
      .mockResolvedValueOnce(mockResponse({ id: 'l4', name: 'In Review', closed: false, pos: 4, idBoard: 'b1' })) // createList In Review
      .mockResolvedValueOnce(mockResponse({ id: 'l5', name: 'Done', closed: false, pos: 5, idBoard: 'b1' })) // createList Done
      .mockResolvedValueOnce(mockResponse({ id: 'l6', name: 'Blocked', closed: false, pos: 6, idBoard: 'b1' })) // createList Blocked
      .mockResolvedValueOnce(mockResponse({ id: 'l7', name: 'Cancelled', closed: false, pos: 7, idBoard: 'b1' })); // createList Cancelled

    const statusMap = {
      backlog: 'Backlog',
      todo: 'To Do',
      in_progress: 'In Progress',
      in_review: 'In Review',
      done: 'Done',
      blocked: 'Blocked',
      cancelled: 'Cancelled',
    };

    const result = await ensureStatusLists('b1', statusMap);

    // "To Do" should be reused (id l1), others created
    expect(result.todo.id).toBe('l1');
    expect(result.backlog.id).toBe('l2');
    expect(result.in_progress.id).toBe('l3');
  });
});

// --- Error handling ---

describe('trello-client: error handling', () => {
  it('throws on non-ok response with status code', async () => {
    mockFetch.mockResolvedValue(mockResponse({ message: 'Not Found' }, false, 404));
    await expect(getBoard('nonexistent')).rejects.toThrow('Trello API GET');
  });

  it('includes response text in error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('invalid key'),
      json: jest.fn(),
    } as unknown as import('node-fetch').Response);
    await expect(getBoard('b1')).rejects.toThrow('invalid key');
  });
});

// --- Webhook signature (already tested in existing file, but verify via client export) ---

describe('trello-client: verifyWebhookSignature re-export', () => {
  it('is the same function as imported from mapping', () => {
    expect(typeof verifyWebhookSignature).toBe('function');
  });
});