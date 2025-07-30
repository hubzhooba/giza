import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';
import { useEffect } from 'react';
import Script from 'next/script';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function AppWithSession({ Component, pageProps }: AppProps) {
  useSessionPersistence();
  
  // Clear stale cache on mount
  useEffect(() => {
    // Check build version using dynamic build ID
    const buildId = typeof window !== 'undefined' ? window.location.pathname : 'development';
    const storedBuildId = localStorage.getItem('app-build-id');
    const currentBuildTime = new Date().toISOString();
    
    // Also check last clear time to prevent infinite reloads
    const lastClearTime = localStorage.getItem('last-cache-clear');
    const timeSinceLastClear = lastClearTime ? Date.now() - new Date(lastClearTime).getTime() : Infinity;
    
    // Only clear cache if it's been more than 30 seconds since last clear
    if (storedBuildId && storedBuildId !== buildId && timeSinceLastClear > 30000) {
      console.log('New deployment detected, clearing cache...');
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Clear session storage too
      sessionStorage.clear();
      
      // Update build ID and clear time
      localStorage.setItem('app-build-id', buildId);
      localStorage.setItem('last-cache-clear', currentBuildTime);
      
      // Reload to get fresh assets
      window.location.reload();
    } else if (!storedBuildId) {
      localStorage.setItem('app-build-id', buildId);
    }
  }, []);
  
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </>
  );
}

export default function App(props: AppProps) {
  const { Component, pageProps } = props;
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppWithSession {...props} />
      </AuthProvider>
    </QueryClientProvider>
  );
}