import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const workerUrl = process.env.WORKER_BASE_URL || 'http://localhost:8787';

  try {
    const body = await req.json();
    const response = await fetch(`${workerUrl}/v1/checkout/${token}/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to submit manual payment', details: err.message }, { status: 500 });
  }
}
