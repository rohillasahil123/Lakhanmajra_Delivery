/**
 * Input Sanitization Utility for React Native
 * Prevents injection attacks and malicious input
 * 
 * SECURITY:
 * - Removes dangerous characters
 * - Validates input
 * - Enforces length limits
 * - Encodes special characters for safe display
 * 
 * NOTE: React Native doesn't have DOM, so no DOMPurify needed
 */

/**
 * Sanitize form input - Remove dangerous characters, keep safe text
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

  // Remove any dangerous characters
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
 * Sanitize number input (for quantities, pagination, etc)
 * 
 * @param input Raw input
 * @param min Minimum allowed value
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
 * Sanitize location coordinates (latitude/longitude)
 * Validates GPS coordinates
 * 
 * @param coord Raw coordinate input
 * @returns Valid coordinate or 0
 */
export const sanitizeCoordinate = (coord: unknown): number => {
  try {
    const num = parseFloat(String(coord));
    if (isNaN(num)) return 0;
    
    // Latitude: -90 to 90
    // Longitude: -180 to 180
    // This function is flexible for both
    return Math.max(-180, Math.min(180, num));
  } catch {
    return 0;
  }
};

/**
 * Sanitize password input
 * Removes leading/trailing whitespace only
 * (Don't modify password content as it affects security)
 * 
 * @param password Raw password input
 * @param minLength Minimum password length
 * @returns Trimmed password or empty if too short
 */
export const sanitizePassword = (password: string | null | undefined, minLength = 6): string => {
  if (!password) return '';

  const trimmed = String(password).trim();

  // Only validate length, don't modify content
  if (trimmed.length < minLength) {
    return '';
  }

  return trimmed;
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
 * Safe text display - Removes and escapes special characters
 * Used when displaying user-provided data
 * 
 * @param text Text to display safely
 * @returns Safe text
 */
export const displaySafeText = (text: string | null | undefined): string => {
  if (!text) return '';

  return String(text)
    .replace(/[<>]/g, '') // Remove dangerous characters
    .trim();
};

/**
 * Sanitize general address fields (addresses can include commas, digits, and words)
 */
export const sanitizeAddress = (address: string | null | undefined, maxLength = 255): string => {
  const sanitized = sanitizeFormInput(address, maxLength);
  // allow comma and number characters for addresses but remove suspicious script tokens
  return sanitized.replace(/<script.*?>.*?<\/script>/gi, '');
};

/**
 * Sanitize delivery instructions text.
 */
export const sanitizeDeliveryInstructions = (instructions: string | null | undefined, maxLength = 500): string => {
  const sanitized = sanitizeFormInput(instructions, maxLength);
  return sanitized.replace(/\b(drop|hack|sql|rm\s+-rf)\b/gi, '');
};
