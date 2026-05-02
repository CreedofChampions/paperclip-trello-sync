// created by AI
import { PaperclipIssue } from './paperclip-client';

describe('PaperclipIssue interface', () => {
  it('has expected fields for type checking', () => {
    const issue: PaperclipIssue = {
      id: 'test-id',
      companyId: 'company-id',
      projectId: null,
      title: 'Test Issue',
      description: 'A test issue',
      status: 'todo',
      priority: 'medium',
      assigneeAgentId: null,
      assigneeUserId: null,
      issueNumber: 1,
      identifier: 'CRE-1',
      originKind: 'manual',
      originId: null,
      originFingerprint: null,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      hiddenAt: null,
    };
    expect(issue.id).toBe('test-id');
    expect(issue.identifier).toBe('CRE-1');
    expect(issue.status).toBe('todo');
  });
});