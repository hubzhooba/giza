import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentViewer from '@/components/DocumentViewer';
import { 
  Tent, FileText, DollarSign, Check, Copy, Users, 
  ArrowRight, Clock, Lock, Hash, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/lib/database';
import { useRealtimeRoom } from '@/hooks/useRealtimeRoom';

type TentStep = 'invite' | 'contract' | 'payment' | 'complete';

export default function TentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { rooms, documents, user, loadDocuments, loadRooms } = useStore();
  const [copiedId, setCopiedId] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use the new realtime hook
  const { isSubscribed } = useRealtimeRoom(id as string);
  
  // Load documents and rooms when component mounts
  useEffect(() => {
    if (user && id) {
      // Initial load
      loadDocuments();
      loadRooms();
      
      // Only set up periodic refresh if real-time subscription fails
      if (!isSubscribed) {
        const interval = setInterval(() => {
          loadRooms();
          loadDocuments();
        }, 10000); // Reduced frequency to 10 seconds
        
        return () => clearInterval(interval);
      }
    }
  }, [user, id, loadDocuments, loadRooms, isSubscribed]);
  
  // Subscription is now handled by useRealtimeRoom hook
  
  // Find tent with proper type checking
  const tent = rooms.find((r) => r.id === id);
  const tentDocuments = documents.filter((d) => d.roomId === id);
  
  // Load specific room data if not in store
  useEffect(() => {
    const loadTentData = async () => {
      if (id && !tent && user) {
        try {
          const roomData = await DatabaseService.loadRoom(id as string);
          if (roomData) {
            // Add to store
            const { rooms: currentRooms } = useStore.getState();
            useStore.setState({ 
              rooms: [...currentRooms.filter(r => r.id !== roomData.id), roomData] 
            });
          }
        } catch (error) {
          console.error('Error loading tent data:', error);
        }
      }
    };
    
    loadTentData();
  }, [id, tent, user]);
  
  if (!tent || !user) {
    return (
      <ProtectedPage>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Tent not found</p>
          </div>
        </DashboardLayout>
      </ProtectedPage>
    );
  }

  const isOwner = tent.creatorId === user.id;
  // Check if tent has an invitee (second participant)
  const hasInvitee = tent.inviteeId !== undefined && tent.inviteeId !== null;
  const allSigned = tentDocuments.some(doc => 
    doc.signatures.length >= 2 || doc.status === 'signed'
  );
  
  // Determine current step
  const getCurrentStep = (): TentStep => {
    if (tent.status === 'completed') return 'complete';
    if (allSigned) return 'payment';
    if (hasInvitee) return 'contract';
    return 'invite';
  };
  
  const currentStep = getCurrentStep();

  const copyTentId = () => {
    navigator.clipboard.writeText(tent.id);
    setCopiedId(true);
    toast.success('Tent ID copied!');
    setTimeout(() => setCopiedId(false), 3000);
  };

  const handleRefresh = async () => {
    if (refreshing) return; // Prevent multiple refreshes
    
    setRefreshing(true);
    try {
      // Use Promise.allSettled to ensure both complete
      const results = await Promise.allSettled([
        loadRooms(),
        loadDocuments()
      ]);
      
      // Check if any failed
      const failed = results.some(r => r.status === 'rejected');
      if (failed) {
        toast.error('Some data failed to refresh');
      } else {
        toast.success('Refreshed successfully');
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh');
    } finally {
      // Ensure we always reset refreshing state
      setTimeout(() => setRefreshing(false), 100);
    }
  };

  const steps = [
    { id: 'invite', label: 'Invite Client', icon: Users },
    { id: 'contract', label: 'Sign Contract', icon: FileText },
    { id: 'payment', label: 'Payment', icon: DollarSign },
  ];

  return (
    <ProtectedPage>
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">{tent.name}</h1>
                <p className="text-gray-600 mt-1">Secure Contract Tent</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <div className="flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">End-to-End Encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tent Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-2">Participants ({hasInvitee ? '2/2' : '1/2'})</p>
                <div className="space-y-1">
                  {tent.participants && tent.participants.length > 0 ? (
                    tent.participants.map((participant, index) => (
                      <div key={participant.userId} className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary-700">
                            {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-sm">
                            {participant.name || participant.email || 'Unknown User'}
                          </span>
                          {participant.role === 'creator' && (
                            <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                              Creator
                            </span>
                          )}
                          {participant.userId === user.id && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">
                      Loading participants...
                    </div>
                  )}
                  {!hasInvitee && (
                    <div className="flex items-center space-x-2 opacity-50">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-500">?</span>
                      </div>
                      <span className="text-sm text-gray-500">Awaiting invitee...</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-semibold capitalize">
                      {tent.status === 'pending' && !hasInvitee ? 'Waiting for Client' :
                       tent.status === 'pending' && hasInvitee ? 'Setting Up Contract' :
                       tent.status === 'active' && !allSigned ? 'Contract In Progress' :
                       tent.status === 'active' && allSigned ? 'Ready for Payment' :
                       tent.status === 'completed' ? 'Completed' :
                       tent.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-semibold">
                      {new Date(tent.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${isCompleted ? 'bg-green-600 text-white' : 
                          isActive ? 'bg-primary-600 text-white' : 
                          'bg-gray-200 text-gray-500'}
                      `}>
                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span className={`ml-3 font-medium ${
                        isActive || isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="flex-1 mx-4">
                        <div className="h-1 bg-gray-200 rounded">
                          <div className={`h-1 rounded transition-all ${
                            isCompleted ? 'bg-green-600 w-full' : 'bg-gray-200 w-0'
                          }`} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content based on current step */}
          <div className="bg-white rounded-lg shadow-sm p-8">
            {currentStep === 'invite' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Invite Your Client</h2>
                  <p className="text-gray-600 mb-6">
                    Share this tent ID with your client. They can join by entering it in their dashboard.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tent ID
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 flex items-center bg-white rounded-lg border border-gray-300 px-4 py-2">
                      <Hash className="w-5 h-5 text-gray-400 mr-2" />
                      <input
                        type="text"
                        value={tent.id}
                        readOnly
                        className="flex-1 bg-transparent outline-none font-mono text-lg"
                      />
                    </div>
                    <button
                      onClick={copyTentId}
                      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      {copiedId ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copiedId ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Your client needs to:
                  </p>
                  <ol className="text-sm text-gray-500 mt-2 list-decimal list-inside space-y-1">
                    <li>Log into their account</li>
                    <li>Click "Join a Tent" on their dashboard</li>
                    <li>Enter this tent ID</li>
                  </ol>
                </div>

                <div className="flex items-center justify-center py-8">
                  <Clock className="w-12 h-12 text-gray-300 mr-4" />
                  <p className="text-gray-500">Waiting for client to join...</p>
                </div>
              </div>
            )}

            {currentStep === 'contract' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Upload & Sign Contract</h2>
                  <p className="text-gray-600 mb-6">
                    Upload your contract PDF. Both parties will be able to review and sign digitally.
                  </p>
                </div>

                {isOwner && tentDocuments.length === 0 && (
                  <DocumentUpload roomId={tent.id} encryptionKey={tent.encryptionKey} />
                )}

                {tentDocuments.length > 0 ? (
                  <div className="space-y-4">
                    {tentDocuments.map((doc) => (
                      <DocumentViewer
                        key={doc.id}
                        document={doc}
                        room={tent}
                        currentUser={user}
                      />
                    ))}
                  </div>
                ) : (
                  !isOwner && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Waiting for contract upload...</p>
                    </div>
                  )
                )}

                {allSigned && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <Check className="w-6 h-6 text-green-600 mr-3" />
                      <div>
                        <h3 className="font-semibold text-green-900">Contract Signed!</h3>
                        <p className="text-green-700 text-sm mt-1">
                          Both parties have signed. Proceed to payment setup.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Payment Setup</h2>
                  <p className="text-gray-600 mb-6">
                    Configure payment terms and method for this contract.
                  </p>
                </div>

                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Payment module coming soon</p>
                  <button
                    onClick={() => {
                      toast.success('Tent marked as complete!');
                      router.push('/dashboard');
                    }}
                    className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
                  >
                    Complete Tent
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Tent Complete!</h2>
                <p className="text-gray-600 mb-6">
                  This contract tent has been completed successfully.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
                >
                  Back to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}
          </div>

          {/* Tent Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-medium text-gray-900 mb-2">Participants</h3>
              <div className="space-y-2">
                {tent.participants.map((participant) => (
                  <div key={participant.userId} className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    <span className="text-gray-600">{participant.name || participant.email}</span>
                    {participant.userId === tent.creatorId && (
                      <span className="ml-2 text-xs text-gray-500">(Owner)</span>
                    )}
                  </div>
                ))}
                {!hasInvitee && (
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mr-2" />
                    <span className="text-gray-400">Awaiting invitee...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-medium text-gray-900 mb-2">Status</h3>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  tent.status === 'completed' ? 'bg-green-500' : 
                  tent.status === 'active' ? 'bg-blue-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-600 capitalize">
                  {tent.status === 'pending' && !hasInvitee ? 'Waiting for Client' :
                   tent.status === 'pending' && hasInvitee ? 'Setting Up Contract' :
                   tent.status === 'active' && !allSigned ? 'Contract In Progress' :
                   tent.status === 'active' && allSigned ? 'Ready for Payment' :
                   tent.status === 'completed' ? 'Completed' :
                   tent.status}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-medium text-gray-900 mb-2">Created</h3>
              <p className="text-sm text-gray-600">
                {new Date(tent.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}