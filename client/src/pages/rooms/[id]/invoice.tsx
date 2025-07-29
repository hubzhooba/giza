import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray } from 'react-hook-form';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { FileText, Plus, Trash2, Calculator, Check, ArrowRight, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface InvoiceForm {
  billingFrom: {
    name: string;
    email: string;
    address: string;
    taxId?: string;
  };
  billingTo: {
    name: string;
    email: string;
    address: string;
    taxId?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: {
    network: 'ethereum' | 'polygon' | 'solana';
    token: string;
    walletAddress: string;
  };
  dueDate: string;
  notes?: string;
}

const networkTokens = {
  ethereum: ['ETH', 'USDC', 'USDT', 'DAI'],
  polygon: ['MATIC', 'USDC', 'USDT', 'DAI'],
  solana: ['SOL', 'USDC', 'USDT'],
};

export default function CreateInvoice() {
  const router = useRouter();
  const { id: roomId } = router.query;
  const [loading, setLoading] = useState(false);
  const { user, rooms } = useStore();
  
  const room = rooms.find((r) => r.id === roomId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceForm>({
    defaultValues: {
      billingFrom: {
        name: user?.name || '',
        email: user?.email || '',
      },
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      paymentMethod: {
        network: 'ethereum',
        token: 'USDC',
      },
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const selectedNetwork = watch('paymentMethod.network');

  const calculateTotal = () => {
    return watchItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);
  };

  const onSubmit = async (data: InvoiceForm) => {
    if (!room) return;
    
    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      
      const invoice = {
        id: uuidv4(),
        roomId: room.id,
        documentId: room.id,
        fromUser: data.billingFrom,
        toUser: data.billingTo,
        items: data.items.map(item => ({
          ...item,
          amount: item.quantity * item.unitPrice,
        })),
        paymentMethod: {
          type: 'crypto' as const,
          ...data.paymentMethod,
        },
        status: 'draft' as const,
        totalAmount,
        currency: data.paymentMethod.token,
        dueDate: new Date(data.dueDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      toast.success('Invoice created successfully!');
      router.push(`/rooms/${roomId}/send`);
    } catch (error) {
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  if (!room) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Room not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">Create Room</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">Upload Documents</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <span className="font-medium text-gray-900">Review & Send</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Finalize Your Invoice</h1>
            <p className="text-gray-600 mt-2">
              Add payment details and send the invoice for {room.name}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Invoice Items */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Invoice Items
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    {...register('billingFrom.name', { required: 'Name is required' })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('billingFrom.email', { required: 'Email is required' })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    {...register('billingFrom.address', { required: 'Address is required' })}
                    className="input"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('billingFrom.taxId')}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">To (Client Details)</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company/Name
                  </label>
                  <input
                    type="text"
                    {...register('billingTo.name', { required: 'Name is required' })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register('billingTo.email', { required: 'Email is required' })}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    {...register('billingTo.address', { required: 'Address is required' })}
                    className="input"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID (Optional)
                  </label>
                  <input
                    type="text"
                    {...register('billingTo.taxId')}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Invoice Items
            </h2>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        {...register(`items.${index}.description` as const, {
                          required: 'Description is required',
                        })}
                        className="input"
                        placeholder="Service or product description"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        {...register(`items.${index}.quantity` as const, {
                          required: 'Required',
                          min: 1,
                        })}
                        className="input"
                        min="1"
                      />
                    </div>
                    
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        {...register(`items.${index}.unitPrice` as const, {
                          required: 'Required',
                          min: 0,
                        })}
                        className="input"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="md:col-span-1 flex items-end">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-2xl text-primary-600">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

            <div className="card">
            <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Network
                </label>
                <select
                  {...register('paymentMethod.network')}
                  className="input"
                >
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                  <option value="solana">Solana</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token
                </label>
                <select
                  {...register('paymentMethod.token')}
                  className="input"
                >
                  {networkTokens[selectedNetwork].map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  {...register('paymentMethod.walletAddress', {
                    required: 'Wallet address is required',
                  })}
                  className="input"
                  placeholder="0x..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  {...register('dueDate', { required: 'Due date is required' })}
                  className="input"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                className="input"
                rows={3}
                placeholder="Additional payment terms or notes"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}