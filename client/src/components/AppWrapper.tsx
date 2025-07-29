import { useLoadUserData } from '@/hooks/useLoadUserData';
import { useProcessInvite } from '@/hooks/useProcessInvite';
import { useAuthStateListener } from '@/hooks/useAuthStateListener';

export function AppWrapper({ children }: { children: React.ReactNode }) {
  // Listen for auth state changes and restore session
  useAuthStateListener();
  
  // Load user data from Supabase on app startup
  useLoadUserData();
  
  // Process invite tokens after login
  useProcessInvite();
  
  return <>{children}</>;
}