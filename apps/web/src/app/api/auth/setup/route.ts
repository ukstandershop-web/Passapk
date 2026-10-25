import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createAuthTokens, User } from '@paisabridge/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';

export async function POST(request: Request) {
  try {
    const db = getDb();

    // 1. Check if an owner account already exists
    const existingOwner = await db.selectOne<User>('users', {
      columns: ['id'],
      filters: { role: 'owner' },
    });

    if (existingOwner) {
      return NextResponse.json({ error: 'Setup is permanently disabled because an owner account already exists.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    // 2. Create the first platform owner
    const newOwner = await db.insert<User>('users', {
      name,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: 'owner',
      email_verified: true,
      token_version: 1,
      failed_login_attempts: 0,
    });

    const ownerId = (newOwner as any)?.id;

    // 3. Log initial audit event
    await db.insert('auth_logs', {
      user_id: ownerId,
      email,
      action: 'setup_owner_created',
      ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    // 4. Issue auth tokens and set httpOnly cookies
    const session = {
      userId: ownerId,
      email,
      name,
      role: 'owner' as const,
      tokenVersion: 1,
    };

    const tokens = await createAuthTokens(session, JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: 'Initial platform owner configured successfully.',
      user: { name, email, role: 'owner' },
    });

    // Set secure httpOnly cookies
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
    return NextResponse.json({ error: err.message || 'Setup initialization failed' }, { status: 500 });
  }
}
