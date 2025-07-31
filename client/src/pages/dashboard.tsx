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
import '@/lib/utils/date';

export default function Dashboard() {
  const router = useRouter();
  const { user, rooms, documents, activities } = useStore();
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
              const hasInvitee = tent.inviteeId !== undefined && tent.inviteeId !== null;
              const participantCount = hasInvitee ? 2 : 1;
              const tentDocs = documents.filter(d => d.roomId === tent.id);
              const hasSigned = tentDocs.some(doc => doc.status === 'signed');
              const progress = tent.status === 'completed' ? 100 : 
                             hasSigned ? 75 :
                             hasInvitee ? 50 : 25;
              
              // Determine contract and payment status
              const contractStatus = hasSigned ? 'Signed' : 
                                   tentDocs.length > 0 ? 'In Progress' : 
                                   'Not Started';
              const paymentStatus = tent.status === 'completed' ? 'Completed' :
                                  hasSigned ? 'Ready' : 
                                  'Not Yet Started';
              
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
                      <Users className="w-4 h-4 mr-2" />
                      <span>Participants: {participantCount}/2</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      <span>Contract: {contractStatus}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span>Payment: {paymentStatus}</span>
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
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            activities.slice(0, 10).map((activity) => {
              const getActivityIcon = () => {
                switch (activity.type) {
                  case 'tent_created': return <Tent className="w-4 h-4" />;
                  case 'tent_joined': return <UserPlus className="w-4 h-4" />;
                  case 'document_uploaded': return <FileText className="w-4 h-4" />;
                  case 'document_signed': return <FileSignature className="w-4 h-4" />;
                  case 'document_declined': return <FileText className="w-4 h-4" />;
                  case 'payment_sent': return <Send className="w-4 h-4" />;
                  case 'tent_completed': return <CheckCircle className="w-4 h-4" />;
                  default: return <Clock className="w-4 h-4" />;
                }
              };
              
              const getActivityMessage = () => {
                switch (activity.type) {
                  case 'tent_created':
                    return `created tent "${activity.tentName}"`;
                  case 'tent_joined':
                    return `joined your tent "${activity.tentName}"`;
                  case 'document_uploaded':
                    return `uploaded ${activity.documentName} to "${activity.tentName}"`;
                  case 'document_signed':
                    return `signed ${activity.documentName} in "${activity.tentName}"`;
                  case 'document_declined':
                    return `declined ${activity.documentName} in "${activity.tentName}"`;
                  case 'document_revision':
                    return `requested revision for ${activity.documentName} in "${activity.tentName}"`;
                  case 'payment_sent':
                    return `sent payment of ${activity.amount} ${activity.currency} in "${activity.tentName}"`;
                  case 'tent_completed':
                    return `completed tent "${activity.tentName}"`;
                  default:
                    return activity.message || 'performed an action';
                }
              };
              
              const isOwnActivity = activity.userId === user?.id;
              const actorName = isOwnActivity ? 'You' : activity.userName;
              
              return (
                <div key={activity.id} className="flex items-start space-x-3 py-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'tent_joined' ? 'bg-green-100 text-green-600' :
                      activity.type === 'document_signed' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'document_declined' ? 'bg-red-100 text-red-600' :
                      activity.type === 'payment_sent' ? 'bg-purple-100 text-purple-600' :
                      activity.type === 'tent_completed' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getActivityIcon()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{actorName}</span>{' '}
                      {getActivityMessage()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(activity.createdAt).toRelativeTimeString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
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