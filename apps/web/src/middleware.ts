import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@paisabridge/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'paisabridge_dev_jwt_secret_32_bytes_long';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get('pb_access_token')?.value;
  const refreshToken = request.cookies.get('pb_refresh_token')?.value;

  let session: any = null;

  if (accessToken) {
    session = await verifyJwt(accessToken, JWT_SECRET);
  } else if (refreshToken) {
    session = await verifyJwt(refreshToken, JWT_SECRET);
  }

  // Protect Owner panel
  if (pathname.startsWith('/owner')) {
    if (!session || (session.role !== 'owner' && !session.isImpersonating)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect Merchant panel
  if (pathname.startsWith('/merchant')) {
    if (!session || (!['merchant', 'merchant_staff', 'owner'].includes(session.role))) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/owner/:path*', '/merchant/:path*'],
};
