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
  const { isLoading, isAuthenticated, session } = useAuthContext();
  const { user } = useStore();

  useEffect(() => {
    // Add a small delay to prevent flash of loading state
    const checkAuth = setTimeout(() => {
      if (!isLoading && !session && !isAuthenticated) {
        const redirect = router.asPath !== '/' ? `?redirect=${encodeURIComponent(router.asPath)}` : '';
        router.push(`/login${redirect}`);
      }
    }, 100);
    
    return () => clearTimeout(checkAuth);
  }, [isLoading, isAuthenticated, session, router]);

  // Show loading only while auth context is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // If we have a session, show the content
  if (session || isAuthenticated) {
    return <>{children}</>;
  }

  // If not loading and not authenticated, show loading briefly while redirect happens
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  );
}