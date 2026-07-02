import { supabase } from './supabase';
import { User } from '../types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Build the app User straight from the auth session (no profiles table in the
// per-login model). Each account is its own owner and sees only its own data.
export function userFromSession(u: { id: string; email?: string | null; user_metadata?: any }): User {
  return {
    id: u.id,
    email: u.email || '',
    full_name: u.user_metadata?.full_name || u.email || 'User',
    role: 'dispatcher',
    color: '#3b82f6',
  };
}
