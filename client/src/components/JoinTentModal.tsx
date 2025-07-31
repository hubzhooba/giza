import { useState } from 'react';
import { useRouter } from 'next/router';
import { X, Tent, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { DatabaseService } from '@/lib/database';
import { useStore } from '@/store/useStore';

interface JoinTentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinTentModal({ isOpen, onClose }: JoinTentModalProps) {
  const router = useRouter();
  const { user, loadRooms } = useStore();
  const [tentId, setTentId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tentId.trim()) {
      toast.error('Please enter a tent ID');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to join a tent');
      return;
    }

    setLoading(true);
    try {
      // Try to join the room directly (the function will check if it exists)
      const result = await DatabaseService.joinRoom(tentId.trim(), user.id);
      console.log('Join result:', result);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to join tent. Please check the tent ID.');
        return;
      }
      
      // Reload rooms list
      await loadRooms();
      
      toast.success('Successfully joined the tent!');
      onClose();
      setTentId('');
      
      // Navigate to the tent
      router.push(`/tents/${tentId.trim()}`);
    } catch (error: any) {
      console.error('Error joining tent:', error);
      toast.error(error.message || 'Failed to join tent');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Join a Tent</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label htmlFor="tentId" className="block text-sm font-medium text-gray-700 mb-2">
              Tent ID
            </label>
            <input
              type="text"
              id="tentId"
              value={tentId}
              onChange={(e) => setTentId(e.target.value)}
              placeholder="Enter the tent ID shared with you"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">
              Ask the tent creator to share their tent ID with you
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !tentId.trim()}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Tent className="w-4 h-4 mr-2" />
                  Join Tent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}