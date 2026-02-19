import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/lib/server/database';
import crypto from 'crypto';

const TOKEN_SECRET = 'kstore-token-2026';

// Hash password using Node.js crypto
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + (process.env.PASSWORD_SALT || 'kstore-default-salt'))
    .digest('hex');
}

// Generate token from password hash - if password changes, token becomes invalid
function generateToken(passwordHash: string): string {
  return crypto
    .createHash('sha256')
    .update(passwordHash + TOKEN_SECRET)
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

    if (action === 'validate') {
      // Validate token - check if it matches current password
      const token = searchParams.get('token');
      if (!token) {
        return NextResponse.json({ valid: false });
      }

      const storedHash = await getSetting('password');
      if (!storedHash) {
        // No password set = no auth needed
        return NextResponse.json({ valid: true, noPassword: true });
      }

      const expectedToken = generateToken(storedHash);
      return NextResponse.json({ valid: token === expectedToken });
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
      // Setup new password (first time)
      if (!password || password.length < 4) {
        return NextResponse.json(
          { error: 'كلمة السر لازم تكون 4 حروف على الأقل' },
          { status: 400 }
        );
      }

      const existingHash = await getSetting('password');
      if (existingHash) {
        return NextResponse.json(
          { error: 'كلمة السر موجودة بالفعل' },
          { status: 400 }
        );
      }

      const passwordHash = hashPassword(password);
      await setSetting('password', passwordHash);
      const token = generateToken(passwordHash);
      return NextResponse.json({ success: true, token });
    }

    if (action === 'login') {
      // Verify password and return token
      if (!password) {
        return NextResponse.json({ error: 'ادخل كلمة السر' }, { status: 400 });
      }

      const storedHash = await getSetting('password');
      if (!storedHash) {
        return NextResponse.json({ error: 'مفيش كلمة سر متسجلة' }, { status: 400 });
      }

      const inputHash = hashPassword(password);
      if (inputHash !== storedHash) {
        return NextResponse.json({ valid: false, error: 'كلمة السر غلط' }, { status: 401 });
      }

      const token = generateToken(storedHash);
      return NextResponse.json({ valid: true, token });
    }

    if (action === 'change') {
      // Change password - requires old password
      if (!password || !oldPassword) {
        return NextResponse.json(
          { error: 'ادخل كلمة السر القديمة والجديدة' },
          { status: 400 }
        );
      }

      if (password.length < 4) {
        return NextResponse.json(
          { error: 'كلمة السر لازم تكون 4 حروف على الأقل' },
          { status: 400 }
        );
      }

      const storedHash = await getSetting('password');
      const oldHash = hashPassword(oldPassword);

      if (oldHash !== storedHash) {
        return NextResponse.json({ error: 'كلمة السر القديمة غلط' }, { status: 401 });
      }

      const newHash = hashPassword(password);
      await setSetting('password', newHash);
      const token = generateToken(newHash);
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
