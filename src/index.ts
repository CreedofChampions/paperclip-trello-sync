// <!-- created by AI -->
import { config, validateConfig } from './config';
import { startServer } from './webhook/webhook-server';
import { BidirectionalSyncEngine } from './sync/sync-engine';

export { config } from './config';
export { BidirectionalSyncEngine } from './sync/sync-engine';
export * as trello from './api/trello-client';
export * as paperclip from './api/paperclip-client';
export * as mapping from './sync/mapping';

async function main(): Promise<void> {
  console.log('Paperclip-Trello Sync starting...');

  try {
    validateConfig();
  } catch (err) {
    console.error('Configuration error:', err);
    process.exit(1);
  }

  console.log(`Paperclip API: ${config.paperclip.apiUrl}`);
  console.log(`Trello Board: ${config.trello.boardId || '(will create new)'}`);
  console.log(`Webhook URL: ${config.webhook.baseUrl}/trello/webhook`);

  await startServer();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});