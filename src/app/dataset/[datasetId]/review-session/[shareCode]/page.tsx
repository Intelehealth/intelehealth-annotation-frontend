'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { consensusAPI } from '@/lib/api/consensus';
import { CollaborativeReviewGrid } from '@/components/consensus/collaborative-review-grid';
import { TopNav } from '@/components/top-nav';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, Users, MessageSquare, Lock, Unlock, CheckCircle2,
  Scale, Send, ShieldCheck, RefreshCw, Download, Archive, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESENCE_INTERVAL_MS = 15000;

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CollaborativeReviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const datasetId = params.datasetId as string;
  const shareCode = params.shareCode as string;
  const { showToast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [activeRowField, setActiveRowField] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await consensusAPI.getSessionByShareCode(shareCode);
      setSession(data);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    load();
  }, [authLoading, isAuthenticated, load, router]);

  // Auto-join on first load if not already a participant
  useEffect(() => {
    if (!session || !user) return;
    const alreadyIn = session.participants?.some((p: any) => p.userId === user._id || p.userId?._id === user._id);
    if (!alreadyIn && !joining) {
      setJoining(true);
      consensusAPI.joinSession(shareCode)
        .then(() => load())
        .catch((err) => {
          showToast({ title: 'Could not join', description: err?.response?.data?.message || 'Failed to join session', type: 'error' });
        })
        .finally(() => setJoining(false));
    }
  }, [session, user, shareCode, joining, load, showToast]);

  // Presence heartbeat while the page is open
  useEffect(() => {
    if (!session?._id) return;
    heartbeatRef.current = setInterval(() => {
      consensusAPI.updatePresence(session._id).catch(() => {});
    }, PRESENCE_INTERVAL_MS);
    consensusAPI.updatePresence(session._id).catch(() => {});
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [session?._id]);

  const onlineCount = useMemo(() => {
    if (!session?.participants) return 0;
    const cutoff = Date.now() - PRESENCE_INTERVAL_MS * 3;
    return session.participants.filter((p: any) => p.lastActiveAt && new Date(p.lastActiveAt).getTime() > cutoff).length;
  }, [session?.participants]);

  const isExpired = session?.expiresAt && new Date(session.expiresAt).getTime() < Date.now();

  // Vote tally per row+field from session.votes (live collaborative votes)
  const voteTallyFor = useCallback((rowIndex: number, fieldName: string) => {
    const votes = (session?.votes || []).filter((v: any) => v.rowIndex === rowIndex && v.fieldName === fieldName);
    const counts = new Map<string, number>();
    for (const v of votes) counts.set(v.value, (counts.get(v.value) || 0) + 1);
    return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  }, [session?.votes]);

  const lockFor = useCallback((rowIndex: number, fieldName: string) => {
    return (session?.fieldLocks || []).find((l: any) => l.rowIndex === rowIndex && l.fieldName === fieldName && !l.releasedAt);
  }, [session?.fieldLocks]);

  const commentsFor = useCallback((rowIndex: number, fieldName: string) => {
    return (session?.comments || []).filter((c: any) => c.rowIndex === rowIndex && c.fieldName === fieldName);
  }, [session?.comments]);

  const handleVote = async (rowIndex: number, fieldName: string, value: string) => {
    if (!session) return;
    const key = `${rowIndex}:${fieldName}`;
    try {
      setSubmittingVote(key);
      const updated = await consensusAPI.submitVote(session._id, { rowIndex, fieldName, value });
      setSession(updated);
    } catch (err: any) {
      showToast({ title: 'Vote failed', description: err?.response?.data?.message || 'Could not submit vote', type: 'error' });
    } finally {
      setSubmittingVote(null);
    }
  };

  const handleLock = async (rowIndex: number, fieldName: string) => {
    if (!session) return;
    try {
      const updated = await consensusAPI.lockField(session._id, { fieldName, rowIndex });
      setSession(updated);
    } catch (err: any) {
      showToast({ title: 'Lock failed', description: err?.response?.data?.message || 'Field already locked by someone else', type: 'error' });
    }
  };

  const handleRelease = async (rowIndex: number, fieldName: string) => {
    if (!session) return;
    const updated = await consensusAPI.releaseField(session._id, { fieldName, rowIndex });
    setSession(updated);
  };

  const handleComment = async (rowIndex: number, fieldName: string) => {
    const key = `${rowIndex}:${fieldName}`;
    const text = (commentText[key] || '').trim();
    if (!text || !session) return;
    try {
      const updated = await consensusAPI.addComment(session._id, { text, rowIndex, fieldName });
      setSession(updated);
      setCommentText((prev) => ({ ...prev, [key]: '' }));
    } catch (err: any) {
      showToast({ title: 'Comment failed', description: err?.response?.data?.message || 'Could not post comment', type: 'error' });
    }
  };

  const handleResolveTie = async (rowIndex: number, fieldName: string, chosenValue: string) => {
    if (!session) return;
    try {
      const updated = await consensusAPI.resolveTie(session._id, { fieldName, rowIndex, chosenValue });
      setSession(updated);
      showToast({ title: 'Tie Resolved', description: `Row ${rowIndex + 1} · ${fieldName} → "${chosenValue}"`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Failed', description: err?.response?.data?.message || 'Could not resolve tie', type: 'error' });
    }
  };

  const handleFinishAndMerge = async () => {
    if (!session) return;
    try {
      setMerging(true);
      const result = await consensusAPI.mergeSession(datasetId, session._id);
      showToast({ title: 'Merged', description: result.message, type: 'success' });
      load();
    } catch (err: any) {
      showToast({ title: 'Merge failed', description: err?.response?.data?.message || 'Session must be COMPLETED (all ties resolved) first', type: 'error' });
    } finally {
      setMerging(false);
    }
  };

  const handleFinalize = async () => {
    if (!session) return;
    try {
      setFinalizing(true);
      await consensusAPI.finalizeSession(datasetId, session._id);
      showToast({ title: 'Finalized', description: 'Resolved dataset is ready for export.', type: 'success' });
      load();
    } catch (err: any) {
      showToast({ title: 'Finalize failed', description: err?.response?.data?.message || 'Session must be MERGED first', type: 'error' });
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopen = async () => {
    if (!session) return;
    const updated = await consensusAPI.reopenSession(session._id);
    setSession(updated);
    showToast({ title: 'Session Reopened', description: 'Extended another 24 hours.', type: 'success' });
  };

  const handleArchive = async () => {
    if (!session) return;
    const updated = await consensusAPI.archiveSession(session._id);
    setSession(updated);
    showToast({ title: 'Session Archived', type: 'success' });
  };

  const handleExportResolved = async () => {
    try {
      const data = await consensusAPI.getResolvedDataset(session._id);
      const blob = new Blob([JSON.stringify(data.rows, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resolved-dataset-${session.title || datasetId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      showToast({ title: 'Export failed', type: 'error' });
    }
  };

  if (authLoading || loading) return (
    <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" /></div>
  );
  if (!isAuthenticated) return null;
  if (!session) return (
    <div className="flex h-screen items-center justify-center text-gray-500">Review session not found.</div>
  );

  const tiedRows: any[] = session.tiedRows || [];
  const allResolved = tiedRows.length === 0;
  const isCollaborative = session.reviewMode === 'COLLABORATIVE';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <TopNav />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push(`/dataset/${datasetId}/consensus`)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="w-8 h-8 rounded-lg bg-fuchsia-100 flex items-center justify-center">
                <Scale className="h-4 w-4 text-fuchsia-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{session.title}</h1>
                <p className="text-xs text-gray-400">Share code: <span className="font-mono font-semibold">{session.shareCode}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
              {isAdmin && session.status === 'MERGED' && (
                <Button size="sm" onClick={handleFinalize} disabled={finalizing} className="bg-green-600 hover:bg-green-700 text-white">
                  {finalizing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />} Finalize
                </Button>
              )}
              {isAdmin && session.status === 'FINALIZED' && (
                <Button size="sm" variant="outline" onClick={handleExportResolved} className="border-green-300 text-green-700">
                  <Download className="h-3.5 w-3.5 mr-1" /> Export Resolved
                </Button>
              )}
            </div>
          </div>

          {/* Session status strip */}
          <div className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-xl shadow-sm flex-wrap">
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
              session.status === 'FINALIZED' ? 'bg-green-100 text-green-700' :
              session.status === 'MERGED' ? 'bg-blue-100 text-blue-700' :
              session.status === 'COMPLETED' ? 'bg-indigo-100 text-indigo-700' :
              session.status === 'ARCHIVED' ? 'bg-gray-200 text-gray-600' :
              'bg-fuchsia-100 text-fuchsia-700')}>
              {session.status}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Users className="h-3.5 w-3.5" /> {session.participants?.length || 0} participants · {onlineCount} online
            </span>
            {!isCollaborative && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Scale className="h-3.5 w-3.5" /> {tiedRows.length} field(s) still tied
              </span>
            )}
            {isExpired && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <Clock className="h-3.5 w-3.5" /> Expired
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isAdmin && isExpired && (
                <Button size="sm" variant="outline" onClick={handleReopen} className="h-7 text-xs border-amber-300 text-amber-700">Reopen</Button>
              )}
              {isAdmin && !isCollaborative && allResolved && session.status === 'ACTIVE' && (
                <Button size="sm" onClick={handleFinishAndMerge} disabled={merging} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  {merging ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />} Complete &amp; Merge
                </Button>
              )}
              {isAdmin && (session.status === 'COMPLETED' || session.status === 'FINALIZED') && (
                <Button size="sm" variant="ghost" onClick={handleArchive} className="h-7 text-xs text-gray-500">
                  <Archive className="h-3 w-3 mr-1" /> Archive
                </Button>
              )}
            </div>
          </div>

          {/* Presence list */}
          <div className="flex items-center gap-2 flex-wrap">
            {(session.participants || []).map((p: any) => {
              const isOnline = p.lastActiveAt && Date.now() - new Date(p.lastActiveAt).getTime() < PRESENCE_INTERVAL_MS * 3;
              return (
                <span key={p.userId?._id || p.userId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200">
                  <span className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-green-500' : 'bg-gray-300')} />
                  {p.userName}
                  <span className="text-gray-400">· {timeAgo(p.lastActiveAt)}</span>
                </span>
              );
            })}
          </div>

          {/* Collaborative mode: single shared final-answer per row/question */}
          {isCollaborative && (
            <CollaborativeReviewGrid
              sessionId={session._id}
              datasetId={datasetId}
              isAdmin={isAdmin}
              sessionStatus={session.status}
              onSessionChanged={load}
            />
          )}

          {!isCollaborative && allResolved && session.status === 'ACTIVE' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> All tied fields have been resolved. An admin can now Complete &amp; Merge this session.
            </div>
          )}

          {/* Per-tied-field cards (legacy tie-vote mode) */}
          {!isCollaborative && tiedRows.map((tie: any) => {
            const key = `${tie.rowIndex}:${tie.fieldName}`;
            const tally = voteTallyFor(tie.rowIndex, tie.fieldName);
            const lock = lockFor(tie.rowIndex, tie.fieldName);
            const comments = commentsFor(tie.rowIndex, tie.fieldName);
            const isLockedByOther = lock && lock.lockedBy?.toString?.() !== user?._id && lock.lockedBy !== user?._id;

            return (
              <div key={key} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Row {tie.rowIndex + 1}</p>
                    <h3 className="text-sm font-bold text-gray-900">{tie.fieldName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-100 text-fuchsia-700">TIE</span>
                    {lock ? (
                      <button onClick={() => !isLockedByOther && handleRelease(tie.rowIndex, tie.fieldName)}
                        className="flex items-center gap-1 text-[10px] text-amber-600" title={isLockedByOther ? 'Locked by another reviewer' : 'Click to release'}>
                        <Lock className="h-3 w-3" /> {isLockedByOther ? 'Locked' : 'Locked by you'}
                      </button>
                    ) : (
                      <button onClick={() => handleLock(tie.rowIndex, tie.fieldName)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600">
                        <Unlock className="h-3 w-3" /> Lock to discuss
                      </button>
                    )}
                  </div>
                </div>

                {/* Votes */}
                <div className="p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Votes</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tie.values.map((v: string) => {
                      const voteCount = tally.find((t) => t.value === v)?.count || 0;
                      return (
                        <button
                          key={v}
                          disabled={!!isLockedByOther || submittingVote === key}
                          onClick={() => handleVote(tie.rowIndex, tie.fieldName, v)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                            'bg-gray-50 border-gray-200 text-gray-700 hover:bg-fuchsia-50 hover:border-fuchsia-300',
                            isLockedByOther && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          {v} <span className="text-gray-400">({voteCount})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Discussion */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> Discussion
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {comments.length === 0 && <p className="text-xs text-gray-400 italic">No comments yet.</p>}
                    {comments.map((c: any) => (
                      <div key={c._id} className="text-xs">
                        <span className="font-semibold text-gray-700">{c.userName}: </span>
                        <span className="text-gray-600">{c.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentText[key] || ''}
                      onChange={(e) => setCommentText((prev) => ({ ...prev, [key]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(tie.rowIndex, tie.fieldName)}
                      placeholder="Add evidence or reasoning…"
                      className="flex-1 h-8 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-fuchsia-400 bg-white"
                    />
                    <Button size="sm" variant="outline" onClick={() => handleComment(tie.rowIndex, tie.fieldName)} className="h-8 px-2">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Admin decision */}
                {isAdmin && (
                  <div className="p-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Decision:</span>
                    {tie.values.map((v: string) => (
                      <Button key={v} size="sm" variant="outline"
                        onClick={() => handleResolveTie(tie.rowIndex, tie.fieldName, v)}
                        className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50">
                        Choose &ldquo;{v}&rdquo;
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
}
