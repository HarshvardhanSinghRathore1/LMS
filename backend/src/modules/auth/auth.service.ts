import { v4 as uuidv4 } from 'uuid';
import { authRepository } from './auth.repository';
import { RegisterInput, LoginInput } from './auth.schemas';
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from './auth.utils';
import { ApiError } from '../../utils/apiError';
import { UserRecord, UserRole } from './auth.types';

// Dummy bcrypt hash for timing-safe login comparison
const DUMMY_HASH = '$2a$12$e8YQ3/Wj/rW/PjE5J8.b6O8bWk0J4h5j0z5bWk0J4h5j0z5bWk0J4';

export class AuthService {
  private formatSafeUser(user: UserRecord) {
    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };
  }

  async register(input: RegisterInput) {
    // 1. Resolve Organization by Code
    const org = await authRepository.findOrganizationByCode(input.organizationCode);
    if (!org) {
      throw ApiError.notFound(`Organization with code '${input.organizationCode}' not found`, 'ORGANIZATION_NOT_FOUND');
    }

    // 2. Check for duplicate email
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw ApiError.badRequest('An account with this email address already exists', 'EMAIL_ALREADY_EXISTS');
    }

    // 3. Hash password
    const passwordHash = await hashPassword(input.password);

    // 4. Split name into first and last name
    const nameParts = input.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // 5. Create user record (Public registration is strictly TRAINEE role)
    const user = await authRepository.createUser({
      organizationId: org.id,
      firstName,
      lastName,
      email: input.email,
      passwordHash,
      role: 'TRAINEE',
    });

    // 6. Generate authentication tokens
    const tokenFamilyId = uuidv4();
    const accessToken = generateAccessToken({
      id: user.id,
      organizationId: user.organization_id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken(user.id, tokenFamilyId);

    // 7. Save SHA-256 hashed refresh token in database
    const hashedRefresh = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await authRepository.saveRefreshToken({
      userId: user.id,
      tokenHash: hashedRefresh,
      tokenFamilyId,
      expiresAt,
    });

    return {
      user: this.formatSafeUser(user),
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  async login(input: LoginInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await authRepository.findUserByEmail(normalizedEmail);

    // Timing-safe check if user missing or password missing
    if (!user || !user.password_hash || !user.is_active) {
      await comparePassword(input.password, DUMMY_HASH);
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await comparePassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const tokenFamilyId = uuidv4();
    const accessToken = generateAccessToken({
      id: user.id,
      organizationId: user.organization_id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken(user.id, tokenFamilyId);

    // Save refresh token hash
    const hashedRefresh = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken({
      userId: user.id,
      tokenHash: hashedRefresh,
      tokenFamilyId,
      expiresAt,
    });

    // Update last login timestamp
    await authRepository.updateLastLogin(user.id);

    return {
      user: this.formatSafeUser(user),
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw ApiError.unauthorized('Refresh token missing', 'REFRESH_TOKEN_INVALID');
    }

    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
    }

    const hashedInput = hashToken(rawRefreshToken);
    const tokenRecord = await authRepository.findRefreshTokenByHash(hashedInput);

    if (!tokenRecord) {
      throw ApiError.unauthorized('Refresh token session not found', 'REFRESH_TOKEN_INVALID');
    }

    // REUSE DETECTION: If token has already been revoked, invalidate entire token family!
    if (tokenRecord.revoked_at) {
      console.warn(`🚨 SECURITY ALERT: Refresh token reuse detected for family ${tokenRecord.token_family_id}! Revoking all sessions.`);
      await authRepository.revokeTokenFamily(tokenRecord.token_family_id);
      throw ApiError.unauthorized('Refresh token reuse detected. Session invalidated.', 'REFRESH_TOKEN_REUSE_DETECTED');
    }

    if (new Date() > tokenRecord.expires_at) {
      throw ApiError.unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
    }

    const user = await authRepository.findUserById(tokenRecord.user_id);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized('User account disabled or not found', 'ACCOUNT_DISABLED');
    }

    // TOKEN ROTATION: Revoke old refresh token & issue new tokens in same token family
    await authRepository.revokeRefreshToken(tokenRecord.id);

    const newAccessToken = generateAccessToken({
      id: user.id,
      organizationId: user.organization_id,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken(user.id, tokenRecord.token_family_id);

    const newHashedRefresh = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepository.saveRefreshToken({
      userId: user.id,
      tokenHash: newHashedRefresh,
      tokenFamilyId: tokenRecord.token_family_id,
      expiresAt: newExpiresAt,
    });

    return {
      user: this.formatSafeUser(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    };
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      try {
        const hashed = hashToken(rawRefreshToken);
        const record = await authRepository.findRefreshTokenByHash(hashed);
        if (record && !record.revoked_at) {
          await authRepository.revokeRefreshToken(record.id);
        }
      } catch (err) {
        // Ignore error during logout token cleanup
      }
    }
  }

  async getMe(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.is_active) {
      throw ApiError.unauthorized('User account disabled or not found', 'ACCOUNT_DISABLED');
    }
    return this.formatSafeUser(user);
  }
}

export const authService = new AuthService();
