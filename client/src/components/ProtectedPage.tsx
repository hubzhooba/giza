import { useEffect } from 'react';
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

  useEffect(() => {
    console.log('ProtectedPage state:', { isLoading, isAuthenticated, hasUser: !!user });
    
    // Only redirect if we're sure the user is not authenticated
    if (!isLoading && !isAuthenticated && !user) {
      console.log('ProtectedPage: Not authenticated, redirecting to login');
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading only while auth context is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // If we have authentication or a user, show the content
  // This handles cases where auth state might be slightly out of sync
  if (isAuthenticated || user) {
    return <>{children}</>;
  }

  // If not loading and not authenticated, show loading briefly while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );
}