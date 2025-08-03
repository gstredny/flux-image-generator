import { describe, it, expect } from 'vitest';
import { sanitizeUrl, isValidUrl, detectUrlIssues, formatUrlForDisplay } from '../validation';

describe('URL Validation Utilities', () => {
  describe('sanitizeUrl', () => {
    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
      expect(sanitizeUrl('\thttps://example.com\n')).toBe('https://example.com');
    });

    it('should remove trailing slashes', () => {
      expect(sanitizeUrl('https://example.com/')).toBe('https://example.com');
      expect(sanitizeUrl('https://example.com///')).toBe('https://example.com');
    });

    it('should handle both whitespace and trailing slashes', () => {
      expect(sanitizeUrl('  https://example.com/  ')).toBe('https://example.com');
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(isValidUrl('http://localhost:7860')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should accept valid HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://a1d9b207bb29.ngrok-free.app')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    it('should handle URLs with whitespace after sanitization', () => {
      expect(isValidUrl('  https://example.com  ')).toBe(true);
    });
  });

  describe('detectUrlIssues', () => {
    it('should detect whitespace issues', () => {
      expect(detectUrlIssues('  https://example.com')).toBe('URL contains leading or trailing whitespace');
      expect(detectUrlIssues('https://example.com  ')).toBe('URL contains leading or trailing whitespace');
    });

    it('should detect empty URLs', () => {
      expect(detectUrlIssues('')).toBe('URL cannot be empty');
      expect(detectUrlIssues('   ')).toBe('URL cannot be empty');
    });

    it('should detect spaces in URLs', () => {
      expect(detectUrlIssues('https://example .com')).toBe('URL contains spaces - please check for copy-paste errors');
    });

    it('should detect missing protocol', () => {
      expect(detectUrlIssues('example.com')).toBe('URL must start with http:// or https://');
      expect(detectUrlIssues('www.example.com')).toBe('URL must start with http:// or https://');
    });

    it('should detect encoded spaces', () => {
      expect(detectUrlIssues('https://example.com%20')).toBe('URL contains encoded spaces - please remove any spaces');
    });

    it('should return null for valid URLs', () => {
      expect(detectUrlIssues('https://example.com')).toBe(null);
      expect(detectUrlIssues('http://localhost:7860')).toBe(null);
    });
  });

  describe('formatUrlForDisplay', () => {
    it('should not truncate short URLs', () => {
      expect(formatUrlForDisplay('https://example.com')).toBe('https://example.com');
    });

    it('should truncate long URLs', () => {
      const longUrl = 'https://very-long-subdomain.example.com/path/to/some/very/long/endpoint';
      const formatted = formatUrlForDisplay(longUrl, 30);
      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThanOrEqual(30);
    });

    it('should sanitize URL before formatting', () => {
      expect(formatUrlForDisplay('  https://example.com/  ')).toBe('https://example.com');
    });
  });
});