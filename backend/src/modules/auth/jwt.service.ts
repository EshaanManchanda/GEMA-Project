import * as jwt from "jsonwebtoken";
import { Secret, SignOptions } from "jsonwebtoken";
import { StringValue } from "ms";
import { config } from "../../config/env";

const parseExpiration = (value: string): number | StringValue => {
  const numValue = Number(value);
  return isNaN(numValue) ? (value as StringValue) : numValue;
};

export const generateToken = (payload: object): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: parseExpiration(config.jwtExpiresIn),
  };
  return jwt.sign(payload, config.jwtSecret as Secret, options);
};

export const generateRefreshToken = (payload: object): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: parseExpiration(config.jwtRefreshExpiresIn),
  };
  return jwt.sign(payload, config.jwtRefreshSecret as Secret, options);
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwtSecret as Secret, {
      algorithms: ['HS256'],
      clockTolerance: 60,
    });
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret as Secret, {
      algorithms: ['HS256'],
      clockTolerance: 60,
    });
  } catch {
    return null;
  }
};
