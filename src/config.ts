// <!-- created by AI -->
import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  paperclip: {
    apiUrl: process.env.PAPERCLIP_API_URL || 'http://localhost:3100/api',
    companyId: process.env.PAPERCLIP_COMPANY_ID || '',
    apiKey: process.env.PAPERCLIP_API_KEY || '',
    runId: process.env.PAPERCLIP_RUN_ID || '',
  },
  trello: {
    apiKey: process.env.TRELLO_API_KEY || '',
    apiSecret: process.env.TRELLO_API_SECRET || '',
    apiToken: process.env.TRELLO_API_TOKEN || '',
    boardId: process.env.TRELLO_BOARD_ID || '',
    orgId: process.env.TRELLO_ORG_ID || '',
  },
  sync: {
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10),
  },
  webhook: {
    port: parseInt(process.env.WEBHOOK_PORT || '3101', 10),
    baseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3101',
  },
};

export function validateConfig(): void {
  const missing: string[] = [];
  if (!config.paperclip.apiUrl) missing.push('PAPERCLIP_API_URL');
  if (!config.paperclip.companyId) missing.push('PAPERCLIP_COMPANY_ID');
  if (!config.paperclip.apiKey) missing.push('PAPERCLIP_API_KEY');
  if (!config.trello.apiKey) missing.push('TRELLO_API_KEY');
  if (!config.trello.apiToken) missing.push('TRELLO_API_TOKEN');

  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }
}