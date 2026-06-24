'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Mail, Shield, Save, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { z } from 'zod';

// Validation schema
const profileSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If passwords are provided, they must be at least 6 characters
      if (data.newPassword && data.newPassword.length < 6) {
        return false;
      }
      return true;
    },
    {
      message: 'Password must be at least 6 characters',
      path: ['newPassword'],
    },
  )
  .refine(
    (data) => {
      // Only validate password match if both are provided
      if (data.newPassword && data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    },
  );

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');
  const confirmPassword = watch('confirmPassword');

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);

    try {
      // Always update profile information
      const profileUpdateResult = await updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        email: user?.email || '', // Keep the existing email, don't allow changes
      });

      if (!profileUpdateResult.success) {
        throw new Error(profileUpdateResult.error);
      }

      // Attempt password change if user provided new password
      if (data.newPassword) {
        const passwordChangeResult = await changePassword({
          newPassword: data.newPassword!,
          confirmPassword: data.confirmPassword!,
        });

        if (!passwordChangeResult.success) {
          throw new Error(passwordChangeResult.error);
        }
      }

      showToast({
        title: 'Profile Updated Successfully!',
        description: 'Your profile information has been updated.',
        type: 'success',
      });

      // Refresh profile data
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      showToast({
        title: 'Failed to Update Profile',
        description: error.message || 'Please try again or check your connection.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Profile Settings
            </h1>
            <p className="text-gray-600 text-sm">
              Manage your account information and security
            </p>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                <User className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-medium text-gray-900">
                  Personal Information
                </h2>
              </div>

              {/* First Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="firstName"
                  className="text-sm font-medium text-gray-700"
                >
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  {...register('firstName')}
                  className={cn(
                    'h-10',
                    errors.firstName &&
                      'border-red-500 focus:border-red-500 focus:ring-red-500',
                  )}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="lastName"
                  className="text-sm font-medium text-gray-700"
                >
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  {...register('lastName')}
                  className={cn(
                    'h-10',
                    errors.lastName &&
                      'border-red-500 focus:border-red-500 focus:ring-red-500',
                  )}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <div className="h-10 pl-10 pr-4 flex items-center bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {user?.email || ''}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Email address cannot be changed
                </p>
              </div>
            </div>

            {/* Security Section - Available for all users */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-medium text-gray-900">Security</h2>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="newPassword"
                    className="text-sm font-medium text-gray-700"
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password (optional)"
                      {...register('newPassword')}
                      className={cn(
                        'h-10 pr-10',
                        errors.newPassword &&
                          'border-red-500 focus:border-red-500 focus:ring-red-500',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-sm text-red-600">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-gray-700"
                  >
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      {...register('confirmPassword')}
                      className={cn(
                        'h-10 pr-10',
                        errors.confirmPassword &&
                          'border-red-500 focus:border-red-500 focus:ring-red-500',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {/* Password Match Indicator */}
                {newPassword && confirmPassword && (
                  <div
                    className={cn(
                      'text-sm p-2 rounded-md',
                      newPassword === confirmPassword
                        ? 'text-green-600 bg-green-50 border border-green-200'
                        : 'text-red-600 bg-red-50 border border-red-200',
                    )}
                  >
                    {newPassword === confirmPassword
                      ? '✓ Passwords match'
                      : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}