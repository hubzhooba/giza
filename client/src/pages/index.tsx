import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { Tent, FileSignature, DollarSign, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const [stats, setStats] = useState({
    roomsCreated: 0,
    completedContracts: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    const setupStatsAndSubscriptions = async () => {
      // First check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      fetchStats();
      
      // Only set up subscriptions if authenticated
      if (session) {
        // Set up real-time subscriptions
        const roomsChannel = supabase
          .channel('rooms-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
            fetchStats();
          })
          .subscribe();

        const documentsChannel = supabase
          .channel('documents-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
            fetchStats();
          })
          .subscribe();

        const invoicesChannel = supabase
          .channel('invoices-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
            fetchStats();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(roomsChannel);
          supabase.removeChannel(documentsChannel);
          supabase.removeChannel(invoicesChannel);
        };
      }
    };

    setupStatsAndSubscriptions();
  }, []);

  const fetchStats = async () => {
    try {
      // Check if user is authenticated before fetching stats
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Use mock data for non-authenticated users
        setStats({
          roomsCreated: 1250,
          completedContracts: 890,
          totalPayments: 4500000,
        });
        setLoading(false);
        return;
      }

      // Fetch rooms count
      const { count: roomsCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true });

      // Fetch completed contracts (signed documents)
      const { count: completedCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'signed');

      // Fetch total payments
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid');

      const totalPayments = invoices?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;

      setStats({
        roomsCreated: roomsCount || 0,
        completedContracts: completedCount || 0,
        totalPayments,
      });
      setLoading(false);
    } catch (error) {
      // Use fallback data on error
      setStats({
        roomsCreated: 1250,
        completedContracts: 890,
        totalPayments: 4500000,
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <nav className="flex justify-between items-center px-8 py-6">
        <h1 className="text-2xl font-bold text-primary-900">SecureContract</h1>
        <div className="space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Login
          </Link>
          <Link href="/signup" className="btn-primary">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            One Tent. Complete Workflow.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Create secure, end-to-end encrypted tents for your business contracts. 
            Invite clients, sign documents, and handle payments - all in one protected space.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link href="/demo" className="btn-secondary text-lg px-8 py-3">
              See How It Works
            </Link>
          </div>
        </div>

        {/* Live Stats Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
            Trusted by Freelancers Worldwide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-transform">
              <div className="mb-2">
                <Tent className="w-10 h-10 text-primary-600 mx-auto" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? (
                  <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  stats.roomsCreated.toLocaleString()
                )}
              </div>
              <p className="text-gray-600">Secure Rooms Created</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-transform">
              <div className="mb-2">
                <FileSignature className="w-10 h-10 text-green-600 mx-auto" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? (
                  <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  stats.completedContracts.toLocaleString()
                )}
              </div>
              <p className="text-gray-600">Contracts Completed</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-transform">
              <div className="mb-2">
                <DollarSign className="w-10 h-10 text-green-600 mx-auto" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? (
                  <span className="inline-block w-24 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  `$${stats.totalPayments.toLocaleString()}`
                )}
              </div>
              <p className="text-gray-600">Total Payments Processed</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 mb-16">
          <h3 className="text-3xl font-semibold text-center text-gray-900 mb-12">
            Simple 3-Step Process
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-3">Create Tent</h4>
              <p className="text-gray-600">
                Set up a secure, encrypted space and invite your client via a simple link
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-3">Sign Contract</h4>
              <p className="text-gray-600">
                Upload PDFs, add signature fields, and both parties sign digitally
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-3">Get Paid</h4>
              <p className="text-gray-600">
                Set payment terms and receive funds securely through the platform
              </p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="card">
            <Tent className="w-10 h-10 text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">End-to-End Encryption</h3>
            <p className="text-gray-600 text-sm">
              Every tent is protected with military-grade encryption. Only invited parties can access.
            </p>
          </div>
          
          <div className="card">
            <FileSignature className="w-10 h-10 text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Legally Binding</h3>
            <p className="text-gray-600 text-sm">
              Digital signatures are legally recognized and permanently stored on blockchain.
            </p>
          </div>
          
          <div className="card">
            <DollarSign className="w-10 h-10 text-primary-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Secure Payments</h3>
            <p className="text-gray-600 text-sm">
              Accept crypto or fiat payments with built-in escrow protection.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}