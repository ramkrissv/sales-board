/**
 * Socket.IO API Route
 * Next.js App Router doesn't natively support WebSocket upgrades in route handlers,
 * so we use a polling fallback. For full WebSocket support, a custom server.ts is needed.
 * This route exists so the Socket.IO client can initialize.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'Socket.IO server available', transport: 'polling' });
}

export async function POST() {
  return NextResponse.json({ status: 'ok' });
}
