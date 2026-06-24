'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, RotateCcw, Home } from 'lucide-react';

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToDataset: () => void;
  onRecheckRows?: () => void;
  completedCount: number;
  totalCount: number;
  completionTime?: string;
}

export function CompletionModal({
  isOpen,
  onClose,
  onReturnToDataset,
  onRecheckRows,
  completedCount,
  totalCount,
  completionTime
}: CompletionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Annotation Complete!
          </DialogTitle>
          <DialogDescription>
            Congratulations! You have successfully completed all {totalCount} rows. What would you like to do next?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {completedCount}/{totalCount}
              </div>
              <div className="text-sm text-green-600">Rows Completed</div>
            </div>
          </div>
          
          {completionTime && (
            <div className="text-sm text-gray-600 text-center">
              Completed on {completionTime}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            {onRecheckRows && (
              <Button variant="outline" onClick={onRecheckRows} className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Recheck Rows
              </Button>
            )}
            
            <Button onClick={onReturnToDataset} className="w-full bg-black hover:bg-gray-900 text-white">
              <Home className="h-4 w-4 mr-2" />
              Exit to Dataset Overview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
