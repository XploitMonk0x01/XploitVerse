import jwt from "jsonwebtoken";
import config from "../config/index.js";
import User, { USER_ROLES } from "../models/User.js";

/**
 * Verify JWT Token Middleware
 * Extracts token from Authorization header or cookies
 * Attaches user to request object
 */
export const verifyToken = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header first (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Fallback to cookie
    else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // No token found
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Check if user still exists
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account has been deactivated.",
      });
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: "Password recently changed. Please log in again.",
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please log in again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
      error: config.nodeEnv === "development" ? error.message : undefined,
    });
  }
};

/**
 * Check Role Middleware Factory
 * Creates middleware that checks if user has one of the allowed roles
 *
 * Usage: checkRole('ADMIN') or checkRole('ADMIN', 'INSTRUCTOR')
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(
          " or "
        )}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Convenience middleware for specific role checks
 */
export const isAdmin = checkRole(USER_ROLES.ADMIN);
export const isInstructor = checkRole(USER_ROLES.ADMIN, USER_ROLES.INSTRUCTOR);
export const isStudent = checkRole(
  USER_ROLES.ADMIN,
  USER_ROLES.INSTRUCTOR,
  USER_ROLES.STUDENT
);

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id);

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }

    next();
  } catch (error) {
    // Silent fail - just continue without user
    next();
  }
};

export default {
  verifyToken,
  checkRole,
  isAdmin,
  isInstructor,
  isStudent,
  optionalAuth,
};
