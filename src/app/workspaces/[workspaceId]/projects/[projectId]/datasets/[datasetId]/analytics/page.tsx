'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Plus, RefreshCw, Search, Database, Users, CheckCircle, Clock,
  TrendingUp, Activity, ArrowRight, Folder, LayoutDashboard,
  AlertCircle, FileText, Menu, Settings, Eye, Upload, Download,
  ChevronRight, Loader2, Home, BarChart3, Cpu, Scan, FileType,
  ChevronLeft, Save, Printer, Send, ThumbsUp, ThumbsDown,
  Brain, Lightbulb, HelpCircle, Check, X, AlertTriangle,
  MessageSquare, Quote, User, Calendar, Heart, ActivitySquare,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 18 } },
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const t = new Date(dateStr);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-red-100 text-red-700 border-red-200',
    accepted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  const s = map[status.toLowerCase()] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold border', s)}>
      {status}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, sub, action }: {
  icon: React.ElementType; title: string; sub?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </div>
  );
}

export default function DatasetAnalytics() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;
  const datasetId = params.datasetId as string;

  const [activeTab, setActiveTab] = useState('healthcare');
  const [aiSearch, setAiSearch] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<'accept' | 'reject' | null>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});

  const datasetName = 'Patient Record EMR-2024-0847';

  const reviewQuestions = [
    { id: 1, question: 'Is the patient identification correct?', options: ['Yes', 'No', 'Uncertain'] },
    { id: 2, question: 'Are the vital signs within normal range?', options: ['Yes', 'No', 'Requires verification'] },
    { id: 3, question: 'Does the diagnosis match the symptoms?', options: ['Yes', 'Partially', 'No'] },
  ];

  const handleAISuggestion = (action: 'accept' | 'reject') => {
    setSelectedAnswer(action);
    if (action === 'accept') {
      setQuestionAnswers({
        1: 'Yes',
        2: 'Yes',
        3: 'Yes'
      });
      showToast({
        title: 'Assisted Review Pre-filled',
        description: 'All verification items have been pre-filled as ACCEPTED. Please review the options before final submission.',
        type: 'info'
      });
    } else {
      setQuestionAnswers({
        1: 'No',
        2: 'Requires verification',
        3: 'No'
      });
      showToast({
        title: 'Assisted Review Flagged',
        description: 'Verification items have been pre-filled with correction flags. Review the items manually to confirm.',
        type: 'warning'
      });
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-6 pb-8 space-y-6 max-w-7xl mx-auto">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm -mx-4 md:-mx-6 px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <Sidebar forceCollapsed={false} />
              </SheetContent>
            </Sheet>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Link href={`/workspaces/${workspaceId}`} className="text-muted-foreground hover:text-foreground">Workspace</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Link href={`/workspaces/${workspaceId}/projects`} className="text-muted-foreground hover:text-foreground">Projects</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Link href={`/workspaces/${workspaceId}/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">Project</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Link href={`/workspaces/${workspaceId}/projects/${projectId}/datasets/${datasetId}`} className="text-muted-foreground hover:text-foreground">Dataset</Link>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold text-foreground">Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="high" />
            <span className="text-xs font-medium text-muted-foreground">AI Confidence: 94.7%</span>
          </div>
        </div>
      </header>

      {/* Header Actions */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Agentic Dataset Analytics</h1>
            <p className="text-sm text-muted-foreground">{datasetName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Save className="h-3.5 w-3.5" /> Save Draft
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Export PDF
          </Button>
          <Button size="sm" className="h-9 gap-1.5">
            <Send className="h-3.5 w-3.5" /> Submit Review
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="healthcare">
              <Heart className="h-4 w-4 mr-1.5" /> Healthcare View
            </TabsTrigger>
            <TabsTrigger value="raw">
              <FileText className="h-4 w-4 mr-1.5" /> Raw Fields
            </TabsTrigger>
            <TabsTrigger value="original">
              <Eye className="h-4 w-4 mr-1.5" /> Original Document
            </TabsTrigger>
          </TabsList>

          <TabsContent value="healthcare">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Center Panel */}
              <div className="lg:col-span-2 space-y-6">
                <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
                  <SectionHeader icon={User} title="Patient Identification" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="text-sm font-semibold">Johnathan A. Mitchell</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">DOB</p>
                      <p className="text-sm font-semibold">14 Mar 1982</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">MRN</p>
                      <p className="text-sm font-semibold font-mono">MRN-8847-12</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="text-sm font-semibold">Male</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Blood Type</p>
                      <p className="text-sm font-semibold">A+</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Allergies</p>
                      <p className="text-sm font-semibold text-amber-600">Penicillin, Sulfa</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
                  <SectionHeader icon={Activity} title="Vitals & Status" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center">
                      <p className="text-xs text-blue-600">Heart Rate</p>
                      <p className="text-lg font-bold text-blue-700">72 <span className="text-xs font-normal">bpm</span></p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                      <p className="text-xs text-emerald-600">Blood Pressure</p>
                      <p className="text-lg font-bold text-emerald-700">118/76 <span className="text-xs font-normal">mmHg</span></p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center">
                      <p className="text-xs text-amber-600">Temperature</p>
                      <p className="text-lg font-bold text-amber-700">98.6 <span className="text-xs font-normal">°F</span></p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
                  <SectionHeader icon={MessageSquare} title="Clinical Notes (Free-text Excerpt)" />
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm leading-relaxed text-foreground italic">
                      "Patient presents with acute lower back pain radiating to the left leg, onset approximately 3 days
                      ago after lifting heavy equipment. Pain rated 7/10. No history of similar episodes. Neurological
                      exam shows intact motor and sensory function. Recommending conservative management with NSAIDs
                      and physical therapy. Follow-up in 2 weeks if no improvement."
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
                  <SectionHeader icon={Calendar} title="History & Reference" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Previous Visit — 12 Jan 2024</p>
                        <p className="text-xs text-muted-foreground">Routine checkup, all vitals normal</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Medication Record — 05 Mar 2023</p>
                        <p className="text-xs text-muted-foreground">Prescribed Lisinopril 10mg daily</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Lab Results — 22 Feb 2024</p>
                        <p className="text-xs text-muted-foreground">All panels within normal ranges</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Panel */}
              <div className="space-y-6">
                <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
                  <SectionHeader icon={Brain} title="Annotation Intelligence" sub="AI-powered analysis" />
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border bg-gradient-to-br from-violet-50/80 to-white border-violet-200/40">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-violet-600" />
                        <span className="text-xs font-semibold text-violet-700">AI Suggested Answer</span>
                      </div>
                      <p className="text-sm text-foreground mb-3">
                        Based on the clinical notes and vitals, this patient likely has acute lumbar strain with
                        radiculopathy. Recommended ICD-10: M54.5 (Low back pain) and S39.012 (Strain of muscle of lower back).
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <span className="text-xs font-semibold text-emerald-600">94.7%</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: '94.7%' }} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={selectedAnswer === 'accept' ? 'default' : 'outline'}
                          className={cn('flex-1 h-8 text-xs gap-1', selectedAnswer === 'accept' && 'bg-emerald-600 text-white hover:bg-emerald-700')}
                          onClick={() => handleAISuggestion('accept')}
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant={selectedAnswer === 'reject' ? 'default' : 'outline'}
                          className={cn('flex-1 h-8 text-xs gap-1', selectedAnswer === 'reject' && 'bg-red-600 text-white hover:bg-red-700')}
                          onClick={() => handleAISuggestion('reject')}
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <SectionHeader icon={HelpCircle} title="Review Questions" sub="Verify each field" />
                      {reviewQuestions.map(q => (
                        <div key={q.id} className="p-3 rounded-lg border bg-card">
                          <p className="text-xs font-medium text-foreground mb-2">{q.question}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {q.options.map(opt => {
                              const isChecked = questionAnswers[q.id] === opt;
                              return (
                                <button
                                  key={opt}
                                  onClick={() => setQuestionAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                  className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
                                    isChecked
                                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                      : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                                  )}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-lg border bg-emerald-50/50 border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">Agreement Check</span>
                      </div>
                      <p className="text-xs text-emerald-700">
                        AI prediction matches annotator consensus on 6 of 8 fields (75% agreement).
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="raw">
            <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
              <EmptyState icon={FileText} title="Raw Fields View" sub="Structured field data will appear here." />
            </motion.div>
          </TabsContent>

          <TabsContent value="original">
            <motion.div variants={itemVariants} className="rounded-xl border bg-card p-5 shadow-sm">
              <EmptyState icon={Eye} title="Original Document View" sub="The original uploaded document will be rendered here." />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}