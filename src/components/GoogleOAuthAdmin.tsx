'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface GoogleOAuthAdminProps {
  disabled?: boolean;
  className?: string;
}

export default function GoogleOAuthAdmin({
  disabled = false,
  className = '',
}: GoogleOAuthAdminProps) {
  const handleGoogleAdminAuth = () => {
    try {
      // Redirect to backend Google Admin OAuth endpoint
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      window.location.href = `${backendUrl}/auth/google/admin`;
    } catch (error) {
      console.error('Google Admin OAuth error:', error);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl transition-all duration-200 text-sm"
        disabled={disabled}
        onClick={handleGoogleAdminAuth}
      >
        <Image
          src="/svg/google.svg"
          alt="Google"
          width={20}
          height={20}
          className="mr-2"
        />
        Continue with Google (Admin)
      </Button>
    </div>
  );
}
