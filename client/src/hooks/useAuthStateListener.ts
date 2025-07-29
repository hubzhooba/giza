import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { DatabaseService } from '@/lib/database';

export function useAuthStateListener() {
  const router = useRouter();
  const { setUser, setPrivateKey, user } = useStore();

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Load user profile
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Set user even if profile doesn't exist yet
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.full_name || profile?.email || session.user.email || '',
            publicKey: profile?.public_key || '',
            createdAt: new Date(session.user.created_at),
            updatedAt: new Date(),
          });

          // Check if we have a private key in localStorage
          const storedPrivateKey = localStorage.getItem(`pk_${session.user.id}`);
          if (storedPrivateKey) {
            setPrivateKey(storedPrivateKey);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Load user profile when signed in
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Set user even if profile doesn't exist yet
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.full_name || profile?.email || session.user.email || '',
            publicKey: profile?.public_key || '',
            createdAt: new Date(session.user.created_at),
            updatedAt: new Date(),
          });

          // Check for private key
          const storedPrivateKey = localStorage.getItem(`pk_${session.user.id}`);
          if (storedPrivateKey) {
            setPrivateKey(storedPrivateKey);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user data
          setUser(null);
          setPrivateKey(null);
          
          // Only redirect to login if we're on a protected page
          const publicPaths = ['/', '/login', '/signup'];
          if (!publicPaths.includes(router.pathname)) {
            router.push('/login');
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setPrivateKey, router]);
}