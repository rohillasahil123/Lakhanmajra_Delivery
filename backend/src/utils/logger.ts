import winston from 'winston';
import path from 'path';

/**
 * Winston Logger Configuration
 * Structured logging for production and development environments
 * Supports console output, file logging, and log aggregation
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'cyan',
};

winston.addColors(colors);

// Create custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.ms(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Development format with colors for console
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.ms(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ms, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}] ${message} ${ms || ''}${metaStr ? '\n' + metaStr : ''}`;
  })
);

// Console transport
const consoleTransport = new winston.transports.Console({
  format: isDevelopment ? devFormat : format,
  level: isDevelopment ? 'debug' : 'info',
});

// File transport for errors
const errorFileTransport = new winston.transports.File({
  filename: path.join(process.cwd(), 'logs', 'error.log'),
  level: 'error',
  format,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

// File transport for combined logs
const combinedFileTransport = new winston.transports.File({
  filename: path.join(process.cwd(), 'logs', 'combined.log'),
  format,
  maxsize: 5242880, // 5MB
  maxFiles: 10,
});

// Create logger instance
export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  levels,
  format,
  transports: [
    consoleTransport,
    ...(isDevelopment ? [] : [errorFileTransport, combinedFileTransport]),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format,
    }),
  ],
});

/**
 * Metrics Logger - Only logs to files, not to console
 * Used for request/response metrics and other noisy logs
 */
export const metricsLogger = winston.createLogger({
  level: 'info',
  levels,
  format,
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'metrics.log'),
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    ...(isDevelopment ? [] : [new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })]),
  ],
});

// Export logger methods for easier use
export const logError = (message: string, meta?: any, error?: Error) => {
  logger.error(message, { ...meta, stack: error?.stack });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logTrace = (message: string, meta?: any) => {
  logger.log('trace', message, meta);
};

/**
 * Request/Response logging helper
 * Logs only to files (metrics.log), not to console
 */
export const logRequest = (method: string, url: string, status: number, duration: number, meta?: any) => {
  metricsLogger.info(`${method} ${url} - ${status}`, {
    method,
    url,
    status,
    duration: `${duration}ms`,
    ...meta,
  });
};

/**
 * Database operation logging helper
 */
export const logDatabase = (operation: string, collection: string, duration: number, meta?: any) => {
  logger.debug(`DB: ${operation} on ${collection}`, {
    operation,
    collection,
    duration: `${duration}ms`,
    ...meta,
  });
};

/**
 * Queue operation logging helper
 */
export const logQueue = (action: string, queue: string, meta?: any) => {
  logger.info(`Queue: ${action} on ${queue}`, {
    action,
    queue,
    ...meta,
  });
};

export default logger;
