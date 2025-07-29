import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const testSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        setResult(`SignUp Error: ${error.message}`);
      } else {
        setResult(`SignUp Success: Check email for verification`);
      }
    } catch (err) {
      setResult(`Exception: ${err}`);
    }
  };

  const testSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setResult(`SignIn Error: ${error.message}`);
      } else {
        setResult(`SignIn Success: ${data.user?.email}`);
      }
    } catch (err) {
      setResult(`Exception: ${err}`);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setResult(`Current Session: ${session ? session.user.email : 'No session'}`);
    } catch (err) {
      setResult(`Exception: ${err}`);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test Supabase Auth</h1>
      
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
        
        <div className="flex space-x-2">
          <button
            onClick={testSignUp}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Test Sign Up
          </button>
          
          <button
            onClick={testSignIn}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Test Sign In
          </button>
          
          <button
            onClick={checkAuth}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Check Auth
          </button>
        </div>
        
        <div className="p-4 bg-gray-100 rounded">
          <pre className="text-sm">{result}</pre>
        </div>
      </div>
    </div>
  );
}