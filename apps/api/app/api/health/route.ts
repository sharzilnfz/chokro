import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    db: 'connected',
    timestamp: new Date().toISOString(),
  });
}
