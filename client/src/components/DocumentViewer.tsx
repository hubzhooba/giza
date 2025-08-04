import { useState, useEffect } from 'react';
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf';
import { FileText, Download, Edit, CheckCircle, AlertCircle, Cloud } from 'lucide-react';
import { Document, SecureRoom, User } from '@/types';
import { EncryptionService } from '@/lib/encryption';
import { StoarService } from '@/lib/stoar';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DocumentViewerProps {
  document: Document;
  room: SecureRoom;
  currentUser: User;
}

export default function DocumentViewer({ document, room, currentUser }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [loadingFromArweave, setLoadingFromArweave] = useState(false);
  const { updateDocument, privateKey, addActivity } = useStore();
  const encryption = EncryptionService.getInstance();
  const stoar = StoarService.getInstance();

  useEffect(() => {
    const decryptDocument = async () => {
      try {
        let encryptedData;
        let fields;
        
        // Check if document has Arweave ID and try to fetch from there first
        if ((document as any).arweaveId) {
          setLoadingFromArweave(true);
          try {
            // Initialize STOAR if not already done
            const walletKey = process.env.NEXT_PUBLIC_ARWEAVE_WALLET_KEY;
            try {
              await stoar.init(walletKey || undefined);
            } catch (initError) {
              console.warn('STOAR initialization failed, continuing with fallback:', initError);
            }
            
            // Fetch from Arweave
            const arweaveData = await stoar.getDocument((document as any).arweaveId);
            const arweaveContent = JSON.parse(new TextDecoder().decode(arweaveData));
            
            encryptedData = { encrypted: arweaveContent.encrypted, nonce: arweaveContent.nonce };
            fields = arweaveContent.fields;
            
            toast.success('Document loaded from Arweave');
          } catch (error) {
            console.error('Failed to fetch from Arweave:', error);
            toast('Loading from local storage instead', { icon: '⚠️' });
            // Fall back to local storage
            encryptedData = JSON.parse(document.encryptedContent!);
          } finally {
            setLoadingFromArweave(false);
          }
        } else {
          // No Arweave ID, use local storage
          encryptedData = JSON.parse(document.encryptedContent!);
        }
        
        const decrypted = await encryption.decryptData(encryptedData.encrypted, encryptedData.nonce, room.encryptionKey);
        setPdfData(`data:application/pdf;base64,${decrypted}`);
      } catch (error) {
        console.error('Document decryption error:', error);
        toast.error('Failed to decrypt document');
      }
    };

    if (document.encryptedContent || (document as any).arweaveId) {
      decryptDocument();
    }
  }, [document, room.encryptionKey]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleSign = async () => {
    if (!privateKey) {
      toast.error('Private key not found. Please log in again.');
      return;
    }

    setSigning(true);
    try {
      const signature = await encryption.signData(document.id, privateKey);
      
      const newSignature = {
        userId: currentUser.id,
        signature,
        timestamp: new Date(),
        publicKey: currentUser.publicKey,
      };

      updateDocument(document.id, {
        signatures: [...document.signatures, newSignature],
        status: document.signatures.length + 1 === room.participants.length ? 'signed' : 'pending_signatures',
      });

      // Add activity for document signing
      addActivity({
        type: 'document_signed',
        tentId: room.id,
        tentName: room.name,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        documentId: document.id,
        documentName: document.name
      });

      toast.success('Document signed successfully!');
    } catch (error) {
      toast.error('Failed to sign document');
    } finally {
      setSigning(false);
    }
  };

  const hasUserSigned = document.signatures.some((sig) => sig.userId === currentUser.id);
  const allSigned = document.signatures.length === room.participants.length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FileText className="w-6 h-6 text-primary-600 mr-3" />
          <div>
            <h3 className="font-semibold text-gray-900">{document.name}</h3>
            <p className="text-sm text-gray-500">
              Uploaded on {new Date(document.createdAt).toLocaleDateString()}
            </p>
            {(document as any).arweaveId && (
              <div className="flex items-center mt-1">
                <Cloud className="w-3 h-3 text-green-600 mr-1" />
                <span className="text-xs text-green-600">Stored on Arweave</span>
                {loadingFromArweave && (
                  <span className="ml-2 text-xs text-gray-500">Loading...</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {allSigned ? (
            <span className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Fully Signed
            </span>
          ) : (
            <span className="flex items-center text-yellow-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {document.signatures.length}/{room.participants.length} Signatures
            </span>
          )}
        </div>
      </div>

      {pdfData && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <PDFDocument
            file={pdfData}
            onLoadSuccess={onDocumentLoadSuccess}
            className="w-full"
          >
            <Page
              pageNumber={pageNumber}
              width={600}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </PDFDocument>
          
          {numPages && numPages > 1 && (
            <div className="flex items-center justify-center space-x-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1 text-sm btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                disabled={pageNumber >= numPages}
                className="px-3 py-1 text-sm btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Signatures:</h4>
          {document.signatures.map((sig) => {
            const participant = room.participants.find((p) => p.userId === sig.userId);
            return (
              <div key={sig.userId} className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-600">
                  {participant?.name} - {new Date(sig.timestamp).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex space-x-3">
          <button className="btn-secondary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
          
          {!hasUserSigned && !allSigned && (
            <button
              onClick={handleSign}
              disabled={signing}
              className="btn-primary flex items-center disabled:opacity-50"
            >
              <Edit className="w-4 h-4 mr-2" />
              {signing ? 'Signing...' : 'Sign Document'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}