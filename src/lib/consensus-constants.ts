export const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  NOT_STARTED:     { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Not Started' },
  IN_PROGRESS:     { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', label: 'Pending' },
  COMPLETED:       { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-600', label: 'Completed' },
  PENDING_UPDATE:  { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', label: 'Pending Update' },
  AGREED:          { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600', label: 'Agreed' },
  CONFLICT:        { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'Conflict' },
  PARTIAL:         { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-600', label: 'Partial' },
  OVERRIDDEN:      { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', label: 'Overridden' },
  ADMIN_CONFIRMED: { bg: 'bg-green-50 border-green-200', text: 'text-green-600', label: 'Confirmed' },
};

export const STATUS_DISPLAY: Record<string, string> = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'Pending', COMPLETED: 'Completed',
  PENDING_UPDATE: 'Pending Update', AGREED: 'Agreed', CONFLICT: 'Conflict',
  PARTIAL: 'Partial', OVERRIDDEN: 'Overridden', ADMIN_CONFIRMED: 'Confirmed',
};
