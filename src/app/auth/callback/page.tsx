'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('Processing authentication...');
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');

        if (error === 'oauth_failed') {
          setStatus('error');
          setMessage('OAuth authentication failed. Please try again.');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        if (!token) {
          setStatus('error');
          setMessage('No authentication token received');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Store the token
        localStorage.setItem('accessToken', token);

        // Decode JWT token to get user data
        try {
          const tokenParts = token.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          
          const userData = {
            _id: payload.sub,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role || 'ANNOTATOR',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          localStorage.setItem('user', JSON.stringify(userData));

          // Dispatch custom event to notify AuthContext
          window.dispatchEvent(new CustomEvent('auth-updated'));

          setStatus('success');
          if (userData.role.toUpperCase() === 'ADMIN') {
            setMessage('Authentication successful! Redirecting to dashboard...');
            setTimeout(() => router.push('/dashboard'), 1500);
          } else {
            setMessage('Authentication successful! Checking assigned tasks...');
            import('@/lib/api/datasets').then(({ datasetsAPI }) => {
              datasetsAPI.getMyTasks()
                .then((tasks) => {
                  if (tasks && tasks.length > 0) {
                    setMessage('Authentication successful! Redirecting to tasks...');
                    setTimeout(() => router.push('/tasks'), 1500);
                  } else {
                    setMessage('Authentication successful! Redirecting to dashboard...');
                    setTimeout(() => router.push('/dashboard'), 1500);
                  }
                })
                .catch((err) => {
                  console.error('Error fetching tasks on OAuth redirect:', err);
                  setMessage('Authentication successful! Redirecting to dashboard...');
                  setTimeout(() => router.push('/dashboard'), 1500);
                });
            }).catch(() => {
              setTimeout(() => router.push('/dashboard'), 1500);
            });
          }
        } catch (jwtError) {
          throw new Error('AUTH_TOKEN_INVALID');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Authentication failed. Redirecting to login...');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === 'loading' && (
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          )}
          {status === 'success' && (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'loading' && 'Authenticating...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Authentication Failed'}
        </h2>

        <p className="text-gray-600 mb-6">{message}</p>

        {status === 'loading' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}