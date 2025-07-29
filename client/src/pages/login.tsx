import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { EncryptionService } from '@/lib/encryption';
import { Eye, EyeOff } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const router = useRouter();
  const { redirect } = router.query;
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser, setPrivateKey } = useStore();
  const encryption = EncryptionService.getInstance();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    console.log('Starting login...');
    
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      console.log('Auth response:', { authData, error });

      if (error) throw error;

      if (authData.user) {
        console.log('User authenticated:', authData.user.email);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        console.log('Profile loaded:', profile);

        // Generate private key from password (deterministic)
        // In production, you might store encrypted private key and decrypt it
        let privateKey;
        try {
          privateKey = await encryption.deriveKeyFromPassword(
            data.password,
            authData.user.id
          );
          console.log('Private key generated');
        } catch (keyError) {
          console.error('Private key generation failed:', keyError);
          // Use a fallback key
          privateKey = `pk_${authData.user.id}_${Date.now()}`;
          console.log('Using fallback private key');
        }
        
        // Create or update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: profile?.name || authData.user.email,
            public_key: profile?.publicKey || '',
          });

        console.log('Profile upsert result:', profileError);

        setUser({
          id: authData.user.id,
          email: authData.user.email!,
          name: profile?.name || authData.user.email || '',
          publicKey: profile?.publicKey || '',
          createdAt: new Date(authData.user.created_at),
          updatedAt: new Date(),
        });
        
        setPrivateKey(privateKey);
        
        // Store private key in localStorage for session persistence
        localStorage.setItem(`pk_${authData.user.id}`, privateKey);
        
        toast.success('Welcome back!');
        
        // Small delay to ensure state is set
        setTimeout(() => {
          // Redirect to intended page or dashboard
          const redirectUrl = redirect ? decodeURIComponent(redirect as string) : '/dashboard';
          router.push(redirectUrl);
        }, 100);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-gray-600">
            Sign in to manage your contracts and payments
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              className="input"
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', {
                  required: 'Password is required',
                })}
                className="input pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href={redirect ? `/signup?redirect=${encodeURIComponent(redirect as string)}` : '/signup'} 
              className="text-primary-600 hover:text-primary-700"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}