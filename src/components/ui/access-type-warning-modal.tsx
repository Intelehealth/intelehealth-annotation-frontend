'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Lock, Globe, Users } from 'lucide-react';

interface AccessTypeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  currentAccessType: 'private' | 'public' | 'shared';
  newAccessType: 'private' | 'public' | 'shared';
  isSaving?: boolean;
}

export function AccessTypeWarningModal({
  isOpen,
  onClose,
  onConfirm,
  currentAccessType,
  newAccessType,
  isSaving = false,
}: AccessTypeWarningModalProps) {
  const isMakingPublic = newAccessType === 'public';
  const isMakingPrivate = newAccessType === 'private';
  const isMakingShared = newAccessType === 'shared';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {isMakingPublic ? 'Make Dataset Public' : 
                 isMakingPrivate ? 'Make Dataset Private' : 
                 'Make Dataset Shared'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                This action will change who can access your dataset
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current vs New Access Type */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              {currentAccessType === 'private' ? (
                <Lock className="h-4 w-4 text-gray-600" />
              ) : currentAccessType === 'public' ? (
                <Globe className="h-4 w-4 text-green-600" />
              ) : (
                <Users className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                Current: {currentAccessType === 'private' ? 'Private' : 
                         currentAccessType === 'public' ? 'Public' : 'Shared'}
              </span>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex items-center space-x-2">
              {newAccessType === 'private' ? (
                <Lock className="h-4 w-4 text-gray-600" />
              ) : newAccessType === 'public' ? (
                <Globe className="h-4 w-4 text-green-600" />
              ) : (
                <Users className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                New: {newAccessType === 'private' ? 'Private' : 
                      newAccessType === 'public' ? 'Public' : 'Shared'}
              </span>
            </div>
          </div>

          {/* Warning Message */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800 mb-2">
                  {isMakingPublic ? 'Public Access Warning' : 
                   isMakingPrivate ? 'Private Access Warning' : 
                   'Shared Access Warning'}
                </h4>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {isMakingPublic
                    ? 'Making this dataset public means all authenticated users will be able to view and use it. This action cannot be easily undone and may expose your data to a wider audience.'
                    : isMakingPrivate
                    ? 'Making this dataset private will restrict access to only you. Other users who currently have access will no longer be able to view or use this dataset.'
                    : 'Making this dataset shared will allow you to specify which users can access it. You can add or remove users from the shared list at any time.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• This change will take effect immediately after confirmation</p>
            <p>• You can change the access type again at any time</p>
            {isMakingPublic && (
              <p>• Consider reviewing your dataset content before making it public</p>
            )}
            {isMakingShared && (
              <p>• You can add or remove users from the shared list after confirmation</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSaving}
            className={`flex-1 ${
              isMakingPublic
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              `${isMakingPublic ? 'Make Public' : 
                isMakingPrivate ? 'Make Private' : 
                'Make Shared'} & Save`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
