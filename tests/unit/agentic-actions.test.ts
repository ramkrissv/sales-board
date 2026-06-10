import { describe, it, expect } from 'vitest';

describe('Agentic Auto-Actions', () => {
  // Replicate the auto-task creation logic from opportunity router
  function getAutoTasksForStage(stage: string, customerName: string): { name: string; priority: string }[] {
    const tasks: { name: string; priority: string }[] = [];

    if (stage === 'Qualification') {
      tasks.push({ name: `Identify decision maker for ${customerName}`, priority: 'High' });
      tasks.push({ name: `Schedule discovery call with ${customerName}`, priority: 'High' });
    }
    if (stage === 'Proposal') {
      tasks.push({ name: `Generate SOW for ${customerName}`, priority: 'Critical' });
      tasks.push({ name: `Prepare pricing estimate for ${customerName}`, priority: 'High' });
    }
    if (stage === 'Negotiation') {
      tasks.push({ name: `Draft MSA/contract for ${customerName}`, priority: 'Critical' });
    }
    if (stage === 'Won') {
      tasks.push({ name: `Schedule kickoff meeting for ${customerName}`, priority: 'Critical' });
      tasks.push({ name: `Set up delivery workspace for ${customerName}`, priority: 'High' });
    }

    return tasks;
  }

  describe('Qualification Stage', () => {
    it('should create 2 tasks', () => {
      const tasks = getAutoTasksForStage('Qualification', 'Acme Corp');
      expect(tasks).toHaveLength(2);
    });

    it('should create DM identification task', () => {
      const tasks = getAutoTasksForStage('Qualification', 'Acme Corp');
      expect(tasks.some(t => t.name.includes('decision maker'))).toBe(true);
    });

    it('should create discovery call task', () => {
      const tasks = getAutoTasksForStage('Qualification', 'Acme Corp');
      expect(tasks.some(t => t.name.includes('discovery call'))).toBe(true);
    });
  });

  describe('Proposal Stage', () => {
    it('should create 2 tasks', () => {
      const tasks = getAutoTasksForStage('Proposal', 'Acme Corp');
      expect(tasks).toHaveLength(2);
    });

    it('should create SOW generation task with Critical priority', () => {
      const tasks = getAutoTasksForStage('Proposal', 'Acme Corp');
      const sow = tasks.find(t => t.name.includes('SOW'));
      expect(sow).toBeDefined();
      expect(sow?.priority).toBe('Critical');
    });

    it('should create pricing task', () => {
      const tasks = getAutoTasksForStage('Proposal', 'Acme Corp');
      expect(tasks.some(t => t.name.includes('pricing'))).toBe(true);
    });
  });

  describe('Negotiation Stage', () => {
    it('should create 1 task', () => {
      const tasks = getAutoTasksForStage('Negotiation', 'Acme Corp');
      expect(tasks).toHaveLength(1);
    });

    it('should create contract task with Critical priority', () => {
      const tasks = getAutoTasksForStage('Negotiation', 'Acme Corp');
      expect(tasks[0].name).toContain('MSA/contract');
      expect(tasks[0].priority).toBe('Critical');
    });
  });

  describe('Won Stage', () => {
    it('should create 2 tasks', () => {
      const tasks = getAutoTasksForStage('Won', 'Acme Corp');
      expect(tasks).toHaveLength(2);
    });

    it('should create kickoff meeting task', () => {
      const tasks = getAutoTasksForStage('Won', 'Acme Corp');
      expect(tasks.some(t => t.name.includes('kickoff'))).toBe(true);
    });

    it('should include customer name in all tasks', () => {
      const tasks = getAutoTasksForStage('Won', 'Acme Corp');
      tasks.forEach(task => {
        expect(task.name).toContain('Acme Corp');
      });
    });
  });

  describe('Non-triggering Stages', () => {
    it('Discovery should not create auto-tasks', () => {
      const tasks = getAutoTasksForStage('Discovery', 'Acme Corp');
      expect(tasks).toHaveLength(0);
    });

    it('Lost should not create auto-tasks', () => {
      const tasks = getAutoTasksForStage('Lost', 'Acme Corp');
      expect(tasks).toHaveLength(0);
    });

    it('On Hold should not create auto-tasks', () => {
      const tasks = getAutoTasksForStage('On Hold', 'Acme Corp');
      expect(tasks).toHaveLength(0);
    });
  });
});
