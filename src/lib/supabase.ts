import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// In demo mode (or before keys are configured) we don't have a real backend.
// Use a harmless placeholder so importing this file never throws — the demo
// data layer never actually calls these methods.
const isConfigured = SUPABASE_URL.startsWith('http');

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
