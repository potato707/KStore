// Auth using Server API (centralized)

const API_BASE = '/api';

// ==================== AUTHENTICATION ====================

export async function hasPassword(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth?action=check`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.hasPassword;
  } catch (error) {
    console.error('Error checking password:', error);
    return false;
  }
}

export async function setPassword(password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup', password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to set password');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting password:', error);
    return false;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', password }),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.valid;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change', oldPassword, password: newPassword }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }
    
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    return false;
  }
}
