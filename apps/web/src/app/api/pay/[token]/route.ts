import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const workerUrl = process.env.WORKER_BASE_URL || 'http://localhost:8787';

  try {
    const response = await fetch(`${workerUrl}/v1/checkout/${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch payment details', details: err.message }, { status: 500 });
  }
}
