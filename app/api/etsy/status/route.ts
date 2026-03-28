import { NextResponse } from 'next/server';
import { isConnected } from '@/lib/etsy/client';

export async function GET() {
  return NextResponse.json({ connected: isConnected() });
}
