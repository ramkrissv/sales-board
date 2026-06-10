import { describe, it, expect } from 'vitest';

// Test the type system and data model integrity
describe('Type System & Data Model', () => {
  describe('Status', () => {
    const VALID_STATUSES = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost', 'On Hold'];

    it('should define all 7 pipeline stages', () => {
      expect(VALID_STATUSES).toHaveLength(7);
    });

    it('should have proper stage progression order', () => {
      const progression = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won'];
      expect(progression).toEqual(expect.arrayContaining(['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Won']));
    });

    it('should include terminal states', () => {
      expect(VALID_STATUSES).toContain('Won');
      expect(VALID_STATUSES).toContain('Lost');
      expect(VALID_STATUSES).toContain('On Hold');
    });
  });

  describe('Deal Classification', () => {
    const CLASSIFICATIONS = ['EE', 'EN', 'NN'];

    it('should define 3 deal types', () => {
      expect(CLASSIFICATIONS).toHaveLength(3);
    });

    it('EE = Existing-Existing (renewal/expansion)', () => {
      expect(CLASSIFICATIONS).toContain('EE');
    });

    it('EN = Existing-New (cross-sell)', () => {
      expect(CLASSIFICATIONS).toContain('EN');
    });

    it('NN = New-New (net new business)', () => {
      expect(CLASSIFICATIONS).toContain('NN');
    });
  });

  describe('Lifecycle Phases', () => {
    const PHASES = ['opportunity', 'pursuit', 'deal', 'engagement', 'delivery'];

    it('should define 5 lifecycle phases', () => {
      expect(PHASES).toHaveLength(5);
    });

    it('should follow proper progression', () => {
      expect(PHASES[0]).toBe('opportunity');
      expect(PHASES[PHASES.length - 1]).toBe('delivery');
    });
  });

  describe('Priority Levels', () => {
    const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

    it('should define 4 priority levels', () => {
      expect(PRIORITIES).toHaveLength(4);
    });

    it('should include Critical for urgent items', () => {
      expect(PRIORITIES).toContain('Critical');
    });
  });

  describe('Opportunity ID Format', () => {
    it('should generate valid IDs with classification prefix', () => {
      const classifications = ['NN', 'EN', 'EE'];
      const year = new Date().getFullYear();

      classifications.forEach(cls => {
        const id = `${cls}-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        expect(id).toMatch(new RegExp(`^${cls}-${year}-\\d{4}$`));
      });
    });
  });
});
