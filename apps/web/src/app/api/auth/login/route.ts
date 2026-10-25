import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  verifyPassword,
  createAuthTokens,
  decryptAesGcm,
  verifyTotpCode,
  verifyBackupCode,
  User,
  StaffPermissions,
} from '@paisabridge/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'paisabridge_encryption_secret_32b';

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { email, password, totp_code, backup_code } = body;

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch user by email
    const user = await db.selectOne<User>('users', {
      filters: { email: cleanEmail },
    });

    if (!user) {
      // Record failed login audit log
      await db.insert('auth_logs', {
        email: cleanEmail,
        action: 'login_failed',
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { reason: 'user_not_found' },
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 2. Check brute force lockout
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until).getTime();
      const now = Date.now();
      if (now < lockExpiry) {
        const remainingMinutes = Math.ceil((lockExpiry - now) / 60000);
        return NextResponse.json({
            error: `Account is temporarily locked due to consecutive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
            locked: true,
          },
          { status: 429 }
        );
      }
    }

    // 3. Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      const newFailedCount = (user.failed_login_attempts || 0) + 1;
      const isLockoutTriggered = newFailedCount >= 5;
      const lockedUntilIso = isLockoutTriggered
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;

      await db.update(
        'users',
        { id: user.id },
        {
          failed_login_attempts: newFailedCount,
          locked_until: lockedUntilIso,
        }
      );

      await db.insert('auth_logs', {
        user_id: user.id,
        email: cleanEmail,
        action: isLockoutTriggered ? 'lockout' : 'login_failed',
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { attempt_number: newFailedCount },
      });

      if (isLockoutTriggered) {
        return NextResponse.json(
          {
            error: 'Account locked for 15 minutes due to 5 consecutive failed login attempts.',
            locked: true,
          },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // 4. Check merchant account suspension/ban
    if (user.merchant_id) {
      const merchant = await db.selectOne<any>('merchants', {
        columns: ['status', 'is_active', 'business_name'],
        filters: { id: user.merchant_id },
      });

      if (merchant) {
        if (merchant.status === 'banned') {
          return NextResponse.json({ error: 'This merchant account has been permanently suspended by platform administration.' },
            { status: 403 }
          );
        }
        if (merchant.status === 'suspended' || !merchant.is_active) {
          return NextResponse.json(
            { error: 'This merchant account is temporarily suspended. Please contact support.' },
            { status: 403 }
          );
        }
      }
    }

    // 5. Check 2FA if enabled
    if (user.two_factor_enabled) {
      if (!totp_code && !backup_code) {
        return NextResponse.json({
          requires2fa: true,
          message: 'Please enter the 6-digit authenticator code or an 8-character backup code.',
        });
      }

      const totpRecord = await db.selectOne<any>('totp_secrets', {
        filters: { user_id: user.id },
      });

      if (!totpRecord) {
        return NextResponse.json({ error: '2FA configuration missing' }, { status: 500 });
      }

      let is2faVerified = false;

      if (totp_code) {
        const decryptedSecret = await decryptAesGcm(totpRecord.secret_encrypted, ENCRYPTION_SECRET);
        is2faVerified = await verifyTotpCode(decryptedSecret, totp_code);
      } else if (backup_code) {
        const result = await verifyBackupCode(backup_code, totpRecord.backup_codes || []);
        if (result.isValid) {
          is2faVerified = true;
          // Consume backup code
          await db.update(
            'totp_secrets',
            { user_id: user.id },
            { backup_codes: result.remainingHashedCodes }
          );
        }
      }

      if (!is2faVerified) {
        await db.insert('auth_logs', {
          user_id: user.id,
          email: cleanEmail,
          action: 'login_failed',
          ip_address: clientIp,
          user_agent: userAgent,
          metadata: { reason: 'invalid_2fa_code' },
        });
        return NextResponse.json({ error: 'Invalid 2FA authentication code or backup code' }, { status: 401 });
      }

      await db.insert('auth_logs', {
        user_id: user.id,
        email: cleanEmail,
        action: '2fa_verified',
        ip_address: clientIp,
        user_agent: userAgent,
      });
    }

    // 6. Reset failed attempts upon successful login
    await db.update(
      'users',
      { id: user.id },
      {
        failed_login_attempts: 0,
        locked_until: null,
      }
    );

    // Fetch staff permissions if applicable
    let permissions: StaffPermissions | undefined;
    if (user.role === 'merchant_staff') {
      const p = await db.selectOne<StaffPermissions>('staff_permissions', {
        filters: { user_id: user.id },
      });
      if (p) permissions = p;
    }

    // 7. Issue Auth Tokens and set httpOnly cookies
    const session = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      merchantId: user.merchant_id,
      tokenVersion: user.token_version,
      permissions,
    };

    const tokens = await createAuthTokens(session, JWT_SECRET);

    // 8. Log success audit
    await db.insert('auth_logs', {
      user_id: user.id,
      email: cleanEmail,
      action: 'login_success',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        merchant_id: user.merchant_id,
      },
    });

    response.cookies.set('pb_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 mins
    });

    response.cookies.set('pb_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
