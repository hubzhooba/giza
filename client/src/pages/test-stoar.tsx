import { useState, useEffect } from 'react';
import { StoarService } from '@/lib/stoar';
import { handleStoarError } from '@/lib/stoar-error-handler';
import { getHealthyGateway } from '@/lib/arweave-gateways';
import toast, { Toaster } from 'react-hot-toast';
import { Upload, Download, Package, AlertCircle, CheckCircle, Loader2, Globe } from 'lucide-react';

export default function TestStoar() {
  const [stoarInitialized, setStoarInitialized] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [currentGateway, setCurrentGateway] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [downloadedContent, setDownloadedContent] = useState<string>('');
  const [testResults, setTestResults] = useState<{[key: string]: boolean}>({});

  const stoar = StoarService.getInstance();

  // Initialize STOAR
  useEffect(() => {
    initializeStoar();
  }, []);

  const initializeStoar = async () => {
    setLoading(true);
    try {
      // Get the healthy gateway first
      const gateway = await getHealthyGateway();
      setCurrentGateway(gateway);
      toast.success(`Connected to gateway: ${new URL(gateway).hostname}`);
      
      // Check if wallet key is available in environment
      const walletKey = process.env.NEXT_PUBLIC_ARWEAVE_WALLET_KEY;
      
      if (walletKey) {
        // Parse wallet key if it's a JSON string
        const wallet = walletKey.startsWith('{') ? JSON.parse(walletKey) : walletKey;
        await stoar.init(wallet);
      } else {
        // Try to use ArConnect
        await stoar.init();
      }
      
      setStoarInitialized(true);
      setTestResults(prev => ({ ...prev, initialization: true }));
      toast.success('STOAR initialized successfully!');

      // Get wallet info
      const address = stoar.getAddress();
      setWalletAddress(address);

      // Check balance
      const { balance, sufficient } = await stoar.checkBalance();
      setWalletBalance(balance);
      
      if (!sufficient) {
        toast('Low balance! You need at least 0.01 AR for transactions.', {
          icon: '⚠️',
          duration: 5000
        });
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, initialization: false }));
      handleStoarError(error, { operation: 'init' });
      console.error('Initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSingleUpload = async () => {
    if (!stoarInitialized) {
      toast.error('Please initialize STOAR first');
      return;
    }

    setLoading(true);
    try {
      const testData = `Test document created at ${new Date().toISOString()}`;
      const result = await stoar.uploadDocument(
        testData,
        {
          name: 'test-document.txt',
          contentType: 'text/plain',
          roomId: 'test-room-001',
          documentId: 'test-doc-001',
          encrypted: false
        },
        {
          tags: {
            'Test': 'true',
            'Timestamp': Date.now().toString()
          },
          progress: (progress) => {
            console.log(`Upload progress: ${progress}%`);
          }
        }
      );

      setUploadResult(result);
      setTestResults(prev => ({ ...prev, singleUpload: true }));
      toast.success(`Document uploaded! ID: ${result.id}`);
      console.log('Upload result:', result);
    } catch (error) {
      setTestResults(prev => ({ ...prev, singleUpload: false }));
      handleStoarError(error, { operation: 'upload', fileName: 'test-document.txt' });
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testBatchUpload = async () => {
    if (!stoarInitialized) {
      toast.error('Please initialize STOAR first');
      return;
    }

    setLoading(true);
    try {
      const files = [
        {
          data: 'First test document content',
          metadata: {
            name: 'batch-doc-1.txt',
            contentType: 'text/plain',
            roomId: 'test-room-001',
            documentId: 'batch-doc-001',
            encrypted: false
          }
        },
        {
          data: 'Second test document content',
          metadata: {
            name: 'batch-doc-2.txt',
            contentType: 'text/plain',
            roomId: 'test-room-001',
            documentId: 'batch-doc-002',
            encrypted: false
          }
        },
        {
          data: JSON.stringify({ test: 'data', timestamp: Date.now() }),
          metadata: {
            name: 'batch-doc-3.json',
            contentType: 'application/json',
            roomId: 'test-room-001',
            documentId: 'batch-doc-003',
            encrypted: false
          }
        }
      ];

      const result = await stoar.uploadBatch(files, {
        bundleTags: {
          'Batch-Test': 'true',
          'Batch-Timestamp': Date.now().toString()
        },
        progress: (status) => {
          console.log(`Batch progress: ${status.completed}/${status.total} - ${status.current}`);
        }
      });

      setBatchResult(result);
      setTestResults(prev => ({ ...prev, batchUpload: true }));
      toast.success(`Batch uploaded! Bundle ID: ${result.bundleId}`);
      console.log('Batch result:', result);
    } catch (error) {
      setTestResults(prev => ({ ...prev, batchUpload: false }));
      handleStoarError(error, { operation: 'batch', fileCount: 3 });
      console.error('Batch upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDownload = async () => {
    if (!stoarInitialized) {
      toast.error('Please initialize STOAR first');
      return;
    }

    if (!uploadResult?.id) {
      toast.error('Please upload a document first');
      return;
    }

    setLoading(true);
    try {
      const data = await stoar.getDocument(uploadResult.id);
      const text = new TextDecoder().decode(data);
      setDownloadedContent(text);
      setTestResults(prev => ({ ...prev, download: true }));
      toast.success('Document downloaded successfully!');
      console.log('Downloaded content:', text);
    } catch (error) {
      setTestResults(prev => ({ ...prev, download: false }));
      handleStoarError(error, { operation: 'download' });
      console.error('Download error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testQuery = async () => {
    if (!stoarInitialized) {
      toast.error('Please initialize STOAR first');
      return;
    }

    setLoading(true);
    try {
      const results = await stoar.queryDocuments({
        roomId: 'test-room-001',
        limit: 10
      });

      setTestResults(prev => ({ ...prev, query: true }));
      toast.success(`Found ${results.length} documents`);
      console.log('Query results:', results);
    } catch (error) {
      setTestResults(prev => ({ ...prev, query: false }));
      handleStoarError(error, { operation: 'query' });
      console.error('Query error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testS3Compatibility = async () => {
    if (!stoarInitialized) {
      toast.error('Please initialize STOAR first');
      return;
    }

    setLoading(true);
    try {
      // Test S3-compatible putObject
      const result = await stoar.putObject({
        Key: 's3-test-document.txt',
        Body: 'S3 compatibility test content',
        ContentType: 'text/plain',
        Metadata: {
          'Test': 'true',
          'Type': 'S3-compatibility'
        }
      });

      setTestResults(prev => ({ ...prev, s3Compatibility: true }));
      toast.success('S3-compatible upload successful!');
      console.log('S3 upload result:', result);

      // Test S3-compatible getObject
      const downloaded = await stoar.getObject({ Key: result.id });
      const text = new TextDecoder().decode(downloaded.Body);
      console.log('S3 downloaded content:', text);
    } catch (error) {
      setTestResults(prev => ({ ...prev, s3Compatibility: false }));
      handleStoarError(error, { operation: 'upload' });
      console.error('S3 compatibility error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status?: boolean) => {
    if (status === undefined) return <AlertCircle className="w-4 h-4 text-gray-400" />;
    return status ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">STOAR Integration Test Suite</h1>

        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Initialization</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(testResults.initialization)}
                <span className="text-sm text-gray-400">
                  {stoarInitialized ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Gateway</span>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400 font-mono">
                  {currentGateway ? new URL(currentGateway).hostname : 'Not connected'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Wallet Address</span>
              <span className="text-sm text-gray-400 font-mono">
                {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Balance</span>
              <span className="text-sm text-gray-400">{walletBalance === 'unknown' ? 'Balance check failed' : walletBalance || '0'} AR</span>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={testSingleUpload}
            disabled={loading || !stoarInitialized}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            Test Single Upload
            {getStatusIcon(testResults.singleUpload)}
          </button>

          <button
            onClick={testBatchUpload}
            disabled={loading || !stoarInitialized}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
            Test Batch Upload
            {getStatusIcon(testResults.batchUpload)}
          </button>

          <button
            onClick={testDownload}
            disabled={loading || !stoarInitialized || !uploadResult}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Test Download
            {getStatusIcon(testResults.download)}
          </button>

          <button
            onClick={testQuery}
            disabled={loading || !stoarInitialized}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
            Test Query
            {getStatusIcon(testResults.query)}
          </button>

          <button
            onClick={testS3Compatibility}
            disabled={loading || !stoarInitialized}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white p-4 rounded-lg flex items-center justify-center gap-2 transition-colors col-span-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
            Test S3 Compatibility
            {getStatusIcon(testResults.s3Compatibility)}
          </button>
        </div>

        {/* Results Display */}
        {uploadResult && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Single Upload Result</h3>
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {JSON.stringify(uploadResult, null, 2)}
            </pre>
          </div>
        )}

        {batchResult && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Batch Upload Result</h3>
            <pre className="text-sm text-gray-300 overflow-x-auto">
              {JSON.stringify(batchResult, null, 2)}
            </pre>
          </div>
        )}

        {downloadedContent && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Downloaded Content</h3>
            <pre className="text-sm text-gray-300 overflow-x-auto">{downloadedContent}</pre>
          </div>
        )}

        {/* Test Summary */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Test Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(testResults).map(([test, passed]) => (
              <div key={test} className="flex items-center justify-between">
                <span className="text-gray-300 capitalize">{test.replace(/([A-Z])/g, ' $1').trim()}</span>
                {getStatusIcon(passed)}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm text-gray-400">
              {Object.values(testResults).filter(Boolean).length} / {Object.keys(testResults).length} tests passed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}