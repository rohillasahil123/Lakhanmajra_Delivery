import DOMPurify from 'dompurify';

/**
 * Input Sanitization Utility
 * Prevents XSS, injection attacks, and malicious input
 * 
 * SECURITY:
 * - Strips HTML tags from form inputs
 * - Removes dangerous characters
 * - Validates input length
 * - Encodes special characters for safe display
 */

/**
 * Sanitize form input - Remove all HTML/tags, keep only safe text
 * Used when receiving user input from forms
 * 
 * @param input Raw user input
 * @param maxLength Maximum allowed length (default 255)
 * @returns Sanitized safe string
 */
export const sanitizeFormInput = (input: string | null | undefined, maxLength = 255): string => {
  if (!input) return '';

  // Convert to string if not already
  let sanitized = String(input);

  // Remove any HTML tags completely
  sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });

  // Remove any remaining dangerous characters
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/[`]/g, '') // Remove backticks (template injection)
    .replace(/[\n\r\t]/g, ' ') // Replace whitespace with single space
    .trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Sanitize email input specifically
 * Validates RFC 5322 basic format + sanitization
 * 
 * @param email Raw email input
 * @returns Sanitized email (empty if invalid)
 */
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';

  const sanitized = sanitizeFormInput(email, 254).toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
};

/**
 * Sanitize phone number input
 * Keeps only digits and basic formatting characters
 * 
 * @param phone Raw phone input
 * @returns Sanitized phone (only digits)
 */
export const sanitizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';

  // Keep only digits
  const digits = String(phone).replace(/\D/g, '');

  // Limit to reasonable phone length (15 digits max for international)
  return digits.substring(0, 15);
};

/**
 * Sanitize URL/link input
 * Validates that URL is safe and doesn't contain javascript:
 * 
 * @param url Raw URL input
 * @returns Sanitized safe URL or empty string
 */
export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';

  const trimmed = String(url).trim();

  // Reject javascript: and data: URLs (XSS vectors)
  if (trimmed.toLowerCase().startsWith('javascript:') ||
      trimmed.toLowerCase().startsWith('data:')) {
    return '';
  }

  // Only allow http/https/relative URLs
  if (!trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('/')) {
    return '';
  }

  return sanitizeFormInput(trimmed, 2048);
};

/**
 * Sanitize HTML for safe display in DOM
 * Allows structured content but removes scripting vectors
 * 
 * IMPORTANT: Only use this for displaying user-generated content
 * that is expected to potentially have markup
 * 
 * @param html Raw HTML content
 * @returns Safe HTML sanitized by DOMPurify
 */
export const sanitizeHtml = (html: string | null | undefined): string => {
  if (!html) return '';

  return DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Validate and sanitize pagination/limit input
 * Prevents SQL injection via limit manipulation
 * 
 * @param input Raw input
 * @param max Maximum allowed value
 * @returns Safe integer within bounds
 */
export const sanitizeNumber = (input: unknown, min = 0, max = 1000): number => {
  try {
    const num = parseInt(String(input), 10);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(num, max));
  } catch {
    return min;
  }
};

/**
 * Sanitize query/filter strings
 * Used for search inputs to prevent injection
 * 
 * @param query Raw query string
 * @param maxLength Maximum length
 * @returns Sanitized query safe for database search
 */
export const sanitizeSearchQuery = (query: string | null | undefined, maxLength = 100): string => {
  if (!query) return '';

  let sanitized = sanitizeFormInput(query, maxLength);

  // Remove SQL-like patterns (basic protection, use parameterized queries on backend!)
  sanitized = sanitized
    .replace(/['"`]/g, '') // Remove quotes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .replace(/\*/g, ''); // Remove wildcards

  return sanitized;
};

/**
 * Sanitize object (recursively)
 * Sanitizes all string values in an object
 * 
 * @param obj Object with potentially unsafe values
 * @returns New object with sanitized string values
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): Partial<T> => {
  if (!obj || typeof obj !== 'object') return {};

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeFormInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeFormInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Safe text display - HTML-encodes special characters
 * Used when displaying user-provided data in React JSX
 * 
 * @param text Text to display safely
 * @returns HTML-encoded safe text
 */
export const displaySafeText = (text: string | null | undefined): string => {
  if (!text) return '';

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
