/**
 * URL validation and sanitization utilities
 */

/**
 * Sanitizes a URL by trimming whitespace and removing trailing slashes
 * @param url - The URL to sanitize
 * @returns The sanitized URL
 */
export function sanitizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Validates if a string is a valid URL
 * @param url - The string to validate
 * @returns True if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(sanitizeUrl(url));
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detects common URL issues and provides helpful error messages
 * @param url - The URL to check
 * @returns Error message if issues found, null if valid
 */
export function detectUrlIssues(url: string): string | null {
  const trimmedUrl = url.trim();
  
  // Check for whitespace
  if (url !== trimmedUrl) {
    return 'URL contains leading or trailing whitespace';
  }
  
  // Check if empty
  if (!trimmedUrl) {
    return 'URL cannot be empty';
  }
  
  // Check for common copy-paste errors
  if (trimmedUrl.includes(' ')) {
    return 'URL contains spaces - please check for copy-paste errors';
  }
  
  // Check for missing protocol
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return 'URL must start with http:// or https://';
  }
  
  // Validate URL structure
  try {
    new URL(trimmedUrl);
  } catch {
    return 'Invalid URL format';
  }
  
  // Check for encoded spaces
  if (trimmedUrl.includes('%20')) {
    return 'URL contains encoded spaces - please remove any spaces';
  }
  
  return null;
}

/**
 * Formats a URL for display, truncating if necessary
 * @param url - The URL to format
 * @param maxLength - Maximum length before truncation
 * @returns The formatted URL
 */
export function formatUrlForDisplay(url: string, maxLength: number = 50): string {
  const sanitized = sanitizeUrl(url);
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  
  const start = sanitized.substring(0, maxLength - 10);
  const end = sanitized.substring(sanitized.length - 7);
  return `${start}...${end}`;
}