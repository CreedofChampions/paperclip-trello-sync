// created by AI
import fetch from 'node-fetch';

// Mock config before importing the module under test
jest.mock('../config', () => ({
  config: {
    paperclip: {
      apiUrl: 'http://localhost:3100/api',
      companyId: 'company-1',
      apiKey: 'pc-api-key',
      runId: 'run-1',
    },
  },
}));

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as unknown as jest.Mock;

import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  listComments,
  addComment,
  deleteComment,
  listLabels,
  createLabel,
  findIssueByOriginId,
  findIssueByFingerprint,
} from './paperclip-client';

// Helper to build a mock Response
function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue({ data }),
    text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  } as unknown as import('node-fetch').Response;
}

const BASE = 'http://localhost:3100/api';
const AUTH_HEADER = 'Bearer pc-api-key';
const RUN_HEADER = 'run-1';

beforeEach(() => {
  mockFetch.mockReset();
});

// --- Issues ---

describe('paperclip-client: listIssues', () => {
  it('sends GET to /companies/{id}/issues', async () => {
    const issues = [{ id: 'i1', title: 'Test Issue', status: 'todo' }];
    mockFetch.mockResolvedValue(mockResponse(issues));
    const result = await listIssues();
    expect(result).toEqual(issues);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/companies/company-1/issues`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: AUTH_HEADER }),
      }),
    );
  });

  it('passes query params when provided', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    await listIssues({ originKind: 'plugin:trello', originId: 'card-1' });
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/companies/company-1/issues?originKind=plugin%3Atrello&originId=card-1`,
      expect.anything(),
    );
  });
});

describe('paperclip-client: getIssue', () => {
  it('sends GET to /issues/{id}', async () => {
    const issue = { id: 'i1', title: 'Test' };
    mockFetch.mockResolvedValue(mockResponse(issue));
    const result = await getIssue('i1');
    expect(result).toEqual(issue);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/issues/i1`,
      expect.objectContaining({ method: 'GET' }),
    );
  });
});

describe('paperclip-client: createIssue', () => {
  it('sends POST to /companies/{id}/issues with X-Paperclip-Run-Id header', async () => {
    const issue = { id: 'i2', title: 'New Issue' };
    mockFetch.mockResolvedValue(mockResponse(issue));
    const result = await createIssue({
      title: 'New Issue',
      status: 'todo',
      originKind: 'plugin:trello',
      originId: 'card-1',
      originFingerprint: 'trello:card:card-1',
    });
    expect(result).toEqual(issue);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/companies/company-1/issues`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Paperclip-Run-Id': RUN_HEADER }),
        body: expect.stringContaining('"originKind":"plugin:trello"'),
      }),
    );
  });
});

describe('paperclip-client: updateIssue', () => {
  it('sends PATCH to /issues/{id} with X-Paperclip-Run-Id header', async () => {
    const issue = { id: 'i1', title: 'Updated' };
    mockFetch.mockResolvedValue(mockResponse(issue));
    const result = await updateIssue('i1', { status: 'in_progress' });
    expect(result).toEqual(issue);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/issues/i1`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'X-Paperclip-Run-Id': RUN_HEADER }),
      }),
    );
  });
});

describe('paperclip-client: deleteIssue', () => {
  it('sends DELETE to /issues/{id}', async () => {
    mockFetch.mockResolvedValue(mockResponse(null));
    await deleteIssue('i1');
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/issues/i1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// --- Comments ---

describe('paperclip-client: comments', () => {
  it('listComments sends GET to /issues/{id}/comments', async () => {
    const comments = [{ id: 'c1', body: 'Hello' }];
    mockFetch.mockResolvedValue(mockResponse(comments));
    const result = await listComments('i1');
    expect(result).toEqual(comments);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/issues/i1/comments`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('addComment sends POST to /issues/{id}/comments with run header', async () => {
    const comment = { id: 'c2', body: 'New comment' };
    mockFetch.mockResolvedValue(mockResponse(comment));
    const result = await addComment('i1', 'New comment', { resume: true });
    expect(result).toEqual(comment);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/issues/i1/comments`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"resume":true'),
      }),
    );
  });

  it('deleteComment sends DELETE to /issues/{id}/comments/{commentId}', async () => {
    mockFetch.mockResolvedValue(mockResponse(null));
    await deleteComment('i1', 'c1');
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/issues/i1/comments/c1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

// --- Labels ---

describe('paperclip-client: labels', () => {
  it('listLabels sends GET to /companies/{id}/labels', async () => {
    const labels = [{ id: 'lb1', name: 'bug', color: 'red' }];
    mockFetch.mockResolvedValue(mockResponse(labels));
    const result = await listLabels();
    expect(result).toEqual(labels);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/companies/company-1/labels`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('createLabel sends POST to /companies/{id}/labels with run header', async () => {
    const label = { id: 'lb2', name: 'feature', color: 'blue' };
    mockFetch.mockResolvedValue(mockResponse(label));
    const result = await createLabel('feature', 'blue');
    expect(result).toEqual(label);
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/companies/company-1/labels`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"feature"'),
      }),
    );
  });
});

// --- Utility: findIssueByOriginId / findIssueByFingerprint ---

describe('paperclip-client: findIssueByOriginId', () => {
  it('returns first matching issue', async () => {
    const issues = [{ id: 'i1', originKind: 'plugin:trello', originId: 'card-1' }];
    mockFetch.mockResolvedValue(mockResponse(issues));
    const result = await findIssueByOriginId('card-1');
    expect(result).toEqual(issues[0]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('originKind=plugin%3Atrello&originId=card-1'),
      expect.anything(),
    );
  });

  it('returns null when no issues found', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    const result = await findIssueByOriginId('nonexistent');
    expect(result).toBeNull();
  });
});

describe('paperclip-client: findIssueByFingerprint', () => {
  it('returns first matching issue by fingerprint', async () => {
    const issues = [{ id: 'i2', originFingerprint: 'trello:card:c1' }];
    mockFetch.mockResolvedValue(mockResponse(issues));
    const result = await findIssueByFingerprint('trello:card:c1');
    expect(result).toEqual(issues[0]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('originFingerprint=trello%3Acard%3Ac1'),
      expect.anything(),
    );
  });

  it('returns null when no issues found', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    const result = await findIssueByFingerprint('nonexistent');
    expect(result).toBeNull();
  });
});

// --- Error handling ---

describe('paperclip-client: error handling', () => {
  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('internal error'),
      json: jest.fn(),
    } as unknown as import('node-fetch').Response);
    await expect(listIssues()).rejects.toThrow('Paperclip API GET /companies/company-1/issues failed: 500');
  });

  it('includes response text in error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: jest.fn().mockResolvedValue('forbidden'),
      json: jest.fn(),
    } as unknown as import('node-fetch').Response);
    await expect(getIssue('i1')).rejects.toThrow('forbidden');
  });
});

// --- Mutating vs read-only headers ---

describe('paperclip-client: header behavior', () => {
  it('read-only calls do NOT include X-Paperclip-Run-Id', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    await listIssues();
    const call = mockFetch.mock.calls[0];
    const headers = call[1].headers;
    expect(headers['X-Paperclip-Run-Id']).toBeUndefined();
  });

  it('mutating calls include X-Paperclip-Run-Id', async () => {
    mockFetch.mockResolvedValue(mockResponse({ id: 'i1' }));
    await createIssue({ title: 'Test' });
    const call = mockFetch.mock.calls[0];
    const headers = call[1].headers;
    expect(headers['X-Paperclip-Run-Id']).toBe(RUN_HEADER);
  });
});