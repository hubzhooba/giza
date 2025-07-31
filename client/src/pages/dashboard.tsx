import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { 
  Tent, FileText, DollarSign, Clock, Home, Settings, 
  ChevronRight, Users, TrendingUp, Check, CheckCircle, CreditCard,
  FileSignature, PiggyBank, BarChart3, Send, Plus, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ProtectedPage } from '@/components/ProtectedPage';
import JoinTentModal from '@/components/JoinTentModal';

export default function Dashboard() {
  const router = useRouter();
  const { user, rooms } = useStore();
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Filter rooms to show as tents
  const activeTents = rooms.filter(r => r.status === 'active');
  const completedTents = rooms.filter(r => r.status === 'completed');

  return (
    <ProtectedPage>
      <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          Welcome back, {user?.name || 'there'}
        </h1>
        <p className="text-gray-600 mt-2">
          Create secure contract tents for your clients and get paid
        </p>
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

      {/* Active Suites */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Active Tents</h2>
        
        {activeTents.length === 0 ? (
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
              const progress = tent.status === 'completed' ? 100 : 
                             tent.status === 'active' ? 50 : 0;
              
              return (
                <Link
                  key={tent.id}
                  href={`/tents/${tent.id}`}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <Tent className="w-8 h-8 text-primary-600" />
                    <span className="text-xs text-gray-500">
                      {new Date(tent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{tent.name}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Contract: {tent.status === 'active' ? 'In Progress' : 'Not Started'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span>Payment: Pending</span>
                    </div>
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
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        </div>
      </div>
      
      {/* Join Tent Modal */}
      <JoinTentModal 
        isOpen={showJoinModal} 
        onClose={() => setShowJoinModal(false)} 
      />
      </DashboardLayout>
    </ProtectedPage>
  );
}