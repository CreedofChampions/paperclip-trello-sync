// created by AI
// Tests for config validation.
// config is loaded as a mutable singleton via dotenv at module level,
// so we test validateConfig by temporarily mutating the config object.

import { config, validateConfig } from './config';

describe('config', () => {
  it('has all required config sections', () => {
    expect(config).toHaveProperty('paperclip');
    expect(config).toHaveProperty('trello');
    expect(config).toHaveProperty('sync');
    expect(config).toHaveProperty('webhook');
  });

  it('has default sync interval of 30000ms', () => {
    expect(config.sync.intervalMs).toBe(30000);
  });

  it('has default webhook port of 3101', () => {
    expect(config.webhook.port).toBe(3101);
  });

  it('has default webhook baseUrl', () => {
    expect(config.webhook.baseUrl).toBeDefined();
  });

  it('validateConfig throws when required fields are empty', () => {
    // Save original values
    const orig = {
      apiUrl: config.paperclip.apiUrl,
      companyId: config.paperclip.companyId,
      apiKey: config.paperclip.apiKey,
      trelloApiKey: config.trello.apiKey,
      trelloApiToken: config.trello.apiToken,
    };

    // Clear required fields
    config.paperclip.apiUrl = '';
    config.paperclip.companyId = '';
    config.paperclip.apiKey = '';
    config.trello.apiKey = '';
    config.trello.apiToken = '';

    try {
      expect(() => validateConfig()).toThrow('Missing required config');
    } finally {
      // Restore original values
      config.paperclip.apiUrl = orig.apiUrl;
      config.paperclip.companyId = orig.companyId;
      config.paperclip.apiKey = orig.apiKey;
      config.trello.apiKey = orig.trelloApiKey;
      config.trello.apiToken = orig.trelloApiToken;
    }
  });

  it('validateConfig does not throw when all required fields are present', () => {
    // Save original values
    const orig = {
      apiUrl: config.paperclip.apiUrl,
      companyId: config.paperclip.companyId,
      apiKey: config.paperclip.apiKey,
      trelloApiKey: config.trello.apiKey,
      trelloApiToken: config.trello.apiToken,
    };

    // Set required fields
    config.paperclip.apiUrl = 'http://localhost:3100/api';
    config.paperclip.companyId = 'company-1';
    config.paperclip.apiKey = 'test-key';
    config.trello.apiKey = 'trello-key';
    config.trello.apiToken = 'trello-token';

    try {
      expect(() => validateConfig()).not.toThrow();
    } finally {
      // Restore original values
      config.paperclip.apiUrl = orig.apiUrl;
      config.paperclip.companyId = orig.companyId;
      config.paperclip.apiKey = orig.apiKey;
      config.trello.apiKey = orig.trelloApiKey;
      config.trello.apiToken = orig.trelloApiToken;
    }
  });
});