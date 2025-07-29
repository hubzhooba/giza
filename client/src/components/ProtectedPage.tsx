import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthContext } from '@/contexts/AuthContext';
import { useStore } from '@/store/useStore';
import { Loader } from 'lucide-react';

interface ProtectedPageProps {
  children: React.ReactNode;
}

export function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthContext();
  const { user } = useStore();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Give auth context time to initialize
    const timer = setTimeout(() => {
      if (!isLoading && !isAuthenticated && !user) {
        console.log('ProtectedPage: Not authenticated, redirecting to login');
        setShouldRedirect(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, user]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [shouldRedirect, router]);

  // Show loading state while auth is initializing
  if (isLoading || (!isAuthenticated && !shouldRedirect)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // If authenticated and have user, show content
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  // Otherwise show loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );
}