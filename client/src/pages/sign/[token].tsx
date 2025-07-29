import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  FileText, PenTool, Check, Calendar, User, 
  Mail, Loader, CheckCircle, Eye 
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArweaveService } from '@/lib/arweave';
import toast from 'react-hot-toast';
import { EncryptionService } from '@/lib/encryption';
import { useStore } from '@/store/useStore';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SigningField {
  id: string;
  type: 'text' | 'signature' | 'date' | 'checkbox';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assignedEmail?: string;
  label?: string;
  value?: string;
  required: boolean;
}

export default function SignDocument() {
  const router = useRouter();
  const { token } = router.query;
  const { privateKey, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [pdfData, setPdfData] = useState<string>('');
  const [fields, setFields] = useState<SigningField[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [signerInfo, setSignerInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    agreed: false,
  });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signatureStyle, setSignatureStyle] = useState<'typed' | 'drawn'>('typed');
  const encryption = EncryptionService.getInstance();
  const arweave = ArweaveService.getInstance();

  useEffect(() => {
    if (token) {
      loadDocument();
    }
  }, [token]);

  const loadDocument = async () => {
    try {
      // In a real app, decode the token to get document/room/signer info
      // For now, we'll simulate loading
      const mockDocumentId = token; // This would come from decoded token
      
      // Load room and document data
      // This is a simplified version - in production, use proper API calls
      const roomData = {
        id: 'room123',
        encryptionKey: 'mock-key',
        participants: [
          { email: 'client@example.com', name: 'John Doe', role: 'signer' }
        ]
      };
      
      const documentData = {
        id: mockDocumentId,
        name: 'Service Agreement.pdf',
        fields: JSON.stringify([
          {
            id: '1',
            type: 'text',
            label: 'Full Name',
            page: 1,
            x: 100,
            y: 200,
            width: 200,
            height: 30,
            assignedEmail: 'client@example.com',
            required: true,
          },
          {
            id: '2',
            type: 'signature',
            label: 'Signature',
            page: 1,
            x: 100,
            y: 300,
            width: 200,
            height: 60,
            assignedEmail: 'client@example.com',
            required: true,
          },
          {
            id: '3',
            type: 'date',
            label: 'Date',
            page: 1,
            x: 350,
            y: 300,
            width: 150,
            height: 30,
            assignedEmail: 'client@example.com',
            required: true,
          }
        ]),
        encryptedContent: 'mock-encrypted-content',
      };

      setRoom(roomData);
      setDocument(documentData);
      
      // Parse fields
      const parsedFields = JSON.parse(documentData.fields || '[]');
      setFields(parsedFields);
      
      // In real app, decrypt the PDF
      // For now, use a placeholder
      setPdfData('/sample.pdf'); // You'd decrypt the actual PDF here
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
      setLoading(false);
    }
  };

  const generateSignature = (name: string): string => {
    // Simple signature generation - in production, use a proper signature font/canvas
    return name;
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Auto-fill name fields with signer's name
    if (fields.find(f => f.id === fieldId)?.type === 'text' && signerInfo.name) {
      setFieldValues(prev => ({ ...prev, [fieldId]: signerInfo.name }));
    }
  };

  const autoFillFields = () => {
    const newValues: Record<string, string> = {};
    
    fields.forEach(field => {
      if (field.type === 'text' && field.label?.toLowerCase().includes('name')) {
        newValues[field.id] = signerInfo.name;
      } else if (field.type === 'signature') {
        newValues[field.id] = generateSignature(signerInfo.name);
      } else if (field.type === 'date') {
        newValues[field.id] = new Date().toLocaleDateString();
      }
    });
    
    setFieldValues(newValues);
    toast.success('Fields auto-filled with your information');
  };

  const validateFields = (): boolean => {
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !fieldValues[f.id]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return false;
    }
    
    if (!signerInfo.agreed) {
      toast.error('Please agree to sign electronically');
      return false;
    }
    
    return true;
  };

  const handleSign = async () => {
    if (!validateFields()) return;
    
    // Check if user needs to login for signing
    if (!user) {
      toast.error('Please log in to sign documents');
      // Preserve the current URL so user can return after login
      const currentUrl = `/sign/${token}`;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }
    
    setSigning(true);
    try {
      // Load PDF and add field values
      const existingPdfBytes = await fetch(pdfData).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Add field values to PDF
      fields.forEach(field => {
        const value = fieldValues[field.id];
        if (!value) return;
        
        const pages = pdfDoc.getPages();
        const page = pages[field.page - 1];
        
        if (field.type === 'signature') {
          // Draw signature with special styling
          page.drawText(value, {
            x: field.x,
            y: page.getHeight() - field.y - field.height,
            size: 24,
            font: helveticaBold,
            color: rgb(0, 0, 0.8),
          });
        } else {
          // Draw regular text
          page.drawText(value, {
            x: field.x,
            y: page.getHeight() - field.y - field.height + 10,
            size: 12,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }
      });
      
      // Add signing metadata
      pdfDoc.setTitle(`${document.name} - Signed`);
      pdfDoc.setSubject(`Signed by ${signerInfo.name} on ${new Date().toISOString()}`);
      
      const pdfBytes = await pdfDoc.save();
      
      // Sign the document hash if we have a private key
      let documentSignature = '';
      if (privateKey) {
        try {
          const pdfHash = await crypto.subtle.digest('SHA-256', pdfBytes);
          const hashString = Array.from(new Uint8Array(pdfHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          documentSignature = await encryption.signData(hashString, privateKey);
        } catch (error) {
          console.error('Error signing document:', error);
          // Continue without signature for now
        }
      } else {
        // Mock signature for testing
        documentSignature = 'mock-signature-' + Date.now();
      }
      
      // Upload to Arweave
      const arweaveResult = await arweave.uploadDocument(
        {
          documentId: document.id,
          signerEmail: signerInfo.email,
          signerName: signerInfo.name,
          signedAt: new Date().toISOString(),
          fieldValues: fieldValues,
          documentHash: documentSignature ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', pdfBytes)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('') : '',
          signature: documentSignature,
          signedPdfData: Buffer.from(pdfBytes).toString('base64'),
        },
        [
          { name: 'App-Name', value: 'SecureContract' },
          { name: 'Document-Type', value: 'Signed-PDF' },
          { name: 'Signer', value: signerInfo.email },
        ]
      );
      
      // Update document status
      // In real app, update via API
      toast.success('Document signed successfully!');
      
      // Show success page
      router.push(`/sign/success?id=${arweaveResult.id}`);
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error('Failed to sign document');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Document not found</h2>
          <p className="text-gray-600 mt-2">This signing link may be invalid or expired</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{document.name}</h1>
              <p className="text-sm text-gray-600">Please review and sign this document</p>
            </div>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center text-primary-600 hover:text-primary-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Login prompt if not authenticated */}
        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
            <p className="text-gray-700 mb-4">
              You need to be logged in to sign documents. This ensures the security and validity of your signature.
            </p>
            <div className="flex space-x-4">
              <Link href="/login" className="btn-primary">
                Log In
              </Link>
              <Link href="/signup" className="btn-secondary">
                Create Account
              </Link>
            </div>
          </div>
        )}
        
        {/* Signer Information */}
        {user && !signerInfo.name && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={signerInfo.name}
                  onChange={(e) => setSignerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={signerInfo.email}
                  onChange={(e) => setSignerInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (signerInfo.name && signerInfo.email) {
                  autoFillFields();
                } else {
                  toast.error('Please enter your name and email first');
                }
              }}
              disabled={!signerInfo.name || !signerInfo.email}
              className="mt-4 btn-primary disabled:opacity-50"
            >
              Continue to Sign
            </button>
          </div>
        )}

        {/* Fields to Fill */}
        {user && signerInfo.name && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Fields to Complete</h2>
            <div className="space-y-4">
              {fields
                .filter(f => f.page === currentPage)
                .map(field => (
                  <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="input"
                        placeholder={`Enter ${field.label}`}
                      />
                    )}
                    
                    {field.type === 'signature' && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        {fieldValues[field.id] ? (
                          <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'cursive' }}>
                            {fieldValues[field.id]}
                          </p>
                        ) : (
                          <p className="text-gray-500">Click to sign</p>
                        )}
                      </div>
                    )}
                    
                    {field.type === 'date' && (
                      <input
                        type="date"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="input"
                      />
                    )}
                    
                    {field.type === 'checkbox' && (
                      <input
                        type="checkbox"
                        checked={fieldValues[field.id] === 'true'}
                        onChange={(e) => handleFieldChange(field.id, e.target.checked.toString())}
                        className="w-4 h-4"
                      />
                    )}
                  </div>
                ))}
            </div>

            {/* Agreement */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={signerInfo.agreed}
                  onChange={(e) => setSignerInfo(prev => ({ ...prev, agreed: e.target.checked }))}
                  className="mt-1 mr-3"
                />
                <span className="text-sm text-gray-700">
                  I agree to sign this document electronically and understand that my electronic 
                  signature is legally binding and has the same legal effect as a handwritten signature.
                </span>
              </label>
            </div>

            {/* Sign Button */}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing || !signerInfo.agreed}
                className="btn-primary flex items-center disabled:opacity-50"
              >
                {signing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4 mr-2" />
                    Sign Document
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Document Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <Document file={pdfData}>
                <Page pageNumber={currentPage} width={600} />
              </Document>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}