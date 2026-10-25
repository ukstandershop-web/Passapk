import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const start = Date.now();
    const db = getDb();
    
    // Ping check by counting merchants
    const merchants = await db.select<any>('merchants', { columns: ['id'] });
    const latency = Date.now() - start;

    return NextResponse.json({
      success: true,
      health: {
        status: 'healthy',
        database_ping_ms: latency,
        total_merchants: merchants.length,
        worker_status: 'online',
        proxy_endpoint: process.env.SUPABASE_URL || 'PostgREST Proxy Active',
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      health: {
        status: 'degraded',
        error: err.message,
      }
    }, { status: 500 });
  }
}
