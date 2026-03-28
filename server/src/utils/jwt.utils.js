import jwt from "jsonwebtoken";
import config from "../config/index.js";

/**
 * Generate JWT token
 * @param {Object} payload - Token payload (usually user id)
 * @returns {string} JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Generate token and set cookie options
 * @param {Object} user - User document
 * @returns {Object} { token, cookieOptions }
 */
export const createTokenResponse = (user) => {
  const token = generateToken({ id: user._id });

  const cookieOptions = {
    expires: new Date(
      Date.now() + config.jwt.cookieExpiresIn * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "strict" : "lax",
  };

  return { token, cookieOptions };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

export default {
  generateToken,
  createTokenResponse,
  verifyToken,
};
