export type UserRole = 'ADMIN' | 'TRAINER' | 'TRAINEE';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: UserRole;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface AccessTokenPayload {
  sub: string;
  organizationId: string;
  role: UserRole;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenFamilyId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

export interface UserRecord {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string | null;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  token_family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
