import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/server/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }
    
    const value = await getSetting(key);
    return NextResponse.json({ value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || !value) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }
    
    await setSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
