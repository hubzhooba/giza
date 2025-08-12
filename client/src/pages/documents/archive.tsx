import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/DashboardLayout';
import DocumentQuery from '@/components/DocumentQuery';
import { withArConnectAuth } from '@/contexts/ArConnectContext';
import { StoarService } from '@/lib/stoar';
import { handleStoarError } from '@/lib/stoar-error-handler';
import { FileText, Download, Eye, Info } from 'lucide-react';
import type { QueryResult } from '@stoar/sdk';
import toast from 'react-hot-toast';

function DocumentArchive() {
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState<QueryResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const stoar = StoarService.getInstance();

  const handleDocumentSelect = (doc: QueryResult) => {
    setSelectedDocument(doc);
  };

  const handleDownload = async () => {
    if (!selectedDocument) return;

    setDownloading(true);
    try {
      // Try to initialize STOAR - it will handle failures gracefully
      await stoar.init();
      
      // Check if STOAR is initialized before trying to download
      if (!stoar.getIsInitialized()) {
        toast.error('Unable to connect to Arweave. Please check your wallet connection.');
        return;
      }

      // Fetch the document
      const data = await stoar.getDocument(selectedDocument.id);
      
      // Parse the encrypted document
      const content = JSON.parse(new TextDecoder().decode(data));
      
      // Create a blob and download
      const blob = new Blob([JSON.stringify(content, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDocument.tags['File-Name'] || selectedDocument.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Document downloaded successfully');
    } catch (error) {
      handleStoarError(error, { 
        operation: 'download',
        fileName: selectedDocument.tags['File-Name']
      });
    } finally {
      setDownloading(false);
    }
  };

  const getTagValue = (tags: Record<string, string>, key: string, defaultValue = 'Unknown') => {
    return tags[key] || defaultValue;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Document Archive - Giza</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Document Archive</h1>
          <p className="mt-2 text-gray-600">
            Browse and search all documents stored on Arweave
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Document List */}
          <div className="lg:col-span-2">
            <DocumentQuery onDocumentSelect={handleDocumentSelect} />
          </div>

          {/* Document Details */}
          <div className="lg:col-span-1">
            <div className="card glossy sticky top-8">
              <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Document Details
              </h3>

              {selectedDocument ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center p-6 bg-gray-50 rounded-xl">
                    <FileText className="w-16 h-16 text-gray-400" />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">File Name</p>
                      <p className="mt-1 text-gray-900 break-all">
                        {getTagValue(selectedDocument.tags, 'File-Name')}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">Transaction ID</p>
                      <p className="mt-1 text-xs text-gray-900 font-mono break-all">
                        {selectedDocument.id}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">Upload Date</p>
                      <p className="mt-1 text-gray-900">
                        {formatDate(selectedDocument.block?.timestamp)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">Content Type</p>
                      <p className="mt-1 text-gray-900">
                        {getTagValue(selectedDocument.tags, 'Content-Type')}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <div className="mt-1 flex items-center space-x-2">
                        {selectedDocument.tags['Encrypted'] === 'true' ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Encrypted
                          </span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Unencrypted
                          </span>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          On Arweave
                        </span>
                      </div>
                    </div>

                    {selectedDocument.tags['Room-ID'] && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Room ID</p>
                        <p className="mt-1 text-xs text-gray-900 font-mono">
                          {selectedDocument.tags['Room-ID']}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="w-full btn-primary flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {downloading ? 'Downloading...' : 'Download JSON'}
                    </button>

                    <a
                      href={`https://arweave.net/${selectedDocument.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full btn-secondary flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View on Arweave
                    </a>
                  </div>

                  <div className="pt-4 p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Note</p>
                        <p>
                          This document is permanently stored on the Arweave blockchain. 
                          {selectedDocument.tags['Encrypted'] === 'true' && 
                            ' The content is encrypted and requires the room encryption key to decrypt.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a document to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withArConnectAuth(DocumentArchive);
