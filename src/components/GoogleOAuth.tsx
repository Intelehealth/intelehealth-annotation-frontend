'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { API_BASE_URL, isBackendReachable } from '@/lib/api';

interface GoogleOAuthProps {
  mode: 'login' | 'signup';
  disabled?: boolean;
  className?: string;
}

export default function GoogleOAuth({
  mode,
  disabled = false,
  className = '',
}: GoogleOAuthProps) {
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    setError('');
    try {
      // Verify the backend is reachable before redirecting, so we never
      // point the browser at a broken URL when the API is down/misconfigured.
      const reachable = await isBackendReachable();
      if (!reachable) {
        setError(
          `Cannot reach the backend at ${API_BASE_URL}. Please make sure the server is running and try again.`,
        );
        return;
      }
      // Redirect to backend Google OAuth endpoint
      window.location.href = `${API_BASE_URL}/auth/google`;
    } catch (error) {
      console.error('Google OAuth error:', error);
      setError('Unable to start Google authentication. Please try again.');
    }
  };

  return (
    <div className={className}>
      <Button
        id="google-signin-btn"
        type="button"
        variant="outline"
        className="w-full h-10 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all duration-200 text-sm focus:outline-none"
        disabled={disabled}
        onClick={handleGoogleAuth}
      >
        <Image
          src="/svg/google.svg"
          alt="Google"
          width={20}
          height={20}
          className="mr-2"
        />
        Continue with Google
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
