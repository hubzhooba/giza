import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Edit3, Sparkles } from 'lucide-react';
import { EncryptionService } from '@/lib/encryption';
import { useStore } from '@/store/useStore';
import PDFFieldEditor from './PDFFieldEditor';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface DocumentUploadProps {
  roomId: string;
  encryptionKey: string;
}

export default function DocumentUpload({ roomId, encryptionKey }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [generatingContract, setGeneratingContract] = useState(false);
  const { addDocument, rooms, user, addActivity } = useStore();
  const encryption = EncryptionService.getInstance();
  
  const room = rooms.find(r => r.id === roomId);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      setPdfDataUrl(`data:application/pdf;base64,${base64}`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const handleAddFields = () => {
    if (files.length === 0) return;
    setShowEditor(true);
  };

  const handleSaveWithFields = async (fields: any[], pdfBytes: Uint8Array) => {
    setUploading(true);
    try {
      const file = files[0];
      const base64 = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const { encrypted, nonce } = await encryption.encryptData(base64, encryptionKey);
      
      const document = {
        id: uuidv4(),
        roomId,
        name: file.name,
        type: 'contract' as const,
        encryptedContent: JSON.stringify({ encrypted, nonce }),
        fields: JSON.stringify(fields), // Store field definitions
        signatures: [],
        status: 'pending_signatures' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      addDocument(document);
      
      // Add activity for document upload
      if (user && room) {
        addActivity({
          type: 'document_uploaded',
          tentId: roomId,
          tentName: room.name,
          userId: user.id,
          userName: user.name || user.email,
          documentId: document.id,
          documentName: file.name
        });
      }
      
      setFiles([]);
      setShowEditor(false);
      toast.success('Document uploaded with signature fields!');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFiles([]);
  };

  const generateContractFromPrompt = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for your contract');
      return;
    }

    setGeneratingContract(true);
    try {
      // TODO: Replace with actual OpenAI API call
      // For now, we'll create a simple contract template
      const contractText = `CONTRACT AGREEMENT

This agreement is entered into on ${new Date().toLocaleDateString()} between:

Client: [Client Name]
Freelancer: [Freelancer Name]

${aiPrompt}

Scope of Work:
[To be defined]

Payment Terms:
[To be defined]

Timeline:
[To be defined]

Terms and Conditions:
1. All work remains the property of the client upon full payment
2. The freelancer agrees to complete work by the agreed deadline
3. Payment is due within 30 days of invoice
4. This agreement is governed by applicable laws

Signatures:

Client: _____________________  Date: __________

Freelancer: _____________________  Date: __________`;

      // Create PDF from text
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const { height } = page.getSize();
      const fontSize = 12;
      const margin = 50;
      
      // Split text into lines and draw
      const lines = contractText.split('\n');
      let yPosition = height - margin;
      
      for (const line of lines) {
        if (yPosition < margin) {
          // Add new page if needed
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = newPage.getHeight() - margin;
        }
        
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= fontSize * 1.5;
      }

      // Convert to base64
      const pdfBytes = await pdfDoc.save();
      const base64 = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Create a File object
      const file = new File([pdfBytes], 'ai-generated-contract.pdf', {
        type: 'application/pdf',
      });
      
      setFiles([file]);
      setPdfDataUrl(`data:application/pdf;base64,${base64}`);
      setShowAIModal(false);
      setAIPrompt('');
      toast.success('Contract generated successfully!');
    } catch (error) {
      toast.error('Failed to generate contract');
      console.error(error);
    } finally {
      setGeneratingContract(false);
    }
  };

  if (showEditor && room) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Add Signature Fields</h2>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop fields where signers need to fill information
            </p>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <PDFFieldEditor
              pdfData={pdfDataUrl}
              roomId={roomId}
              participants={room.participants}
              onSave={handleSaveWithFields}
            />
          </div>
          
          <div className="p-4 border-t flex justify-end space-x-3">
            <button
              onClick={() => setShowEditor(false)}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 rounded-2xl hover:bg-white/10 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card glossy">
        <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Upload Document</h3>
        
        {files.length === 0 ? (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? 'border-primary-500 bg-primary-500/10 backdrop-blur-sm'
                  : 'border-white/30 hover:border-white/50 bg-white/5 backdrop-blur-sm'
              }`}
            >
              <input {...getInputProps()} />
              <div className="relative mx-auto mb-4 w-12 h-12">
                <Upload className="w-12 h-12 text-gray-400" />
                <div className="absolute inset-0 w-12 h-12 bg-gray-400/20 blur-xl"></div>
              </div>
              <p className="text-gray-600">
                {isDragActive
                  ? 'Drop the PDF here...'
                  : 'Drag & drop a PDF here, or click to select'}
              </p>
              <p className="text-sm text-gray-500 mt-2">Only PDF files are supported</p>
            </div>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowAIModal(true)}
              className="w-full btn-secondary flex items-center justify-center glossy liquid-border">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Contract with AI
            </button>
          </>
        ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-white/30 rounded-2xl bg-white/10 backdrop-blur-sm">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-primary-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">{files[0].name}</p>
                <p className="text-sm text-gray-500">
                  {(files[0].size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-500 hover:text-red-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={handleAddFields}
            className="w-full btn-primary flex items-center justify-center glossy ripple"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Add Signature Fields
          </button>
        </div>
      )}
    </div>

    {/* AI Contract Generation Modal */}
    {showAIModal && (
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
        <div className="modal-glass w-full max-w-2xl">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">Generate Contract with AI</h2>
            <p className="text-sm text-gray-600 mt-1">
              Describe your contract requirements and we'll generate a professional contract for you
            </p>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Description
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAIPrompt(e.target.value)}
                  placeholder="Example: I need a web development contract for building an e-commerce website. The project includes frontend development with React, backend with Node.js, database setup, and payment integration. Timeline is 3 months with milestone-based payments."
                  className="input"
                  rows={6}
                />
              </div>
              
              <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 backdrop-blur-sm border border-white/20">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Tips for better results:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Include the type of work (web development, design, consulting, etc.)</li>
                  <li>• Specify deliverables and milestones</li>
                  <li>• Mention payment terms and schedule</li>
                  <li>• Add any special requirements or conditions</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-white/20 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowAIModal(false);
                setAIPrompt('');
              }}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 rounded-2xl hover:bg-white/10 transition-all duration-200"
              disabled={generatingContract}
            >
              Cancel
            </button>
            <button
              onClick={generateContractFromPrompt}
              disabled={generatingContract || !aiPrompt.trim()}
              className="btn-primary flex items-center glossy ripple"
            >
              {generatingContract ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Contract
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}