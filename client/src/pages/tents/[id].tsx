import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentViewer from '@/components/DocumentViewer';
import { 
  Tent, FileText, DollarSign, Check, Copy, Users, 
  ArrowRight, Clock, Lock, ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedPage } from '@/components/ProtectedPage';

type TentStep = 'invite' | 'contract' | 'payment' | 'complete';

export default function TentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { rooms, documents, user, loadDocuments } = useStore();
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Load documents when component mounts
  useEffect(() => {
    if (user && id) {
      loadDocuments();
    }
  }, [user, id, loadDocuments]);
  
  const tent = rooms.find((r) => r.id === id);
  const tentDocuments = documents.filter((d) => d.roomId === id);
  
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
  const hasInvitee = tent.participants.length > 1;
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
  const inviteLink = `${window.location.origin}/tents/join/${tent.id}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopiedLink(false), 3000);
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
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">End-to-End Encrypted</span>
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
                    Share this secure link with your client to grant them access to this tent.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secure Invite Link
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 input bg-white"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                    >
                      {copiedLink ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This link will allow your client to join the tent securely.
                  </p>
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
                <span className="text-sm text-gray-600 capitalize">{tent.status}</span>
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