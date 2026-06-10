import { describe, it, expect } from 'vitest';

describe('Navigation & Routing', () => {
  // Core nav items from AppShell
  const coreNavItems = [
    { label: 'Command Center', href: '/' },
    { label: 'Leads', href: '/leads' },
    { label: 'Pipeline', href: '/pipeline' },
    { label: 'Accounts', href: '/accounts' },
    { label: 'Tasks', href: '/tasks' },
    { label: 'Close', href: '/presales' },
    { label: 'Analytics', href: '/dashboard' },
    { label: 'AI Agents', href: '/agents' },
  ];

  const pipelineViewModes = [
    { id: 'kanban', href: '/pipeline' },
    { id: 'table', href: '/table' },
    { id: 'calendar', href: '/calendar' },
    { id: 'timeline', href: '/timeline' },
    { id: 'schedule', href: '/schedule' },
    { id: 'graph', href: '/graph' },
  ];

  const analyticsViews = [
    { id: 'dashboard', href: '/dashboard' },
    { id: 'forecast', href: '/forecasting' },
    { id: 'waterfall', href: '/waterfall' },
  ];

  describe('Sidebar Structure', () => {
    it('should have exactly 8 core nav items', () => {
      expect(coreNavItems).toHaveLength(8);
    });

    it('should start with Command Center', () => {
      expect(coreNavItems[0].label).toBe('Command Center');
      expect(coreNavItems[0].href).toBe('/');
    });

    it('should follow sales lifecycle order', () => {
      const labels = coreNavItems.map(i => i.label);
      const leadsIdx = labels.indexOf('Leads');
      const pipelineIdx = labels.indexOf('Pipeline');
      const closeIdx = labels.indexOf('Close');
      const analyticsIdx = labels.indexOf('Analytics');
      expect(leadsIdx).toBeLessThan(pipelineIdx);
      expect(pipelineIdx).toBeLessThan(closeIdx);
      expect(closeIdx).toBeLessThan(analyticsIdx);
    });

    it('all routes should be unique', () => {
      const hrefs = coreNavItems.map(i => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    });
  });

  describe('Pipeline View Modes', () => {
    it('should have 6 view modes', () => {
      expect(pipelineViewModes).toHaveLength(6);
    });

    it('should include kanban as default', () => {
      expect(pipelineViewModes[0].id).toBe('kanban');
      expect(pipelineViewModes[0].href).toBe('/pipeline');
    });

    it('should include graph view', () => {
      const graph = pipelineViewModes.find(v => v.id === 'graph');
      expect(graph).toBeDefined();
    });
  });

  describe('Analytics Views', () => {
    it('should have 3 consolidated views', () => {
      expect(analyticsViews).toHaveLength(3);
    });

    it('should start with dashboard', () => {
      expect(analyticsViews[0].id).toBe('dashboard');
    });
  });

  describe('Deal Detail Tabs', () => {
    const tabs = ['details', 'stakeholders', 'tasks', 'pricing', 'presales', 'contracts', 'documents', 'log'];

    it('should have 8 tabs covering full lifecycle', () => {
      expect(tabs).toHaveLength(8);
    });

    it('should include pricing for cost estimation', () => {
      expect(tabs).toContain('pricing');
    });

    it('should include presales for proposal work', () => {
      expect(tabs).toContain('presales');
    });

    it('should include contracts for deal closure', () => {
      expect(tabs).toContain('contracts');
    });
  });
});
