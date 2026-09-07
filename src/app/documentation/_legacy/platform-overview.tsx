'use client';

import { Info, Database, FileText, Users, GitBranch, CheckCircle2, User, CircleCheckBig, CircleAlert, Server, Shield, Box, ArrowRightCircle, Monitor, Search, ScanEye, Bell, BarChart3, Package, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { SectionPill, H2, colorMap, type BadgeColor, SubsectionNumber, ArrowRight, ArrowDown, ZoomBlock, StaggerContent, TiltCard, Reveal, tokens } from './_components';

const INK    = 'var(--color-ink)';
const INDIGO = 'var(--color-indigo)';
const BRONZE = 'var(--color-bronze)';

export default function PlatformOverview() {
  return (
    <section id="platform-overview" data-section-id="platform-overview" className="scroll-mt-28">

      {/* Section header */}
      <ZoomBlock delay={0}>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-1 rounded"
            style={{ background: '#EEF1F8', color: INDIGO, fontFamily: "'IBM Plex Mono', monospace" }}>§ 01</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #D0CBBE, transparent)' }} />
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight" style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>
          Platform Overview
        </h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: '#5B6478', maxWidth: '62ch' }}>
          Foundational architecture of DataAnnotate — an enterprise-grade collaborative data labeling platform purpose-built for AI teams at scale.
        </p>
      </ZoomBlock>

      <StaggerContent className="space-y-10" baseDelay={0.15} staggerAmount={0.07}>

        {/* 1.1 Project Overview */}
        <H2 id="project-overview" data-subsection-id="project-overview" num="1.1" color="blue">Project Overview</H2>
        <p className="text-base leading-relaxed mb-6" style={{ color: '#3C4656', maxWidth: '72ch' }}>
          DataAnnotate is a centralised, web-based, multi-annotator dataset annotation platform that replaces fragmented spreadsheet-driven workflows with an administrator-governed system for producing model-ready training data at scale. Built for enterprise AI teams, it delivers structure, accountability, and real-time quality control across every annotation pipeline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Server, label: 'Full-Stack Architecture', desc: 'Next.js 15 · NestJS · MongoDB', color: 'blue' as BadgeColor },
            { icon: Shield, label: 'Authentication',         desc: 'JWT + Google OAuth 2.0',      color: 'indigo' as BadgeColor },
            { icon: Box,    label: 'Deployment',             desc: 'Docker + Docker Compose',     color: 'amber' as BadgeColor },
          ].map((card, i) => {
            const c = colorMap[card.color];
            return (
              <TiltCard key={i} max={5}
                className="flex items-start gap-3 p-5 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06),0_8px_20px_-12px_rgba(11,29,51,0.14)] hover:shadow-[0_4px_24px_-8px_rgba(11,29,51,0.22)] transition-shadow duration-300"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                  <card.icon className={`h-5 w-5 ${c.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-bold mb-0.5" style={{ color: INK }}>{card.label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{card.desc}</p>
                </div>
              </TiltCard>
            );
          })}
        </div>

        {/* 1.2 Business Purpose */}
        <H2 id="business-purpose" data-subsection-id="business-purpose" num="1.2" color="purple">Business Purpose</H2>
        <p className="text-base leading-relaxed mb-6" style={{ color: '#3C4656', maxWidth: '72ch' }}>
          Scaling annotation across multiple contributors introduces critical risks — inconsistency, managerial blind spots, and indefensible audit trails — that spreadsheet-based processes cannot address.
        </p>
        <div className="space-y-3">
          {[
            { challenge: 'Annotation Inconsistency at Scale',    issue: 'Multiple annotators produce conflicting labels without a structured resolution process.',        solution: 'Automated consensus engine with admin override',                        accent: '#A8394A' },
            { challenge: 'Lost Visibility for Management',       issue: 'No real-time insight into annotation progress, quality, or bottlenecks across teams.',           solution: 'Live dashboards with per-annotator progress and quality metrics',       accent: '#B8863A' },
            { challenge: 'No Audit Trail for Label Decisions',   issue: 'Unable to trace how a final label was determined or who contributed to it.',                    solution: 'Immutable history of every clone, annotation, and consensus event',    accent: '#2643B0' },
          ].map((item, i) => (
            <TiltCard key={i} max={3}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.05)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300"
              style={{ borderColor: 'var(--color-border)', borderLeft: `3px solid ${item.accent}` }}
            >
              <div className="flex-1">
                <p className="text-sm font-bold mb-1" style={{ color: INK }}>{item.challenge}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{item.issue}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 px-3 py-2 rounded-xl" style={{ background: '#EAF4EE', border: '1px solid #BFE0CD' }}>
                <ArrowRightCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#1A8A62' }} />
                <p className="text-xs font-semibold dark:text-emerald-300" style={{ color: '#1F5A3D' }}>{item.solution}</p>
              </div>
            </TiltCard>
          ))}
        </div>

        {/* 1.3 Objectives */}
        <H2 id="objectives" data-subsection-id="objectives" num="1.3" color="green">Objectives</H2>
        <p className="text-base leading-relaxed mb-4" style={{ color: '#3C4656', maxWidth: '72ch' }}>
          The following objectives represent the measurable goals of the DataAnnotate platform. Each maps directly to a capability described in Functional Requirements and Acceptance Criteria.
        </p>
        <div className="overflow-x-auto rounded-2xl border shadow-[0_1px_2px_rgba(11,29,51,0.04),0_8px_24px_-12px_rgba(11,29,51,0.10)] bg-white" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: INK }}>
                <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/80 w-1/2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Objective</th>
                <th className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/80" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Business Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {[
                { dot: INDIGO,   obj: 'Centralised Dataset Management',           outcome: 'Single system of record for all datasets, eliminating spreadsheet sprawl.' },
                { dot: '#6B4A8A', obj: 'Multi-Annotator Support with Isolation',   outcome: 'Independent parallel annotation without cross-contributor bias.' },
                { dot: BRONZE,   obj: 'Real-Time Progress Monitoring',            outcome: 'Instant visibility into completion and status per annotator.' },
                { dot: '#1A8A62', obj: 'Consensus Generation with Override',       outcome: 'Auto-detected agreement with admin authority on conflicts.' },
                { dot: '#3D45A0', obj: 'Role-Based Security',                      outcome: 'Clearly separated permissions for annotators and administrators.' },
                { dot: '#17797F', obj: 'Scalable, Portable Architecture',          outcome: 'Containerised deployment scales from pilot to enterprise.' },
                { dot: '#2E6CA8', obj: 'Audit-Ready Dataset History',              outcome: 'Every upload, clone, and consensus decision is immutably recorded.' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[#F7F5EF] dark:hover:bg-[#1E293B] transition-colors even:bg-[#FDFCF9] dark:even:bg-[#151B2E]">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.dot }} />
                      <span className="font-semibold text-sm" style={{ color: INK }}>{row.obj}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{row.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 1.4 Scope */}
        <H2 id="scope" data-subsection-id="scope" num="1.4" color="amber">Scope</H2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* In Scope */}
          <Reveal delay={0.05}>
            <div className="rounded-2xl border p-6 bg-[#F7FBF9] dark:bg-[#0C2D1D]" style={{ borderColor: '#BFE0CD' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#1A8A62' }}>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.1em] dark:text-emerald-300" style={{ color: '#175A42', fontFamily: "'IBM Plex Mono', monospace" }}>In Scope</p>
              </div>
              <ul className="space-y-2">
                {['Dataset upload (CSV) and schema configuration','Physical dataset cloning per annotator','Independent per-annotator annotation UI','Consensus engine with conflict resolution','Admin oversight dashboard and controls','Role-based access control (Admin / Annotator)','Export of finalised datasets','Field versioning and schema change propagation'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm dark:text-emerald-200" style={{ color: '#1F5A3D' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#1A8A62' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          {/* Out of Scope */}
          <Reveal delay={0.12}>
            <div className="rounded-2xl border p-6 bg-[#FDF7F7] dark:bg-[#2D1517]" style={{ borderColor: '#F0CED2' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#A8394A' }}>
                  <CircleAlert className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.1em] dark:text-red-300" style={{ color: '#7A2530', fontFamily: "'IBM Plex Mono', monospace" }}>Out of Scope</p>
              </div>
              <ul className="space-y-2">
                {['Model training or inference pipelines','Automated ML/AI label suggestion','Real-time collaborative editing','Native mobile application','Third-party annotation tool integrations','Direct cloud storage integration (S3, GCS)'].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm dark:text-red-200" style={{ color: '#7A2530' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#A8394A' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        {/* 1.5 Business Workflow */}
        <H2 id="business-workflow" data-subsection-id="business-workflow" num="1.5" color="indigo">Overall Business Workflow</H2>
        <p className="text-base leading-relaxed mb-8" style={{ color: '#3C4656', maxWidth: '72ch' }}>
          The end-to-end business process the platform supports — from administrator setup through to a model-ready dataset — is presented in two phases.
        </p>

        {/* Phase 1 */}
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-5" style={{ color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Phase 1 — Dataset Setup, Configuration & Cloning</p>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-3">
            {[
              { label: 'Admin Uploads CSV Dataset',         Icon: Database,   step: '01', color: 'blue' as BadgeColor },
              { label: 'Admin Configures Fields',           Icon: FileText,   step: '02', color: 'indigo' as BadgeColor },
              { label: 'Admin Assigns Annotators',          Icon: Users,      step: '03', color: 'amber' as BadgeColor },
              { label: 'System Generates Physical Clones',  Icon: GitBranch,  step: '04', color: 'green' as BadgeColor },
            ].map((item, i) => {
              const c = colorMap[item.color];
              return (
                <div key={i} className="flex items-center gap-2">
                  <TiltCard max={8} className="flex flex-col items-center text-center w-32">
                    <div className={`w-14 h-14 rounded-2xl ${c.bg} border-2 ${c.border} flex items-center justify-center mb-2 shadow-sm`}>
                      <item.Icon className={`h-6 w-6 ${c.icon}`} />
                    </div>
                    <span className="text-[10px] font-bold mb-1" style={{ color: c.text as string, fontFamily: "'IBM Plex Mono', monospace" }}>{item.step}</span>
                    <span className="text-xs font-semibold leading-snug" style={{ color: INK }}>{item.label}</span>
                  </TiltCard>
                  {i < 3 && <ArrowRight />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 2 */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] mb-5" style={{ color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Phase 2 — Independent Annotation & Consensus Resolution</p>
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { label: 'Annotator A', color: 'blue' as BadgeColor },
                { label: 'Annotator B', color: 'purple' as BadgeColor },
                { label: 'Annotator C', color: 'amber' as BadgeColor },
              ].map((ann, i) => {
                const c = colorMap[ann.color];
                return (
                  <TiltCard key={i} max={8} className="flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl ${c.bg} border-2 ${c.border} flex items-center justify-center mb-1 shadow-sm`}>
                      <User className={`h-6 w-6 ${c.icon}`} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: INK }}>{ann.label}</span>
                  </TiltCard>
                );
              })}
            </div>
            <ArrowDown />
            <div className="w-full max-w-xl rounded-xl border p-3 text-center" style={{ background: 'var(--color-sidebar-bg)', borderColor: 'var(--color-border)' }}>
              <span className="text-sm font-semibold" style={{ color: INK }}>Independent Annotation on Isolated Clones</span>
            </div>
            <ArrowDown />
            <div className="w-full max-w-xl rounded-xl border p-3 text-center" style={{ background: '#EBEDF9', borderColor: '#CBCFEE' }}>
              <span className="text-sm font-bold" style={{ color: INDIGO }}>Consensus Engine</span>
            </div>
            <div className="w-full max-w-2xl rounded-2xl border p-5 text-left" style={{ background: 'var(--color-card-bg)', borderColor: 'var(--color-border)', borderStyle: 'dashed' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] mb-3" style={{ color: INDIGO, fontFamily: "'IBM Plex Mono', monospace" }}>Consensus Rules</p>
              <ul className="space-y-1.5">
                {[
                  'Generate Consensus never blocks — always opens with skeleton review when annotations are incomplete',
                  'Review Consensus renders every row and field, even unstarted ones (NOT_STARTED / PENDING)',
                  'Field status lifecycle: NOT_STARTED → PENDING → PARTIAL → AGREED/CONFLICT → ADMIN_CONFIRMED/OVERRIDDEN',
                  'Schema changes auto-increment version and sync clones; modified fields marked PENDING_UPDATE',
                  'Hierarchy (CSV → Groups → Nested Groups → Repeat Groups → Children) is never flattened',
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: INDIGO, opacity: 0.5 }} />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <ArrowDown />
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: 'All Agree → Auto-Resolved', bg: '#E9F5EF', border: '#BFE0CD', text: '#175A42' },
                { label: 'Partial → Flagged',         bg: '#FBF3E4', border: '#E9D3A3', text: '#7A5417' },
                { label: 'Conflict → Admin Review',   bg: '#FAEBEC', border: '#EAC0C4', text: '#7A2530' },
              ].map((s, i) => (
                <div key={i} className="px-4 py-2 rounded-xl border text-center" style={{ background: s.bg, borderColor: s.border }}>
                  <span className="text-xs font-bold" style={{ color: s.text }}>{s.label}</span>
                </div>
              ))}
            </div>
            <ArrowDown />
            <div className="w-full max-w-xl rounded-xl border-2 p-4 text-center dark:bg-[#0C2D1D]" style={{ background: '#E9F5EF', borderColor: '#1A8A62' }}>
              <span className="text-sm font-bold dark:text-emerald-300" style={{ color: '#175A42' }}>Gold Standard Dataset → Model Training</span>
            </div>
          </div>
        </div>

      </StaggerContent>
    </section>
  );
}
