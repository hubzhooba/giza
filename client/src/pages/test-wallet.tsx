import { useState } from 'react';
import { useArweaveWallet } from '@/contexts/ArweaveWalletProvider';
import { arweaveWalletStorage } from '@/lib/arweave-wallet-storage';
import toast from 'react-hot-toast';

export default function TestWallet() {
  const { isConnected, walletAddress, balance, connect, disconnect } = useArweaveWallet();
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  const handleTestUpload = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    setUploading(true);
    try {
      // Initialize storage
      await arweaveWalletStorage.init();
      
      // Test data
      const testData = JSON.stringify({
        message: 'Test upload from Arweave Wallet Kit',
        timestamp: new Date().toISOString(),
        wallet: walletAddress
      });
      
      // Upload to Arweave
      const result = await arweaveWalletStorage.uploadDocument(
        testData,
        {
          name: 'test-document.json',
          contentType: 'application/json',
          encrypted: false
        },
        {
          tags: {
            'Test': 'true',
            'App-Name': 'Giza'
          }
        }
      );
      
      setUploadResult(result);
      toast.success('Upload successful!');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Arweave Wallet Test</h1>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Wallet Connection</h2>
          
          <div className="text-white space-y-2">
            <p>Status: {isConnected ? 'Connected' : 'Not Connected'}</p>
            {walletAddress && (
              <>
                <p>Address: {walletAddress}</p>
                <p>Balance: {balance || 'Loading...'} AR</p>
              </>
            )}
          </div>
          
          <div className="mt-4 space-x-4">
            {!isConnected ? (
              <button
                onClick={connect}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Test Upload</h2>
          
          <button
            onClick={handleTestUpload}
            disabled={!isConnected || uploading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Test Upload to Arweave'}
          </button>
          
          {uploadResult && (
            <div className="mt-4 p-4 bg-black/20 rounded text-white">
              <p className="font-semibold">Upload Result:</p>
              <p>Transaction ID: {uploadResult.id}</p>
              <p>
                URL: <a href={uploadResult.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">
                  {uploadResult.url}
                </a>
              </p>
              <p>Size: {uploadResult.size} bytes</p>
              <p>Content Type: {uploadResult.contentType}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}