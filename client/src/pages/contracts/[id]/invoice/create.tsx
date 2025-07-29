import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { 
  DollarSign, Calendar, Calculator, AlertCircle, 
  Plus, Trash2, FileText, Clock, Percent, ArrowRight,
  CreditCard, Bitcoin, DollarSign as Crypto
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { ArweaveService } from '@/lib/arweave';
import type { Invoice } from '@/types';

interface PaymentSchedule {
  id: string;
  type: 'percentage' | 'fixed';
  amount: number;
  description: string;
  dueDate: string;
  milestone?: string;
}

interface InvoiceForm {
  contractId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'BTC' | 'ETH' | 'USDC';
  totalAmount: number;
  description: string;
  paymentSchedules: PaymentSchedule[];
  paymentMethod: {
    type: 'crypto' | 'fiat';
    network?: 'ethereum' | 'polygon' | 'solana' | 'bitcoin';
    token?: string;
    walletAddress?: string;
  };
  notes: string;
  // Billing details
  billingAddress?: string;
  taxId?: string;
  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientTaxId?: string;
}

export default function CreateInvoice() {
  const router = useRouter();
  const { id: contractId } = router.query;
  const { rooms, user, addDocument } = useStore();
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<'single' | 'milestone' | 'percentage'>('single');
  const arweave = ArweaveService.getInstance();
  
  const room = rooms.find(r => r.id === contractId);
  const contract = room?.contractData;
  
  const [form, setForm] = useState<InvoiceForm>({
    contractId: contractId as string,
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'USD',
    totalAmount: 0,
    description: '',
    paymentSchedules: [
      {
        id: uuidv4(),
        type: 'percentage',
        amount: 100,
        description: 'Full payment',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }
    ],
    paymentMethod: {
      type: 'crypto',
      network: 'ethereum',
      token: 'USDC',
      walletAddress: user?.publicKey || '',
    },
    notes: '',
    billingAddress: '',
    taxId: '',
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientTaxId: '',
  });

  useEffect(() => {
    if (!room || !room.participants.every(p => p.hasJoined)) {
      toast.error('Contract must be fully signed before creating invoices');
      router.push(`/contracts/${contractId}`);
    }
  }, [room, contractId, router]);

  const scheduleTemplates = [
    { 
      id: 'single', 
      name: 'One-time Payment', 
      description: 'Full payment on due date',
      icon: DollarSign,
      schedules: [
        { type: 'percentage' as const, amount: 100, description: 'Full payment' }
      ]
    },
    { 
      id: '50-50', 
      name: '50/50 Split', 
      description: '50% upfront, 50% on completion',
      icon: Percent,
      schedules: [
        { type: 'percentage' as const, amount: 50, description: 'Upfront payment' },
        { type: 'percentage' as const, amount: 50, description: 'Final payment' }
      ]
    },
    { 
      id: '60-40', 
      name: '60/40 Split', 
      description: '60% upfront, 40% on completion',
      icon: Percent,
      schedules: [
        { type: 'percentage' as const, amount: 60, description: 'Upfront payment' },
        { type: 'percentage' as const, amount: 40, description: 'Final payment' }
      ]
    },
    { 
      id: 'milestone', 
      name: 'Milestone-based', 
      description: 'Custom payments per milestone',
      icon: Clock,
      schedules: []
    },
  ];

  const applyTemplate = (templateId: string) => {
    const template = scheduleTemplates.find(t => t.id === templateId);
    if (!template) return;

    if (templateId === 'milestone') {
      setScheduleType('milestone');
      setForm(prev => ({
        ...prev,
        paymentSchedules: [
          {
            id: uuidv4(),
            type: 'percentage',
            amount: 33.33,
            description: 'Milestone 1: Project kickoff',
            dueDate: new Date().toISOString().split('T')[0],
            milestone: 'Project kickoff',
          },
          {
            id: uuidv4(),
            type: 'percentage',
            amount: 33.33,
            description: 'Milestone 2: Mid-project review',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            milestone: 'Mid-project review',
          },
          {
            id: uuidv4(),
            type: 'percentage',
            amount: 33.34,
            description: 'Milestone 3: Project completion',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            milestone: 'Project completion',
          },
        ]
      }));
    } else {
      setScheduleType(templateId === 'single' ? 'single' : 'percentage');
      const schedules = template.schedules.map((s, index) => ({
        ...s,
        id: uuidv4(),
        dueDate: new Date(Date.now() + (index * 15 + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));
      setForm(prev => ({ ...prev, paymentSchedules: schedules }));
    }
  };

  const addPaymentSchedule = () => {
    const newSchedule: PaymentSchedule = {
      id: uuidv4(),
      type: 'percentage',
      amount: 0,
      description: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    setForm(prev => ({
      ...prev,
      paymentSchedules: [...prev.paymentSchedules, newSchedule]
    }));
  };

  const removePaymentSchedule = (id: string) => {
    setForm(prev => ({
      ...prev,
      paymentSchedules: prev.paymentSchedules.filter(s => s.id !== id)
    }));
  };

  const updatePaymentSchedule = (id: string, updates: Partial<PaymentSchedule>) => {
    setForm(prev => ({
      ...prev,
      paymentSchedules: prev.paymentSchedules.map(s => 
        s.id === id ? { ...s, ...updates } : s
      )
    }));
  };

  const calculateScheduleAmounts = () => {
    if (form.totalAmount === 0) return [];
    
    return form.paymentSchedules.map(schedule => {
      if (schedule.type === 'percentage') {
        return {
          ...schedule,
          calculatedAmount: (form.totalAmount * schedule.amount) / 100,
        };
      }
      return {
        ...schedule,
        calculatedAmount: schedule.amount,
      };
    });
  };

  const getTotalPercentage = () => {
    return form.paymentSchedules
      .filter(s => s.type === 'percentage')
      .reduce((sum, s) => sum + s.amount, 0);
  };

  const getTotalFixed = () => {
    return form.paymentSchedules
      .filter(s => s.type === 'fixed')
      .reduce((sum, s) => sum + s.amount, 0);
  };

  const validateForm = () => {
    if (!form.totalAmount || form.totalAmount <= 0) {
      toast.error('Please enter a valid total amount');
      return false;
    }

    if (!form.description) {
      toast.error('Please add an invoice description');
      return false;
    }

    const totalPercentage = getTotalPercentage();
    if (totalPercentage > 0 && totalPercentage !== 100) {
      toast.error('Payment percentages must total 100%');
      return false;
    }

    const hasEmptySchedules = form.paymentSchedules.some(s => !s.description);
    if (hasEmptySchedules) {
      toast.error('Please fill in all payment schedule descriptions');
      return false;
    }

    return true;
  };

  const handleCreateInvoice = async () => {
    if (!validateForm() || !room) return;

    setLoading(true);
    try {
      const creator = room.participants.find(p => p.role === 'creator');
      const client = room.participants.find(p => p.role === 'signer');
      
      const invoiceData: Invoice = {
        id: uuidv4(),
        roomId: room.id,
        documentId: contract?.documentId || room.id,
        fromUser: {
          name: creator?.name || '',
          email: creator?.email || '',
          address: form.billingAddress || '',
          taxId: form.taxId,
        },
        toUser: {
          name: client?.name || form.clientName || '',
          email: client?.email || form.clientEmail || '',
          address: form.clientAddress || '',
          taxId: form.clientTaxId,
        },
        items: form.paymentSchedules.map(schedule => ({
          description: schedule.description,
          quantity: 1,
          unitPrice: schedule.type === 'fixed' ? schedule.amount : (form.totalAmount * schedule.amount) / 100,
          amount: schedule.type === 'fixed' ? schedule.amount : (form.totalAmount * schedule.amount) / 100,
        })),
        paymentMethod: {
          type: 'crypto',
          network: form.paymentMethod.network || 'ethereum',
          token: form.paymentMethod.token || 'USDC',
          walletAddress: form.paymentMethod.walletAddress || '',
        },
        status: 'draft',
        totalAmount: form.totalAmount,
        currency: form.currency,
        dueDate: new Date(form.dueDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store invoice on Arweave
      const arweaveResult = await arweave.uploadDocument(
        invoiceData,
        [
          { name: 'App-Name', value: 'SecureContract' },
          { name: 'Document-Type', value: 'Invoice' },
          { name: 'Contract-ID', value: room.id },
          { name: 'Invoice-Number', value: form.invoiceNumber },
        ]
      );

      // Add to local store
      addDocument({
        id: invoiceData.id,
        roomId: room.id,
        name: `Invoice ${form.invoiceNumber}`,
        type: 'invoice',
        arweaveId: arweaveResult.id,
        encryptedContent: '',
        fields: '',
        signatures: [],
        status: 'draft',
        invoiceData: invoiceData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast.success('Invoice created successfully!');
      router.push(`/invoices/${invoiceData.id}`);
    } catch (error) {
      toast.error('Failed to create invoice');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!room) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Contract not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const client = room.participants.find(p => p.role === 'signer');

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Create Invoice</h1>
          <p className="text-gray-600 mt-2">
            Bill for work defined in contract "{room.name}"
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Invoice Details */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm(prev => ({ ...prev, issueDate: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm(prev => ({ ...prev, currency: e.target.value as any }))}
                  className="input"
                >
                  <optgroup label="Fiat">
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </optgroup>
                  <optgroup label="Cryptocurrency">
                    <option value="BTC">BTC - Bitcoin</option>
                    <option value="ETH">ETH - Ethereum</option>
                    <option value="USDC">USDC - USD Coin</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {form.currency === 'USD' || form.currency === 'USDC' ? '$' : form.currency}
                  </span>
                  <input
                    type="number"
                    value={form.totalAmount}
                    onChange={(e) => setForm(prev => ({ ...prev, totalAmount: parseFloat(e.target.value) || 0 }))}
                    className="input pl-12"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="input"
                rows={3}
                placeholder="Brief description of services rendered..."
              />
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Payment Schedule</h2>
              <button
                onClick={addPaymentSchedule}
                className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Schedule
              </button>
            </div>

            {/* Quick Templates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {scheduleTemplates.map(template => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition text-left"
                  >
                    <Icon className="w-5 h-5 text-primary-600 mb-2" />
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="text-xs text-gray-500">{template.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Payment Schedules */}
            <div className="space-y-4">
              {form.paymentSchedules.map((schedule, index) => (
                <div key={schedule.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={schedule.type}
                        onChange={(e) => updatePaymentSchedule(schedule.id, { type: e.target.value as any })}
                        className="input"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {schedule.type === 'percentage' ? 'Percentage' : 'Amount'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={schedule.amount}
                          onChange={(e) => updatePaymentSchedule(schedule.id, { amount: parseFloat(e.target.value) || 0 })}
                          className="input pr-8"
                          placeholder="0"
                          step={schedule.type === 'percentage' ? '0.01' : '1'}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          {schedule.type === 'percentage' ? '%' : form.currency}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={schedule.dueDate}
                        onChange={(e) => updatePaymentSchedule(schedule.id, { dueDate: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div className="flex items-end">
                      {form.paymentSchedules.length > 1 && (
                        <button
                          onClick={() => removePaymentSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      type="text"
                      value={schedule.description}
                      onChange={(e) => updatePaymentSchedule(schedule.id, { description: e.target.value })}
                      className="input"
                      placeholder="Payment description (e.g., 'Upfront payment', 'Milestone 1: Design phase')"
                    />
                  </div>

                  {form.totalAmount > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Amount: {form.currency === 'USD' || form.currency === 'USDC' ? '$' : ''}
                      {schedule.type === 'percentage' 
                        ? ((form.totalAmount * schedule.amount) / 100).toFixed(2)
                        : schedule.amount.toFixed(2)
                      } {form.currency}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total Validation */}
            {form.totalAmount > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Percentage:</span>
                  <span className={`text-sm font-semibold ${
                    getTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {getTotalPercentage()}%
                  </span>
                </div>
                {getTotalPercentage() !== 100 && getTotalPercentage() > 0 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Percentages must total 100%
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setForm(prev => ({ ...prev, paymentMethod: { ...prev.paymentMethod, type: 'crypto' } }))}
                className={`p-4 border rounded-lg transition ${
                  form.paymentMethod.type === 'crypto'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Bitcoin className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="font-medium">Cryptocurrency</p>
                <p className="text-xs text-gray-500 mt-1">Accept crypto payments with escrow</p>
              </button>
              
              <button
                onClick={() => setForm(prev => ({ ...prev, paymentMethod: { ...prev.paymentMethod, type: 'fiat' } }))}
                className={`p-4 border rounded-lg transition ${
                  form.paymentMethod.type === 'fiat'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <p className="font-medium">Traditional Payment</p>
                <p className="text-xs text-gray-500 mt-1">Bank transfer or credit card</p>
              </button>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="input"
              rows={3}
              placeholder="Any additional information for the client..."
            />
          </div>

          {/* Client Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Invoice will be sent to:</strong> {client?.name} ({client?.email})
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => router.push(`/contracts/${contractId}`)}
              className="text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateInvoice}
              disabled={loading || !validateForm()}
              className="btn-primary flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Invoice
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}