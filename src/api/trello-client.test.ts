// created by AI
import crypto from 'crypto';

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

import { verifyWebhookSignature } from './trello-client';

describe('verifyWebhookSignature', () => {
  const callbackUrl = 'https://example.com/trello/webhook';

  it('rejects missing signature', () => {
    expect(verifyWebhookSignature('body', undefined, callbackUrl)).toBe(false);
  });

  it('rejects invalid signature', () => {
    expect(verifyWebhookSignature('body', 'badsignature', callbackUrl)).toBe(false);
  });

  it('accepts valid HMAC-SHA1 signature', () => {
    const secret = 'testsecret123';
    const content = 'testbody' + callbackUrl;
    const hash = crypto.createHmac('sha1', secret).update(content).digest('base64');
    expect(verifyWebhookSignature('testbody', hash, callbackUrl)).toBe(true);
  });

  it('rejects signature with wrong secret', () => {
    const wrongSecret = 'wrongsecret';
    const content = 'testbody' + callbackUrl;
    const hash = crypto.createHmac('sha1', wrongSecret).update(content).digest('base64');
    expect(verifyWebhookSignature('testbody', hash, callbackUrl)).toBe(false);
  });

  it('rejects signature with wrong callback URL', () => {
    const secret = 'testsecret123';
    const content = 'testbody' + 'https://wrong.example.com/webhook';
    const hash = crypto.createHmac('sha1', secret).update(content).digest('base64');
    expect(verifyWebhookSignature('testbody', hash, callbackUrl)).toBe(false);
  });
});