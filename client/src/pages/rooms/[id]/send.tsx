import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { Check, Send, Copy, Mail, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SendInvoice() {
  const router = useRouter();
  const { id: roomId } = router.query;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { rooms, user } = useStore();
  
  const room = rooms.find((r) => r.id === roomId);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!room || !user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Room not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const generateSigningLink = (email: string) => {
    // In production, generate a secure token with JWT containing document ID and signer email
    const token = btoa(JSON.stringify({ roomId, email, timestamp: Date.now() }));
    return `${window.location.origin}/sign/${token}`;
  };

  const invoiceLink = `${window.location.origin}/invoice/view/${roomId}`;
  const clients = room.participants.filter(p => p.role === 'signer');

  const handleSendInvoice = async () => {
    setSending(true);
    try {
      // Simulate sending email
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSent(true);
      toast.success('Invoice sent successfully!');
      
      // Update onboarding step
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error) {
      toast.error('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(invoiceLink);
    toast.success('Invoice link copied!');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps - All Complete */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">Create Room</span>
              </div>
              <div className="w-16 h-0.5 bg-green-600 mx-2" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">Upload Documents</span>
              </div>
              <div className="w-16 h-0.5 bg-green-600 mx-2" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">Review & Send</span>
              </div>
            </div>
          </div>
        </div>

        {!sent ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <Send className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Ready to Send Your Invoice</h1>
              <p className="text-gray-600">
                Your invoice for "{room.name}" is ready to be sent to your client
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">Document will be sent to:</h3>
              {clients.map((client, index) => (
                <div key={index} className="mb-4 last:mb-0">
                  <div className="flex items-center mb-2">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">{client.email}</p>
                    </div>
                  </div>
                  <div className="ml-8 text-xs text-gray-500">
                    Unique signing link: {generateSigningLink(client.email).substring(0, 50)}...
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your client will receive an email with a secure link to view and pay the invoice. 
                They can pay using their preferred cryptocurrency.
              </p>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm text-gray-600 mb-4">Or share this link directly:</p>
              <div className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3">
                <input
                  type="text"
                  value={invoiceLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                />
                <button
                  onClick={copyLink}
                  className="text-primary-600 hover:text-primary-700"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={handleSendInvoice}
                disabled={sending}
                className="flex items-center bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Invoice Now
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Invoice Sent Successfully!</h1>
              <p className="text-gray-600 mb-8">
                Your invoice has been sent to {clients[0]?.name}
              </p>
              <p className="text-sm text-gray-500 mb-4">Redirecting to dashboard...</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}