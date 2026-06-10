import { describe, it, expect } from 'vitest';
import { ADAPTER_TEMPLATES } from '@/lib/sync/universal-sync';

describe('Universal Sync Engine', () => {
  describe('Adapter Templates', () => {
    it('should have at least 4 adapter templates', () => {
      expect(Object.keys(ADAPTER_TEMPLATES).length).toBeGreaterThanOrEqual(4);
    });

    it('should support HubSpot', () => {
      expect(ADAPTER_TEMPLATES.hubspot).toBeDefined();
      expect(ADAPTER_TEMPLATES.hubspot.name).toBe('HubSpot');
    });

    it('should support Pipedrive', () => {
      expect(ADAPTER_TEMPLATES.pipedrive).toBeDefined();
      expect(ADAPTER_TEMPLATES.pipedrive.name).toBe('Pipedrive');
    });

    it('should support Zoho CRM', () => {
      expect(ADAPTER_TEMPLATES.zoho).toBeDefined();
      expect(ADAPTER_TEMPLATES.zoho.name).toBe('Zoho CRM');
    });

    it('should support Freshsales', () => {
      expect(ADAPTER_TEMPLATES.freshsales).toBeDefined();
      expect(ADAPTER_TEMPLATES.freshsales.name).toBe('Freshsales');
    });

    it('each template should have required config fields', () => {
      Object.values(ADAPTER_TEMPLATES).forEach(template => {
        expect(template.requiredConfig.length).toBeGreaterThan(0);
        template.requiredConfig.forEach(field => {
          expect(field.key).toBeTruthy();
          expect(field.label).toBeTruthy();
          expect(field.type).toBeTruthy();
        });
      });
    });

    it('each template should have a createAdapter function', () => {
      Object.values(ADAPTER_TEMPLATES).forEach(template => {
        expect(typeof template.createAdapter).toBe('function');
      });
    });
  });

  describe('HubSpot Adapter', () => {
    const adapter = ADAPTER_TEMPLATES.hubspot.createAdapter({ accessToken: 'test-token' });

    it('should create a REST adapter', () => {
      expect(adapter.type).toBe('rest');
      expect(adapter.id).toBe('hubspot');
    });

    it('should map all critical fields', () => {
      const fieldNames = adapter.fieldMappings.map(f => f.galentField);
      expect(fieldNames).toContain('opportunityName');
      expect(fieldNames).toContain('tcv');
      expect(fieldNames).toContain('expectedCloseDate');
      expect(fieldNames).toContain('status');
    });

    it('should map all stages', () => {
      expect(adapter.stageMappings.length).toBeGreaterThanOrEqual(6);
      const galentStages = adapter.stageMappings.map(s => s.galentStage);
      expect(galentStages).toContain('Discovery');
      expect(galentStages).toContain('Won');
      expect(galentStages).toContain('Lost');
    });
  });

  describe('Field Mapping Transforms', () => {
    it('date transform should be specified for date fields', () => {
      Object.values(ADAPTER_TEMPLATES).forEach(template => {
        const adapter = template.createAdapter({ accessToken: 'test', apiKey: 'test', domain: 'test', apiToken: 'test' });
        adapter.fieldMappings.forEach(m => {
          if (m.galentField === 'expectedCloseDate') {
            expect(m.transform).toBe('date');
          }
        });
      });
    });

    it('currency transform should be specified for money fields', () => {
      Object.values(ADAPTER_TEMPLATES).forEach(template => {
        const adapter = template.createAdapter({ accessToken: 'test', apiKey: 'test', domain: 'test', apiToken: 'test' });
        adapter.fieldMappings.forEach(m => {
          if (m.galentField === 'tcv') {
            expect(m.transform).toBe('currency');
          }
        });
      });
    });

    it('stage transform should be specified for status fields', () => {
      Object.values(ADAPTER_TEMPLATES).forEach(template => {
        const adapter = template.createAdapter({ accessToken: 'test', apiKey: 'test', domain: 'test', apiToken: 'test' });
        adapter.fieldMappings.forEach(m => {
          if (m.galentField === 'status') {
            expect(m.transform).toBe('stage');
          }
        });
      });
    });
  });
});
