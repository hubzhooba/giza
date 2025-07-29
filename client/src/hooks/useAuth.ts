import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const { user, setUser, setPrivateKey } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        console.log('useAuth: session check', session);

        if (session?.user) {
          // Session exists, set user if not already set
          if (!user) {
            console.log('useAuth: Setting user from session');
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: profile?.full_name || profile?.name || session.user.email || '',
              publicKey: profile?.public_key || '',
              createdAt: new Date(session.user.created_at),
              updatedAt: new Date(),
            });

            // Restore private key
            const storedKey = localStorage.getItem(`pk_${session.user.id}`);
            if (storedKey) {
              setPrivateKey(storedKey);
            }
          }
          setLoading(false);
        } else {
          // No session
          console.log('useAuth: No session found');
          if (requireAuth) {
            router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('useAuth error:', error);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setPrivateKey(null);
          router.push('/login');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [requireAuth, router, setUser, setPrivateKey, user]);

  return { user, loading };
}