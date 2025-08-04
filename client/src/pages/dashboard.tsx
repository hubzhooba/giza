import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useArConnect, withArConnectAuth } from '@/contexts/ArConnectContext';
import { 
  Tent, FileText, DollarSign, Clock, Home, Settings, 
  ChevronRight, Users, TrendingUp, Check, CheckCircle, CreditCard,
  FileSignature, PiggyBank, BarChart3, Send, Plus, UserPlus, Wallet
} from 'lucide-react';
import { ArweaveIcon } from '@/components/icons/ArweaveIcon';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import JoinTentModal from '@/components/JoinTentModal';
import { supabase } from '@/lib/supabase-client';
import '@/lib/utils/date';

function Dashboard() {
  const router = useRouter();
  const { username, displayName, walletAddress, balance, refreshBalance, isUsernameSet } = useArConnect();
  const [rooms, setRooms] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Redirect to onboarding if username not set
  useEffect(() => {
    if (walletAddress && !isUsernameSet) {
      router.push('/onboarding', undefined, { shallow: true });
    }
  }, [walletAddress, isUsernameSet, router]);
  
  // Load user data
  useEffect(() => {
    if (walletAddress && isUsernameSet) {
      loadUserData();
      const interval = setInterval(refreshBalance, 60000); // Refresh balance every minute
      return () => clearInterval(interval);
    }
  }, [walletAddress, isUsernameSet]);

  const loadUserData = async () => {
    if (!walletAddress) return;
    
    try {
      // Load rooms where user is participant
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .or(`creator_wallet.eq.${walletAddress},invitee_wallet.eq.${walletAddress}`)
        .order('created_at', { ascending: false });
      
      if (roomsData) setRooms(roomsData);

      // Load documents for user's rooms
      if (roomsData && roomsData.length > 0) {
        const roomIds = roomsData.map(r => r.id);
        const { data: docsData } = await supabase
          .from('documents')
          .select('*')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false });
        
        if (docsData) setDocuments(docsData);
      }

      // Load recent activities
      const { data: activitiesData } = await supabase
        .from('wallet_activity')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (activitiesData) setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoize filtered rooms
  const activeTents = useMemo(() => 
    rooms.filter(r => r.status === 'active'), 
    [rooms]
  );
  
  const completedTents = useMemo(() => 
    rooms.filter(r => r.status === 'completed'), 
    [rooms]
  );

  return (
    <DashboardLayout>
      {/* Welcome Section with Wallet Info */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold">
              Welcome back, {displayName || username || 'there'}
            </h1>
            <p className="text-gray-600 mt-2">
              Create secure contract tents for your clients and get paid
            </p>
          </div>
          
          {/* Wallet Info Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ArweaveIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Wallet Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {balance ? `${balance} AR` : 'Loading...'}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 truncate">
                {walletAddress}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link
          href="/tents/new"
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg p-6 text-center transition"
        >
          <Tent className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Create New Tent</h3>
          <p className="text-sm opacity-90">Start a secure contract workflow</p>
        </Link>

        <button
          onClick={() => setShowJoinModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 text-center transition"
        >
          <UserPlus className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Join a Tent</h3>
          <p className="text-sm opacity-90">Enter a tent ID to join</p>
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-3xl font-bold mb-1">{activeTents.length}</h3>
          <p className="text-gray-600">Active Tents</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-3xl font-bold mb-1">{completedTents.length}</h3>
          <p className="text-gray-600">Completed Tents</p>
        </div>
      </div>

      {/* Active Tents */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Active Tents</h2>
        
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : activeTents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Tent className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No active tents</h3>
            <p className="text-gray-600 mb-6">Create your first secure contract tent to get started</p>
            <Link
              href="/tents/new"
              className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Tent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTents.map((tent) => {
              const hasInvitee = tent.invitee_wallet !== null;
              const participantCount = hasInvitee ? 2 : 1;
              const tentDocs = documents.filter(d => d.room_id === tent.id);
              const hasSigned = tentDocs.some(doc => doc.status === 'signed');
              const hasArweave = tentDocs.some(doc => doc.arweaveId !== null);
              const progress = tent.status === 'completed' ? 100 : 
                             hasSigned ? 75 :
                             hasInvitee ? 50 : 25;
              
              return (
                <Link
                  key={tent.id}
                  href={`/tents/${tent.id}`}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Tent className="w-8 h-8 text-primary-600" />
                    <span className="text-xs text-gray-500">
                      {new Date(tent.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{tent.name}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span>Participants: {participantCount}/2</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      <span>Documents: {tentDocs.length}</span>
                    </div>
                    {hasArweave && (
                      <div className="flex items-center text-sm text-green-600">
                        <ArweaveIcon className="w-4 h-4 mr-2" />
                        <span>Stored on Arweave</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 py-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Join Tent Modal */}
      <JoinTentModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
    </DashboardLayout>
  );
}

export default withArConnectAuth(Dashboard);