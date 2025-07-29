import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { Home, FileText, DollarSign, Settings, LogOut, Plus, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import LiquidBubbles from './LiquidBubbles';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { user, logout } = useStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Contracts', href: '/contracts', icon: FileText },
    { name: 'Payments', href: '/payments', icon: DollarSign },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen relative">
      <LiquidBubbles />
      
      <nav className="nav-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="relative">
                  <Shield className="w-8 h-8 text-primary-600" />
                  <div className="absolute inset-0 w-8 h-8 bg-primary-600/20 blur-xl"></div>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                  SecureContract
                </h1>
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-4 py-1 text-sm font-medium rounded-full transition-all duration-300 ${
                        isActive
                          ? 'text-primary-700 glass shadow-glass'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/rooms/new" className="btn-primary flex items-center glossy">
                <Plus className="w-4 h-4 mr-2" />
                New Room
              </Link>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center relative overflow-hidden"
                       style={{
                         background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)',
                         backdropFilter: 'blur(10px)',
                         border: '1px solid rgba(255, 255, 255, 0.3)',
                       }}>
                    <span className="text-primary-700 font-semibold text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-white/10 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 relative z-10">
        {children}
      </main>
    </div>
  );
}