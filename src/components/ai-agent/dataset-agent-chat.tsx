'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  ListTodo,
  PieChart,
  Lightbulb,
  AlertCircle,
  ArrowRight,
  MessageSquareText,
  RefreshCw,
  Target,
  Gauge,
  Layers,
  Clock,
  ClipboardCheck,
  TrendingUp,
  ExternalLink,
  Minimize2,
  Maximize2,
  Copy,
  MoreVertical,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  agentAPI,
  type AgentPlan,
  type AgentPlanItem,
  type DatasetStats,
} from '@/lib/api/agent';
import { StatsReport } from './dataset-stats-report';
import { Collapsible } from './collapsible';

const SUGGESTIONS = [
  'How much data is present in this dataset?',
  "What is the annotation progress?",
  'Are there any conflicts or ties?',
  'What are the main quality risks?',
];

const REPORT_KEYWORDS = ['report', 'plan', 'roadmap', 'road map', 'best course', 'strategy'];

interface ChatMsg {
  role: 'user' | 'agent';
  text: string;
  error?: boolean;
  plan?: AgentPlan;
  stats?: DatasetStats;
}

export function DatasetAgentChat({
  datasetId,
  datasetName,
  width,
  onWidthChange,
  collapsed,
  onToggleCollapsed,
}: {
  datasetId: string;
  datasetName?: string;
  width: number;
  onWidthChange: (w: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [busy, setBusy] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const onWidthChangeRef = useRef(onWidthChange);
  useEffect(() => {
    onWidthChangeRef.current = onWidthChange;
  }, [onWidthChange]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText, streaming]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // delta = how the LEFT edge moved. Dragging right (positive) shrinks the
      // panel, dragging left (negative) expands it.
      const dx = e.clientX - startXRef.current;
      const newWidth = Math.max(320, Math.min(760, startWidthRef.current - dx));
      onWidthChangeRef.current(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setIsResizing(true);
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || streaming || busy) return;

    // A report request should produce the full agent analysis report, not a
    // plain chat answer.
    const lower = q.toLowerCase();
    const wantsReport = REPORT_KEYWORDS.some((k) => lower.includes(k));
    if (wantsReport) {
      setInput('');
      generatePlan();
      return;
    }

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setStreaming(true);
    setStreamingText('');
    agentAPI.chatStream(datasetId, q, {
      onToken: (t) => setStreamingText((p) => p + t),
      onResult: (a) => {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: a.answer || 'No answer returned.' },
        ]);
        setStreaming(false);
        setStreamingText('');
      },
      onError: (message) => {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: message || 'The agent could not answer.', error: true },
        ]);
        setStreaming(false);
        setStreamingText('');
      },
    });
  };

  const runPlan = (answers: Record<string, string | string[]>) => {
    setMessages((prev) => [
      ...prev,
      { role: 'agent', text: 'Analyzing this dataset and preparing your best plan…' },
    ]);
    setBusy(true);
    agentAPI.streamPlan(datasetId, answers, {
      onResult: (plan) => {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: 'Here is the best plan for this dataset:', plan },
        ]);
        setBusy(false);
      },
      onError: (message) => {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: message || 'Could not generate the plan.', error: true },
        ]);
        setBusy(false);
      },
    });
  };

  const generatePlan = async () => {
    if (busy || streaming) return;
    try {
      const res = await agentAPI.getQuestions(datasetId);
      // Use the fallback answers directly - no wizard, no questions asked.
      runPlan(res.fallbackAnswers || {});
    } catch {
      runPlan({});
    }
  };

  const copySummary = async () => {
    const latest = [...messages].reverse().find((m) => m.plan)?.plan;
    const text = latest
      ? `${latest.headline || ''}\n\n${latest.verdict || ''}\n\n${latest.summary || ''}`.trim()
      : '';
    try {
      await navigator.clipboard.writeText(text || 'No report summary available.');
    } catch {
      /* ignore */
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingText('');
  };

  const handleAction = (value: string) => {
    if (value === 'regenerate') generatePlan();
    else if (value === 'copy') copySummary();
    else if (value === 'clear') clearChat();
    else if (value === 'report') generatePlan();
  };

  if (collapsed) {
    return (
      <div
        className="flex flex-col items-stretch h-full min-h-0 rounded-xl border border-slate-200 bg-classic-navy shadow-xl overflow-hidden relative"
        style={{ width: '48px' }}
      >
        {/* Collapsed vertical bar with always-visible expand button */}
        <button
          onClick={onToggleCollapsed}
          className="flex-1 flex flex-col items-center justify-center gap-3 text-white hover:bg-classic-navy-mid transition-colors"
          aria-label="Expand panel"
          title="Expand"
        >
          <span className="p-1.5 rounded-lg bg-classic-gold text-white">
            <Brain className="h-5 w-5" />
          </span>
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full min-h-[520px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden relative"
      style={{ width: `${width}px` }}
    >
      {/* Header (navy & gold classic) */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-classic-navy border-b border-black/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg bg-classic-gold text-white shrink-0">
            <Brain className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Dataset Agent</p>
            <p className="text-[11px] text-slate-300 truncate max-w-[150px]">
              {datasetName || 'This dataset'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Actions dropdown */}
          <Select value="" onValueChange={handleAction}>
            <SelectTrigger className="h-8 w-8 p-0 justify-center rounded-md bg-white/10 hover:bg-white/20 border border-white/20 [&>svg]:!text-white">
              <MoreVertical className="h-4 w-4 text-white" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regenerate">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate report
                </span>
              </SelectItem>
              <SelectItem value="copy">
                <span className="flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy summary
                </span>
              </SelectItem>
              <SelectItem value="clear">
                <span className="flex items-center gap-1.5">
                  <MessageSquareText className="h-3.5 w-3.5" /> Clear chat
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Generate report */}
          <button
            onClick={generatePlan}
            disabled={busy || streaming}
            className="h-8 px-2.5 rounded-md bg-classic-gold hover:bg-classic-gold-hover text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* Collapse / expand */}
          <button
            onClick={onToggleCollapsed}
            className="h-8 w-8 justify-center inline-flex items-center rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white"
            aria-label="Collapse panel"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resize handle — on the LEFT edge so it's always reachable/grabbable */}
      <div
        className="absolute inset-y-0 left-0 w-3 bg-transparent hover:bg-classic-navy/10 cursor-col-resize z-20 group flex items-stretch justify-center"
        onMouseDown={startResize}
        title="Drag to resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize agent panel"
      >
        <div className="h-full w-1.5 my-0 bg-slate-300 group-hover:bg-classic-gold transition-colors rounded-full" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[240px] bg-slate-50">
            {messages.length === 0 && !streaming && (
              <div className="text-center text-xs text-classic-sub py-6 px-2">
                <MessageSquareText className="h-7 w-7 mx-auto mb-2 opacity-40 text-classic-navy" />
                <p className="mb-3">Ask anything about this dataset or generate a report.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={cn(
                    'max-w-[90%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'ml-auto bg-classic-navy text-white'
                      : m.error
                        ? 'bg-red-50 border border-red-200 text-red-900'
                        : 'mr-auto bg-white border border-slate-200 text-classic-slate shadow-sm',
                  )}
                >
                  {m.text}
                </div>
                {m.plan && <PlanCard plan={m.plan} datasetId={datasetId} />}
              </div>
            ))}
            {(streaming || busy) && (
              <div className="space-y-2">
                <div className="mr-auto max-w-[90%] rounded-lg px-3 py-2 text-sm border bg-white text-classic-slate shadow-sm">
                  {streaming ? (
                    <>
                      {streamingText}
                      <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-classic-navy animate-pulse" />
                    </>
                  ) : (
                    <span className="flex items-center gap-2 text-classic-sub">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-classic-navy" />
                      Generating report…
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length === 0 && !streaming && (
            <div className="px-3 pt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-slate-300 text-classic-sub hover:border-classic-gold hover:text-classic-navy hover:bg-classic-navy-soft transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t space-y-3 bg-slate-50">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about this dataset…"
                disabled={streaming}
                className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-classic-gold/50 text-classic-slate disabled:opacity-50"
                aria-label="Type your question about the dataset"
              />
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-classic-navy hover:bg-classic-navy-mid text-white"
                onClick={() => send()}
                disabled={streaming || busy || !input.trim()}
              >
                <Send className="h-3.5 w-3.5" /> Ask
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-9 gap-1.5 border-classic-gold text-classic-navy hover:bg-classic-navy-soft"
              onClick={generatePlan}
              disabled={busy || streaming}
            >
              <Sparkles className="h-4 w-4" />
              {busy ? 'Generating report…' : 'Generate Full Report'}
            </Button>
          </div>
    </div>
  );
}

export function PlanCard({
  plan,
  datasetId,
}: {
  plan: AgentPlan;
  datasetId?: string;
}) {
  return (
    <div className="mr-auto w-full max-w-[94%] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      {/* Report header — navy & gold classic */}
      <div className="px-4 py-3 bg-classic-navy border-b border-black/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider text-white">
            <Brain className="h-4 w-4 text-classic-gold" /> Agent Analysis Report
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {plan.planId && datasetId && (
              <a
                href={`/dataset/${datasetId}/report?planId=${plan.planId}`}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded-full bg-classic-gold text-white text-[10px] font-semibold hover:bg-classic-gold-hover inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> Full report
              </a>
            )}
            <span className="px-2 py-0.5 rounded-full bg-classic-gold text-white text-[10px] font-bold">
              {plan.confidence}% confident
            </span>
            {plan.reasoningTokens > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20 text-[10px] font-semibold">
                {plan.reasoningTokens} tokens
              </span>
            )}
          </div>
        </div>
        {plan.headline && (
          <p className="text-lg font-bold text-white mt-2">{plan.headline}</p>
        )}
      </div>

      <div className="p-3 space-y-3 bg-slate-50">
        <Collapsible
          title="Recommended course of action"
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-classic-gold" />}
          accent="#1d7a4f"
        >
          {plan.verdict && (
            <p className="text-sm font-semibold text-classic-slate flex gap-1.5">
              <span>{plan.verdict}</span>
            </p>
          )}
          {(plan.objective || plan.summary) && (
            <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
              {plan.objective && (
                <p className="text-[12px] font-medium text-classic-navy flex items-start gap-1">
                  <Target className="h-3.5 w-3.5 mt-0.5 shrink-0 text-classic-gold" />
                  <span>{plan.objective}</span>
                </p>
              )}
              {plan.summary && (
                <p className="text-sm leading-relaxed text-classic-sub">{plan.summary}</p>
              )}
            </div>
          )}
        </Collapsible>

        {/* Confidence gauge */}
        {!Number.isNaN(plan.confidence) && plan.confidence >= 0 && plan.confidence <= 100 && (
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-classic-sub">
                <Gauge className="h-3.5 w-3.5 text-classic-gold" /> Decision confidence
              </p>
              <span className="text-sm font-bold text-classic-navy">{plan.confidence}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  plan.confidence >= 70
                    ? 'bg-[#1d7a4f]'
                    : plan.confidence >= 40
                      ? 'bg-classic-gold'
                      : 'bg-[#b91c1c]',
                )}
                style={{ width: `${plan.confidence}%` }}
              />
            </div>
          </div>
        )}

        {/* Graphs / dataset analysis */}
        {plan.datasetStats && (
          <Collapsible
            title="Dataset Analysis"
            icon={<PieChart className="h-3.5 w-3.5 text-classic-gold" />}
          >
            <StatsReport
              stats={plan.datasetStats}
              planReport={{ kpis: plan.report.kpis, metrics: plan.report.metrics }}
            />
          </Collapsible>
        )}

        {/* Scope */}
        {(plan.scope.inScope.length > 0 ||
          plan.scope.outOfScope.length > 0 ||
          plan.scope.assumptions.length > 0) && (
          <Collapsible
            title="Scope"
            icon={<Target className="h-3.5 w-3.5 text-classic-gold" />}
            defaultOpen={false}
          >
            <div className="space-y-2">
              {plan.scope.inScope.length > 0 && (
                <PillGroup label="In scope" dotClass="bg-[#1d7a4f]" items={plan.scope.inScope} />
              )}
              {plan.scope.outOfScope.length > 0 && (
                <PillGroup label="Out of scope" dotClass="bg-[#b91c1c]" items={plan.scope.outOfScope} />
              )}
              {plan.scope.assumptions.length > 0 && (
                <PillGroup label="Assumptions" dotClass="bg-classic-gold" items={plan.scope.assumptions} />
              )}
            </div>
          </Collapsible>
        )}

        {/* KPIs */}
        {plan.report.kpis.length > 0 && (
          <Collapsible
            title="Key Performance Indicators"
            icon={<Gauge className="h-3.5 w-3.5 text-classic-gold" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {plan.report.kpis.map((k, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-2">
                  <p className="text-[10px] text-classic-sub truncate">{k.label}</p>
                  <p className="text-sm font-semibold text-classic-navy mt-1">
                    {fmtValue(k.current, k.unit)}
                    {k.target !== null && (
                      <span className="text-[10px] font-normal text-classic-sub">
                        {' '}/ {fmtValue(k.target, k.unit)}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Phased roadmap */}
        {plan.phases.length > 0 && (
          <Collapsible
            title="Phased Roadmap"
            icon={<Layers className="h-3.5 w-3.5 text-classic-gold" />}
            defaultOpen={false}
          >
            <div className="space-y-2">
              {plan.phases.map((phase, p) => (
                <div key={p} className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <PhaseHeader index={p + 1} name={phase.name} goal={phase.goal} />
                  <div className="mt-2 space-y-1.5">
                    {phase.steps.map((item, i) => (
                      <StepRow key={item.id || i} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Recommended steps */}
        {plan.actionPlan.length > 0 && (
          <Collapsible
            title="Recommended Steps"
            icon={<ListTodo className="h-3.5 w-3.5 text-classic-gold" />}
            defaultOpen={false}
          >
            <div className="space-y-1.5">
              {plan.actionPlan.map((item, i) => (
                <StepRow key={item.id || i} item={item} />
              ))}
            </div>
          </Collapsible>
        )}

        {/* Timeline */}
        {(plan.timeline.totalEffort || plan.timeline.milestones.length > 0) && (
          <Collapsible
            title="Timeline"
            icon={<Clock className="h-3.5 w-3.5 text-classic-gold" />}
            defaultOpen={false}
          >
            <div className="space-y-1">
              {plan.timeline.totalEffort && (
                <p className="text-[12px] text-classic-sub flex items-center gap-1">
                  <Clock className="h-3 w-3 text-classic-gold" /> Estimated effort:{' '}
                  {plan.timeline.totalEffort}
                </p>
              )}
              {plan.timeline.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-classic-navy shrink-0" />
                  <span className="text-classic-slate flex-1">{m.label}</span>
                  <span className="text-classic-navy font-semibold">{m.eta}</span>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* Recommendations + risks */}
        {(plan.report.recommendations?.length > 0 || plan.report.risks?.length > 0) && (
          <div className="grid grid-cols-1 gap-2">
            {plan.report.recommendations?.length > 0 && (
              <Collapsible
                title="Recommendations"
                icon={<Lightbulb className="h-3.5 w-3.5 text-classic-gold" />}
                accent="#1d7a4f"
              >
                <BulletList color="text-[#1d7a4f]" items={plan.report.recommendations} />
              </Collapsible>
            )}
            {plan.report.risks?.length > 0 && (
              <Collapsible title="Risks" icon={<AlertCircle className="h-3.5 w-3.5 text-[#b91c1c]" />} accent="#b91c1c">
                <BulletList color="text-[#b91c1c]" items={plan.report.risks} />
              </Collapsible>
            )}
          </div>
        )}
        {plan.ragCitations && plan.ragCitations.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-classic-sub">
              Source documents (RAG)
            </p>
            <ul className="mt-1.5 space-y-1">
              {plan.ragCitations.map((c, i) => (
                <li
                  key={i}
                  className="text-[11px] text-classic-sub flex gap-1.5 items-start"
                >
                  <BookOpen className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    {c.fileName || 'Document'}
                    {c.page != null ? ` · p.${c.page}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PillGroup({
  label,
  items,
  dotClass,
}: {
  label: string;
  items: string[];
  dotClass: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-classic-sub">{label}</p>
      <ul className="mt-1 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[12px] text-classic-sub flex gap-1.5 items-start">
            <span className={cn('h-1.5 w-1.5 rounded-full mt-1 shrink-0', dotClass)} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhaseHeader({
  index,
  name,
  goal,
}: {
  index: number;
  name: string;
  goal?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-classic-navy text-[10px] font-bold text-white shrink-0 mt-0.5">
        {index}
      </span>
      <div>
        <p className="text-xs font-semibold text-classic-slate">{name}</p>
        {goal && <p className="text-[11px] text-classic-sub">{goal}</p>}
      </div>
    </div>
  );
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="mt-1 space-y-1">
      {items.map((r, i) => (
        <li key={i} className="text-[12px] text-classic-sub flex gap-1.5 items-start">
          <span className={cn('mt-1', color)}>•</span>
          <span>{r}</span>
        </li>
      ))}
    </ul>
  );
}

function StepRow({ item }: { item: AgentPlanItem }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-classic-slate">{item.title}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.estimate && <span className="text-[10px] text-classic-sub">{item.estimate}</span>}
          <PriorityBadge priority={item.priority} />
        </div>
      </div>
      {item.detail && <p className="text-[11px] text-classic-sub">{item.detail}</p>}
      {(item.owner || item.effort || item.impact || item.successMetric || item.tags?.length) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-classic-sub pt-1">
          {item.owner && (
            <span className="inline-flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> {item.owner}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" /> Effort: {item.effort || '—'}
          </span>
          {item.impact && (
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {item.impact}
            </span>
          )}
          {item.successMetric && (
            <span className="inline-flex items-center gap-1 text-[#1d7a4f]">
              <CheckCircle2 className="h-3 w-3" /> {item.successMetric}
            </span>
          )}
          {item.tags?.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded-full bg-classic-navy-soft text-classic-navy text-[9px] font-semibold border border-slate-200"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtValue(v: string | number | null, unit?: string): string {
  if (v === null || v === undefined || v === '') return '—';
  return `${v}${unit ? ` ${unit}` : ''}`;
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const map: Record<string, { cls: string; label: string }> = {
    high: { cls: 'bg-red-100 text-red-700 border-red-200', label: 'High' },
    medium: { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Medium' },
    low: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Low' },
  };
  const cfg = map[priority] || map.medium;
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}
