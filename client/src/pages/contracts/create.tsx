import { useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import PDFFieldEditor from '@/components/PDFFieldEditor';
import { 
  FileText, Sparkles, Upload, ArrowRight, Check, 
  AlertCircle, Edit3, Users, Save
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { ArweaveService } from '@/lib/arweave';
import { EncryptionService } from '@/lib/encryption';
import { Participant } from '@/types';
import { ProtectedPage } from '@/components/ProtectedPage';

type ContractStep = 'select' | 'ai-generate' | 'upload' | 'add-fields' | 'review';

interface AIContractForm {
  type: string;
  parties: {
    clientName: string;
    clientEmail: string;
    providerName: string;
    providerEmail: string;
  };
  scope: string;
  deliverables: string;
  timeline: string;
  payment: string;
  additionalTerms: string;
}

export default function CreateContract() {
  const router = useRouter();
  const { user, addRoom } = useStore();
  const [currentStep, setCurrentStep] = useState<ContractStep>('select');
  const [contractMethod, setContractMethod] = useState<'ai' | 'upload' | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfData, setPdfData] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [contractFields, setContractFields] = useState<any[]>([]);
  const [aiForm, setAiForm] = useState<AIContractForm>({
    type: 'service-agreement',
    parties: {
      clientName: '',
      clientEmail: '',
      providerName: user?.name || '',
      providerEmail: user?.email || '',
    },
    scope: '',
    deliverables: '',
    timeline: '',
    payment: '',
    additionalTerms: '',
  });
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const arweave = ArweaveService.getInstance();
  const encryption = EncryptionService.getInstance();

  const contractTemplates = [
    { id: 'service-agreement', name: 'Service Agreement', description: 'General services contract' },
    { id: 'web-development', name: 'Web Development', description: 'Website/app development' },
    { id: 'design-services', name: 'Design Services', description: 'Graphic/UI/UX design' },
    { id: 'consulting', name: 'Consulting Agreement', description: 'Professional consulting' },
    { id: 'content-creation', name: 'Content Creation', description: 'Writing, video, social media' },
  ];

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile(file);
      
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      setPdfData(`data:application/pdf;base64,${base64}`);
      setCurrentStep('add-fields');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const generateAIContract = async () => {
    setLoading(true);
    try {
      // Simulate AI generation - in production, call OpenAI API
      const contractContent = `
SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of ${new Date().toLocaleDateString()} between:

PROVIDER: ${aiForm.parties.providerName} ("Provider")
Email: ${aiForm.parties.providerEmail}

CLIENT: ${aiForm.parties.clientName} ("Client")
Email: ${aiForm.parties.clientEmail}

1. SCOPE OF WORK
${aiForm.scope}

2. DELIVERABLES
${aiForm.deliverables}

3. TIMELINE
${aiForm.timeline}

4. PAYMENT TERMS
${aiForm.payment}

5. ADDITIONAL TERMS
${aiForm.additionalTerms}

6. CONFIDENTIALITY
Both parties agree to maintain confidentiality of all proprietary information.

7. INTELLECTUAL PROPERTY
Upon full payment, all deliverables become the property of the Client.

8. TERMINATION
Either party may terminate this agreement with 30 days written notice.

9. GOVERNING LAW
This agreement shall be governed by the laws of the jurisdiction where the Provider is located.

SIGNATURES:

_______________________               _______________________
Provider Signature                     Client Signature
Date: _____________                   Date: _____________
      `;

      setGeneratedContract(contractContent);
      
      // Convert to PDF (in production, use a proper PDF generation library)
      // For now, we'll simulate with a data URL
      setPdfData('data:application/pdf;base64,JVBERi0xLjQKJeLjz9M...'); // Mock PDF data
      
      toast.success('Contract generated successfully!');
      setCurrentStep('add-fields');
    } catch (error) {
      toast.error('Failed to generate contract');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldsSaved = async (fields: any[], pdfBytes: Uint8Array) => {
    setContractFields(fields);
    setLoading(true);
    
    try {
      // Store V1 on Arweave
      const contractData = {
        version: 1,
        createdBy: user?.email,
        createdAt: new Date().toISOString(),
        type: contractMethod === 'ai' ? 'ai-generated' : 'uploaded',
        fields: fields,
        status: 'draft',
      };

      const arweaveResult = await arweave.uploadDocument(
        contractData,
        [
          { name: 'App-Name', value: 'SecureContract' },
          { name: 'Contract-Version', value: '1' },
          { name: 'Document-Type', value: 'Contract-Draft' },
        ]
      );

      // Create room with contract reference
      const roomKey = await encryption.generateRoomKey();
      const roomId = uuidv4();
      
      const room = {
        id: roomId,
        name: contractMethod === 'ai' ? `${aiForm.type} Contract` : uploadedFile?.name || 'Contract',
        creatorId: user!.id,
        inviteeId: undefined, // Will be set when other party joins
        participants: [
          {
            userId: user!.id,
            email: user!.email,
            name: user!.name,
            role: 'creator',
            hasJoined: true,
            publicKey: user!.publicKey,
            joinedAt: new Date(),
          },
        ] as Participant[],
        encryptionKey: roomKey,
        contractData: {
          arweaveId: arweaveResult.id,
          version: 1,
          fields: fields,
          status: 'draft' as const,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending' as const, // Pending until other party joins
      };

      // If AI generated, add client as participant
      if (contractMethod === 'ai' && aiForm.parties.clientEmail) {
        room.participants.push({
          userId: uuidv4(),
          email: aiForm.parties.clientEmail,
          name: aiForm.parties.clientName,
          role: 'signer',
          hasJoined: false,
        });
      }

      await addRoom(room);
      toast.success('Contract created and stored on blockchain!');
      router.push(`/contracts/${roomId}/invite`);
    } catch (error) {
      toast.error('Failed to save contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage>
      <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Create New Contract</h1>
          <p className="text-gray-600 mt-2">
            Generate with AI or upload your own contract document
          </p>
        </div>

        {currentStep === 'select' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => {
                setContractMethod('ai');
                setCurrentStep('ai-generate');
              }}
              className="bg-white rounded-lg shadow-sm p-8 border-2 border-transparent hover:border-primary-500 transition text-left"
            >
              <Sparkles className="w-12 h-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Generate with AI</h3>
              <p className="text-gray-600">
                Let AI create a professional contract based on your requirements
              </p>
            </button>

            <button
              onClick={() => {
                setContractMethod('upload');
                setCurrentStep('upload');
              }}
              className="bg-white rounded-lg shadow-sm p-8 border-2 border-transparent hover:border-primary-500 transition text-left"
            >
              <Upload className="w-12 h-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Upload Contract</h3>
              <p className="text-gray-600">
                Upload an existing PDF contract to add signature fields
              </p>
            </button>
          </div>
        )}

        {currentStep === 'ai-generate' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold mb-6">Generate Contract with AI</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contract Type
                </label>
                <select
                  value={aiForm.type}
                  onChange={(e) => setAiForm(prev => ({ ...prev, type: e.target.value }))}
                  className="input"
                >
                  {contractTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Provider Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={aiForm.parties.providerName}
                        onChange={(e) => setAiForm(prev => ({
                          ...prev,
                          parties: { ...prev.parties, providerName: e.target.value }
                        }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Email
                      </label>
                      <input
                        type="email"
                        value={aiForm.parties.providerEmail}
                        onChange={(e) => setAiForm(prev => ({
                          ...prev,
                          parties: { ...prev.parties, providerEmail: e.target.value }
                        }))}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Client Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Name
                      </label>
                      <input
                        type="text"
                        value={aiForm.parties.clientName}
                        onChange={(e) => setAiForm(prev => ({
                          ...prev,
                          parties: { ...prev.parties, clientName: e.target.value }
                        }))}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Email
                      </label>
                      <input
                        type="email"
                        value={aiForm.parties.clientEmail}
                        onChange={(e) => setAiForm(prev => ({
                          ...prev,
                          parties: { ...prev.parties, clientEmail: e.target.value }
                        }))}
                        className="input"
                        placeholder="client@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scope of Work
                </label>
                <textarea
                  value={aiForm.scope}
                  onChange={(e) => setAiForm(prev => ({ ...prev, scope: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Describe the services to be provided..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deliverables
                </label>
                <textarea
                  value={aiForm.deliverables}
                  onChange={(e) => setAiForm(prev => ({ ...prev, deliverables: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="List specific deliverables..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline
                  </label>
                  <input
                    type="text"
                    value={aiForm.timeline}
                    onChange={(e) => setAiForm(prev => ({ ...prev, timeline: e.target.value }))}
                    className="input"
                    placeholder="e.g., 4 weeks from start date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={aiForm.payment}
                    onChange={(e) => setAiForm(prev => ({ ...prev, payment: e.target.value }))}
                    className="input"
                    placeholder="e.g., $5,000 total, 50% upfront"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Terms (Optional)
                </label>
                <textarea
                  value={aiForm.additionalTerms}
                  onChange={(e) => setAiForm(prev => ({ ...prev, additionalTerms: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Any additional terms or conditions..."
                />
              </div>

              <div className="flex justify-between pt-6">
                <button
                  onClick={() => setCurrentStep('select')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={generateAIContract}
                  disabled={loading || !aiForm.parties.clientEmail || !aiForm.scope}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Contract'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold mb-6">Upload Your Contract</h2>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                {isDragActive
                  ? 'Drop your contract here...'
                  : 'Drag & drop your contract PDF here'}
              </p>
              <p className="text-sm text-gray-500">or click to browse files</p>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep('select')}
                className="text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {currentStep === 'add-fields' && pdfData && (
          <div className="bg-white rounded-lg shadow-xl">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Add Signature Fields</h2>
              <p className="text-sm text-gray-600 mt-1">
                Place fields where parties need to sign or fill information
              </p>
            </div>
            
            <div className="h-[600px]">
              <PDFFieldEditor
                pdfData={pdfData}
                roomId="temp"
                participants={[
                  { 
                    email: aiForm.parties.providerEmail || user?.email || '', 
                    name: aiForm.parties.providerName || user?.name || '', 
                    role: 'creator' 
                  },
                  { 
                    email: aiForm.parties.clientEmail || 'client@example.com', 
                    name: aiForm.parties.clientName || 'Client', 
                    role: 'signer' 
                  },
                ]}
                onSave={handleFieldsSaved}
              />
            </div>
          </div>
        )}
      </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}