'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  rowIndex: number;
  fileName: string;
  fileType: 'text' | 'image' | 'audio';
  filePath: string;
  status: 'pending' | 'in_progress' | 'completed' | 'needs_review';
  assignedTo?: string;
  metadata?: Record<string, any>;
  annotations?: any[];
  createdAt: Date;
  updatedAt: Date;
}

interface RowFooterProps {
  tasks: Task[];
  currentTaskIndex: number;
  onNavigateTask: (direction: 'prev' | 'next') => void;
  onJumpToRow: (rowIndex: number) => void;
  onMarkAsCompleted?: (rowIndex: number) => void;
  completedCount?: number;
  totalCount?: number;
  onSaveAllNewColumnData: () => void;
  isSaving: boolean;
}

export function RowFooter({
  tasks,
  currentTaskIndex,
  onNavigateTask,
  onJumpToRow,
  onMarkAsCompleted,
  completedCount,
  totalCount,
  onSaveAllNewColumnData,
  isSaving,
}: RowFooterProps) {
  const annotatedTasks = tasks.filter(
    (task) => task.status === 'completed',
  );
  const unannotatedTasks = tasks.filter(
    (task) => task.status !== 'completed',
  );

  // Use provided counts or calculate from tasks
  const finalCompletedCount = completedCount ?? annotatedTasks.length;
  const finalTotalCount = totalCount ?? tasks.length;
  const completionPercent = finalTotalCount > 0 ? Math.round((finalCompletedCount / finalTotalCount) * 100) : 0;

  return (
    <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
      {/* Row 1: Previous + Jump to Row + Next */}
      <div className="flex flex-row items-center justify-center gap-2 w-full min-w-0 flex-nowrap overflow-x-auto overscroll-x-contain">
            <Button
              onClick={() => onNavigateTask('prev')}
              disabled={currentTaskIndex === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex flex-row items-center justify-center gap-2 flex-nowrap shrink-0 overflow-x-auto">
              {/* Simple pagination: show all rows for small datasets */}
              {tasks.length <= 10 ? (
                // Show all rows if 10 or fewer
                tasks.map((task, index) => (
                  <button
                    key={task.rowIndex}
                    onClick={() => onJumpToRow(task.rowIndex)}
                    className={cn(
                      'px-2 py-1 text-xs rounded transition-colors',
                      index === currentTaskIndex
                        ? 'bg-blue-600 text-white'
                        : task.status === 'completed'
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                    title={`Row ${task.rowIndex} - ${task.status || 'pending'}`}
                  >
                    {task.rowIndex}
                  </button>
                ))
              ) : (
                // Show paginated view for larger datasets
                <>
                  {/* First row */}
                  {currentTaskIndex > 2 && (
                    <>
                      <button
                        onClick={() => onJumpToRow(tasks[0].rowIndex)}
                        className={
                          cn(
                            'px-2 py-1 text-xs rounded transition-colors',
                            currentTaskIndex === 0
                              ? 'bg-blue-600 text-white'
                              : tasks[0].status === 'completed'
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                          )
                        }
                        title={`Row ${tasks[0].rowIndex} - ${tasks[0].status || 'pending'}`}
                      >
                        {tasks[0].rowIndex}
                      </button>
                      {currentTaskIndex > 3 && <span className="text-xs text-gray-500 px-1">...</span>}
                    </>
                  )}
                  
                  {/* Current row ±2 */}
                  {Array.from({ length: Math.min(5, tasks.length) }, (_, i) => {
                    const startIndex = Math.max(0, Math.min(currentTaskIndex - 2, tasks.length - 5));
                    const taskIndex = startIndex + i;
                    const task = tasks[taskIndex];
                    
                    if (!task || taskIndex >= tasks.length) return null;
                    
                    return (
                      <button
                        key={task.rowIndex}
                        onClick={() => onJumpToRow(task.rowIndex)}
                        className={cn(
                          'px-2 py-1 text-xs rounded transition-colors',
                          taskIndex === currentTaskIndex
                            ? 'bg-blue-600 text-white'
                            : task.status === 'completed'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                        title={`Row ${task.rowIndex} - ${task.status || 'pending'}`}
                      >
                        {task.rowIndex}
                      </button>
                    );
                  })}
                  
                  {/* Last row */}
                  {currentTaskIndex < tasks.length - 3 && (
                    <>
                      {currentTaskIndex < tasks.length - 4 && <span className="text-xs text-gray-500 px-1">...</span>}
                      <button
                        onClick={() => onJumpToRow(tasks[tasks.length - 1].rowIndex)}
                        className={cn(
                          'px-2 py-1 text-xs rounded transition-colors',
                          currentTaskIndex === tasks.length - 1
                            ? 'bg-blue-600 text-white'
                            : tasks[tasks.length - 1].status === 'completed'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                        title={`Row ${tasks[tasks.length - 1].rowIndex} - ${(tasks[tasks.length - 1].status || 'pending')} (Last row)`}
                      >
                        {tasks[tasks.length - 1].rowIndex}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            
            <Button
              onClick={() => onNavigateTask('next')}
              disabled={currentTaskIndex === tasks.length - 1}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Row 2: Total Rows + Save */}
          <div className="mt-2 flex items-center justify-between gap-3 flex-nowrap">
            <span className="text-sm text-gray-600 whitespace-nowrap">
              Total Rows: {tasks.length}
            </span>
            <Button
              size="sm"
              onClick={onSaveAllNewColumnData}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 sm:px-6 h-9 transition-colors shadow-sm justify-center shrink-0 whitespace-nowrap"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving…' : 'Save and Continue'}
            </Button>
          </div>

          {/* Row 3: Status Summary */}
          <div className="mt-2 flex items-center justify-center flex-wrap gap-2 sm:gap-4 text-sm w-full min-w-0">
            {/* Progress bar */}
            <div className="flex items-center space-x-2">
               <span className="text-xs text-gray-500 whitespace-nowrap">Progress</span>
               <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}>
                 <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${completionPercent}%` }}></div>
               </div>
               <span className="text-xs text-black whitespace-nowrap">{completionPercent}%</span>
               </div>
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">{finalTotalCount - finalCompletedCount} pending</span>
            </div>
            <div className="flex items-center space-x-1 whitespace-nowrap">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">{finalCompletedCount} completed</span>
            </div>
          </div>
    </div>
  );
}
