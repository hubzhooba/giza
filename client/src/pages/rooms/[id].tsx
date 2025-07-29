import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentViewer from '@/components/DocumentViewer';
import ParticipantsList from '@/components/ParticipantsList';
import { Shield, FileText, Users, CheckCircle, ArrowRight, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function RoomDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { rooms, documents, user } = useStore();
  const [activeTab, setActiveTab] = useState<'documents' | 'participants'>('documents');
  
  const room = rooms.find((r) => r.id === id);
  const roomDocuments = documents.filter((d) => d.roomId === id);

  if (!room || !user) {
    return (
      <ProtectedPage>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Room not found</p>
          </div>
        </DashboardLayout>
      </ProtectedPage>
    );
  }

  const isCreator = room.creatorId === user.id;
  const allSigned = roomDocuments.every(
    (doc) => doc.signatures.length === room.participants.length
  );
  const currentStep = roomDocuments.length === 0 ? 2 : allSigned ? 3 : 2;

  return (
    <ProtectedPage>
      <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">Create Room</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 ${currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'} rounded-full flex items-center justify-center font-semibold`}>
                  {roomDocuments.length > 0 && allSigned ? <Check className="w-5 h-5" /> : '2'}
                </div>
                <span className={currentStep >= 2 ? 'font-medium text-gray-900' : 'text-gray-500'}>
                  Upload Documents
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 ${currentStep >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'} rounded-full flex items-center justify-center font-semibold`}>
                  {currentStep >= 3 ? <Check className="w-5 h-5" /> : '3'}
                </div>
                <span className={currentStep >= 3 ? 'font-medium text-gray-900' : 'text-gray-500'}>
                  Review & Send
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{room.name}</h1>
                <p className="text-gray-600 mt-1">
                  Created on {new Date(room.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Encrypted</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'documents'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-4 h-4 inline-block mr-2" />
                  Documents ({roomDocuments.length})
                </button>
                <button
                  onClick={() => setActiveTab('participants')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'participants'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  Participants ({room.participants.length})
                </button>
              </nav>
            </div>
          </div>

          {activeTab === 'documents' ? (
            <div className="space-y-6">
              {isCreator && roomDocuments.length === 0 && (
                <DocumentUpload roomId={room.id} encryptionKey={room.encryptionKey} />
              )}

              {roomDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No documents uploaded yet</p>
                  {isCreator && (
                    <p className="text-sm text-gray-400 mt-2">
                      Upload your invoice or contract document to continue
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {roomDocuments.map((doc) => (
                    <DocumentViewer
                      key={doc.id}
                      document={doc}
                      room={room}
                      currentUser={user}
                    />
                  ))}
                </div>
              )}

              {allSigned && roomDocuments.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900">All Documents Signed!</h3>
                      <p className="text-green-700 text-sm mt-1">
                        Your invoice has been signed by all parties. Ready to send for payment.
                      </p>
                    </div>
                    <Link
                      href={`/rooms/${room.id}/send`}
                      className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Invoice
                    </Link>
                  </div>
                </div>
              )}

              {!isCreator && roomDocuments.length > 0 && !allSigned && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    Please review and sign the documents above to proceed.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <ParticipantsList room={room} />
          )}

          {/* Action Buttons */}
          {isCreator && roomDocuments.length > 0 && !allSigned && (
            <div className="flex justify-end mt-6 pt-6 border-t">
              <button
                disabled
                className="flex items-center bg-gray-300 text-gray-500 px-6 py-2 rounded-lg cursor-not-allowed"
              >
                Waiting for Signatures
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}
        </div>
      </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}