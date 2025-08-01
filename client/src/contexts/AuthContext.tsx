import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { User } from '@/types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  session: null,
  signOut: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser, setPrivateKey, clearStore } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check initial session
    const initAuth = async () => {
      try {
        console.log('AuthProvider: Checking session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthProvider: Session error:', sessionError);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('AuthProvider: Session found:', session.user.email);
          
          // Load profile with better error handling
          let profile = null;
          // Try to fetch profile once with a timeout
          try {
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
            );
            
            const { data, error } = await Promise.race([
              profilePromise,
              timeoutPromise
            ]) as any;
            
            if (!error && data) {
              profile = data;
            }
          } catch (err) {
            console.warn('Profile fetch failed, using session data:', err);
          }

          // Set user state even if profile fetch failed
          const userState = {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.full_name || profile?.name || session.user.email || '',
            publicKey: profile?.public_key || '',
            createdAt: new Date(session.user.created_at),
            updatedAt: new Date(),
          };
          
          console.log('AuthProvider: Setting user state:', userState);
          setUser(userState);

          // Restore private key
          const storedKey = localStorage.getItem(`pk_${session.user.id}`);
          if (storedKey) {
            console.log('AuthProvider: Restored private key');
            setPrivateKey(storedKey);
          }

          setIsAuthenticated(true);
          setSession(session);
          
          // Load rooms and documents after setting user
          const loadUserData = async () => {
            try {
              const { loadRooms, loadDocuments } = useStore.getState();
              console.log('AuthProvider: Loading user data...');
              if (loadRooms) await loadRooms();
              if (loadDocuments) await loadDocuments();
              console.log('AuthProvider: User data loaded');
            } catch (err) {
              console.error('AuthProvider: Error loading user data:', err);
            }
          };
          
          // Use Promise to ensure it runs after state updates
          Promise.resolve().then(loadUserData);
        } else {
          console.log('AuthProvider: No session found');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('AuthProvider: Error checking session:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event);
        
        // Skip INITIAL_SESSION as we handle it above
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        // Handle SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user) {
          // Don't reload if we already have this user
          const currentUser = useStore.getState().user;
          if (currentUser?.id === session.user.id) {
            return;
          }
          // Load profile
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

          setIsAuthenticated(true);
          setSession(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setPrivateKey(null);
          setIsAuthenticated(false);
          setSession(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setPrivateKey]);

  const signOut = useCallback(async () => {
    try {
      // Clear all local storage except essential items
      const essentialKeys: string[] = [];
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (!essentialKeys.some((essential: string) => key.includes(essential))) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear store
      clearStore();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Reset state
      setIsAuthenticated(false);
      setSession(null);
      
      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [clearStore, router]);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, session, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}