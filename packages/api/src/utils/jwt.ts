import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { JWTPayload } from '../types';

export const generateToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret as Secret, options);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    throw new Error(`Invalid or expired token: ${token}, real: ${config.jwt.secret}`);
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};