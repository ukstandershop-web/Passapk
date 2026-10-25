import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import {
  generateTotpSecret,
  generateOtpAuthUri,
  generateBackupCodes,
  verifyTotp,
  encryptSecret,
  sha256Hex,
  verifyPassword,
} from '@paisabridge/shared';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = generateTotpSecret(20);
    const otpAuthUri = generateOtpAuthUri({
      secret,
      accountName: session.email,
      issuer: 'PaisaBridge PK',
    });
    const { rawCodes: backupCodes } = await generateBackupCodes(10);

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(
      otpAuthUri
    )}`;

    return NextResponse.json({
      success: true,
      secret,
      otpAuthUri,
      qrImageUrl,
      backupCodes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to initialize 2FA setup' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { secret, token, backupCodes } = body;

    if (!secret || !token) {
      return NextResponse.json({ error: 'Secret and verification code are required' }, { status: 400 });
    }

    // Verify the TOTP token using RFC 6238 standard
    const isValid = await verifyTotp({ token, secret });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid 6-digit code. Check your authenticator app.' }, { status: 400 });
    }

    const encryptionKey = process.env.ENCRYPTION_SECRET || 'paisabridge_32_byte_secret_key_pk!';
    const encryptedSecret = await encryptSecret(secret, encryptionKey);

    // Hash backup codes
    const hashedCodes = await Promise.all(
      (backupCodes || []).map((code: string) => sha256Hex(code.trim().toUpperCase()))
    );

    const db = getDb();

    // Check existing totp record
    const existing = await db.selectOne<any>('totp_secrets', { user_id: session.userId });
    if (existing) {
      await db.update(
        'totp_secrets',
        { user_id: session.userId },
        {
          secret_encrypted: encryptedSecret,
          backup_codes: hashedCodes,
          verified_at: new Date().toISOString(),
        }
      );
    } else {
      await db.insert('totp_secrets', {
        user_id: session.userId,
        secret_encrypted: encryptedSecret,
        backup_codes: hashedCodes,
        verified_at: new Date().toISOString(),
      });
    }

    // Enable totp on users table
    await db.update('users', { id: session.userId }, { totp_enabled: true });

    return NextResponse.json({ success: true, message: '2FA enabled successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to verify and activate 2FA' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password confirmation is required' }, { status: 400 });
    }

    const db = getDb();
    const user = await db.selectOne<any>('users', { id: session.userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 400 });
    }

    await db.delete('totp_secrets', { user_id: session.userId });
    await db.update('users', { id: session.userId }, { totp_enabled: false });

    return NextResponse.json({ success: true, message: '2FA disabled successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disable 2FA' }, { status: 500 });
  }
}
