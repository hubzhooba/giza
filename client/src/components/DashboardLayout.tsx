import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useArConnect } from '@/contexts/ArConnectContext';
import { 
  Home, FileText, DollarSign, CreditCard, Users, 
  Settings, LogOut, Menu, X, ChevronRight, Gift, Tent, Wallet
} from 'lucide-react';
import { ArweaveIcon } from './icons/ArweaveIcon';
import toast from 'react-hot-toast';
import LiquidBubbles from './LiquidBubbles';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { username, displayName, walletAddress, balance, disconnect } = useArConnect();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Tents', href: '/tents', icon: Tent },
    { name: 'Documents', href: '/documents/archive', icon: FileText },
  ];

  const handleLogout = () => {
    disconnect();
    toast.success('Disconnected successfully');
  };

  return (
    <div className="min-h-screen flex relative">
      <LiquidBubbles />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 sidebar-glass transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/20">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="relative">
                <ArweaveIcon className="w-8 h-8 text-blue-400" />
                <div className="absolute inset-0 w-8 h-8 bg-blue-400/20 blur-xl"></div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Giza</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/tents' 
                ? router.pathname.startsWith('/tents')
                : router.pathname === item.href || router.pathname.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? 'glass text-primary-700 shadow-glass'
                      : 'text-gray-700 hover:bg-white/10 hover:backdrop-blur-md'
                  } liquid-border`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="badge-glass text-primary-700">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </Link>
              );
            })}
          </nav>

          {/* Wallet Balance Section */}
          <div className="p-4 border-t border-white/20">
            <div className="p-3 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <ArweaveIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-gray-700">Wallet Balance</span>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {balance ? `${balance} AR` : 'Loading...'}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {walletAddress?.substring(0, 8)}...{walletAddress?.substring(walletAddress.length - 8)}
              </p>
            </div>
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden"
                     style={{
                       background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%)',
                       backdropFilter: 'blur(10px)',
                       border: '1px solid rgba(255, 255, 255, 0.3)',
                     }}>
                  <span className="text-primary-700 font-semibold">
                    {displayName?.charAt(0).toUpperCase() || username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {displayName || username || 'Anonymous'}
                  </p>
                  <p className="text-xs text-gray-500">Connected</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
                title="Disconnect wallet"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="nav-glass h-16 flex items-center justify-between px-4 lg:px-8 relative z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4 ml-auto">
            {/* Balance display for desktop */}
            <div className="hidden md:flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">
                {balance ? `${balance} AR` : 'Loading...'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 pt-20 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}