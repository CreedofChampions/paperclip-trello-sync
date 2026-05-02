// <!-- created by AI -->
import fetch, { RequestInit } from 'node-fetch';
import { config } from '../config';

const PC_BASE = config.paperclip.apiUrl.replace(/\/api$/, '') + '/api';

export interface PaperclipIssue {
  id: string;
  companyId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeAgentId: string | null;
  assigneeUserId: string | null;
  issueNumber: number | null;
  identifier: string | null;
  originKind: string;
  originId: string | null;
  originFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  hiddenAt: string | null;
}

export interface PaperclipComment {
  id: string;
  issueId: string;
  authorAgentId: string | null;
  authorUserId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaperclipLabel {
  id: string;
  companyId: string;
  name: string;
  color: string | null;
}

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.paperclip.apiKey) {
    h['Authorization'] = `Bearer ${config.paperclip.apiKey}`;
  }
  return h;
}

function mutatingHeaders(): Record<string, string> {
  const h = headers();
  if (config.paperclip.runId) {
    h['X-Paperclip-Run-Id'] = config.paperclip.runId;
  }
  return h;
}

async function pcRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  isMutating: boolean = false
): Promise<T> {
  const url = `${PC_BASE}${path}`;
  const options: RequestInit = {
    method,
    headers: isMutating ? mutatingHeaders() : headers(),
    body: body ? JSON.stringify(body) : undefined,
  };

  const resp = await fetch(url, options);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Paperclip API ${method} ${path} failed: ${resp.status} ${text}`);
  }

  const json = await resp.json() as ApiResponse<T>;
  return json.data !== undefined ? json.data : (json as unknown as T);
}

// --- Issues ---

export async function listIssues(params?: Record<string, string>): Promise<PaperclipIssue[]> {
  const companyId = config.paperclip.companyId;
  let path = `/companies/${companyId}/issues`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    path += `?${qs}`;
  }
  return pcRequest<PaperclipIssue[]>('GET', path);
}

export async function getIssue(issueId: string): Promise<PaperclipIssue> {
  return pcRequest<PaperclipIssue>('GET', `/issues/${issueId}`);
}

export async function createIssue(data: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  originKind?: string;
  originId?: string;
  originFingerprint?: string;
}): Promise<PaperclipIssue> {
  const companyId = config.paperclip.companyId;
  return pcRequest<PaperclipIssue>('POST', `/companies/${companyId}/issues`, data, true);
}

export async function updateIssue(
  issueId: string,
  data: Partial<Pick<PaperclipIssue, 'title' | 'description' | 'status' | 'priority'>>
): Promise<PaperclipIssue> {
  return pcRequest<PaperclipIssue>('PATCH', `/issues/${issueId}`, data, true);
}

export async function deleteIssue(issueId: string): Promise<void> {
  await pcRequest<void>('DELETE', `/issues/${issueId}`, undefined, true);
}

// --- Comments ---

export async function listComments(issueId: string): Promise<PaperclipComment[]> {
  return pcRequest<PaperclipComment[]>('GET', `/issues/${issueId}/comments`);
}

export async function addComment(
  issueId: string,
  body: string,
  extra?: { resume?: boolean; reopen?: boolean }
): Promise<PaperclipComment> {
  return pcRequest<PaperclipComment>('POST', `/issues/${issueId}/comments`, {
    body,
    ...extra,
  }, true);
}

export async function deleteComment(issueId: string, commentId: string): Promise<void> {
  await pcRequest<void>('DELETE', `/issues/${issueId}/comments/${commentId}`, undefined, true);
}

// --- Labels ---

export async function listLabels(): Promise<PaperclipLabel[]> {
  const companyId = config.paperclip.companyId;
  return pcRequest<PaperclipLabel[]>('GET', `/companies/${companyId}/labels`);
}

export async function createLabel(name: string, color?: string): Promise<PaperclipLabel> {
  const companyId = config.paperclip.companyId;
  return pcRequest<PaperclipLabel>('POST', `/companies/${companyId}/labels`, { name, color }, true);
}

// --- Utility: Find issue by Trello card ID ---

export async function findIssueByOriginId(trelloCardId: string): Promise<PaperclipIssue | null> {
  const issues = await listIssues({ originKind: 'plugin:trello', originId: trelloCardId });
  return issues.length > 0 ? issues[0] : null;
}

export async function findIssueByFingerprint(fingerprint: string): Promise<PaperclipIssue | null> {
  const issues = await listIssues({ originFingerprint: fingerprint });
  return issues.length > 0 ? issues[0] : null;
}