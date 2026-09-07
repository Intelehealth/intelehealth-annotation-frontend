'use client';

import { Target, Shield, Database, FileText, GitBranch, LayoutDashboard, CheckCircle2, Users, BarChart3, ExternalLink, ScanEye, NotebookPen, ClipboardList, RefreshCw } from 'lucide-react';
import { SectionPill, H2, H3Icon, StyledTable, IDBadge, RoleBadge, TechBadge, colorMap, type BadgeColor, SubsectionNumber, ZoomBlock, StaggerContent, Reveal, TiltCard, tokens } from './_components';

export default function SuccessMetrics() {
  const INK = 'var(--color-ink)';
  const INDIGO = 'var(--color-indigo)';

  return (
    <section id="success-metrics" data-section-id="success-metrics" className="scroll-mt-28">
      <ZoomBlock delay={0}>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-1 rounded"
            style={{ background: '#EEF1F8', color: INDIGO, fontFamily: "'IBM Plex Mono', monospace" }}>§ 03</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #D0CBBE, transparent)' }} />
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight"
          style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>
          Success Metrics
        </h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: '#5B6478', maxWidth: '62ch' }}>
          Acceptance criteria organised by module — the measurable definition of done for every platform capability.
        </p>
      </ZoomBlock>

      <StaggerContent className="space-y-6" baseDelay={0.3}>
          <H2 id="sm-acceptance" data-subsection-id="sm-acceptance" num="3.1" color="amber">Acceptance Criteria by Module</H2>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            This section defines the measurable conditions every feature must satisfy before it ships. Each criterion serves as the single source of truth for test validation and module sign-off.
          </p>

          {/* 3.1.1 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
<p id="sm-authentication" data-subsection-id="sm-authentication" className="text-base font-bold text-gray-900 dark:text-white">3.1.1 Authentication &amp; Access Control</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">User login, session management, role-based access, and logout</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold rounded-full border border-blue-200/60 dark:border-blue-700 flex-shrink-0">
                    100% role-restricted endpoints enforced
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Valid credentials provided on login form', outcome: 'User authenticates and is redirected to role-appropriate dashboard' },
                      { condition: 'Unauthenticated request reaches a protected endpoint', outcome: 'System returns 401 Unauthorized for all secured routes' },
                      { condition: 'Annotator attempts to access an admin-only route', outcome: 'System returns 403 Forbidden and prevents access' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Valid login redirects to correct dashboard</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Wrong password shows generic error</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Expired token redirects to login</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Logout invalidates token for subsequent requests</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.2 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #a855f7' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Database className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p id="sm-dataset" data-subsection-id="sm-dataset" className="text-base font-bold text-gray-900 dark:text-white">3.1.2 Dataset Management</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">CRUD operations, CSV upload and validation, duplicate detection, statistics</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-bold rounded-full border border-purple-200/60 dark:border-purple-700 flex-shrink-0">
                    0% data loss on upload
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Administrator uploads a valid CSV file', outcome: 'System ingests data and confirms row count to the administrator' },
                      { condition: 'Uploaded CSV is malformed or empty', outcome: 'System rejects with a descriptive error, dataset remains unchanged' },
                      { condition: 'Duplicate records are detected during upload', outcome: 'System flags duplicates in the log and ingests only unique records' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Valid CSV upload confirms correct row count</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Malformed CSV rejected with descriptive error</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Duplicate rows flagged, unique rows ingested</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Dataset update reflects metadata changes immediately</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.3 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p id="sm-fields" data-subsection-id="sm-fields" className="text-base font-bold text-gray-900 dark:text-white">3.1.3 Field Configuration &amp; Schema Management</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Schema definition, field types, validation rules, schema lock</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-sm font-bold rounded-full border border-amber-200/60 dark:border-amber-700 flex-shrink-0">
                    Schema lock enforced after 2nd upload
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Administrator configures annotation fields and saves', outcome: 'Schema activates with text, numeric, dropdown, and group field types' },
                      { condition: 'Annotator leaves a required field empty', outcome: 'System blocks submission and displays a validation error' },
                      { condition: 'A second CSV upload occurs on the same dataset', outcome: 'Schema locks permanently and all field changes are rejected' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — All four field types render correctly in workbench</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Required field bypass blocked with validation error</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Schema lock activates after second upload</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Field edit attempt after lock displays rejection alert</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.4 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #22c55e' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p id="sm-cloning" data-subsection-id="sm-cloning" className="text-base font-bold text-gray-900 dark:text-white">3.1.4 Dataset Cloning &amp; Assignment</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Clone creation, annotator assignment, blind annotation isolation</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-sm font-bold rounded-full border border-green-200/60 dark:border-green-700 flex-shrink-0">
                    0% data leakage across clones
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Administrator clones a configured dataset and selects annotators', outcome: 'Each annotator receives an independent copy with matching Row IDs' },
                      { condition: 'Annotator attempts to view another annotator\'s clone', outcome: 'System blocks access and enforces blind annotation isolation' },
                      { condition: 'New rows are added to the parent dataset', outcome: 'System propagates new rows to all active clones automatically' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Clone creation produces independent copy with correct Row IDs</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Cross-clone access attempt returns access denial</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — New parent rows appear in all clones</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Clone history logs parent-child relationship</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.5 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #6366f1' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <LayoutDashboard className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p id="sm-workbench" data-subsection-id="sm-workbench" className="text-base font-bold text-gray-900 dark:text-white">3.1.5 Annotation Workbench</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Annotator workbench experience, autosave, resume, keyboard navigation</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-bold rounded-full border border-indigo-200/60 dark:border-indigo-700 flex-shrink-0">
                    0% session data loss
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Annotator enters data in the workbench', outcome: 'System autosaves all input without requiring an explicit save action' },
                      { condition: 'Annotator closes and reopens the workbench', outcome: 'Session resumes from the last incomplete record' },
                      { condition: 'Annotator submits invalid field input', outcome: 'System displays a validation error and blocks submission' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Autosave fires automatically without save button interaction</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Session resume returns to the last incomplete record</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Keyboard shortcuts navigate records and fields</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Validation error displays on invalid input</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.6 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p id="sm-consensus" data-subsection-id="sm-consensus" className="text-base font-bold text-gray-900 dark:text-white">3.1.6 Review Consensus &amp; Consensus Generation</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Comparison view, status indicators, auto-resolution, conflict handling, zero-blocking access, skeleton generation, hierarchy mirroring, field status lifecycle</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-bold rounded-full border border-emerald-200/60 dark:border-emerald-700 flex-shrink-0">
                    Zero-blocking access guaranteed
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'All annotators submit identical values for a record', outcome: 'System auto-accepts the value as final without administrator intervention' },
                      { condition: 'Annotators submit conflicting values for a record', outcome: 'System flags the conflict and requires administrator to select or enter a final value' },
                      { condition: 'Administrator overrides any existing annotation', outcome: 'Administrator decision records as final and takes precedence over all values' },
                      { condition: 'Admin opens Generate Consensus with incomplete annotations', outcome: 'System generates a skeleton review immediately — never shows "Cannot generate consensus"' },
                      { condition: 'Admin opens Review Consensus while no reviews exist', outcome: 'System generates a temporary skeleton automatically — Review page is never empty' },
                      { condition: 'Annotator has not started any rows', outcome: 'Every field displays NOT_STARTED status — no fields or rows are hidden' },
                      { condition: 'Schema changed after clone creation', outcome: 'Affected fields display PENDING_UPDATE status in both consensus pages' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Unanimous agreement auto-resolves without admin action</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Conflicting values flagged and queued for admin review</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Admin override applies and records as final</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Resolution method logged per record for audit</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 5</span> — Generate Consensus opens without error when annotators incomplete</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 6</span> — Review Consensus shows all rows and fields even when empty</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 7</span> — Field status lifecycle renders all states correctly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.7 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #06b6d4' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <p id="sm-users" data-subsection-id="sm-users" className="text-base font-bold text-gray-900 dark:text-white">3.1.7 User Management</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Invitation, activation, status transitions, search, disable, deletion</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-sm font-bold rounded-full border border-cyan-200/60 dark:border-cyan-700 flex-shrink-0">
                    All user states governed by lifecycle
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Administrator invites a new user by email', outcome: 'User appears in the list with Pending status' },
                      { condition: 'Invited user logs in for the first time', outcome: 'User status transitions from Pending to Active' },
                      { condition: 'Administrator disables a user account', outcome: 'Access revokes immediately and all active sessions invalidate' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Email invitation creates user with Pending status</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — First login transitions status to Active</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Account disable blocks login and invalidates sessions</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — User search filters correctly by name, email, or status</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.8 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #f43f5e' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900 dark:text-white">3.1.8 Notifications &amp; Dashboards</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Notification generation, administrator dashboard, annotator dashboard</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-sm font-bold rounded-full border border-rose-200/60 dark:border-rose-700 flex-shrink-0">
                    Real-time visibility at every level
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Annotator receives a new dataset clone assignment', outcome: 'In-app notification fires automatically to inform the annotator' },
                      { condition: 'Consensus decision is finalised affecting a user', outcome: 'System sends an in-app notification to the affected user' },
                      { condition: 'Administrator opens the platform dashboard', outcome: 'Dashboard displays active datasets, per-annotator progress, and pending review count' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Clone assignment triggers in-app notification</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Consensus notification reaches the affected user</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Admin dashboard shows datasets, progress, and pending reviews</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Annotator dashboard shows tasks, progress, and notifications</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.9 */}
          <div className="mb-8 last:mb-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #0ea5e9' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                      <ExternalLink className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                      <p id="sm-export" data-subsection-id="sm-export" className="text-base font-bold text-gray-900 dark:text-white">3.1.9 Data Export</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Consensus dataset export and file format</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 text-sm font-bold rounded-full border border-sky-200/60 dark:border-sky-700 flex-shrink-0">
                    Fully traceable CSV output
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Administrator initiates a dataset export', outcome: 'System generates and delivers a downloadable CSV file using current schema' },
                      { condition: 'Export completes successfully', outcome: 'CSV includes system Row IDs and finalised values for every annotation field with consensus status and admin decisions' },
                      { condition: 'Administrator requests audit export', outcome: 'CSV contains side-by-side annotator columns with final decision, status, and schema version' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-sky-100 dark:bg-sky-800 text-sky-700 dark:text-sky-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Export action triggers CSV file download</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — Exported file contains Row IDs, final field values, and status</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Audit export shows side-by-side annotator comparison</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.1.10 */}
          <div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden shadow-sm" style={{ borderLeft: '4px solid #6366f1' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <RefreshCw className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p id="sm-schema-sync" data-subsection-id="sm-schema-sync" className="text-base font-bold text-gray-900 dark:text-white">3.1.10 Schema Synchronization</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Schema versioning, clone sync, PENDING_UPDATE handling, field lifecycle</p>
                    </div>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-bold rounded-full border border-indigo-200/60 dark:border-indigo-700 flex-shrink-0">
                    Zero data loss on schema change
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Acceptance Criteria</p>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {[
                      { condition: 'Administrator adds a new question to the schema after cloning', outcome: 'Schema version increments, all clones receive the new field with PENDING_UPDATE placeholder status' },
                      { condition: 'Administrator deletes a question from the schema', outcome: 'Field is archived (not deleted), version increments, clones updated, and field shows as archived in history' },
                      { condition: 'Administrator modifies question type or options', outcome: 'Schema version increments, existing incompatible answers marked PENDING_UPDATE, compatible answers preserved' },
                      { condition: 'Annotator opens workbench with PENDING_UPDATE fields', outcome: 'Task card shows Pending Update badge, workbench synchronises clone and displays affected rows' },
                      { condition: 'Administrator adds or modifies a group or nested group', outcome: 'Every clone receives updated group structure, new child fields show PENDING_UPDATE, exports and consensus pages reflect changes immediately' },
                    ].map((pair, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 py-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded mt-0.5 flex-shrink-0">IF</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.03] origin-left transform-gpu cursor-default">{pair.condition}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex px-2 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 text-xs font-bold rounded mt-0.5 flex-shrink-0">THEN</span>
                          <span className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">{pair.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Validation Tests</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 1</span> — Schema version increments on every structural change</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 2</span> — New fields appear as PENDING_UPDATE in all clones</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 3</span> — Deleted fields archived, not removed from history</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 4</span> — Annotator sees Pending Update badge on task card</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-800 dark:text-gray-200">Test 5</span> — Generate Consensus and Review Consensus show PENDING_UPDATE correctly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </StaggerContent>
    </section>
  );
}
