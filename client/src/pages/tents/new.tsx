import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { useArConnect, withArConnectAuth } from '@/contexts/ArConnectContext';
import { useSignedAction } from '@/hooks/useSignedAction';
import { EncryptionService } from '@/lib/encryption';
import toast from 'react-hot-toast';
import { Tent, ArrowRight, Lock, Link as LinkIcon, Wallet } from 'lucide-react';
import { ArweaveIcon } from '@/components/icons/ArweaveIcon';
import { v4 as uuidv4 } from 'uuid';

interface TentForm {
  name: string;
  description: string;
}

function NewTent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { user, addRoom, addActivity } = useStore();
  const { walletAddress, isConnected } = useArConnect();
  const { createContract } = useSignedAction();
  const encryption = EncryptionService.getInstance();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TentForm>();

  const onSubmit = async (data: TentForm) => {
    if (!user || !isConnected) {
      toast.error('Please connect your wallet to create a tent');
      return;
    }
    
    setLoading(true);
    
    // Generate IDs and keys immediately for instant navigation
    const roomKey = await encryption.generateRoomKey();
    const roomId = uuidv4();
    
    // Use wallet signing for tent creation
    const result = await createContract(
      data.name,
      async () => {
        // Navigate immediately for better UX
        router.push(`/tents/${roomId}`);
        
        const room = {
          id: roomId,
          name: data.name,
          creatorId: user.id,
          creatorWallet: walletAddress,
          participants: [{
            userId: user.id,
            email: user.email,
            name: user.name,
            walletAddress: walletAddress,
            role: 'creator' as const,
            hasJoined: true,
            joinedAt: new Date(),
          }],
          encryptionKey: roomKey,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: data.description,
        };
        
        // Add room to store (this will also save to database)
        await addRoom(room);
        
        // Add activity for tent creation
        addActivity({
          type: 'tent_created',
          tentId: roomId,
          tentName: data.name,
          userId: user.id,
          userName: user.name || user.email,
          message: data.description || `Created by ${walletAddress!.substring(0, 8)}...${walletAddress!.substring(walletAddress!.length - 6)}`
        });
        
        return room;
      },
      'Contract Tent'
    );
    
    setLoading(false);
    
    if (result) {
      toast.success('Tent created successfully!');
    } else {
      // Navigate back on error
      router.push('/tents');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Create Secure Tent</h1>
          <p className="text-gray-600 mt-2">
            Create a blockchain-secured space for contracts and payments
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Lock className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">End-to-End Encryption + Blockchain Security</p>
                  <p>All documents are encrypted locally and stored permanently on Arweave. Access is controlled by wallet signatures.</p>
                </div>
              </div>
            </div>

            {/* Wallet Connection Status */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wallet className="w-5 h-5 text-gray-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Connected Wallet</p>
                    <p className="text-xs text-gray-500">
                      {walletAddress ? `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                <ArweaveIcon className="w-5 h-5 text-gray-400" />
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
                    <p className="text-sm text-gray-600">Share a secure link - they'll need an Arweave wallet to join</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Upload and sign contract</p>
                    <p className="text-sm text-gray-600">Documents are stored permanently on Arweave with wallet signatures</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Set up payment</p>
                    <p className="text-sm text-gray-600">Configure crypto payments with smart contract escrow</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading || !isConnected}
                className="flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {!isConnected ? (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet to Create
                  </>
                ) : loading ? (
                  'Creating...'
                ) : (
                  <>
                    Create Tent
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withArConnectAuth(NewTent);