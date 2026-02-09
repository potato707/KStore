import { supabase } from './client';

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

export async function getAppSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error || !data) {
    return { passwordHash: null, id: null };
  }

  return data;
}

export async function hasPassword(): Promise<boolean> {
  const settings = await getAppSettings();
  return !!settings.passwordHash;
}

export async function setPassword(password: string): Promise<boolean> {
  const passwordHash = hashPassword(password);

  // First check if settings exist
  const existing = await getAppSettings();

  if (existing.id) {
    // Update existing
    const { error } = await supabase
      .from('settings')
      .update({ password_hash: passwordHash })
      .eq('id', existing.id);

    return !error;
  } else {
    // Create new
    const { error } = await supabase
      .from('settings')
      .insert({ id: 'default', password_hash: passwordHash });

    return !error;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const settings = await getAppSettings();

  if (!settings.passwordHash) {
    return false;
  }

  const inputHash = hashPassword(password);
  return inputHash === settings.passwordHash;
}
