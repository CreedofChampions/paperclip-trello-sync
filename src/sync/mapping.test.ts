// created by AI
import {
  STATUS_TO_LIST,
  LIST_TO_STATUS,
  PRIORITY_TO_LABEL,
  formatCardName,
  parseCardName,
  formatCardDescription,
  extractIssueIdFromDescription,
  priorityToLabelName,
  labelNameToPriority,
  statusToListName,
  listNameToStatus,
  trelloCardFingerprint,
  paperclipIssueFingerprint,
} from './mapping';

describe('mapping: status and priority', () => {
  it('maps all Paperclip statuses to Trello list names', () => {
    expect(STATUS_TO_LIST.backlog).toBe('Backlog');
    expect(STATUS_TO_LIST.todo).toBe('To Do');
    expect(STATUS_TO_LIST.in_progress).toBe('In Progress');
    expect(STATUS_TO_LIST.in_review).toBe('In Review');
    expect(STATUS_TO_LIST.done).toBe('Done');
    expect(STATUS_TO_LIST.blocked).toBe('Blocked');
    expect(STATUS_TO_LIST.cancelled).toBe('Cancelled');
  });

  it('maps Trello list names back to Paperclip statuses (case-insensitive)', () => {
    expect(listNameToStatus('Backlog')).toBe('backlog');
    expect(listNameToStatus('To Do')).toBe('todo');
    expect(listNameToStatus('In Progress')).toBe('in_progress');
    expect(listNameToStatus('In Review')).toBe('in_review');
    expect(listNameToStatus('Done')).toBe('done');
    expect(listNameToStatus('Blocked')).toBe('blocked');
    expect(listNameToStatus('Cancelled')).toBe('cancelled');
  });

  it('falls back to todo for unknown list names', () => {
    expect(listNameToStatus('Unknown')).toBe('todo');
  });

  it('falls back to To Do for unknown statuses', () => {
    expect(statusToListName('unknown_status')).toBe('To Do');
  });

  it('maps priorities to label names and colors', () => {
    expect(PRIORITY_TO_LABEL.critical).toEqual({ name: 'Critical', color: 'red' });
    expect(PRIORITY_TO_LABEL.high).toEqual({ name: 'High', color: 'orange' });
    expect(PRIORITY_TO_LABEL.medium).toEqual({ name: 'Medium', color: 'yellow' });
    expect(PRIORITY_TO_LABEL.low).toEqual({ name: 'Low', color: 'green' });
  });

  it('converts label names to priorities', () => {
    expect(labelNameToPriority('Critical')).toBe('critical');
    expect(labelNameToPriority('High')).toBe('high');
    expect(labelNameToPriority('Medium')).toBe('medium');
    expect(labelNameToPriority('Low')).toBe('low');
    expect(labelNameToPriority('Unknown')).toBe('medium');
  });

  it('converts priorities to label names', () => {
    expect(priorityToLabelName('critical')).toBe('Critical');
    expect(priorityToLabelName('high')).toBe('High');
    expect(priorityToLabelName('medium')).toBe('Medium');
    expect(priorityToLabelName('low')).toBe('Low');
    expect(priorityToLabelName('unknown')).toBe('Medium');
  });
});

describe('mapping: card name formatting', () => {
  it('formats card name with identifier', () => {
    expect(formatCardName({ identifier: 'CRE-61', title: 'Trello app' })).toBe('CRE-61 Trello app');
  });

  it('formats card name without identifier', () => {
    expect(formatCardName({ identifier: null, title: 'Trello app' })).toBe('Trello app');
    expect(formatCardName({ title: 'Trello app' })).toBe('Trello app');
  });

  it('parses card name with identifier', () => {
    expect(parseCardName('CRE-61 Trello app')).toEqual({ identifier: 'CRE-61', title: 'Trello app' });
    expect(parseCardName('PAP-123 Fix bug')).toEqual({ identifier: 'PAP-123', title: 'Fix bug' });
  });

  it('parses card name without identifier', () => {
    expect(parseCardName('Just a title')).toEqual({ identifier: null, title: 'Just a title' });
  });

  it('handles identifier-only names', () => {
    expect(parseCardName('CRE-61')).toEqual({ identifier: null, title: 'CRE-61' });
  });
});

describe('mapping: description formatting', () => {
  it('formats description with metadata', () => {
    const desc = formatCardDescription({
      id: 'issue-123',
      description: 'Some description',
      priority: 'high',
      status: 'in_progress',
    });
    expect(desc).toContain('<!-- paperclip-issue-id: issue-123 -->');
    expect(desc).toContain('Some description');
    expect(desc).toContain('*Priority: high* | *Status: in_progress*');
  });

  it('extracts issue ID from description', () => {
    const desc = '<!-- paperclip-issue-id: abc-123 -->\nSome text';
    expect(extractIssueIdFromDescription(desc)).toBe('abc-123');
  });

  it('returns null when no issue ID in description', () => {
    expect(extractIssueIdFromDescription('Just text')).toBeNull();
  });
});

describe('mapping: fingerprints', () => {
  it('creates Trello card fingerprint', () => {
    expect(trelloCardFingerprint('card123')).toBe('trello:card:card123');
  });

  it('creates Paperclip issue fingerprint', () => {
    expect(paperclipIssueFingerprint('issue456')).toBe('paperclip:issue:issue456');
  });
});