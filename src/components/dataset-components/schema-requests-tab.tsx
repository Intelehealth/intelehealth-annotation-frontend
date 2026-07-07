'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { schemaRequestsAPI, SchemaChangeRequestResponse } from '@/lib/api/schema-requests';
import { ArrowLeft, Check, X, FileText, ChevronRight } from 'lucide-react';

interface SchemaRequestsTabProps {
  datasetId: string;
  onNavigateToOverview: () => void;
}

export function SchemaRequestsTab({ datasetId, onNavigateToOverview }: SchemaRequestsTabProps) {
  const [requests, setRequests] = useState<SchemaChangeRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [syncChoices, setSyncChoices] = useState<Record<string, 'PUSH_ALL' | 'KEEP_LOCAL'>>({});
  const { showToast } = useToast();

  useEffect(() => {
    loadRequests();
  }, [datasetId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await schemaRequestsAPI.getByDataset(datasetId);
      setRequests(data.filter(r => r.status === 'PENDING'));
    } catch (err) {
      setError('Failed to load schema change requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    const choice = syncChoices[requestId] || 'PUSH_ALL';
    const note = reviewNotes[requestId] || '';

    try {
      await schemaRequestsAPI.approve(requestId, { choice, reviewNote: note });
      showToast({
        title: 'Request Approved',
        description: 'Schema change has been merged successfully.',
        type: 'success',
      });
      loadRequests();
    } catch (err: any) {
      showToast({
        title: 'Approval Failed',
        description: err?.response?.data?.message || 'Failed to approve request.',
        type: 'error',
      });
    }
  };

  const handleReject = async (requestId: string) => {
    const note = reviewNotes[requestId] || '';
    try {
      await schemaRequestsAPI.reject(requestId, { reviewNote: note });
      showToast({
        title: 'Request Rejected',
        description: 'Schema change request has been discarded.',
        type: 'success',
      });
      loadRequests();
    } catch (err: any) {
      showToast({
        title: 'Rejection Failed',
        description: err?.response?.data?.message || 'Failed to reject request.',
        type: 'error',
      });
    }
  };

  const renderDiff = (req: SchemaChangeRequestResponse) => {
    switch (req.type) {
      case 'ADD_FIELD':
        return (
          <div className="bg-green-50/50 border border-green-150 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-green-700">
              <span className="bg-green-150 text-green-800 text-[10px] px-1.5 py-0.5 rounded">PROPOSE ADD FIELD</span>
              <span className="font-mono">{req.field?.fieldName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 mt-1">
              <div><strong>Question Title:</strong> {req.field?.questionTitle || req.field?.fieldName}</div>
              <div><strong>Type:</strong> {req.field?.columnType || req.field?.fieldType}</div>
              <div><strong>Required:</strong> {req.field?.isRequired ? 'Yes' : 'No'}</div>
              <div><strong>Description:</strong> {req.field?.questionDescription || 'None'}</div>
            </div>
            {req.field?.options && req.field.options.length > 0 && (
              <div className="mt-1">
                <strong>Options:</strong> <code className="bg-white px-1.5 py-0.5 border rounded font-mono">{JSON.stringify(req.field.options)}</code>
              </div>
            )}
          </div>
        );

      case 'ADD_GROUP':
        return (
          <div className="bg-purple-50/50 border border-purple-150 rounded-lg p-3 space-y-2 text-xs text-left">
            <div className="flex items-center gap-1.5 font-bold text-purple-700 border-b border-purple-100 pb-1.5 mb-2">
              <span className="bg-purple-150 text-purple-800 text-[10px] px-1.5 py-0.5 rounded">PROPOSE ADD GROUP</span>
              <span>{req.field?.groupTitle || req.field?.groupName}</span>
            </div>
            <RenderGroupTree group={req.field} />
          </div>
        );

      case 'DELETE_FIELD':
        return (
          <div className="bg-red-50/50 border border-red-150 rounded-lg p-3 space-y-1 text-xs text-left">
            <div className="flex items-center gap-1.5 font-bold text-red-700">
              <span className="bg-red-150 text-red-800 text-[10px] px-1.5 py-0.5 rounded">PROPOSE DELETE FIELD</span>
              <span className="font-mono">{req.fieldName}</span>
            </div>
            <p className="text-slate-500 text-[11px] mt-1">
              Request to permanently remove this question from the workbench config.
            </p>
          </div>
        );

      case 'RENAME_FIELD':
        return (
          <div className="bg-blue-50/50 border border-blue-150 rounded-lg p-3 space-y-2 text-xs text-left">
            <div className="flex items-center gap-1.5 font-bold text-blue-700">
              <span className="bg-blue-150 text-blue-800 text-[10px] px-1.5 py-0.5 rounded">PROPOSE RENAME</span>
              <span className="font-mono">{req.fieldName}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-slate-600 font-mono text-[11px]">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded">{req.fieldName}</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">{req.newQuestionTitle}</span>
            </div>
          </div>
        );

      case 'UPDATE_FIELD':
        const isGroupUpdate = req.field && (req.field.groupId || req.field.fields);
        if (isGroupUpdate) {
          return (
            <div className="bg-purple-50/50 border border-purple-150 rounded-lg p-3 space-y-2 text-xs text-left">
              <div className="flex items-center gap-1.5 font-bold text-purple-700 border-b border-purple-100 pb-1.5 mb-2">
                <span className="bg-purple-150 text-purple-800 text-[10px] px-1.5 py-0.5 rounded">PROPOSE UPDATE GROUP</span>
                <span>{req.field?.groupTitle || req.field?.groupName}</span>
              </div>
              <RenderGroupTree group={req.field} />
            </div>
          );
        }
        return (
          <div className="bg-amber-50/50 border border-amber-150 rounded-lg p-3 space-y-2 text-xs text-left">
            <div className="flex items-center gap-1.5 font-bold text-amber-700">
              <span className="bg-amber-150 text-amber-800 text-[10px] px-1.5 py-0.5 rounded">PROPOSE CHANGE PROPERTIES</span>
              <span className="font-mono">{req.fieldName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-600 mt-1">
              <div><strong>Question Title:</strong> {req.field?.questionTitle || req.field?.fieldName}</div>
              <div><strong>Type:</strong> {req.field?.columnType || req.field?.fieldType}</div>
              <div><strong>Required:</strong> {req.field?.isRequired ? 'Yes' : 'No'}</div>
              <div><strong>Description:</strong> {req.field?.questionDescription || 'None'}</div>
            </div>
            {req.field?.options && req.field.options.length > 0 && (
              <div className="mt-1">
                <strong>Options:</strong> <code className="bg-white px-1.5 py-0.5 border rounded font-mono">{JSON.stringify(req.field.options)}</code>
              </div>
            )}
          </div>
        );

      default:
        return <pre className="text-[10px] p-2 bg-slate-100 rounded">{JSON.stringify(req.field, null, 2)}</pre>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onNavigateToOverview} className="text-slate-600 hover:bg-slate-100 h-8">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Overview
        </Button>
      </div>

      <Card className="border-slate-150 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <span>Pending Schema Change Requests</span>
          </CardTitle>
          <CardDescription>
            Review and approve modifications requested by annotators. Merging changes updates parent configuration and synchronizes clone workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="w-14 h-14 bg-slate-50 border border-slate-150 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-teal-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700 mb-0.5">No Pending Schema Requests</h4>
              <p className="text-xs text-slate-400">All clones and parent configuration are fully in sync.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => {
                const createdBy = req.createdBy as any;
                const annotatorName = createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : 'Unknown Annotator';
                const annotatorEmail = createdBy?.email || '';
                const cloneName = (req.cloneId as any)?.name || 'Clone Workspace';
                const currentSync = syncChoices[req._id] || 'PUSH_ALL';

                return (
                  <div key={req._id} className="p-5 flex flex-col md:flex-row gap-5 items-start">
                    {/* Metatada Details */}
                    <div className="w-full md:w-1/4 space-y-2 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Annotator</span>
                        <strong className="text-slate-800 text-[13px]">{annotatorName}</strong>
                        <span className="block text-slate-400 text-[11px] font-mono mt-0.5">{annotatorEmail}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Workspace</span>
                        <span className="font-semibold text-slate-700 block truncate">{cloneName}</span>
                      </div>
                      {req.rowId && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Case / Row ID</span>
                          <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-[10px]">{req.rowId}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Submitted</span>
                        <span>{new Date(req.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Diff Preview / Compare */}
                    <div className="flex-1 w-full space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Propose Change Preview</span>
                      {renderDiff(req)}
                    </div>

                    {/* Actions and sync selection */}
                    <div className="w-full md:w-1/3 bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-4">
                      {/* Push mode selector */}
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sync Scope</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSyncChoices(prev => ({ ...prev, [req._id]: 'PUSH_ALL' }))}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                              currentSync === 'PUSH_ALL'
                                ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Push to All Clones
                          </button>
                          <button
                            type="button"
                            onClick={() => setSyncChoices(prev => ({ ...prev, [req._id]: 'KEEP_LOCAL' }))}
                            className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                              currentSync === 'KEEP_LOCAL'
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Keep Local Only
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          {currentSync === 'PUSH_ALL'
                            ? 'All clone datasets will update with this field and mark it Pending Update.'
                            : 'Only this requesting annotator will receive the new schema configuration.'}
                        </p>
                      </div>

                      {/* Review notes */}
                      <div className="space-y-1.5">
                        <Label htmlFor={`note-${req._id}`} className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Review Note (Optional)
                        </Label>
                        <Input
                          id={`note-${req._id}`}
                          placeholder="Leave a message for annotator..."
                          value={reviewNotes[req._id] || ''}
                          onChange={(e) => setReviewNotes(prev => ({ ...prev, [req._id]: e.target.value }))}
                          className="h-8 text-xs bg-white border-slate-200"
                        />
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 pt-1.5 border-t border-slate-150">
                        <Button
                          onClick={() => handleReject(req._id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold h-8"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleApprove(req._id)}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold h-8"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Approve &amp; Merge
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RenderGroupTree({ group }: { group: any }) {
  if (!group) return null;

  return (
    <div className="font-mono text-xs leading-relaxed space-y-1 mt-2">
      <div className="flex items-center gap-1.5 py-0.5 font-semibold text-purple-700">
        <span>📦 {group.groupTitle || group.groupName || 'Repeat Group'}</span>
        <span className="text-[10px] text-purple-500 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
          (repeat: {group.repeatCount || 1})
        </span>
      </div>
      {group.fields && group.fields.length > 0 ? (
        <div className="ml-4 border-l border-slate-200 pl-3 space-y-2 mt-1">
          {group.fields.map((field: any, idx: number) => (
            <RenderGroupFieldNode
              key={field.fieldName || idx}
              field={field}
              isLast={idx === group.fields.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="ml-4 text-xs text-red-500 italic">No fields configured inside this repeat group.</div>
      )}
    </div>
  );
}

function RenderGroupFieldNode({ field, isLast }: { field: any; isLast: boolean }) {
  if (!field) return null;
  const type = field.columnType || field.fieldType || 'text';
  const isBranchable = ['radio', 'multiselect', 'select', 'rating', 'checkbox'].includes(type);

  // Extract option/branch children
  const options: any[] = [];
  if (isBranchable) {
    if (field.branching?.enabled && field.branching.options) {
      options.push(...field.branching.options);
    } else if (field.options) {
      field.options.forEach((opt: string) => {
        const colonIdx = opt.indexOf(':');
        const baseVal = colonIdx === -1 ? opt : opt.slice(0, colonIdx);
        options.push({ value: baseVal, childFields: [] });
      });
    }
  }

  return (
    <div className="space-y-1 text-slate-700">
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="text-slate-300 select-none">{isLast ? '└── ' : '├── '}</span>
        <span className="font-semibold text-slate-800">{field.fieldName || 'unnamed'}</span>
        <span className="text-[10px] text-slate-400 bg-slate-150 border border-slate-200 px-1 rounded">
          {type} {field.isRequired ? '(required)' : ''}
        </span>
        {field.questionTitle && (
          <span className="text-[11px] text-slate-500 italic">"{field.questionTitle}"</span>
        )}
      </div>

      {options.length > 0 && (
        <div className="ml-4 border-l border-slate-200 pl-3">
          {options.map((opt, oIdx) => (
            <div key={opt.value || oIdx} className="space-y-1">
              <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                <span>Option:</span>
                <span className="font-semibold text-slate-600">{opt.value}</span>
              </div>
              {opt.childFields && opt.childFields.length > 0 && (
                <div className="ml-4 space-y-1">
                  {opt.childFields.map((child: any, cIdx: number) => (
                    <RenderGroupFieldNode
                      key={child.fieldName || cIdx}
                      field={child}
                      isLast={cIdx === opt.childFields.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

