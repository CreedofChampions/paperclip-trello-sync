// created by AI
import * as dotenv from 'dotenv';
dotenv.config();

import { BidirectionalSyncEngine } from './sync/sync-engine';

const command = process.argv[2] || 'sync';

async function main(): Promise<void> {
  const engine = new BidirectionalSyncEngine();

  switch (command) {
    case 'sync': {
      console.log('Initializing board...');
      const boardId = await engine.initializeBoard();
      console.log(`Using board: ${boardId}`);

      console.log('Running bidirectional sync...');
      const results = await engine.fullSync();

      for (const result of results) {
        const skipped = result.skipped ? `, ${result.skipped} skipped` : '';
        console.log(
          `${result.direction}: ${result.created} created, ${result.updated} updated${skipped}, ${result.errors} errors`
        );
      }

      const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
      const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
      console.log(`\nTotal: ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`);
      break;
    }

    case 'board': {
      console.log('Initializing board...');
      const boardId = await engine.initializeBoard();
      console.log(`Board ID: ${boardId}`);
      break;
    }

    case 'webhook-setup': {
      console.log('Initializing board...');
      await engine.initializeBoard();
      console.log('Setting up Trello webhook...');
      const webhookId = await engine.setupWebhook();
      console.log(`Webhook ID: ${webhookId}`);
      break;
    }

    case 'webhook-teardown': {
      console.log('Tearing down Trello webhook...');
      await engine.teardownWebhook();
      console.log('Webhook removed.');
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: ts-node src/cli.ts [sync|board|webhook-setup|webhook-teardown]');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});