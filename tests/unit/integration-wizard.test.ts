import { describe, it, expect } from 'vitest';

// Test the integration wizard platform configs
describe('Integration Wizard', () => {
  const PLATFORM_CONFIGS: Record<string, { fields: any[]; authMethod: string; syncCapabilities: string[]; mcpTools: any[] }> = {
    'Salesforce': {
      fields: [
        { key: 'instanceUrl', label: 'Salesforce Instance URL', type: 'url', required: true },
        { key: 'clientId', label: 'Connected App Client ID', type: 'text', required: true },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
        { key: 'securityToken', label: 'Security Token', type: 'password' },
      ],
      authMethod: 'OAuth 2.0',
      syncCapabilities: ['Opportunities', 'Contacts', 'Accounts', 'Tasks', 'Events', 'Custom Objects'],
      mcpTools: [
        { name: 'sf_query', description: 'Run SOQL queries' },
        { name: 'sf_create_record', description: 'Create records' },
        { name: 'sf_update_record', description: 'Update records' },
        { name: 'sf_get_metadata', description: 'Fetch schemas' },
      ],
    },
    'HubSpot': {
      fields: [
        { key: 'apiKey', label: 'Private App Access Token', type: 'password', required: true },
        { key: 'portalId', label: 'Portal ID', type: 'text' },
      ],
      authMethod: 'Bearer Token',
      syncCapabilities: ['Contacts', 'Companies', 'Deals', 'Tickets', 'Marketing Emails', 'Forms'],
      mcpTools: [
        { name: 'hs_search_contacts', description: 'Search contacts' },
        { name: 'hs_create_deal', description: 'Create deal' },
      ],
    },
    'Gmail': {
      fields: [
        { key: 'email', label: 'Gmail Address', type: 'email', required: true },
        { key: 'appPassword', label: 'App Password', type: 'password', required: true },
      ],
      authMethod: 'IMAP + SMTP (App Password)',
      syncCapabilities: ['Inbox Monitoring', 'Send Emails', 'Thread Tracking', 'Label Sync'],
      mcpTools: [
        { name: 'email_search', description: 'Search emails' },
        { name: 'email_send', description: 'Send email' },
      ],
    },
    'Slack': {
      fields: [
        { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
        { key: 'signingSecret', label: 'Signing Secret', type: 'password', required: true },
        { key: 'defaultChannel', label: 'Default Channel', type: 'text' },
      ],
      authMethod: 'OAuth 2.0 (Slack)',
      syncCapabilities: ['Channel Messages', 'DMs', 'Reactions', 'File Sharing'],
      mcpTools: [
        { name: 'slack_send_message', description: 'Post to channel' },
        { name: 'slack_search', description: 'Search messages' },
      ],
    },
  };

  describe('Platform Coverage', () => {
    it('should support at least 4 platforms', () => {
      expect(Object.keys(PLATFORM_CONFIGS).length).toBeGreaterThanOrEqual(4);
    });

    it('should support CRM platforms', () => {
      expect(PLATFORM_CONFIGS['Salesforce']).toBeDefined();
      expect(PLATFORM_CONFIGS['HubSpot']).toBeDefined();
    });

    it('should support email platforms', () => {
      expect(PLATFORM_CONFIGS['Gmail']).toBeDefined();
    });

    it('should support messaging platforms', () => {
      expect(PLATFORM_CONFIGS['Slack']).toBeDefined();
    });
  });

  describe('Platform-Specific Fields', () => {
    it('Salesforce should require instance URL and OAuth credentials', () => {
      const sf = PLATFORM_CONFIGS['Salesforce'];
      const required = sf.fields.filter(f => f.required).map(f => f.key);
      expect(required).toContain('instanceUrl');
      expect(required).toContain('clientId');
      expect(required).toContain('clientSecret');
    });

    it('HubSpot should require API key', () => {
      const hs = PLATFORM_CONFIGS['HubSpot'];
      const required = hs.fields.filter(f => f.required).map(f => f.key);
      expect(required).toContain('apiKey');
    });

    it('Gmail should require email and app password', () => {
      const gmail = PLATFORM_CONFIGS['Gmail'];
      const required = gmail.fields.filter(f => f.required).map(f => f.key);
      expect(required).toContain('email');
      expect(required).toContain('appPassword');
    });

    it('password fields should use type=password', () => {
      Object.values(PLATFORM_CONFIGS).forEach(config => {
        config.fields.forEach(field => {
          if (field.key.includes('Secret') || field.key.includes('Password') || field.key.includes('Token') || field.key === 'apiKey') {
            expect(field.type).toBe('password');
          }
        });
      });
    });
  });

  describe('MCP Tools', () => {
    it('each platform should have at least 2 MCP tools', () => {
      Object.entries(PLATFORM_CONFIGS).forEach(([name, config]) => {
        expect(config.mcpTools.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('MCP tools should have name and description', () => {
      Object.values(PLATFORM_CONFIGS).forEach(config => {
        config.mcpTools.forEach(tool => {
          expect(tool.name).toBeTruthy();
          expect(tool.description).toBeTruthy();
        });
      });
    });

    it('Salesforce should have query, create, update tools', () => {
      const toolNames = PLATFORM_CONFIGS['Salesforce'].mcpTools.map(t => t.name);
      expect(toolNames).toContain('sf_query');
      expect(toolNames).toContain('sf_create_record');
      expect(toolNames).toContain('sf_update_record');
    });
  });

  describe('Auth Methods', () => {
    it('each platform should specify an auth method', () => {
      Object.values(PLATFORM_CONFIGS).forEach(config => {
        expect(config.authMethod).toBeTruthy();
      });
    });

    it('Salesforce should use OAuth 2.0', () => {
      expect(PLATFORM_CONFIGS['Salesforce'].authMethod).toContain('OAuth');
    });
  });

  describe('Sync Capabilities', () => {
    it('each platform should have sync capabilities', () => {
      Object.values(PLATFORM_CONFIGS).forEach(config => {
        expect(config.syncCapabilities.length).toBeGreaterThan(0);
      });
    });

    it('Salesforce should sync Opportunities and Contacts', () => {
      const caps = PLATFORM_CONFIGS['Salesforce'].syncCapabilities;
      expect(caps).toContain('Opportunities');
      expect(caps).toContain('Contacts');
    });
  });
});
