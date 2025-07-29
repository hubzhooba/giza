import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { Loader } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const router = useRouter();
  const { user } = useStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Give auth state listener time to check session
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isChecking) return;

    if (requireAuth && !user) {
      // User needs to be logged in but isn't
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    } else if (!requireAuth && user) {
      // User is logged in but on a public page (login/signup)
      // Only redirect if we're actually on the login/signup page
      if (router.pathname === '/login' || router.pathname === '/signup') {
        router.push('/dashboard');
      }
    }
  }, [user, requireAuth, router, isChecking]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return <>{children}</>;
}