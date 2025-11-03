/**
 * Structured Logging System
 * Using Winston for production-grade logging
 *
 * Features:
 * - Structured JSON logs
 * - Log rotation
 * - Sensitive data filtering
 * - Multiple transports (console, file)
 * - Log levels (error, warn, info, debug)
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Define sensitive fields that should NOT be logged
 * These will be replaced with [REDACTED]
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'csrfToken',
  'secret',
  'apiKey',
  'authorization',
  'x-csrf-token',
  'x-xsrf-token',
  'creditCard',
  'ssn',
  'pin',
  'otp',
  'code' // 2FA codes
];

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'object') {
    const sanitized = { ...data };

    // Check all keys
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();

      // Check if key matches sensitive field
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  if (typeof data === 'string') {
    // Redact sensitive patterns
    let result = data;

    // Credit card pattern: 1234-5678-9012-3456
    result = result.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED-CC]');

    // Email pattern (partial): user@***
    result = result.replace(/([a-zA-Z0-9._-]+)@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED-EMAIL]');

    // Phone pattern: 123-456-7890
    result = result.replace(/\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g, '[REDACTED-PHONE]');

    return result;
  }

  return data;
}

/**
 * Custom formatter for structured JSON logs
 */
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    // Sanitize sensitive data
    if (info.metadata) {
      info.metadata = sanitizeData(info.metadata);
    }
    if (info.request) {
      info.request = sanitizeData(info.request);
    }
    if (info.response) {
      info.response = sanitizeData(info.response);
    }

    return info;
  })(),
  winston.format.json()
);

/**
 * Simple text format for development
 */
const simpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ' ' + JSON.stringify(sanitizeData(meta), null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: structuredFormat,
  defaultMeta: { service: 'e-voting-api', environment: process.env.NODE_ENV || 'development' },
  transports: [
    // Error log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5 // Keep 5 files
    }),

    // Combined log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: simpleFormat
    })
  );
}

/**
 * Log levels with methods
 */
export const log = {
  /**
   * Error level - Serious problems that need immediate attention
   */
  error: (message, meta = {}) => {
    logger.error(message, { metadata: meta });
  },

  /**
   * Warn level - Potentially harmful situations
   */
  warn: (message, meta = {}) => {
    logger.warn(message, { metadata: meta });
  },

  /**
   * Info level - Important events
   */
  info: (message, meta = {}) => {
    logger.info(message, { metadata: meta });
  },

  /**
   * Debug level - Detailed information for debugging
   */
  debug: (message, meta = {}) => {
    logger.debug(message, { metadata: meta });
  },

  /**
   * Log HTTP request
   */
  http: (method, path, status, duration, meta = {}) => {
    logger.info(`HTTP ${method} ${path}`, {
      metadata: {
        method,
        path,
        status,
        duration: `${duration}ms`,
        ...meta
      }
    });
  },

  /**
   * Log authentication event
   */
  auth: (action, userId, success, meta = {}) => {
    logger.info(`Auth ${action}`, {
      metadata: {
        action,
        userId,
        success,
        timestamp: new Date().toISOString(),
        ...meta
      }
    });
  },

  /**
   * Log security event
   */
  security: (event, severity, meta = {}) => {
    const level = severity === 'critical' ? 'error' :
                  severity === 'high' ? 'warn' : 'info';
    logger[level](`Security: ${event}`, {
      metadata: {
        event,
        severity,
        timestamp: new Date().toISOString(),
        ...meta
      }
    });
  },

  /**
   * Log database operation
   */
  database: (operation, table, duration, success, meta = {}) => {
    logger.info(`Database ${operation}`, {
      metadata: {
        operation,
        table,
        duration: `${duration}ms`,
        success,
        ...meta
      }
    });
  },

  /**
   * Log validation error
   */
  validation: (field, message, meta = {}) => {
    logger.warn(`Validation Error`, {
      metadata: {
        field,
        message,
        ...meta
      }
    });
  }
};

/**
 * Express middleware for HTTP logging
 */
export const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.debug(`Incoming ${req.method} ${req.path}`, {
    metadata: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    }
  });

  // Hook into response to log when it's sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log response
    logger.info(`${req.method} ${req.path} ${res.statusCode}`, {
      metadata: {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id
      }
    });
  });

  next();
};

/**
 * Express middleware for error logging
 */
export const errorLogger = (err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`, {
    metadata: {
      error: {
        message: err.message,
        code: err.code,
        stack: err.stack
      },
      request: {
        method: req.method,
        path: req.path,
        userId: req.user?.id
      }
    }
  });

  next(err);
};

/**
 * Get logger instance
 */
export function getLogger() {
  return logger;
}

/**
 * Close logger (for graceful shutdown)
 */
export function closeLogger() {
  return new Promise((resolve) => {
    logger.end(() => {
      console.log('Logger closed');
      resolve();
    });
  });
}

export default {
  log,
  httpLogger,
  errorLogger,
  getLogger,
  closeLogger,
  logger
};
