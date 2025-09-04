/**
 * LANStreamer Error Handling System
 * 
 * Provides a consistent error hierarchy and handling patterns across the application.
 * This replaces the mixed error handling approaches with a standardized system.
 */

/**
 * Base error class for all LANStreamer errors
 */
export class LANStreamerError extends Error {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }

  /**
   * Check if this is an operational error (expected) vs programming error
   */
  get isOperational() {
    return true;
  }
}

/**
 * Service-level errors (business logic failures)
 */
export class ServiceError extends LANStreamerError {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends LANStreamerError {
  constructor(message, code = 'CONFIG_ERROR', statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * Process management errors (external processes like Icecast, FFmpeg)
 */
export class ProcessError extends LANStreamerError {
  constructor(message, code = 'PROCESS_ERROR', statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * Validation errors (user input, configuration validation)
 */
export class ValidationError extends LANStreamerError {
  constructor(message, code = 'VALIDATION_ERROR', statusCode = 400, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * Network/connectivity errors
 */
export class NetworkError extends LANStreamerError {
  constructor(message, code = 'NETWORK_ERROR', statusCode = 503, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * File system errors
 */
export class FileSystemError extends LANStreamerError {
  constructor(message, code = 'FILESYSTEM_ERROR', statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * Icecast-specific errors
 */
export class IcecastError extends ServiceError {
  constructor(message, code = 'ICECAST_ERROR', statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * FFmpeg-specific errors
 */
export class FFmpegError extends ServiceError {
  constructor(message, code = 'FFMPEG_ERROR', statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * Audio device errors
 */
export class AudioDeviceError extends ServiceError {
  constructor(message, code = 'AUDIO_DEVICE_ERROR', statusCode = 500, details = {}) {
    super(message, code, statusCode, details);
  }
}

/**
 * Error codes for consistent error identification
 */
export const ErrorCodes = {
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  
  // Configuration
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING_REQUIRED: 'CONFIG_MISSING_REQUIRED',
  
  // Icecast
  ICECAST_NOT_INSTALLED: 'ICECAST_NOT_INSTALLED',
  ICECAST_NOT_RUNNING: 'ICECAST_NOT_RUNNING',
  ICECAST_ALREADY_RUNNING: 'ICECAST_ALREADY_RUNNING',
  ICECAST_START_FAILED: 'ICECAST_START_FAILED',
  ICECAST_STOP_FAILED: 'ICECAST_STOP_FAILED',
  ICECAST_CONFIG_INVALID: 'ICECAST_CONFIG_INVALID',
  ICECAST_PATH_NOT_FOUND: 'ICECAST_PATH_NOT_FOUND',
  
  // Process Management
  PROCESS_SPAWN_FAILED: 'PROCESS_SPAWN_FAILED',
  PROCESS_NOT_FOUND: 'PROCESS_NOT_FOUND',
  PROCESS_KILL_FAILED: 'PROCESS_KILL_FAILED',
  PROCESS_TIMEOUT: 'PROCESS_TIMEOUT',
  
  // File System
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
  
  // Network
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Validation
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Audio
  AUDIO_DEVICE_NOT_FOUND: 'AUDIO_DEVICE_NOT_FOUND',
  AUDIO_DEVICE_BUSY: 'AUDIO_DEVICE_BUSY',
  AUDIO_FORMAT_UNSUPPORTED: 'AUDIO_FORMAT_UNSUPPORTED'
};

/**
 * Error factory for creating consistent errors
 */
export class ErrorFactory {
  /**
   * Create an Icecast-related error
   */
  static icecast(message, code, details = {}) {
    return new IcecastError(message, code, 500, details);
  }

  /**
   * Create a configuration error
   */
  static configuration(message, code = ErrorCodes.CONFIG_INVALID, details = {}) {
    return new ConfigurationError(message, code, 500, details);
  }

  /**
   * Create a process error
   */
  static process(message, code = ErrorCodes.PROCESS_SPAWN_FAILED, details = {}) {
    return new ProcessError(message, code, 500, details);
  }

  /**
   * Create a validation error
   */
  static validation(message, code = ErrorCodes.INVALID_INPUT, details = {}) {
    return new ValidationError(message, code, 400, details);
  }

  /**
   * Create a file system error
   */
  static fileSystem(message, code = ErrorCodes.FILE_NOT_FOUND, details = {}) {
    return new FileSystemError(message, code, 500, details);
  }

  /**
   * Create a network error
   */
  static network(message, code = ErrorCodes.CONNECTION_FAILED, details = {}) {
    return new NetworkError(message, code, 503, details);
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Wrap async functions to provide consistent error handling
   */
  static async handle(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      // If it's already a LANStreamerError, just re-throw
      if (error instanceof LANStreamerError) {
        throw error;
      }

      // Convert unknown errors to LANStreamerError
      throw new LANStreamerError(
        `Operation failed: ${error.message}`,
        ErrorCodes.INTERNAL_ERROR,
        500,
        { originalError: error.message, context }
      );
    }
  }

  /**
   * Create error response for Express routes
   */
  static createResponse(error) {
    if (error instanceof LANStreamerError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp: error.timestamp
      };
    }

    // Handle unknown errors
    return {
      success: false,
      error: 'Internal server error',
      code: ErrorCodes.INTERNAL_ERROR,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log error with appropriate level
   */
  static log(error, logger, context = {}) {
    const logData = {
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack,
      context
    };

    if (error instanceof LANStreamerError) {
      if (error.statusCode >= 500) {
        logger.error('Service error occurred:', logData);
      } else {
        logger.warn('Client error occurred:', logData);
      }
    } else {
      logger.error('Unexpected error occurred:', logData);
    }
  }
}

/**
 * Express middleware for handling errors consistently
 */
export function errorMiddleware(error, req, res, next) {
  // Log the error
  ErrorHandler.log(error, req.logger || console, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent')
  });

  // Create response
  const response = ErrorHandler.createResponse(error);
  const statusCode = error instanceof LANStreamerError ? error.statusCode : 500;

  res.status(statusCode).json(response);
}
