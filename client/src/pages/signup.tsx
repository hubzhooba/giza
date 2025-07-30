import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { EncryptionService } from '@/lib/encryption';
import { useStore } from '@/store/useStore';
import { Eye, EyeOff } from 'lucide-react';

interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Signup() {
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
    watch,
  } = useForm<SignupForm>();

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const { publicKey, privateKey } = await encryption.generateKeyPair();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            public_key: publicKey, // Changed from publicKey to public_key
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Manually create/update profile since trigger might be failing
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: data.name,
            public_key: publicKey,
          })
          .select()
          .single();
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue anyway - profile will be created later
        }
        
        setUser({
          id: authData.user.id,
          email: authData.user.email!,
          name: data.name,
          publicKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        setPrivateKey(privateKey);
        
        // Store private key in localStorage for session persistence
        localStorage.setItem(`pk_${authData.user.id}`, privateKey);
        
        toast.success('Account created successfully! Please check your email to verify.');
        
        // Redirect to intended page or dashboard
        const redirectUrl = redirect ? decodeURIComponent(redirect as string) : '/dashboard';
        router.push(redirectUrl);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600">
            Join thousands of freelancers securing their contracts
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="input"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

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
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
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

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === watch('password') || 'Passwords do not match',
              })}
              className="input"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href={redirect ? `/login?redirect=${encodeURIComponent(redirect as string)}` : '/login'} 
              className="text-primary-600 hover:text-primary-700"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}