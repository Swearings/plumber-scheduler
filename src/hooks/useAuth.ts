import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/auth';
import { User } from '../types';
import { DEMO_MODE, demoUser } from '../lib/mockData';

export function useAuth() {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? demoUser : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
