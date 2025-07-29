import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { User } from '@/types';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser, setPrivateKey } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
          let retries = 3;
          
          while (retries > 0 && !profile) {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (error) {
                console.error(`Profile fetch attempt ${4 - retries} failed:`, error);
                retries--;
                if (retries > 0) {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              } else {
                profile = data;
                break;
              }
            } catch (err) {
              console.error(`Profile fetch attempt ${4 - retries} error:`, err);
              retries--;
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
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
          
          // Load rooms and documents in background
          setTimeout(async () => {
            try {
              const { loadRooms, loadDocuments } = useStore.getState();
              if (loadRooms) await loadRooms();
              if (loadDocuments) await loadDocuments();
            } catch (err) {
              console.error('Error loading user data:', err);
            }
          }, 0);
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
        if (event === 'INITIAL_SESSION') return;
        
        if (event === 'SIGNED_IN' && session?.user) {
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
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setPrivateKey(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setPrivateKey]);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}