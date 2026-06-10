import { describe, it, expect } from 'vitest';

describe('Contact Intelligence', () => {
  // Replicate the categorization logic from stakeholders page
  function categorizeContact(title: string, isDM: boolean): string {
    const t = (title || '').toLowerCase();
    if (isDM || /\b(ceo|cto|cfo|cio|coo|svp|evp|president|chief|vp of|vice president|managing director)\b/.test(t)) return 'executive';
    if (/\b(director|head of|senior director|general manager)\b/.test(t)) return 'champion';
    if (/\b(manager|lead|principal|senior|architect|partner)\b/.test(t)) return 'influencer';
    if (/\b(procurement|legal|compliance|audit|risk)\b/.test(t)) return 'gatekeeper';
    if (/\b(analyst|engineer|developer|designer|specialist|consultant|coordinator)\b/.test(t)) return 'end_user';
    return 'other';
  }

  describe('Executive Detection', () => {
    it('should classify CTO as executive', () => {
      expect(categorizeContact('CTO', false)).toBe('executive');
    });

    it('should classify CEO as executive', () => {
      expect(categorizeContact('CEO & Founder', false)).toBe('executive');
    });

    it('should classify VP as executive', () => {
      expect(categorizeContact('VP of Engineering', false)).toBe('executive');
    });

    it('should classify SVP as executive', () => {
      expect(categorizeContact('SVP of Sales', false)).toBe('executive');
    });

    it('should classify decision maker as executive regardless of title', () => {
      expect(categorizeContact('Junior Analyst', true)).toBe('executive');
    });
  });

  describe('Champion Detection', () => {
    it('should classify Director as champion', () => {
      expect(categorizeContact('Director of IT', false)).toBe('champion');
    });

    it('should classify Head of as champion', () => {
      expect(categorizeContact('Head of Digital Transformation', false)).toBe('champion');
    });

    it('should classify General Manager as champion', () => {
      expect(categorizeContact('General Manager', false)).toBe('champion');
    });
  });

  describe('Influencer Detection', () => {
    it('should classify Manager as influencer', () => {
      expect(categorizeContact('Product Manager', false)).toBe('influencer');
    });

    it('should classify Architect as influencer', () => {
      expect(categorizeContact('Solutions Architect', false)).toBe('influencer');
    });

    it('should classify Senior as influencer', () => {
      expect(categorizeContact('Senior Lead', false)).toBe('influencer');
    });
  });

  describe('End User Detection', () => {
    it('should classify Engineer as end_user', () => {
      expect(categorizeContact('Software Engineer', false)).toBe('end_user');
    });

    it('should classify Developer as end_user', () => {
      expect(categorizeContact('Frontend Developer', false)).toBe('end_user');
    });

    it('should classify Analyst as end_user', () => {
      expect(categorizeContact('Business Analyst', false)).toBe('end_user');
    });
  });

  describe('Gatekeeper Detection', () => {
    it('should classify Procurement Specialist as gatekeeper', () => {
      expect(categorizeContact('Procurement Specialist', false)).toBe('gatekeeper');
    });

    it('should classify Procurement Manager as influencer (manager takes priority)', () => {
      expect(categorizeContact('Procurement Manager', false)).toBe('influencer');
    });

    it('should classify Legal as gatekeeper', () => {
      expect(categorizeContact('Legal Counsel', false)).toBe('gatekeeper');
    });

    it('should classify Compliance as gatekeeper', () => {
      expect(categorizeContact('Compliance Officer', false)).toBe('gatekeeper');
    });
  });

  describe('Fallback', () => {
    it('should return other for unrecognized titles', () => {
      expect(categorizeContact('Intern', false)).toBe('other');
    });

    it('should handle empty title', () => {
      expect(categorizeContact('', false)).toBe('other');
    });
  });
});
