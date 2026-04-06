import config from "../config/index.js";
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('error-handler')

/**
 * 404 Not Found Handler
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Global Error Handler
 */
export const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = null;

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${
      field.charAt(0).toUpperCase() + field.slice(1)
    } already exists`;
    errors = [{ field, message }];
  }

  // Mongoose Cast Error (Invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Express Validator Errors
  if (err.array && typeof err.array === "function") {
    statusCode = 400;
    message = "Validation Error";
    errors = err.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));
  }

  if (config.nodeEnv === "development") {
    log.error({
      message: err.message,
      statusCode,
      stack: err.stack,
    }, 'Request error');
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: config.nodeEnv === "development" ? err.stack : undefined,
  });
};

/**
 * Async Handler Wrapper
 * Eliminates need for try-catch in async route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom API Error Class
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default {
  notFound,
  errorHandler,
  asyncHandler,
  ApiError,
};
