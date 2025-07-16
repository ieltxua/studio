import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { User, Role } from '@/models';
import { logger } from '@/config/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: Role;
  permissions?: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  try {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'studio-api',
      audience: 'studio-client',
    });
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: Pick<JWTPayload, 'userId'>): string => {
  try {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'studio-api',
      audience: 'studio-refresh',
    });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (payload: JWTPayload): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: payload.userId });
  
  // Calculate expiration time in seconds
  const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
  const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
  
  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string, audience = 'studio-client'): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'studio-api',
      audience,
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      logger.error('Error verifying token:', error);
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): Pick<JWTPayload, 'userId'> => {
  return verifyToken(token, 'studio-refresh') as Pick<JWTPayload, 'userId'>;
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Create JWT payload from user data
 */
export const createJWTPayload = (
  user: User,
  organizationId?: string,
  role?: Role,
  permissions?: string[]
): JWTPayload => {
  return {
    userId: user.id,
    email: user.email,
    organizationId,
    role,
    permissions: permissions || [],
  };
};