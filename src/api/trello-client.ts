// <!-- created by AI -->
import fetch, { RequestInit } from 'node-fetch';
import { createHmac } from 'crypto';
import { config } from '../config';

const TRELLO_BASE = 'https://api.trello.com/1';

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idOrganization: string;
  url: string;
  shortUrl: string;
  labelNames: Record<string, string>;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
  idBoard: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idBoard: string;
  idList: string;
  url: string;
  shortUrl: string;
  pos: number;
  due: string | null;
  dueComplete: boolean;
  labels: TrelloLabel[];
  idMembers: string[];
  dateLastActivity: string;
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
  idBoard: string;
}

export interface TrelloAction {
  id: string;
  type: string;
  date: string;
  data: Record<string, unknown>;
  memberCreator: { id: string; fullName: string; username: string };
}

export interface TrelloWebhook {
  id: string;
  description: string;
  callbackURL: string;
  idModel: string;
  active: boolean;
}

function authParams(): string {
  return `key=${config.trello.apiKey}&token=${config.trello.apiToken}`;
}

async function trelloRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${TRELLO_BASE}${path}${path.includes('?') ? '&' : '?'}${authParams()}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  };

  const resp = await fetch(url, options);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Trello API ${method} ${path} failed: ${resp.status} ${text}`);
  }
  return resp.json() as Promise<T>;
}

// Verify webhook signature from Trello
export function verifyWebhookSignature(
  body: string,
  signature: string | undefined,
  callbackUrl: string
): boolean {
  if (!signature) return false;
  const content = body + callbackUrl;
  const hash = createHmac('sha1', config.trello.apiSecret)
    .update(content)
    .digest('base64');
  return hash === signature;
}

// --- Boards ---

export async function getBoard(boardId: string): Promise<TrelloBoard> {
  return trelloRequest<TrelloBoard>('GET', `/boards/${boardId}?fields=name,desc,closed,idOrganization,url,shortUrl,labelNames`);
}

export async function createBoard(name: string, orgId?: string, desc?: string): Promise<TrelloBoard> {
  const body: Record<string, unknown> = {
    name,
    defaultLabels: true,
    defaultLists: false,
  };
  if (orgId) body.idOrganization = orgId;
  if (desc) body.desc = desc;
  return trelloRequest<TrelloBoard>('POST', '/boards', body);
}

export async function updateBoard(boardId: string, updates: Record<string, unknown>): Promise<TrelloBoard> {
  return trelloRequest<TrelloBoard>('PUT', `/boards/${boardId}`, updates);
}

// --- Lists ---

export async function getBoardLists(boardId: string): Promise<TrelloList[]> {
  return trelloRequest<TrelloList[]>('GET', `/boards/${boardId}/lists`);
}

export async function createList(name: string, boardId: string, pos?: string): Promise<TrelloList> {
  const body: Record<string, unknown> = { name, idBoard: boardId };
  if (pos) body.pos = pos;
  return trelloRequest<TrelloList>('POST', '/lists', body);
}

export async function updateList(listId: string, updates: Record<string, unknown>): Promise<TrelloList> {
  return trelloRequest<TrelloList>('PUT', `/lists/${listId}`, updates);
}

// --- Cards ---

export async function getCard(cardId: string): Promise<TrelloCard> {
  return trelloRequest<TrelloCard>('GET', `/cards/${cardId}?fields=name,desc,idList,idBoard,closed,labels,due,dueComplete,url,shortUrl,pos,dateLastActivity`);
}

export async function getBoardCards(boardId: string): Promise<TrelloCard[]> {
  return trelloRequest<TrelloCard[]>('GET', `/boards/${boardId}/cards?fields=name,desc,idList,idBoard,closed,labels,due,dueComplete,url,shortUrl,pos,dateLastActivity`);
}

export async function createCard(listId: string, name: string, desc?: string, extra?: Record<string, unknown>): Promise<TrelloCard> {
  const body: Record<string, unknown> = { idList: listId, name, pos: 'top' };
  if (desc) body.desc = desc;
  if (extra) Object.assign(body, extra);
  return trelloRequest<TrelloCard>('POST', '/cards', body);
}

export async function updateCard(cardId: string, updates: Record<string, unknown>): Promise<TrelloCard> {
  return trelloRequest<TrelloCard>('PUT', `/cards/${cardId}`, updates);
}

export async function deleteCard(cardId: string): Promise<void> {
  await trelloRequest<void>('DELETE', `/cards/${cardId}`);
}

export async function archiveCard(cardId: string): Promise<TrelloCard> {
  return updateCard(cardId, { closed: true });
}

// --- Comments (Actions) ---

export async function addComment(cardId: string, text: string): Promise<TrelloAction> {
  return trelloRequest<TrelloAction>('POST', `/cards/${cardId}/actions/comments?text=${encodeURIComponent(text)}`);
}

export async function getComments(cardId: string): Promise<TrelloAction[]> {
  return trelloRequest<TrelloAction[]>('GET', `/cards/${cardId}/actions?filter=commentCard`);
}

export async function editComment(actionId: string, text: string): Promise<TrelloAction> {
  return trelloRequest<TrelloAction>('PUT', `/actions/${actionId}`, { text });
}

export async function deleteComment(actionId: string): Promise<void> {
  await trelloRequest<void>('DELETE', `/actions/${actionId}`);
}

// --- Labels ---

export async function getBoardLabels(boardId: string): Promise<TrelloLabel[]> {
  return trelloRequest<TrelloLabel[]>('GET', `/boards/${boardId}/labels`);
}

export async function createLabel(boardId: string, name: string, color: string): Promise<TrelloLabel> {
  return trelloRequest<TrelloLabel>('POST', '/labels', { idBoard: boardId, name, color });
}

export async function addLabelToCard(cardId: string, labelId: string): Promise<void> {
  await trelloRequest<void>('POST', `/cards/${cardId}/idLabels?value=${labelId}`);
}

export async function removeLabelFromCard(cardId: string, labelId: string): Promise<void> {
  await trelloRequest<void>('DELETE', `/cards/${cardId}/idLabels/${labelId}`);
}

// --- Webhooks ---

export async function createWebhook(
  callbackUrl: string,
  idModel: string,
  description?: string
): Promise<TrelloWebhook> {
  return trelloRequest<TrelloWebhook>('POST', '/webhooks', {
    callbackURL: callbackUrl,
    idModel,
    description: description || 'Paperclip-Trello sync webhook',
  });
}

export async function listWebhooks(): Promise<TrelloWebhook[]> {
  return trelloRequest<TrelloWebhook[]>('GET', `/tokens/${config.trello.apiToken}/webhooks`);
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await trelloRequest<void>('DELETE', `/webhooks/${webhookId}`);
}

// --- Utility: Find or create lists for Paperclip statuses ---

export async function ensureStatusLists(
  boardId: string,
  statusMap: Record<string, string>
): Promise<Record<string, TrelloList>> {
  const existingLists = await getBoardLists(boardId);
  const result: Record<string, TrelloList> = {};

  for (const [status, listName] of Object.entries(statusMap)) {
    const existing = existingLists.find((l) => l.name === listName && !l.closed);
    if (existing) {
      result[status] = existing;
    } else {
      result[status] = await createList(listName, boardId);
    }
  }

  return result;
}