import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { Tent, Lock, ArrowRight, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';

export default function JoinTent() {
  const router = useRouter();
  const { id } = router.query;
  const { user, setCurrentRoom } = useStore();
  const { isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [tent, setTent] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [loadingTent, setLoadingTent] = useState(true);
  const [tentError, setTentError] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadTent(id);
    }
  }, [id]);

  const loadTent = async (tentId: string) => {
    console.log('Loading tent:', tentId);
    setLoadingTent(true);
    setTentError(null);
    
    try {
      const room = await DatabaseService.loadRoom(tentId);
      console.log('Loaded room:', room);
      
      if (room) {
        setTent(room);
        
        // Check if user is already a participant
        if (user && room.participants.some((p: any) => p.userId === user.id)) {
          console.log('User is already a participant');
          setJoined(true);
        }
      } else {
        console.error('No tent found with ID:', tentId);
        setTentError('This tent could not be found. The invite link may be invalid or expired.');
      }
    } catch (error) {
      console.error('Error loading tent:', error);
      setTentError('Failed to load tent. Please try again later.');
    } finally {
      setLoadingTent(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/tents/join/${id}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!tent) {
      toast.error('Tent information not available');
      return;
    }

    setLoading(true);
    try {
      // Join the room in database
      await DatabaseService.joinRoom(tent.id, user.id);
      
      // Update local state
      setCurrentRoom(tent);
      setJoined(true);
      
      toast.success('Successfully joined the tent!');
      
      // Redirect to tent page
      setTimeout(() => {
        router.push(`/tents/${tent.id}`);
      }, 1000);
    } catch (error) {
      console.error('Error joining tent:', error);
      toast.error('Failed to join tent');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show tent loading state
  if (loadingTent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Tent className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading tent information...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (tentError || !tent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Tent className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Tent</h2>
          <p className="text-gray-500 mb-4">{tentError || 'This invite link may be invalid or expired.'}</p>
          <Link
            href="/"
            className="text-primary-600 hover:text-primary-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // If already joined and authenticated, redirect
  if (joined && user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-green-900 font-medium mb-4">
            You're already a member of this tent!
          </p>
          <button
            onClick={() => router.push(`/tents/${tent.id}`)}
            className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition"
          >
            Go to Tent
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Tent className="w-10 h-10 text-primary-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              You're Invited to Join
            </h1>
            
            <h2 className="text-xl text-gray-700 mb-4">{tent.name}</h2>
            
            <div className="flex items-center justify-center text-sm text-gray-600 mb-6">
              <Lock className="w-4 h-4 mr-2" />
              <span>End-to-End Encrypted Tent</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Review and sign contracts securely</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>All documents are end-to-end encrypted</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">•</span>
                <span>Manage payments and terms together</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full flex items-center justify-center bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          >
            {loading ? 'Joining...' : user ? 'Join Tent' : 'Login to Join'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>

          {!user && (
            <p className="text-center text-sm text-gray-600 mt-4">
              Don't have an account?{' '}
              <button
                onClick={() => router.push(`/signup?redirect=${encodeURIComponent(`/tents/join/${id}`)}`)}
                className="text-primary-600 hover:text-primary-700"
              >
                Sign up
              </button>
            </p>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Powered by SecureContract
          </p>
        </div>
      </div>
    </div>
  );
}