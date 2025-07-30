import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { EncryptionService } from '@/lib/encryption';
import toast from 'react-hot-toast';
import { Tent, ArrowRight, Lock, Link as LinkIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProtectedPage } from '@/components/ProtectedPage';

interface TentForm {
  name: string;
  description: string;
}

export default function NewTent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, addRoom } = useStore();
  const encryption = EncryptionService.getInstance();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TentForm>();

  const onSubmit = async (data: TentForm) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const roomKey = await encryption.generateRoomKey();
      const roomId = uuidv4();
      
      const room = {
        id: roomId,
        name: data.name,
        creatorId: user.id,
        participants: [{
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'owner' as const,
          hasJoined: true,
          joinedAt: new Date(),
        }],
        encryptionKey: roomKey,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await addRoom(room);
      
      toast.success('Tent created successfully!');
      router.push(`/tents/${roomId}`);
    } catch (error) {
      toast.error('Failed to create tent');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage>
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">Create Secure Tent</h1>
            <p className="text-gray-600 mt-2">
              Create an encrypted space for contracts and payments
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Security Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">End-to-End Encryption</p>
                    <p>All documents and communications in this tent will be encrypted. Only you and invited parties can access the content.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tent Name
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Tent name is required' })}
                  className="input"
                  placeholder="e.g., Contract with ABC Company"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  {...register('description')}
                  className="input"
                  rows={3}
                  placeholder="Brief description of the contract or project"
                />
              </div>

              {/* What happens next */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">What happens next?</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Invite your client</p>
                      <p className="text-sm text-gray-600">Share a secure link with your client to join the tent</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Upload and sign contract</p>
                      <p className="text-sm text-gray-600">Upload PDF contracts for both parties to review and sign</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Set up payment</p>
                      <p className="text-sm text-gray-600">Configure payment terms and receive funds securely</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Tent'}
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