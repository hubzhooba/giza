import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm, useFieldArray } from 'react-hook-form';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { EncryptionService } from '@/lib/encryption';
import toast from 'react-hot-toast';
import { Plus, Trash2, Shield, ArrowRight, FileText, Users } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProtectedPage } from '@/components/ProtectedPage';

interface RoomForm {
  name: string;
  description: string;
  participants: Array<{
    email: string;
    name: string;
    role: 'signer';
  }>;
}

export default function NewRoom() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, addRoom } = useStore();
  const encryption = EncryptionService.getInstance();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RoomForm>({
    defaultValues: {
      participants: [{ email: '', name: '', role: 'signer' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participants',
  });

  const onSubmit = async (data: RoomForm) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const roomKey = await encryption.generateRoomKey();
      const roomId = uuidv4();
      
      const room = {
        id: roomId,
        name: data.name,
        creatorId: user.id,
        participants: [
          {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: 'creator' as const,
            hasJoined: true,
            publicKey: user.publicKey,
            joinedAt: new Date(),
          },
          ...data.participants.map((p) => ({
            userId: uuidv4(),
            email: p.email,
            name: p.name,
            role: p.role,
            hasJoined: false,
          })),
        ],
        encryptionKey: roomKey,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active' as const,
      };
      
      await addRoom(room);
      
      toast.success('Secure room created successfully!');
      router.push(`/rooms/${roomId}`);
    } catch (error) {
      toast.error('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage>
      <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <span className="font-medium text-gray-900">Create Room</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <span className="text-gray-500">Upload Documents</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <span className="text-gray-500">Review & Send</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Create Your Invoice Room</h1>
            <p className="text-gray-600 mt-2">
              Set up a secure space for your contract and invoice
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary-600" />
                Invoice Details
              </h2>
            
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Title
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Invoice title is required' })}
                  className="input"
                  placeholder="e.g., Website Development - March 2024"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description (Optional)
                </label>
                <textarea
                  {...register('description')}
                  className="input"
                  rows={3}
                  placeholder="Brief description of the services or project"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary-600" />
                Client Information
              </h2>
              
              {fields.map((field, index) => (
                <div key={field.id} className="mb-4">
                  {index === 0 && (
                    <p className="text-sm text-gray-600 mb-4">
                      Add your client's information. They will receive an invitation to sign the invoice.
                    </p>
                  )}
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client Name
                        </label>
                        <input
                          type="text"
                          {...register(`participants.${index}.name` as const, {
                            required: 'Client name is required',
                          })}
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
                          {...register(`participants.${index}.email` as const, {
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address',
                            },
                          })}
                          className="input"
                          placeholder="john@company.com"
                        />
                      </div>
                    </div>
                    
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="mt-3 text-red-600 hover:text-red-700 flex items-center text-sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove Client
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => append({ email: '', name: '', role: 'signer' })}
                className="flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Another Client
              </button>
            </div>

            <div className="flex justify-between items-center pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Next: Upload Documents'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </form>
        </div>
      </div>
      </DashboardLayout>
    </ProtectedPage>
  );
}