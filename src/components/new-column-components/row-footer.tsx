'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
}

export function RowFooter({
  tasks,
  currentTaskIndex,
  onNavigateTask,
  onJumpToRow,
  onMarkAsCompleted,
  completedCount,
  totalCount,
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
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center">
          {/* Left: Row info and Progress */}
          <div className="flex items-center w-1/3 space-x-4">
            <span className="text-sm text-gray-600">
              Total Rows: {tasks.length}
            </span>
           </div>

          {/* Center: Previous + Jump to Row + Next */}
          <div className="flex items-center justify-center space-x-4 flex-1">
            <Button
              onClick={() => onNavigateTask('prev')}
              disabled={currentTaskIndex === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex space-x-2">
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Right: Status Summary */}
          <div className="flex items-center space-x-4 text-sm w-1/3 justify-end">
            {/* Progress bar */}
            <div className="flex items-center space-x-2">
               <span className="text-xs text-gray-500">Progress</span>
               <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}>
                 <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${completionPercent}%` }}></div>
               </div>
               <span className="text-xs text-black">{completionPercent}%</span>
               </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">{finalTotalCount - finalCompletedCount} pending</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">{finalCompletedCount} completed</span>
            </div>
          </div>
        </div>
      </div>
  );
}
