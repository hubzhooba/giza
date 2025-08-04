import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Cloud, AlertCircle, Package } from 'lucide-react';
import { EncryptionService } from '@/lib/encryption';
import { StoarService } from '@/lib/stoar';
import { useStore } from '@/store/useStore';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface BatchDocumentUploadProps {
  roomId: string;
  encryptionKey: string;
  onUploadComplete?: () => void;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  encrypted?: boolean;
  uploadProgress?: number;
}

export default function BatchDocumentUpload({ roomId, encryptionKey, onUploadComplete }: BatchDocumentUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [stoarInitialized, setStoarInitialized] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  
  const { addDocument, rooms, user, addActivity } = useStore();
  const encryption = EncryptionService.getInstance();
  const stoar = StoarService.getInstance();
  
  const room = rooms.find(r => r.id === roomId);

  // Initialize STOAR
  useEffect(() => {
    const initStoar = async () => {
      try {
        const walletKey = process.env.NEXT_PUBLIC_ARWEAVE_WALLET_KEY;
        await stoar.init(walletKey || undefined);
        setStoarInitialized(true);

        const { balance } = await stoar.checkBalance();
        setWalletBalance(balance);
      } catch (error) {
        console.error('Failed to initialize STOAR:', error);
        toast.error('Failed to connect to Arweave wallet');
      }
    };

    initStoar();
  }, []);

  // Calculate estimated cost based on file sizes
  useEffect(() => {
    if (files.length > 0) {
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      // Rough estimate: 0.00001 AR per KB
      const estimatedAR = (totalSize / 1024) * 0.00001;
      setEstimatedCost(estimatedAR.toFixed(6));
    } else {
      setEstimatedCost('');
    }
  }, [files]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        id: uuidv4(),
        preview: URL.createObjectURL(file)
      }) as FileWithPreview
    );
    
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleBatchUpload = async () => {
    if (!stoarInitialized) {
      toast.error('STOAR not initialized. Please check your wallet connection.');
      return;
    }

    setUploading(true);
    setUploadProgress({ completed: 0, total: files.length });

    try {
      // Enable auto-batching for efficient upload
      stoar.enableAutoBatching({
        timeout: 60000, // 1 minute timeout
        maxFiles: files.length,
        maxBytes: 100 * 1024 * 1024 // 100MB max
      });

      const uploadPromises = files.map(async (file, index) => {
        try {
          // Read file content
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          // Encrypt the file
          const { encrypted, nonce } = await encryption.encryptData(base64, encryptionKey);
          
          const documentId = uuidv4();
          const encryptedDocumentData = JSON.stringify({
            encrypted,
            nonce,
            metadata: {
              name: file.name,
              type: file.type,
              size: file.size,
              createdAt: new Date().toISOString(),
              createdBy: user?.id || 'unknown'
            }
          });

          // Upload to Arweave using STOAR (will be batched automatically)
          const uploadResult = await stoar.uploadDocument(
            encryptedDocumentData,
            {
              name: `${file.name}.encrypted`,
              contentType: 'application/json',
              roomId,
              documentId,
              encrypted: true
            },
            {
              tags: {
                'File-Name': file.name,
                'File-Type': file.type,
                'Batch-Upload': 'true',
                'User-ID': user?.id || 'unknown'
              },
              batch: true, // Enable batching for this upload
              progress: (progress) => {
                console.log(`File ${index + 1}/${files.length}: ${progress}%`);
              }
            }
          );

          // Create document record
          const document = {
            id: documentId,
            roomId,
            name: file.name,
            type: 'contract' as const,
            encryptedContent: JSON.stringify({ encrypted, nonce }),
            arweaveId: uploadResult.id,
            arweaveUrl: uploadResult.url,
            signatures: [],
            status: 'draft' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          addDocument(document);
          
          setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          
          return { success: true, document, file };
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          return { success: false, file, error };
        }
      });

      const results = await Promise.all(uploadPromises);
      
      // Small delay to ensure all files are properly queued
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Commit the batch
      const batchResult = await stoar.disableAutoBatching();
      
      if (batchResult) {
        toast.success(`Batch uploaded successfully! Bundle ID: ${batchResult.bundleId}`);
        console.log(`Batch upload completed successfully!`);
      }

      // Add activity for batch upload
      if (user && room) {
        const successCount = results.filter(r => r.success).length;
        addActivity({
          type: 'document_uploaded',
          tentId: roomId,
          tentName: room.name,
          userId: user.id,
          userName: user.name || user.email,
          message: `Uploaded ${successCount} documents in batch`
        });
      }

      // Clear successful uploads
      const successfulIds = results
        .filter(r => r.success)
        .map(r => r.file.id);
      
      setFiles(prev => prev.filter(f => !successfulIds.includes(f.id)));
      
      if (onUploadComplete) {
        onUploadComplete();
      }

      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        toast.error(`${failedCount} files failed to upload`);
      } else {
        toast.success('All documents uploaded successfully!');
      }
    } catch (error) {
      console.error('Batch upload error:', error);
      toast.error('Batch upload failed');
    } finally {
      setUploading(false);
      setUploadProgress({ completed: 0, total: 0 });
    }
  };

  return (
    <div className="card glossy">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Batch Document Upload
          </h3>
          <p className="text-sm text-gray-600 mt-1">Upload multiple documents at once to save on transaction fees</p>
        </div>
        {stoarInitialized && walletBalance && (
          <div className="text-right">
            <div className="flex items-center text-sm text-gray-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>Balance: {walletBalance} AR</span>
            </div>
            {estimatedCost && (
              <div className="text-xs text-gray-500 mt-1">
                Est. cost: ~{estimatedCost} AR
              </div>
            )}
          </div>
        )}
      </div>

      {files.length === 0 ? (
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
            <Package className="w-12 h-12 text-gray-400" />
            <div className="absolute inset-0 w-12 h-12 bg-gray-400/20 blur-xl"></div>
          </div>
          <p className="text-gray-600">
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag & drop multiple files here, or click to select'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports PDF, Images, Word documents
          </p>
          <div className="mt-4 inline-flex items-center text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <Cloud className="w-3 h-3 mr-1" />
            Save up to 90% on fees with batch upload
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center flex-1">
                  <FileText className="w-6 h-6 text-primary-600 mr-3 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-3 text-gray-500 hover:text-red-600 transition"
                  disabled={uploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Uploading documents...
                </span>
                <span className="text-sm text-blue-700">
                  {uploadProgress.completed}/{uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-gray-600">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setFiles([])}
                className="btn-secondary"
                disabled={uploading}
              >
                Clear All
              </button>
              <button
                onClick={handleBatchUpload}
                disabled={uploading || !stoarInitialized}
                className="btn-primary flex items-center glossy ripple"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Batch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}