import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { 
  FileText, Users, Clock, CheckCircle, AlertCircle, 
  DollarSign, MessageSquare, ExternalLink, Plus
} from 'lucide-react';
import Link from 'next/link';

export default function ContractDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { rooms, documents } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'versions'>('overview');
  
  const room = rooms.find(r => r.id === id);
  const contractDocs = documents.filter(d => d.roomId === id);

  if (!room) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Contract not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const allSigned = room.participants.every(p => p.hasJoined);
  const pendingSigners = room.participants.filter(p => !p.hasJoined && p.role === 'signer');

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{room.name}</h1>
              <p className="text-gray-600 mt-2">
                Created on {new Date(room.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {allSigned ? (
                <Link
                  href={`/contracts/${room.id}/invoice/create`}
                  className="btn-primary flex items-center"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Create Invoice
                </Link>
              ) : (
                <Link
                  href={`/contracts/${room.id}/invite`}
                  className="btn-secondary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Parties
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Contract Status</h2>
              {allSigned ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Fully Executed</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-600">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="font-medium">Pending Signatures ({pendingSigners.length})</span>
                </div>
              )}
            </div>
            
            {contractDocs[0]?.arweaveId && (
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Blockchain Record</p>
                <a
                  href={`https://arweave.net/${contractDocs[0].arweaveId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
                >
                  View on Arweave
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'feedback'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Feedback & Notes
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'versions'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Version History
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Participants */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary-600" />
                  Contract Parties
                </h3>
                
                <div className="space-y-4">
                  {room.participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-primary-700 font-semibold">
                            {participant.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{participant.name}</p>
                          <p className="text-sm text-gray-600">{participant.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          participant.role === 'creator'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {participant.role}
                        </span>
                        
                        {participant.hasJoined ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Signed
                          </span>
                        ) : (
                          <span className="flex items-center text-yellow-600 text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                
                {allSigned ? (
                  <div className="space-y-3">
                    <Link
                      href={`/contracts/${room.id}/invoice/create`}
                      className="w-full btn-primary flex items-center justify-center"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Link>
                    
                    <button className="w-full btn-secondary flex items-center justify-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Download Contract
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                      Waiting for all parties to sign before creating invoices.
                    </p>
                    
                    <Link
                      href={`/contracts/${room.id}/invite`}
                      className="w-full btn-secondary flex items-center justify-center"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Invite More Parties
                    </Link>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Contract Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-500">Version</dt>
                      <dd className="font-medium">{room.contractData?.version || 1}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Status</dt>
                      <dd className="font-medium">{allSigned ? 'Executed' : 'Draft'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Created</dt>
                      <dd className="font-medium">{new Date(room.createdAt).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No feedback or notes yet</p>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-primary-700 font-semibold">V1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Version 1</p>
                    <p className="text-sm text-gray-600">
                      Created on {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <a
                  href={`https://arweave.net/${room.contractData?.arweaveId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
                >
                  View
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}