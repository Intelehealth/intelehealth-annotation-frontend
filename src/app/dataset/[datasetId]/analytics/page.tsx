'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, LineChart } from 'lucide-react';
import { DatasetAgentChat } from '@/components/ai-agent/dataset-agent-chat';

export default function DatasetAnalyticsPage() {
  const params = useParams();
  const datasetId = String(params?.datasetId || '');

  const [width, setWidth] = useState(520);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="print:hidden sticky top-0 z-20 bg-classic-navy border-b border-black/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/dataset/${datasetId}`}
            className="text-xs text-slate-200 hover:text-white inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <span className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
            <LineChart className="h-4 w-4 text-classic-gold" /> Dataset Analytics Agent
          </span>
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full min-w-0">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-base font-bold text-classic-navy">Agentic Dataset Analysis</h1>
            <p className="text-xs text-classic-sub mt-1 mb-4">
              Ask questions about this dataset, or generate a structured action
              plan and data-health report with the AI agent. When a report is
              ready you can print it or save it as a PDF.
            </p>
            <ul className="space-y-2 text-xs text-classic-sub list-none">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-classic-gold shrink-0" />
                Ask free-form questions like “How much data is present?” or
                “Which fields have the most disagreements?”
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-classic-gold shrink-0" />
                Click <b>Report</b> to stream a structured quality plan, KPIs, risks and roadmap.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-classic-gold shrink-0" />
                Use the <b>•</b> menu to regenerate, copy a summary, or clear the chat.
              </li>
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-classic-sub">
              Generate a report from the chat to unlock a print-ready PDF view.
              Once a plan is ready, use the{" "}
              <b>Full report</b> link inside the agent analysis report.
            </p>
          </div>
        </div>

        {datasetId && (
          <div className="w-full lg:w-auto shrink-0">
            <DatasetAgentChat
              datasetId={datasetId}
              width={width}
              onWidthChange={setWidth}
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((c) => !c)}
            />
          </div>
        )}
      </div>
    </div>
  );
}