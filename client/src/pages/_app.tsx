import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function AppWithProviders({ Component, pageProps }: AppProps) {
  // Clear stale cache on mount with proper build versioning
  useEffect(() => {
    // Use a proper build version from environment or package.json
    const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || '1.0.0';
    const storedVersion = localStorage.getItem('app-build-version');
    
    if (storedVersion && storedVersion !== buildVersion) {
      console.log('New version detected, clearing cache...');
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Update version
      localStorage.setItem('app-build-version', buildVersion);
      
      // Reload to get fresh assets
      window.location.reload();
    } else if (!storedVersion) {
      localStorage.setItem('app-build-version', buildVersion);
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
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppWithProviders {...props} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}