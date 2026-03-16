/**
 * Input Sanitization Utilities for Rider App
 * 
 * SECURITY: React Native compatible sanitization (no DOMPurify)
 * Prevents XSS, SQL injection, and other input-based attacks
 * 
 * Used by: auth, location, delivery, and profile services
 */

/**
 * Sanitize general form input text
 * 
 * Removes:
 * - HTML tags and special characters
 * - Leading/trailing whitespace
 * - Multiple consecutive spaces
 * 
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default 100)
 * @returns Sanitized text or empty string if invalid
 */
export function sanitizeFormInput(input: string | undefined | null, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>\"'`;&]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .substring(0, maxLength);

  return sanitized;
}

/**
 * Sanitize email addresses
 * 
 * Validates RFC 5322 basic format and removes dangerous characters
 * 
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const sanitized = email
    .trim()
    .toLowerCase()
    .replace(/[<>\"'`;&]/g, ''); // Remove dangerous chars

  // Basic RFC 5322 validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized) || sanitized.length > 254) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize phone numbers
 * 
 * Extracts digits only, validates minimum length
 * 
 * @param phone - Phone number (can include formatting)
 * @param minDigits - Minimum required digits (default 10)
 * @param maxDigits - Maximum allowed digits (default 15)
 * @returns Sanitized phone (digits only) or empty string if invalid
 */
export function sanitizePhone(
  phone: string | undefined | null,
  minDigits: number = 10,
  maxDigits: number = 15,
): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Extract digits only
  const digits = phone.replace(/\D/g, '');

  // Validate length
  if (digits.length < minDigits || digits.length > maxDigits) {
    return '';
  }

  return digits;
}

/**
 * Sanitize numeric input
 * 
 * Ensures value is within bounds and is valid integer
 * 
 * @param value - Number or string representation
 * @param min - Minimum allowed value (default 0)
 * @param max - Maximum allowed value (default 999999)
 * @returns Valid number or 0 if invalid
 */
export function sanitizeNumber(
  value: string | number | undefined | null,
  min: number = 0,
  max: number = 999999,
): number {
  if (value === null || value === undefined) {
    return min;
  }

  let num: number;

  if (typeof value === 'string') {
    num = parseInt(value.replace(/[^\d-]/g, ''), 10);
  } else {
    num = Math.floor(value);
  }

  if (isNaN(num)) {
    return min;
  }

  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize search queries
 * 
 * Removes SQL injection patterns and search operators
 * 
 * @param query - Search query string
 * @param maxLength - Maximum allowed length (default 100)
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(
  query: string | undefined | null,
  maxLength: number = 100,
): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  let sanitized = query
    .trim()
    .substring(0, maxLength)
    // Remove SQL injection patterns
    .replace(/('|"|;|--|\/\*|\*\/|xp_|sp_|exec|execute|select|insert|update|delete|drop|create|alter)/gi, '')
    // Remove special search operators
    .replace(/[*%&\\]/g, '')
    .replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Sanitize GPS coordinates
 * 
 * Validates latitude (-90 to 90) and longitude (-180 to 180)
 * 
 * @param coordinate - Latitude or longitude value
 * @param isLatitude - True for latitude, false for longitude (default true)
 * @returns Valid coordinate or 0 if invalid
 */
export function sanitizeCoordinate(
  coordinate: string | number | undefined | null,
  isLatitude: boolean = true,
): number {
  if (coordinate === null || coordinate === undefined) {
    return 0;
  }

  let num: number;

  if (typeof coordinate === 'string') {
    num = parseFloat(coordinate.replace(/[^\d.-]/g, ''));
  } else {
    num = parseFloat(String(coordinate));
  }

  if (isNaN(num)) {
    return 0;
  }

  const [min, max] = isLatitude ? [-90, 90] : [-180, 180];
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize password input
 * 
 * Validates minimum length, does not modify content
 * Preserves special characters for password strength
 * 
 * @param password - Password string
 * @param minLength - Minimum required length (default 6)
 * @returns Original password if valid, empty string if too short
 */
export function sanitizePassword(
  password: string | undefined | null,
  minLength: number = 6,
): string {
  if (!password || typeof password !== 'string') {
    return '';
  }

  // Only validate length - don't modify password content
  // Password strength validation should be done separately
  if (password.length < minLength) {
    return '';
  }

  // Trim only - preserve all characters for password strength
  return password.trim();
}

/**
 * Sanitize object by recursively sanitizing all string values
 * 
 * @param obj - Object to sanitize
 * @param maxDepth - Maximum object nesting depth (default 2)
 * @returns New object with sanitized string values
 */
export function sanitizeObject(
  obj: Record<string, any> | undefined | null,
  maxDepth: number = 2,
): Record<string, any> {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  if (maxDepth <= 0) {
    return obj;
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Sanitize string values
      sanitized[key] = sanitizeFormInput(value, 200);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value as Record<string, any>, maxDepth - 1);
    } else {
      // Keep other types as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Convert text to safe display format
 * 
 * Encodes potentially dangerous characters for safe text display
 * Does NOT encode HTML (use sanitizeHtml for that)
 * 
 * @param text - Text to make safe for display
 * @returns Text safe for direct display in UI
 */
export function displaySafeText(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[char] || char;
    });
}

/**
 * Validate and sanitize location data
 * 
 * Used for delivery location validation
 * 
 * @param location - Location object with latitude, longitude, and optional address
 * @returns Sanitized location or null if invalid
 */
export function sanitizeLocation(location: {
  latitude?: number | string;
  longitude?: number | string;
  address?: string;
}): {
  latitude: number;
  longitude: number;
  address: string;
} | null {
  if (!location) {
    return null;
  }

  const latitude = sanitizeCoordinate(location.latitude, true);
  const longitude = sanitizeCoordinate(location.longitude, false);

  if (latitude === 0 && longitude === 0) {
    return null; // Both coordinates are invalid
  }

  return {
    latitude,
    longitude,
    address: sanitizeFormInput(location.address, 200),
  };
}

/**
 * Validate and sanitize delivery address
 * 
 * @param address - Delivery address string
 * @returns Sanitized address (max 300 chars)
 */
export function sanitizeAddress(address: string | undefined | null): string {
  return sanitizeFormInput(address, 300);
}

/**
 * Validate and sanitize delivery instructions
 * 
 * @param instructions - Special delivery instructions
 * @returns Sanitized instructions (max 500 chars)
 */
export function sanitizeDeliveryInstructions(
  instructions: string | undefined | null,
): string {
  return sanitizeFormInput(instructions, 500);
}
