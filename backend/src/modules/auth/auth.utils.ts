import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config/env';
import { AccessTokenPayload, RefreshTokenPayload, UserRole } from './auth.types';

// Password Hashing Helpers
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Token Hashing Helper (SHA-256 for secure DB storage)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// JWT Token Generation Helpers
export function generateAccessToken(user: { id: string; organizationId: string; role: UserRole }): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    organizationId: user.organizationId,
    role: user.role,
    type: 'access',
  };

  return jwt.sign(payload, config.auth.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: config.auth.jwtAccessExpiresIn,
  });
}

export function generateRefreshToken(userId: string, tokenFamilyId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    tokenFamilyId,
    type: 'refresh',
  };

  return jwt.sign(payload, config.auth.jwtRefreshSecret, {
    algorithm: 'HS256',
    expiresIn: config.auth.jwtRefreshExpiresIn,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.auth.jwtAccessSecret, {
    algorithms: ['HS256'],
  }) as AccessTokenPayload;

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type: expected access token');
  }

  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, config.auth.jwtRefreshSecret, {
    algorithms: ['HS256'],
  }) as RefreshTokenPayload;

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }

  return decoded;
}
