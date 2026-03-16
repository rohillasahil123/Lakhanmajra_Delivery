/**
 * Error Sanitization Utility
 * Converts raw errors to user-friendly messages without exposing sensitive info
 */

export interface SanitizedError {
  userMessage: string;
  code: string;
  shouldLog: boolean;
}

export const sanitizeError = (error: unknown): SanitizedError => {
  const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';
  const DEFAULT_CODE = 'UNKNOWN_ERROR';

  if (!error) {
    return {
      userMessage: DEFAULT_MESSAGE,
      code: DEFAULT_CODE,
      shouldLog: false,
    };
  }

  if (error instanceof Error) {
    const isAxiosError = 'response' in error;

    if (isAxiosError) {
      const status = (error as any).response?.status;

      // Map HTTP status codes to user-friendly messages
      switch (status) {
        case 400:
          return {
            userMessage: 'Invalid input. Please check your data.',
            code: 'VALIDATION_ERROR',
            shouldLog: false,
          };
        case 401:
          return {
            userMessage: 'Session expired. Please login again.',
            code: 'UNAUTHORIZED',
            shouldLog: false,
          };
        case 403:
          return {
            userMessage: 'You do not have permission to perform this action.',
            code: 'FORBIDDEN',
            shouldLog: false,
          };
        case 404:
          return {
            userMessage: 'Resource not found.',
            code: 'NOT_FOUND',
            shouldLog: false,
          };
        case 409:
          return {
            userMessage: 'This resource already exists.',
            code: 'CONFLICT',
            shouldLog: false,
          };
        case 422:
          return {
            userMessage: 'Invalid data format. Please check your input.',
            code: 'UNPROCESSABLE_ENTITY',
            shouldLog: false,
          };
        case 429:
          return {
            userMessage: 'Too many requests. Please wait a moment and try again.',
            code: 'RATE_LIMITED',
            shouldLog: false,
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            userMessage: 'Server error. Please try again later.',
            code: 'SERVER_ERROR',
            shouldLog: true,
          };
        default:
          return {
            userMessage: DEFAULT_MESSAGE,
            code: 'HTTP_ERROR',
            shouldLog: true,
          };
      }
    }

    // Generic error - don't expose the message
    return {
      userMessage: DEFAULT_MESSAGE,
      code: 'GENERIC_ERROR',
      shouldLog: true,
    };
  }

  // Unknown error type
  return {
    userMessage: DEFAULT_MESSAGE,
    code: DEFAULT_CODE,
    shouldLog: false,
  };
};

/**
 * Safely logs errors without exposing sensitive information
 * Only logs non-sensitive error codes, not full messages
 */
export const logErrorSafely = (location: string, error: unknown): void => {
  const sanitized = sanitizeError(error);

  if (sanitized.shouldLog) {
    // Only log location and error code, never the full error message
    console.error(`[${location}] Error Code: ${sanitized.code}`);
    // In production, you could send this to Sentry or similar service here
    // Sentry.captureException(error, { tags: { location } });
  }
};
