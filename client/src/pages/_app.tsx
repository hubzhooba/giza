import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';

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
  
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppWithSession Component={Component} pageProps={pageProps} />
      </AuthProvider>
    </QueryClientProvider>
  );
}