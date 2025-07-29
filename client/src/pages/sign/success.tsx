import { useRouter } from 'next/router';
import { CheckCircle, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function SigningSuccess() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Document Signed Successfully!
            </h1>
            
            <p className="text-gray-600 mb-8">
              Your signature has been recorded and the document has been permanently stored on the blockchain.
            </p>

            {id && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Blockchain Transaction ID:</p>
                <div className="flex items-center justify-center space-x-2">
                  <code className="text-xs bg-white px-3 py-1 rounded border">
                    {id}
                  </code>
                  <a
                    href={`https://arweave.net/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button className="w-full btn-primary flex items-center justify-center">
                <Download className="w-4 h-4 mr-2" />
                Download Signed Document
              </button>
              
              <p className="text-sm text-gray-600">
                A copy has also been sent to your email address
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Powered by{' '}
            <Link href="/" className="text-primary-600 hover:text-primary-700">
              SecureContract
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}