import * as jwt from "jsonwebtoken";
import { Secret, SignOptions } from "jsonwebtoken";
import { StringValue } from "ms"; // 👈 important
import { config } from "./env";

/**
 * Parse expiration value to handle both string and number formats
 */
const parseExpiration = (value: string): number | StringValue => {
  const numValue = Number(value);
  return isNaN(numValue) ? (value as StringValue) : numValue;
};

/**
 * Generate a JWT token
 */
export const generateToken = (payload: object): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: parseExpiration(config.jwtExpiresIn),
  };
  return jwt.sign(payload, config.jwtSecret as Secret, options);
};

/**
 * Generate a refresh token
 */
export const generateRefreshToken = (payload: object): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: parseExpiration(config.jwtRefreshExpiresIn),
  };
  return jwt.sign(payload, config.jwtRefreshSecret as Secret, options);
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwtSecret as Secret, {
      algorithms: ['HS256'],
      clockTolerance: 60, // Allow 60 seconds clock skew
    });
  } catch {
    return null;
  }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret as Secret, {
      algorithms: ['HS256'],
      clockTolerance: 60, // Allow 60 seconds clock skew
    });
  } catch {
    return null;
  }
};