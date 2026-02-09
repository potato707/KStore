// Auth using IndexedDB
import { getSetting, setSetting } from './database';

// Simple hash function for password (browser-compatible)
function hashPassword(password: string): string {
  // Simple hash for demo purposes
  // In production, use bcrypt or argon2 on server side
  let hash = 0;
  const str = password + 'kstore-salt';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// ==================== SETTINGS ====================

export async function hasPassword(): Promise<boolean> {
  const settings = await getSetting('password');
  return !!settings;
}

export async function setPassword(password: string): Promise<boolean> {
  const passwordHash = hashPassword(password);
  try {
    await setSetting('password', passwordHash);
    return true;
  } catch (error) {
    return false;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const storedHash = await getSetting('password');
  if (!storedHash) return false;

  const inputHash = hashPassword(password);
  return inputHash === storedHash;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const isValid = await verifyPassword(oldPassword);
  if (!isValid) return false;

  return await setPassword(newPassword);
}
