import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useArConnect } from '../contexts/ArConnectContext';
import { motion } from 'framer-motion';
import { FaWallet, FaShieldAlt, FaFileContract, FaArrowRight, FaGithub, FaTwitter } from 'react-icons/fa';
import { ArweaveIcon } from '@/components/icons/ArweaveIcon';

export default function LandingPage() {
  const { isConnected, connect, isLoading } = useArConnect();
  const router = useRouter();
  const [arweavePrice, setArweavePrice] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected) {
      router.push('/dashboard');
    }
  }, [isConnected, router]);

  useEffect(() => {
    // Fetch AR price
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=arweave&vs_currencies=usd')
      .then(res => res.json())
      .then(data => {
        if (data.arweave?.usd) {
          setArweavePrice(data.arweave.usd.toFixed(2));
        }
      })
      .catch(console.error);
  }, []);

  const features = [
    {
      icon: <FaShieldAlt className="text-3xl" />,
      title: 'Decentralized & Secure',
      description: 'All contracts stored permanently on Arweave blockchain with end-to-end encryption'
    },
    {
      icon: <FaFileContract className="text-3xl" />,
      title: 'Smart Contracts',
      description: 'Create, sign, and manage freelance contracts with blockchain-backed signatures'
    },
    {
      icon: <ArweaveIcon className="text-3xl" />,
      title: 'Permanent Storage',
      description: 'Your contracts are stored forever on Arweave, accessible anytime, anywhere'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Navigation */}
      <nav className="backdrop-blur-md bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <ArweaveIcon className="text-3xl text-blue-400" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white">Giza</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {arweavePrice && (
                <div className="text-sm text-gray-300">
                  AR: ${arweavePrice}
                </div>
              )}
              <a
                href="https://github.com/hubzhooba/giza"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                <FaGithub className="text-xl" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Freelance Contracts
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                on Arweave
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Create, sign, and store your freelance contracts permanently on the blockchain. 
              Secure, decentralized, and accessible forever.
            </p>

            {/* Connect Button */}
            <motion.button
              onClick={connect}
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaWallet className="text-xl" />
              <span className="text-lg">
                {isLoading ? 'Connecting...' : 'Connect with ArConnect'}
              </span>
              <FaArrowRight className="text-lg group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <p className="mt-4 text-sm text-gray-400">
              Don't have ArConnect? 
              <a 
                href="https://www.arconnect.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 ml-1 underline"
              >
                Install it here
              </a>
            </p>
          </motion.div>
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="backdrop-blur-md bg-white/10 rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300"
            >
              <div className="text-blue-400 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Connect Wallet', desc: 'Use ArConnect to securely connect' },
            { step: '2', title: 'Create Contract', desc: 'Draft your freelance agreement' },
            { step: '3', title: 'Get Signatures', desc: 'Both parties sign digitally' },
            { step: '4', title: 'Store Forever', desc: 'Saved permanently on Arweave' }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                {item.step}
              </div>
              <h4 className="text-white font-semibold mb-2">{item.title}</h4>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2024 Giza. Built on Arweave.
            </div>
            <div className="flex space-x-6">
              <a href="https://github.com/hubzhooba/giza" className="text-gray-400 hover:text-white">
                <FaGithub />
              </a>
              <a href="https://twitter.com" className="text-gray-400 hover:text-white">
                <FaTwitter />
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}