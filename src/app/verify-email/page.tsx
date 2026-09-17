'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${backendUrl}/auth/verify-email?token=${token}`);
        const resData = await response.json();
        
        if (!response.ok) {
          throw new Error(resData.message || 'Failed to verify email');
        }

        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'An error occurred during verification');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  if (loading) {
    return (
      <Card className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <CardContent className="flex flex-col items-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email...</h2>
          <p className="text-sm text-gray-500">Please wait while we secure your account activation.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <CardContent className="flex flex-col items-center py-6">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-950 mb-2">Verification Failed</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md text-sm"
          >
            Back to Login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
      <CardContent className="flex flex-col items-center py-6">
        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-950 mb-2">Email Verified Successfully!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your email has been verified. You can now log in to the Data Annotation Platform.
        </p>
        <Button
          onClick={() => router.push('/login')}
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md text-sm"
        >
          Proceed to Login <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-gray-500 text-sm">Loading verify...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
