import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useRouter } from 'next/router';

export function useSessionPersistence() {
  const router = useRouter();
  const { user, setUser, setPrivateKey } = useStore();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const checkAndRestoreSession = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && !user) {
          console.log('useSessionPersistence: Restoring session for', session.user.email);
          
          // Try to load profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Set user state
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
      } catch (error) {
        console.error('useSessionPersistence: Error restoring session:', error);
      }
    };

    checkAndRestoreSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
          console.log('useSessionPersistence: Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user, setUser, setPrivateKey]);
}