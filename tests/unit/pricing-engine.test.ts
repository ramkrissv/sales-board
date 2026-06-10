import { describe, it, expect } from 'vitest';

describe('Pricing Engine', () => {
  const GEO_RATES: Record<string, { label: string; multiplier: number }> = {
    'us': { label: 'US (Onshore)', multiplier: 1.0 },
    'canada': { label: 'Canada', multiplier: 0.85 },
    'india': { label: 'India (Offshore)', multiplier: 0.35 },
    'latam': { label: 'Latin America (Nearshore)', multiplier: 0.55 },
    'europe': { label: 'Europe', multiplier: 0.90 },
    'apac': { label: 'APAC', multiplier: 0.45 },
  };

  const ROLES = [
    { role: 'Program Manager', baseRate: 130 },
    { role: 'Technical Architect', baseRate: 120 },
    { role: 'QA Architect', baseRate: 100 },
    { role: 'Data Architect', baseRate: 110 },
    { role: 'Sr Full Stack Engineer', baseRate: 95 },
    { role: 'Business Analyst', baseRate: 90 },
    { role: 'DevOps Engineer', baseRate: 95 },
    { role: 'QA Engineer', baseRate: 80 },
    { role: 'AI/ML Engineer', baseRate: 130 },
    { role: 'UX Designer', baseRate: 90 },
  ];

  describe('Geo Rates', () => {
    it('should define 6 geo regions', () => {
      expect(Object.keys(GEO_RATES)).toHaveLength(6);
    });

    it('US should be the baseline (1.0x)', () => {
      expect(GEO_RATES['us'].multiplier).toBe(1.0);
    });

    it('India should be 0.35x (offshore discount)', () => {
      expect(GEO_RATES['india'].multiplier).toBe(0.35);
    });

    it('all multipliers should be between 0 and 1', () => {
      Object.values(GEO_RATES).forEach(rate => {
        expect(rate.multiplier).toBeGreaterThan(0);
        expect(rate.multiplier).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Role Rates', () => {
    it('should define at least 10 roles', () => {
      expect(ROLES.length).toBeGreaterThanOrEqual(10);
    });

    it('all base rates should be positive', () => {
      ROLES.forEach(role => {
        expect(role.baseRate).toBeGreaterThan(0);
      });
    });

    it('AI/ML Engineer should be the highest rate', () => {
      const maxRate = Math.max(...ROLES.map(r => r.baseRate));
      const aiEngineer = ROLES.find(r => r.role === 'AI/ML Engineer');
      expect(aiEngineer?.baseRate).toBe(maxRate);
    });
  });

  describe('Pricing Calculations', () => {
    it('should calculate effective rate with geo multiplier', () => {
      const baseRate = 100; // $100/hr
      const geoMultiplier = GEO_RATES['india'].multiplier;
      const effective = baseRate * geoMultiplier;
      expect(effective).toBe(35); // $35/hr in India
    });

    it('should calculate monthly cost correctly', () => {
      const effectiveRate = 35; // $35/hr
      const hoursPerMonth = 160;
      const count = 2; // 2 engineers
      const monthly = effectiveRate * hoursPerMonth * count;
      expect(monthly).toBe(11200); // $11,200/month
    });

    it('should calculate TCV with margin', () => {
      const monthlyCost = 50000;
      const duration = 12; // months
      const margin = 28; // percent
      const totalCost = monthlyCost * duration;
      const tcv = totalCost * (1 + margin / 100);
      expect(totalCost).toBe(600000);
      expect(tcv).toBe(768000);
    });

    it('blended rate should be weighted average', () => {
      const lines = [
        { count: 1, effectiveRate: 130 }, // 1 US PM
        { count: 2, effectiveRate: 33 },  // 2 India devs
      ];
      const totalHeadcount = lines.reduce((s, l) => s + l.count, 0);
      const totalMonthly = lines.reduce((s, l) => s + l.effectiveRate * l.count * 160, 0);
      const blended = totalMonthly / totalHeadcount / 160;
      expect(blended).toBeCloseTo(65.33, 1); // blended ~$65/hr
    });
  });
});
