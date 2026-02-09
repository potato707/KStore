import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/server/database';
import crypto from 'crypto';

// Hash password using Node.js crypto
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + process.env.PASSWORD_SALT || 'kstore-default-salt')
    .digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'check') {
      // Check if password exists
      const passwordHash = await getSetting('password');
      return NextResponse.json({ hasPassword: !!passwordHash });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, password, oldPassword } = body;
    
    if (action === 'setup') {
      // Setup new password
      if (!password || password.length < 4) {
        return NextResponse.json(
          { error: 'Password must be at least 4 characters' },
          { status: 400 }
        );
      }
      
      const passwordHash = hashPassword(password);
      await setSetting('password', passwordHash);
      return NextResponse.json({ success: true });
    }
    
    if (action === 'verify') {
      // Verify password
      if (!password) {
        return NextResponse.json({ error: 'Missing password' }, { status: 400 });
      }
      
      const storedHash = await getSetting('password');
      if (!storedHash) {
        return NextResponse.json({ error: 'No password set' }, { status: 400 });
      }
      
      const inputHash = hashPassword(password);
      const isValid = inputHash === storedHash;
      
      return NextResponse.json({ valid: isValid });
    }
    
    if (action === 'change') {
      // Change password
      if (!password || !oldPassword) {
        return NextResponse.json(
          { error: 'Missing old or new password' },
          { status: 400 }
        );
      }
      
      const storedHash = await getSetting('password');
      const oldHash = hashPassword(oldPassword);
      
      if (oldHash !== storedHash) {
        return NextResponse.json({ error: 'Invalid old password' }, { status: 401 });
      }
      
      const newHash = hashPassword(password);
      await setSetting('password', newHash);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
