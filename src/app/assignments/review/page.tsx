'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { datasetsAPI } from '@/lib/api/datasets';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardList,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Eye,
  Check,
  X,
  RefreshCw,
  GitPullRequest,
  Search,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
interface Assignment {
  _id: string;
  datasetId: string;
  cloneDatasetId: {
    _id: string;
    name: string;
  };
  assignedTo: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'REWORK_REQUIRED' | 'APPROVED' | 'COMPLETED';
  totalRows: number;
  completedRows: number;
  progressPercentage: number;
  parentDatasetName?: string;
  submittedAt?: string;
  rejectionReason?: string;
  reviewNote?: string;
}

interface ChangeRequest {
  _id: string;
  cloneDatasetId: {
    _id: string;
    name: string;
    cloneParentId?: string;
  };
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  type: 'ROW_ADD' | 'ROW_DELETE' | 'COLUMN_ADD' | 'CELL_UPDATE';
  payload: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  parentDatasetName?: string;
}

export default function ReviewQueuePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<'assignments' | 'changes'>('assignments');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Actions State
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REWORK' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Change Request rejection modal
  const [selectedChangeRequest, setSelectedChangeRequest] = useState<ChangeRequest | null>(null);
  const [changeRejectionReason, setChangeRejectionReason] = useState('');

  // Load review queue data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get assignments in queue
      const rawQueue = await datasetsAPI.getReviewQueue();
      setAssignments(rawQueue || []);

      // 2. Get pending change requests
      const rawChanges = await datasetsAPI.getPendingChangeRequests();
      setChangeRequests(rawChanges || []);
    } catch (err) {
      console.error('Error fetching review queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role?.toUpperCase() !== 'ADMIN') {
        router.push('/dashboard');
      } else {
        fetchData();
      }
    }
  }, [isAuthenticated, user, authLoading, router]);

  // Handle Assignment Status Transition
  const handleAssignmentStatus = async () => {
    if (!selectedAssignment || !actionType) return;
    setActionLoading(true);

    try {
      const status = actionType === 'APPROVE' ? 'APPROVED' : 'REWORK_REQUIRED';
      await datasetsAPI.updateAssignmentStatus(
        selectedAssignment._id,
        status,
        actionType === 'APPROVE' ? noteText : undefined,
        actionType === 'REWORK' ? rejectionReason : undefined
      );

      // Close modal and refresh
      setSelectedAssignment(null);
      setActionType(null);
      setNoteText('');
      setRejectionReason('');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update assignment status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Change Request Approval
  const handleApproveChange = async (crId: string) => {
    if (!confirm('Are you sure you want to approve this structural change request? This will modify the parent dataset and automatically sync all active clones.')) {
      return;
    }
    setLoading(true);
    try {
      await datasetsAPI.approveChangeRequest(crId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve change request');
      setLoading(false);
    }
  };

  // Handle Change Request Rejection
  const handleRejectChange = async () => {
    if (!selectedChangeRequest) return;
    if (!changeRejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setActionLoading(true);
    try {
      await datasetsAPI.rejectChangeRequest(selectedChangeRequest._id, changeRejectionReason);
      setSelectedChangeRequest(null);
      setChangeRejectionReason('');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject change request');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading && assignments.length === 0 && changeRequests.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading review queue...</p>
          </div>
        </div>
      </div>
    );
  }

  // Filters
  const filteredAssignments = assignments.filter((a) => {
    const annotatorName = `${a.assignedTo?.firstName || ''} ${a.assignedTo?.lastName || ''}`.toLowerCase();
    const parentName = (a.parentDatasetName || '').toLowerCase();
    const cloneName = (a.cloneDatasetId?.name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return annotatorName.includes(query) || parentName.includes(query) || cloneName.includes(query);
  });

  const filteredChanges = changeRequests.filter((cr) => {
    const annotatorName = `${cr.userId?.firstName || ''} ${cr.userId?.lastName || ''}`.toLowerCase();
    const cloneName = (cr.cloneDatasetId?.name || '').toLowerCase();
    const type = cr.type.toLowerCase();
    const query = searchQuery.toLowerCase();
    return annotatorName.includes(query) || cloneName.includes(query) || type.includes(query);
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-blue-600" />
                Admin Review Queue
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Review submitted annotator tasks and manage pending structural change requests.
              </p>
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 self-start md:self-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Tab Controls & Search */}
        <main className="flex-1 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex bg-gray-100 p-1 rounded-lg self-start">
              <button
                onClick={() => { setActiveTab('assignments'); setSearchQuery(''); }}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-all',
                  activeTab === 'assignments'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Assignments Queue ({assignments.length})
              </button>
              <button
                onClick={() => { setActiveTab('changes'); setSearchQuery(''); }}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md transition-all',
                  activeTab === 'changes'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Change Requests ({changeRequests.length})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={activeTab === 'assignments' ? "Search assignments..." : "Search change requests..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>

          {/* Table Container */}
          <Card className="border-gray-200 bg-white shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {activeTab === 'assignments' ? (
                /* --- ASSIGNMENTS QUEUE TABLE --- */
                filteredAssignments.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No assignments waiting for review.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Annotator</th>
                          <th className="px-6 py-4">Dataset details</th>
                          <th className="px-6 py-4">Progress</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Submitted At</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredAssignments.map((a) => {
                          const annotatorName = `${a.assignedTo?.firstName || ''} ${a.assignedTo?.lastName || ''}`.trim() || a.assignedTo?.email;
                          return (
                            <tr key={a._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-semibold text-gray-900">{annotatorName}</div>
                                <div className="text-xs text-gray-500">{a.assignedTo?.email}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900 truncate max-w-xs">{a.parentDatasetName || 'Dataset'}</div>
                                <div className="text-xs text-indigo-600 truncate max-w-xs">{a.cloneDatasetId?.name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-700">{a.completedRows} / {a.totalRows}</span>
                                  <span className="text-xs text-gray-400">({a.progressPercentage}%)</span>
                                </div>
                                <div className="w-28 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${a.progressPercentage}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <Badge
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border-none',
                                    a.status === 'SUBMITTED' && 'bg-amber-100 text-amber-800',
                                    a.status === 'APPROVED' && 'bg-green-100 text-green-800',
                                    a.status === 'REWORK_REQUIRED' && 'bg-red-100 text-red-800',
                                    a.status === 'COMPLETED' && 'bg-blue-100 text-blue-800',
                                    a.status === 'IN_PROGRESS' && 'bg-sky-100 text-sky-800',
                                    a.status === 'PENDING' && 'bg-gray-100 text-gray-800'
                                  )}
                                >
                                  {a.status === 'REWORK_REQUIRED' ? 'Rework Required' : a.status}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-gray-500 text-xs">
                                {a.submittedAt
                                  ? new Date(a.submittedAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '-'}
                              </td>
                              <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => router.push(`/dataset/${a.cloneDatasetId?._id}`)}
                                  title="Inspect annotator workbench read-only"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Inspect
                                </Button>

                                {a.status === 'SUBMITTED' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => {
                                        setSelectedAssignment(a);
                                        setActionType('APPROVE');
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => {
                                        setSelectedAssignment(a);
                                        setActionType('REWORK');
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Rework
                                    </Button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* --- STRUCTURAL CHANGE REQUESTS TABLE --- */
                filteredChanges.length === 0 ? (
                  <div className="text-center py-12">
                    <GitPullRequest className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No pending structural change requests.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <th className="px-6 py-4">Request Details</th>
                          <th className="px-6 py-4">Source Clone</th>
                          <th className="px-6 py-4">Requested By</th>
                          <th className="px-6 py-4">Requested At</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredChanges.map((cr) => {
                          const annotatorName = `${cr.userId?.firstName || ''} ${cr.userId?.lastName || ''}`.trim() || cr.userId?.email;
                          
                          // Format details payload nicely
                          let payloadStr = '';
                          if (cr.type === 'ROW_ADD') {
                            payloadStr = `Add new row with content: ${JSON.stringify(cr.payload?.rowData || cr.payload || {})}`;
                          } else if (cr.type === 'ROW_DELETE') {
                            payloadStr = `Delete row at index ${cr.payload?.rowIndex}`;
                          } else if (cr.type === 'COLUMN_ADD') {
                            payloadStr = `Add column "${cr.payload?.name || cr.payload?.columnName}" of type ${cr.payload?.columnType || 'text'}`;
                          } else if (cr.type === 'CELL_UPDATE') {
                            payloadStr = `Update cell at row ${cr.payload?.rowIndex}, column "${cr.payload?.columnName}" to "${cr.payload?.value || cr.payload?.newValue}"`;
                          } else {
                            payloadStr = JSON.stringify(cr.payload || {});
                          }

                          return (
                            <tr key={cr._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    className={cn(
                                      'px-2 py-0.5 text-xs font-bold uppercase rounded border-none',
                                      cr.type === 'ROW_ADD' && 'bg-emerald-100 text-emerald-800',
                                      cr.type === 'ROW_DELETE' && 'bg-rose-100 text-rose-800',
                                      cr.type === 'COLUMN_ADD' && 'bg-purple-100 text-purple-800',
                                      cr.type === 'CELL_UPDATE' && 'bg-indigo-100 text-indigo-800'
                                    )}
                                  >
                                    {cr.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div className="text-gray-700 font-medium break-all max-w-lg">{payloadStr}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-600 font-medium">
                                {cr.cloneDatasetId?.name || 'Clone Dataset'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-semibold text-gray-900">{annotatorName}</div>
                                <div className="text-xs text-gray-500">{cr.userId?.email}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-500 text-xs">
                                {new Date(cr.createdAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                <Button
                                  size="sm"
                                  className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApproveChange(cr._id)}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => setSelectedChangeRequest(cr)}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* --- ASSIGNMENT ACTION MODAL (APPROVE / REWORK) --- */}
      {selectedAssignment && actionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl animate-in fade-in zoom-in duration-150">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                {actionType === 'APPROVE' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Approve Assignment
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    Request Rework
                  </>
                )}
              </CardTitle>
              <CardDescription>
                For {selectedAssignment.assignedTo?.firstName} {selectedAssignment.assignedTo?.lastName} - {selectedAssignment.cloneDatasetId?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {actionType === 'APPROVE' ? (
                <div className="space-y-2">
                  <Label htmlFor="note">Approval Note (Optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Provide comments or feedback for the annotator..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-red-700 font-semibold">Rework Instructions (Required)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain clearly what needs to be reworked or fixed..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedAssignment(null);
                    setActionType(null);
                    setNoteText('');
                    setRejectionReason('');
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  className={cn(
                    'text-white border-none',
                    actionType === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  )}
                  onClick={handleAssignmentStatus}
                  disabled={actionLoading || (actionType === 'REWORK' && !rejectionReason.trim())}
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  {actionType === 'APPROVE' ? 'Confirm Approval' : 'Send Rework Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- CHANGE REQUEST REJECTION MODAL --- */}
      {selectedChangeRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white border-none shadow-2xl animate-in fade-in zoom-in duration-150">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-700">
                <X className="h-5 w-5" />
                Reject Structural Change Request
              </CardTitle>
              <CardDescription>
                Rejecting {selectedChangeRequest.type} request from {selectedChangeRequest.userId?.firstName} {selectedChangeRequest.userId?.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="changeReason" className="font-semibold">Rejection Reason (Required)</Label>
                <Textarea
                  id="changeReason"
                  placeholder="Provide a reason why this change request is being rejected..."
                  value={changeRejectionReason}
                  onChange={(e) => setChangeRejectionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedChangeRequest(null);
                    setChangeRejectionReason('');
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectChange}
                  disabled={actionLoading || !changeRejectionReason.trim()}
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Confirm Rejection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
