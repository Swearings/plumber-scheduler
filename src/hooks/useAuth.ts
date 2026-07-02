import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { userFromSession } from '../lib/auth';
import { User } from '../types';
import { DEMO_MODE, demoUser } from '../lib/mockData';

export function useAuth() {
  const [user, setUser] = useState<User | null>(DEMO_MODE ? demoUser : null);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? userFromSession(session.user) : null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? userFromSession(session.user) : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
