// created by AI
// Tests for the file-based mapping functions (getPaperclipIssueId, getTrelloCardId, saveMapping, removeMapping)
// These touch the filesystem so we mock fs

jest.mock('fs');
jest.mock('path', () => ({
  resolve: jest.fn((...args: string[]) => args.join('/')),
}));

import fs from 'fs';
import {
  getPaperclipIssueId,
  getTrelloCardId,
  saveMapping,
  removeMapping,
  getAllMappings,
} from './mapping';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('mapping: file-based mapping', () => {
  beforeEach(() => {
    mockFs.existsSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.writeFileSync.mockReset();
  });

  it('getPaperclipIssueId returns mapped ID when present', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      trelloToPaperclip: { 'card-1': 'issue-1' },
      paperclipToTrello: { 'issue-1': 'card-1' },
      lastSyncAt: '2025-01-01T00:00:00Z',
    }));
    expect(getPaperclipIssueId('card-1')).toBe('issue-1');
  });

  it('getPaperclipIssueId returns null for unmapped card', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      trelloToPaperclip: {},
      paperclipToTrello: {},
      lastSyncAt: '2025-01-01T00:00:00Z',
    }));
    expect(getPaperclipIssueId('card-999')).toBeNull();
  });

  it('getPaperclipIssueId returns null when file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getPaperclipIssueId('card-1')).toBeNull();
  });

  it('getPaperclipIssueId returns null on read error', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('read error');
    });
    expect(getPaperclipIssueId('card-1')).toBeNull();
  });

  it('getTrelloCardId returns mapped ID when present', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      trelloToPaperclip: { 'card-1': 'issue-1' },
      paperclipToTrello: { 'issue-1': 'card-1' },
      lastSyncAt: '2025-01-01T00:00:00Z',
    }));
    expect(getTrelloCardId('issue-1')).toBe('card-1');
  });

  it('saveMapping writes bidirectional mapping', () => {
    // First call: read existing empty mapping
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      trelloToPaperclip: {},
      paperclipToTrello: {},
      lastSyncAt: '2025-01-01T00:00:00Z',
    }));
    mockFs.writeFileSync.mockReturnValue(undefined);

    saveMapping('card-1', 'issue-1');

    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(written.trelloToPaperclip['card-1']).toBe('issue-1');
    expect(written.paperclipToTrello['issue-1']).toBe('card-1');
    expect(written.lastSyncAt).toBeDefined();
  });

  it('saveMapping preserves existing mappings', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      trelloToPaperclip: { 'card-old': 'issue-old' },
      paperclipToTrello: { 'issue-old': 'card-old' },
      lastSyncAt: '2025-01-01T00:00:00Z',
    }));
    mockFs.writeFileSync.mockReturnValue(undefined);

    saveMapping('card-new', 'issue-new');

    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(written.trelloToPaperclip['card-old']).toBe('issue-old');
    expect(written.trelloToPaperclip['card-new']).toBe('issue-new');
    expect(written.paperclipToTrello['issue-old']).toBe('card-old');
    expect(written.paperclipToTrello['issue-new']).toBe('card-new');
  });

  it('removeMapping by trelloCardId removes both directions', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      trelloToPaperclip: { 'card-1': 'issue-1' },
      paperclipToTrello: { 'issue-1': 'card-1' },
      lastSyncAt: '2025-01-01T00:00:00Z',
    }));
    mockFs.writeFileSync.mockReturnValue(undefined);

    removeMapping('card-1');

    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(written.trelloToPaperclip['card-1']).toBeUndefined();
    expect(written.paperclipToTrello['issue-1']).toBeUndefined();
  });

  it('removeMapping by paperclipIssueId removes both directions', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      trelloToPaperclip: { 'card-1': 'issue-1' },
      paperclipToTrello: { 'issue-1': 'card-1' },
      lastSyncAt: '2025-01-01T00:00:00Z',
    }));
    mockFs.writeFileSync.mockReturnValue(undefined);

    removeMapping(undefined, 'issue-1');

    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(written.trelloToPaperclip['card-1']).toBeUndefined();
    expect(written.paperclipToTrello['issue-1']).toBeUndefined();
  });

  it('getAllMappings reads and returns the mapping', () => {
    const data = {
      trelloToPaperclip: { 'card-1': 'issue-1' },
      paperclipToTrello: { 'issue-1': 'card-1' },
      lastSyncAt: '2025-01-01T00:00:00Z',
    };
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(data));

    const mapping = getAllMappings();
    expect(mapping.trelloToPaperclip['card-1']).toBe('issue-1');
    expect(mapping.paperclipToTrello['issue-1']).toBe('card-1');
  });
});