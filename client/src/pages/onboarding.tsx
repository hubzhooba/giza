import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useArConnect } from '../contexts/ArConnectContext';
import { motion } from 'framer-motion';
import { FaUser, FaCheck, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { walletAddress, username: currentUsername, setUsername, isUsernameSet, isConnected } = useArConnect();
  const [username, setUsernameInput] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    } else if (isUsernameSet && currentUsername) {
      router.push('/dashboard');
    }
  }, [isConnected, isUsernameSet, currentUsername, router]);

  // Debounced username check
  useEffect(() => {
    if (username.length < 3) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-username?username=${username}`);
        const data = await response.json();
        setIsAvailable(data.available);
      } catch (error) {
        console.error('Username check failed:', error);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAvailable || username.length < 3) {
      toast.error('Please choose a valid username');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await setUsername(username);
      if (success) {
        toast.success('Welcome to Giza!');
        router.push('/dashboard');
      } else {
        toast.error('Username is already taken');
      }
    } catch (error) {
      toast.error('Failed to set username');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidUsername = (username: string) => {
    return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-md bg-white/10 rounded-2xl p-8 border border-white/20 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Giza!</h1>
          <p className="text-gray-300">Choose your username to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="johndoe"
                maxLength={20}
                required
              />
              {username.length >= 3 && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {isChecking ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : isAvailable ? (
                    <FaCheck className="text-green-400" />
                  ) : (
                    <FaTimes className="text-red-400" />
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-400">
              3-20 characters, letters, numbers, underscores, and hyphens only
            </p>
            {username.length >= 3 && !isValidUsername(username) && (
              <p className="mt-1 text-sm text-red-400">
                Invalid username format
              </p>
            )}
            {username.length >= 3 && isAvailable === false && (
              <p className="mt-1 text-sm text-red-400">
                Username is already taken
              </p>
            )}
          </div>

          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-gray-300 mb-2">
              <strong>Your wallet address:</strong>
            </p>
            <p className="text-xs text-gray-400 font-mono break-all">
              {walletAddress}
            </p>
          </div>

          <button
            type="submit"
            disabled={!isAvailable || !isValidUsername(username) || isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Setting username...' : 'Continue to Dashboard'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Your username will be displayed publicly across the platform
        </p>
      </motion.div>
    </div>
  );
}