import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  FileText, ThumbsUp, ThumbsDown, MessageSquare, 
  Send, Loader, CheckCircle, X, Edit3 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ArweaveService } from '@/lib/arweave';
import { DatabaseService } from '@/lib/database';
import { useStore } from '@/store/useStore';
import { EncryptionService } from '@/lib/encryption';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface ContractReview {
  id: string;
  name: string;
  version: number;
  arweaveId: string;
  createdBy: string;
  reviewer: {
    email: string;
    name: string;
  };
}

export default function ReviewContract() {
  const router = useRouter();
  const { token } = router.query;
  const { user, privateKey } = useStore();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractReview | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [decision, setDecision] = useState<'accept' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const arweave = ArweaveService.getInstance();

  useEffect(() => {
    if (token && user) {
      loadContract();
    }
  }, [token, user]);

  const loadContract = async () => {
    try {
      // Check if user is logged in
      if (!user) {
        // Redirect to login with the review URL as redirect
        const currentUrl = `/contracts/review/${token}`;
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      // Decode token to get contract info
      const decoded = JSON.parse(atob(token as string));
      const contractId = decoded.contractId;
      
      // Load the room/contract from database
      const contractRoom = await DatabaseService.loadRoom(contractId);
      if (!contractRoom) {
        toast.error('Contract not found');
        setLoading(false);
        return;
      }

      setRoom(contractRoom);

      // Load documents for this room
      const documents = await DatabaseService.loadRoomDocuments(contractId);
      const latestDoc = documents[0]; // Get the latest document

      if (latestDoc && latestDoc.encryptedContent) {
        // For now, use the encrypted content directly if it's a data URL
        // In production, this would be properly encrypted with nonce
        if (latestDoc.encryptedContent.startsWith('data:application/pdf')) {
          setPdfUrl(latestDoc.encryptedContent);
        }
      }

      const contractData: ContractReview = {
        id: contractId,
        name: contractRoom.name,
        version: documents.length,
        arweaveId: latestDoc?.arweaveId || '',
        createdBy: contractRoom.creatorId,
        reviewer: {
          email: user.email || '',
          name: user.name || '',
        },
      };

      setContract(contractData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading contract:', error);
      toast.error('Failed to load contract');
      setLoading(false);
    }
  };

  const handleAccept = () => {
    setDecision('accept');
  };

  const handleReject = () => {
    setDecision('reject');
  };

  const submitReview = async () => {
    if (!contract) return;

    setSubmitting(true);
    try {
      if (decision === 'accept') {
        // Redirect to signing page
        const signingToken = btoa(JSON.stringify({
          contractId: contract.id,
          email: contract.reviewer.email,
          version: contract.version,
        }));
        
        toast.success('Proceeding to sign the contract...');
        router.push(`/sign/${signingToken}`);
      } else if (decision === 'reject' && feedback) {
        // Store feedback on blockchain
        const feedbackData = {
          contractId: contract.id,
          version: contract.version,
          reviewer: contract.reviewer,
          decision: 'rejected',
          feedback: feedback,
          timestamp: new Date().toISOString(),
        };

        await arweave.uploadDocument(
          feedbackData,
          [
            { name: 'App-Name', value: 'SecureContract' },
            { name: 'Document-Type', value: 'Contract-Feedback' },
            { name: 'Contract-ID', value: contract.id },
            { name: 'Version', value: contract.version.toString() },
          ]
        );

        toast.success('Feedback submitted successfully');
        router.push('/contracts/review/feedback-sent');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Contract not found</h2>
          <p className="text-gray-600 mt-2">This review link may be invalid or expired</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-primary-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{contract.name}</h1>
                <p className="text-sm text-gray-600">Version {contract.version} • Review as {contract.reviewer.name}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              From: {contract.createdBy}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Contract Document</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 text-sm btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {numPages || '...'}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(numPages || 1, currentPage + 1))}
                    disabled={currentPage >= (numPages || 1)}
                    className="px-3 py-1 text-sm btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                >
                  <Page pageNumber={currentPage} width={600} />
                </Document>
              </div>
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-lg font-semibold mb-6">Your Review</h2>

              {!decision ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Please review the contract carefully. You can either accept and proceed to sign, 
                    or reject and provide feedback for revisions.
                  </p>

                  <button
                    onClick={handleAccept}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                  >
                    <ThumbsUp className="w-5 h-5 mr-2" />
                    Accept & Sign
                  </button>

                  <button
                    onClick={handleReject}
                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition flex items-center justify-center"
                  >
                    <ThumbsDown className="w-5 h-5 mr-2" />
                    Request Changes
                  </button>
                </div>
              ) : decision === 'accept' ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center text-green-800">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">You've accepted this contract</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    Click below to proceed with signing the contract electronically.
                  </p>

                  <button
                    onClick={submitReview}
                    disabled={submitting}
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Proceed to Sign'}
                  </button>

                  <button
                    onClick={() => setDecision(null)}
                    className="w-full text-gray-600 hover:text-gray-800"
                  >
                    Change Decision
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center text-red-800">
                      <X className="w-5 h-5 mr-2" />
                      <span className="font-medium">Requesting changes</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MessageSquare className="w-4 h-4 inline mr-1" />
                      Your Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="input"
                      rows={6}
                      placeholder="Please describe what changes you'd like to see in the contract..."
                    />
                  </div>

                  <button
                    onClick={submitReview}
                    disabled={submitting || !feedback.trim()}
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>

                  <button
                    onClick={() => {
                      setDecision(null);
                      setFeedback('');
                    }}
                    className="w-full text-gray-600 hover:text-gray-800"
                  >
                    Change Decision
                  </button>
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Contract ID: {contract.id}</p>
                  <p>Version: {contract.version}</p>
                  <p>Blockchain ID: {contract.arweaveId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}