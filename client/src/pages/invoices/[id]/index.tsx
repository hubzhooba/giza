import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { 
  FileText, Clock, DollarSign, Calendar, CheckCircle,
  XCircle, Send, Copy, ExternalLink, Bitcoin, CreditCard,
  Download, Mail, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ProtectedPage } from '@/components/ProtectedPage';

interface PaymentScheduleItem {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  transactionId?: string;
}

export default function InvoiceDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { documents } = useStore();
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'activity'>('details');
  const [sending, setSending] = useState(false);
  
  const invoice = documents.find(d => d.id === id && d.type === 'invoice');
  const invoiceData = invoice?.invoiceData;

  if (!invoice || !invoiceData) {
    return (
      <ProtectedPage>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Invoice not found</p>
          </div>
        </DashboardLayout>
      </ProtectedPage>
    );
  }

  // Since Invoice doesn't have paymentSchedules, we'll use status to determine payment
  const totalPaid = invoiceData.status === 'paid' ? invoiceData.totalAmount : 0;
  
  const totalDue = invoiceData.totalAmount - totalPaid;
  const isPaid = invoiceData.status === 'paid';
  const isOverdue = new Date(invoiceData.dueDate) < new Date() && !isPaid;

  const generatePaymentLink = () => {
    const token = btoa(JSON.stringify({ 
      invoiceId: invoice.id,
      amount: totalDue,
      currency: invoiceData.currency,
    }));
    return `${window.location.origin}/pay/${token}`;
  };

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(generatePaymentLink());
    toast.success('Payment link copied!');
  };

  const sendInvoice = async () => {
    setSending(true);
    try {
      // Simulate sending
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Invoice sent successfully!');
    } catch (error) {
      toast.error('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const downloadInvoice = () => {
    // In production, generate PDF
    toast.success('Downloading invoice...');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="flex items-center text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full text-sm">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center text-red-600 bg-red-100 px-3 py-1 rounded-full text-sm">
            <XCircle className="w-4 h-4 mr-1" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedPage>
      <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Invoice #{invoice.id.slice(0, 8)}</h1>
              <p className="text-gray-600 mt-2">
                Issued on {new Date(invoiceData.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {!isPaid && (
                <button
                  onClick={sendInvoice}
                  disabled={sending}
                  className="btn-secondary flex items-center"
                >
                  {sending ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Invoice
                </button>
              )}
              <button
                onClick={downloadInvoice}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              {isPaid ? (
                getStatusBadge('paid')
              ) : isOverdue ? (
                getStatusBadge('overdue')
              ) : (
                getStatusBadge('pending')
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-semibold">
                {invoiceData.currency === 'USD' || invoiceData.currency === 'USDC' ? '$' : ''}
                {invoiceData.totalAmount.toLocaleString()} {invoiceData.currency}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
              <p className="text-2xl font-semibold text-green-600">
                {invoiceData.currency === 'USD' || invoiceData.currency === 'USDC' ? '$' : ''}
                {totalPaid.toLocaleString()} {invoiceData.currency}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Balance Due</p>
              <p className="text-2xl font-semibold text-red-600">
                {invoiceData.currency === 'USD' || invoiceData.currency === 'USDC' ? '$' : ''}
                {totalDue.toLocaleString()} {invoiceData.currency}
              </p>
            </div>
          </div>

          {invoice.arweaveId && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-1">Blockchain Record</p>
              <a
                href={`https://arweave.net/${invoice.arweaveId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
              >
                View on Arweave
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Invoice Details
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'payments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Payment Schedule
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activity'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Activity
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Information</h3>
                
                <dl className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">From</dt>
                      <dd className="mt-1">
                        <p className="font-medium text-gray-900">{invoiceData.fromUser?.name}</p>
                        <p className="text-sm text-gray-600">{invoiceData.fromUser?.email}</p>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">To</dt>
                      <dd className="mt-1">
                        <p className="font-medium text-gray-900">{invoiceData.toUser?.name}</p>
                        <p className="text-sm text-gray-600">{invoiceData.toUser?.email}</p>
                      </dd>
                    </div>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contract Reference</dt>
                    <dd className="mt-1">
                      <Link
                        href={`/contracts/${invoiceData.roomId}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        View Contract
                      </Link>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Options</h3>
                
                {!isPaid && (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Share this secure link with your client for payment:
                    </p>
                    
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-3">
                        <input
                          type="text"
                          value={generatePaymentLink()}
                          readOnly
                          className="flex-1 bg-transparent text-xs text-gray-700 outline-none"
                        />
                        <button
                          onClick={copyPaymentLink}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    {invoiceData.paymentMethod.type === 'crypto' ? (
                      <>
                        <Bitcoin className="w-8 h-8 text-yellow-500" />
                        <div>
                          <p className="font-medium">Cryptocurrency</p>
                          <p className="text-xs text-gray-500">Accept BTC, ETH, USDC with escrow</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="font-medium">Traditional Payment</p>
                          <p className="text-xs text-gray-500">Bank transfer or credit card</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Invoice Items</h3>
            
            <div className="space-y-4">
              {invoiceData.items.map((item, index) => {
                return (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{item.description}</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Quantity:</span>
                            <span className="ml-2 font-medium">{item.quantity}</span>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Unit Price:</span>
                            <span className="ml-2 font-medium">
                              {invoiceData.currency === 'USD' || invoiceData.currency === 'USDC' ? '$' : ''}
                              {item.unitPrice.toLocaleString()} {invoiceData.currency}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Amount:</span>
                            <span className="ml-2 font-medium">
                              {invoiceData.currency === 'USD' || invoiceData.currency === 'USDC' ? '$' : ''}
                              {item.amount.toLocaleString()} {invoiceData.currency}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-lg font-semibold">
                    {invoiceData.currency === 'USD' || invoiceData.currency === 'USDC' ? '$' : ''}
                    {invoiceData.totalAmount.toLocaleString()} {invoiceData.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Activity History</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Invoice created</p>
                  <p className="text-xs text-gray-500">{new Date(invoiceData.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              {/* Additional activity items would go here */}
            </div>
          </div>
        )}
      </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}