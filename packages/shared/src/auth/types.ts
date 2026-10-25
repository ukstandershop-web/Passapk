export type UserRole = 'owner' | 'merchant' | 'merchant_staff';
export type MerchantStatus = 'active' | 'suspended' | 'banned';

export interface StaffPermissions {
  can_view_transactions: boolean;
  can_manage_accounts: boolean;
  can_manage_bridge: boolean;
  can_view_analytics: boolean;
  can_export_reports: boolean;
  can_manage_webhooks: boolean;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  merchant_id?: string | null;
  name: string;
  email_verified: boolean;
  email_verification_token?: string | null;
  token_version: number;
  failed_login_attempts: number;
  locked_until?: string | null;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  merchantId?: string | null;
  tokenVersion: number;
  permissions?: StaffPermissions;
  isImpersonating?: boolean;
  realOwnerId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type AuthLogAction =
  | 'login_success'
  | 'login_failed'
  | 'lockout'
  | 'logout'
  | 'impersonation_start'
  | 'impersonation_end'
  | 'password_reset_request'
  | 'password_reset_complete'
  | '2fa_enabled'
  | '2fa_verified';
