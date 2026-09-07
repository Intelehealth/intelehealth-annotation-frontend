'use client';

import { Target, Shield, Database, FileText, GitBranch, LayoutDashboard, CheckCircle2, Users, BarChart3, ExternalLink, User, Bell, Download, Activity, Zap, Layout, Code2, Package, Monitor, XCircle, Lock, Key, UserCheck, Upload, History, Settings, Copy, Edit3, Save, GitMerge, AlertCircle, UserPlus, Search, FileDown, CheckSquare, Navigation } from 'lucide-react';
import { SectionPill, H2, type BadgeColor, ZoomBlock, StaggerContent, Reveal, TiltCard, tokens } from './_components';

export default function FunctionalRequirements() {
  const modules = [
    {
      num: '2.1.1', title: 'Authentication & Access Control', slug: 'fr-authentication', icon: Shield,
      key: 'blue', border: '#3b82f6', bg: 'bg-blue-50/30', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', badgeColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 dark:border-blue-700',
      desc: 'Secure identity verification and role-based access for all platform users.',
      count: 8, actionIcons: [Lock, Key, UserCheck],
      items: [
        { id: 'FR-01', desc: 'The system shall allow users to authenticate using a JWT-based credential login.' },
        { id: 'FR-02', desc: 'The system shall allow users to authenticate using Google OAuth as an alternative sign-in method.' },
        { id: 'FR-03', desc: 'The system shall issue a session token upon successful login and validate this token on every protected API request.' },
        { id: 'FR-04', desc: 'The system shall restrict access to administrator-only screens and endpoints using DatasetAccessService.validateAccess() verification instead of hardcoded role checks.' },
        { id: 'FR-05', desc: 'The system shall allow a user to log out, invalidating the active session token.' },
        { id: 'FR-06', desc: 'The system shall persist an authenticated session across page reloads until the token expires or the user logs out.' },
        { id: 'FR-06a', desc: 'The system shall restrict guest or non-invited users on login, displaying a "Waiting for Admin Approval" state on the dashboard.' },
        { id: 'FR-06b', desc: 'The system shall restrict invited annotators to their assigned clones, Tasks console, and Profile Settings.' },
      ],
    },
    {
      num: '2.1.2', title: 'Dataset Management', slug: 'fr-dataset', icon: Database,
      key: 'purple', border: '#a855f7', bg: 'bg-purple-50/30', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', badgeColor: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 dark:border-purple-700',
      desc: 'Governs how raw data enters the system and how its lifecycle is tracked over time.',
      count: 9, actionIcons: [Upload, Database, History],
      items: [
        { id: 'FR-07', desc: 'The system shall allow an administrator to create a new dataset with a name and descriptive metadata.' },
        { id: 'FR-08', desc: 'The system shall allow an administrator to upload a source CSV file into a dataset.' },
        { id: 'FR-09', desc: 'The system shall validate uploaded CSV files for structural correctness and reject malformed files with a descriptive error.' },
        { id: 'FR-10', desc: 'The system shall detect and flag duplicate records during CSV upload.' },
        { id: 'FR-11', desc: 'The system shall assign a unique, system-generated Row ID to every record upon ingestion, independent of any column in the source file.' },
        { id: 'FR-12', desc: 'The system shall maintain a complete upload history for each dataset, including file name, row count, and upload status.' },
        { id: 'FR-13', desc: 'The system shall support multiple CSV uploads into the same dataset over time.' },
        { id: 'FR-14', desc: 'The system shall allow an administrator to update dataset metadata and delete a dataset.' },
        { id: 'FR-15', desc: 'The system shall display dataset-level statistics, including total records, annotation progress, and upload count, on a dataset card or dashboard view.' },
      ],
    },
    {
      num: '2.1.3', title: 'Field Configuration & Schema Management', slug: 'fr-fields', icon: FileText,
      key: 'amber', border: '#f59e0b', bg: 'bg-amber-50/30', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', badgeColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 dark:border-amber-700',
      desc: 'Defines the annotation schema and protects data integrity once annotation has started.',
      count: 9, actionIcons: [Settings, Lock, FileText],
      items: [
        { id: 'FR-16', desc: 'The system shall allow an administrator to select which uploaded columns are treated as metadata versus annotation targets.' },
        { id: 'FR-17', desc: 'The system shall allow an administrator to define annotation fields of type text, numeric, dropdown/select, and repeatable group.' },
        { id: 'FR-18', desc: 'The system shall allow an administrator to mark individual annotation fields as required or optional.' },
        { id: 'FR-19', desc: 'The system shall allow an administrator to define validation rules (for example, numeric ranges or allowed dropdown values) for annotation fields.' },
        { id: 'FR-20', desc: 'The system shall allow an administrator to save a field configuration as the active schema for a dataset.' },
        { id: 'FR-21', desc: 'The system shall automatically lock the schema once a second CSV file has been uploaded into the same dataset, preventing structural changes that would corrupt existing annotations.' },
        { id: 'FR-22', desc: 'The system shall display the current configuration status (editable or locked) to the administrator at all times.' },
        { id: 'FR-22a', desc: 'The system shall increment schema versions on structural configuration changes and trigger automatic clone synchronization for all annotators.' },
        { id: 'FR-22b', desc: 'The system shall preserve compatible answers, mark modified incompatible fields as PENDING_UPDATE, generate placeholders for newly created fields, and archive deleted fields during sync.' },
        { id: 'FR-22c', desc: 'Schema synchronization events (add/delete/rename question, change type, change options, change branch logic, add/delete group, nested group, repeat group) shall automatically update: Annotation Workbench, Task Cards with Pending Update badge, Generate Consensus, Review Consensus, Statistics, Exports, and Audit History.' },
      ],
    },
    {
      num: '2.1.4', title: 'Dataset Cloning & Assignment', slug: 'fr-cloning', icon: GitBranch,
      key: 'green', border: '#22c55e', bg: 'bg-green-50/30', iconBg: 'bg-green-100', iconColor: 'text-green-600', badgeColor: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 dark:border-green-700',
      desc: 'Creates isolated, independent dataset copies for each assigned annotator.',
      count: 6, actionIcons: [Copy, GitBranch, Users],
      items: [
        { id: 'FR-23', desc: 'The system shall allow an administrator to clone a configured dataset and assign the resulting clone to one or more annotators.' },
        { id: 'FR-24', desc: 'The system shall create a physically independent copy of dataset rows for each annotator clone, sharing the same system Row IDs as the parent dataset.' },
        { id: 'FR-25', desc: 'The system shall prevent any annotator from viewing or accessing another annotator\'s clone or annotation values (blind annotation).' },
        { id: 'FR-26', desc: 'The system shall automatically propagate newly added parent-dataset rows to all active annotator clones.' },
        { id: 'FR-27', desc: 'The system shall maintain a clone history record showing the relationship between a parent dataset and each cloned copy.' },
        { id: 'FR-28', desc: 'The system shall allow the administrator to monitor the cloning operation status until completion.' },
      ],
    },
    {
      num: '2.1.5', title: 'Annotation Workbench', slug: 'fr-workbench', icon: LayoutDashboard,
      key: 'indigo', border: '#6366f1', bg: 'bg-indigo-50/30', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', badgeColor: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 dark:border-indigo-700',
      desc: 'Primary annotation surface with autosave, keyboard navigation, and progress tracking.',
      count: 7, actionIcons: [Edit3, Save, Navigation],
      items: [
        { id: 'FR-29', desc: 'The system shall display assigned records to an annotator in a structured workbench view based on the configured schema.' },
        { id: 'FR-30', desc: 'The system shall automatically save annotation input without requiring an explicit save action by the user.' },
        { id: 'FR-31', desc: 'The system shall allow an annotator to resume an in-progress annotation session from the point at which they left off.' },
        { id: 'FR-32', desc: 'The system shall support keyboard-based navigation between records and fields to improve annotation speed.' },
        { id: 'FR-33', desc: 'The system shall validate annotator input against the field-level validation rules defined during configuration.' },
        { id: 'FR-34', desc: 'The system shall display a visual indicator of the annotator\'s overall completion percentage for an assigned dataset.' },
        { id: 'FR-35', desc: 'The system shall maintain a history of annotation changes made to each record.' },
      ],
    },
    {
      num: '2.1.6', title: 'Review Consensus & Consensus Generation', slug: 'fr-consensus', icon: CheckCircle2,
      key: 'emerald', border: '#10b981', bg: 'bg-emerald-50/30', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 dark:border-emerald-700',
      desc: 'Compares submissions, detects disagreement, and produces authoritative final values with zero-blocking access and full schema synchronization.',
      count: 16, actionIcons: [GitMerge, CheckCircle2, AlertCircle],
      items: [
        { id: 'FR-36', desc: 'The system shall present a side-by-side hierarchical tree view matching the Annotation Workbench tree hierarchy exactly.' },
        { id: 'FR-37', desc: 'The system shall map cell and row states to their designated status values: NOT_STARTED, PENDING, AGREED, CONFLICT, ADMIN_CONFIRMED, OVERRIDDEN, or PENDING_UPDATE.' },
        { id: 'FR-38', desc: 'The system shall allow the administrator to review original source text alongside each annotator\'s submitted value.' },
        { id: 'FR-39', desc: 'The system shall automatically accept a value as final when all assigned annotators agree.' },
        { id: 'FR-40', desc: 'The system shall require the administrator to select or enter a final value when annotators disagree.' },
        { id: 'FR-41', desc: 'The system shall allow the administrator to override any annotator value, including in cases of unanimous agreement, with the administrator\'s decision always taking precedence.' },
        { id: 'FR-42', desc: 'The system shall generate a final, consolidated consensus dataset upon administrator confirmation.' },
        { id: 'FR-43', desc: 'The system shall record the resolution method (auto-agreement or administrator override) for every finalised record.' },
        { id: 'FR-43a', desc: 'The system shall support zero-blocking page entry, generating temporary skeleton consensus reviews and showing uncompleted annotator rows as NOT_STARTED or PENDING rather than throwing access errors or hiding rows.' },
        { id: 'FR-43b', desc: 'The system shall allow administrators to view the consensus resolution options and customize decisions for any row regardless of annotator completion rate.' },
        { id: 'FR-43c', desc: 'The system shall enforce that tree hierarchies (CSV, Groups, Nested Groups, Repeat Groups, Repeat Instances) are never flattened in Review or Generate Consensus.' },
        { id: 'FR-43d', desc: 'The Generate Consensus page shall never refuse to open — it must always generate a skeleton review when annotations are incomplete or when no ConsensusReview documents exist.' },
        { id: 'FR-43e', desc: 'The Review Consensus page shall never be empty — it must render every dataset row and every configured field even when no annotator has started working, displaying NOT_STARTED for missing values.' },
        { id: 'FR-43f', desc: 'The system shall maintain a field status lifecycle: NOT_STARTED → PENDING → PARTIAL → AGREED/CONFLICT → ADMIN_CONFIRMED/OVERRIDDEN, never skipping states.' },
        { id: 'FR-43g', desc: 'When schema changes occur (add/delete/rename question, change type/options/branch logic, add/delete group or nested group or repeat group), the system shall auto-increment schema version, sync every annotator clone, preserve compatible answers, mark incompatible answers as PENDING_UPDATE, and archive deleted fields without immediate removal.' },
        { id: 'FR-43h', desc: 'The consensus calculation algorithm shall compare every row, every field, every nested field, every repeat instance, and every branch — with missing values showing NOT_STARTED, incomplete showing PENDING, and schema mismatch showing PENDING_UPDATE.' },
      ],
    },
    {
      num: '2.1.7', title: 'User Management', slug: 'fr-users', icon: Users,
      key: 'cyan', border: '#06b6d4', bg: 'bg-cyan-50/30', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', badgeColor: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 dark:border-cyan-700',
      desc: 'Manages user accounts, invitations, and role-based access across the platform.',
      count: 7, actionIcons: [UserPlus, Search, Shield],
      items: [
        { id: 'FR-44', desc: 'The system shall allow an administrator to invite a new user by email, creating a record with Pending status.' },
        { id: 'FR-45', desc: 'The system shall transition a user\'s status to Active upon successful registration and login.' },
        { id: 'FR-46', desc: 'The system shall transition a user\'s status to Inactive when the user is not currently logged in.' },
        { id: 'FR-47', desc: 'The system shall allow an administrator to disable a user account, immediately revoking platform access.' },
        { id: 'FR-48', desc: 'The system shall allow an administrator to permanently delete a user account.' },
        { id: 'FR-49', desc: 'The system shall allow an administrator to search and filter the user list by name, email, or status.' },
        { id: 'FR-50', desc: 'The system shall display users grouped by invitation status (invited and not-yet-invited) for ease of administration.' },
      ],
    },
    {
      num: '2.1.8', title: 'Notifications & Dashboards', slug: 'fr-notifications', icon: Bell,
      key: 'rose', border: '#f43f5e', bg: 'bg-rose-50/30', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', badgeColor: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 dark:border-rose-700',
      desc: 'Real-time alerts and role-specific dashboards for progress and activity.',
      count: 4, actionIcons: [Bell, BarChart3, Layout],
      items: [
        { id: 'FR-51', desc: 'The system shall generate an in-app notification when an annotator is assigned a new dataset clone.' },
        { id: 'FR-52', desc: 'The system shall generate an in-app notification when a consensus decision affecting a user\'s work is finalised.' },
        { id: 'FR-53', desc: 'The system shall present an administrator dashboard summarising active datasets, annotator progress, and pending reviews.' },
        { id: 'FR-54', desc: 'The system shall present an annotator dashboard summarising assigned tasks, completion progress, and recent notifications.' },
      ],
    },
    {
      num: '2.1.9', title: 'Data Export', slug: 'fr-export', icon: Download,
      key: 'sky', border: '#0ea5e9', bg: 'bg-sky-50/30', iconBg: 'bg-sky-100', iconColor: 'text-sky-600', badgeColor: 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 dark:border-sky-700',
      desc: 'Downloads the final consensus dataset as a structured CSV file with current schema.',
      count: 4, actionIcons: [Download, FileDown, CheckSquare],
      items: [
        { id: 'FR-55', desc: 'The system shall allow an administrator to export the final consensus dataset as a downloadable CSV file.' },
        { id: 'FR-56', desc: 'The exported file shall include the system Row ID and the finalised value for every configured annotation field.' },
        { id: 'FR-56a', desc: 'Every export must use the current schema — deleted fields excluded, new fields included, Pending Update status included, consensus status included, and admin decisions included.' },
        { id: 'FR-56b', desc: 'The system shall support two export modes: "dataset" (clean ground-truth values) and "audit" (side-by-side annotator columns with final decision and status).' },
      ],
    },
  ];

  const nfrItems = [
    { label: 'Performance', icon: Zap, desc: 'The annotation workbench loads assigned records within an acceptable response time under normal network conditions.', bg: 'bg-amber-50/50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'Scalability', icon: BarChart3, desc: 'The containerised architecture allows backend, frontend, and database tiers to scale independently as volume grows.', bg: 'bg-blue-50/50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { label: 'Security', icon: Shield, desc: 'All endpoints require a valid JWT token; passwords are hashed; role-based authorisation is enforced at the API layer.', bg: 'bg-red-50/50', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
    { label: 'Availability', icon: Activity, desc: 'Automatic container restart policies minimise downtime in the event of a process failure.', bg: 'bg-green-50/50', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Data Integrity', icon: Database, desc: 'Schema changes are prevented once multiple uploads exist; referential integrity is preserved across all records.', bg: 'bg-purple-50/50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { label: 'Auditability', icon: FileText, desc: 'Every upload, clone, and consensus decision is recorded with a timestamp and the responsible user.', bg: 'bg-cyan-50/50', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
    { label: 'Usability', icon: Layout, desc: 'The annotation workbench supports keyboard navigation and provides clear visual feedback for autosave and validation.', bg: 'bg-indigo-50/50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { label: 'Maintainability', icon: Code2, desc: 'Backend code is organised into separated NestJS modules with Swagger API contracts and automated unit tests.', bg: 'bg-gray-50/50', iconBg: 'bg-gray-100', iconColor: 'text-gray-600' },
    { label: 'Portability', icon: Package, desc: 'The full stack deploys on any Docker-compatible host through a single Docker Compose definition.', bg: 'bg-orange-50/50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { label: 'Compatibility', icon: Monitor, desc: 'The web application functions correctly on current versions of Chrome, Edge, Firefox, and Safari.', bg: 'bg-teal-50/50', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
  ];

  const borderColors = ['#3b82f6', '#a855f7', '#f59e0b', '#22c55e', '#6366f1', '#10b981', '#06b6d4', '#f43f5e'];

  const INK = 'var(--color-ink)';
  const INDIGO = 'var(--color-indigo)';

  return (
    <section id="functional-requirements" data-section-id="functional-requirements" className="scroll-mt-28">
      <ZoomBlock delay={0}>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-1 rounded"
            style={{ background: '#EEF1F8', color: INDIGO, fontFamily: "'IBM Plex Mono', monospace" }}>§ 02</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #D0CBBE, transparent)' }} />
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight"
          style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>
          Functional Requirements
        </h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: '#5B6478', maxWidth: '62ch' }}>
          Detailed requirements, non-functional constraints, user roles, and the business rules that govern platform behaviour.
        </p>
      </ZoomBlock>

      <StaggerContent className="space-y-6" baseDelay={0.3}>
        {/* 2.1 */}
          <H2 id="fr-intro" data-subsection-id="fr-intro" num="2.1" color="purple">Functional Requirements</H2>
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            Functional requirements define what the DataAnnotate system must do, organised by module so that every business capability is fully traceable to its underlying feature set.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Database, label: '9 Modules', desc: 'Across the full annotation lifecycle', color: 'bg-blue-100', iconColor: 'text-blue-600' },
              { icon: FileText, label: '63 Requirements', desc: 'Each with a unique FR identifier', color: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: Users, label: '2 Roles', desc: 'Administrator and Annotator', color: 'bg-amber-100', iconColor: 'text-amber-600' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 p-5 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300" style={{ borderColor: 'var(--color-border)' }}>
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-none mb-0.5">{stat.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <div id={mod.slug} data-subsection-id={mod.slug} key={mod.num} className="bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300" style={{ borderColor: 'var(--color-border)', borderLeft: `4px solid ${mod.border}` }}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg ${mod.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <mod.icon className={`h-5 w-5 ${mod.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{mod.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] origin-left transform-gpu cursor-default">{mod.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {mod.actionIcons.map((Icon, i) => (
                      <Icon key={i} className={`w-4 h-4 ${mod.iconColor} opacity-60`} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${mod.badgeColor}`}>
                      {mod.count} requirement{mod.count !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 rounded-full bg-gray-300 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ backgroundColor: mod.border, width: '100%' }} />
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">100% covered</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        {/* 2.2 */}
          <H2 id="fr-nonfunctional" data-subsection-id="fr-nonfunctional" num="2.2" color="teal">Non-Functional Requirements</H2>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            Non-functional requirements define the quality attributes the platform must satisfy in order to be fit for production use. These requirements are equally binding as the functional requirements above and are validated through dedicated testing activities.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nfrItems.map((item, i) => (
              <div key={i} className={`flex items-start gap-3 p-5 ${item.bg} border border-gray-200/60 dark:border-gray-700 rounded-xl shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden`}>
                <div className={`w-9 h-9 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{item.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

        {/* 2.3 */}
          <H2 id="fr-roles" data-subsection-id="fr-roles" num="2.3" color="blue">User Roles</H2>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            The platform defines two primary user roles. Each role is associated with a distinct set of permissions, enforced consistently at both the user interface and API layers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50/40 to-white dark:from-blue-950/40 dark:to-gray-900 border border-blue-200/70 dark:border-blue-800/70 rounded-xl p-6 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">Administrator</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
                The Administrator is the platform owner for a given dataset or set of datasets and holds final authority over data and workflow decisions.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Create Datasets', 'Upload CSV', 'Configure Fields', 'Clone & Assign', 'Monitor Progress', 'Resolve Conflicts', 'Override Values', 'Export Data', 'Manage Users'].map((chip, i) => (
                  <span key={i} className="inline-flex px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-200/60 dark:border-blue-700/50">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50/40 to-white dark:from-purple-950/40 dark:to-gray-900 border border-purple-200/70 dark:border-purple-800/70 rounded-xl p-6 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">Annotator</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
                The Annotator is a contributing user responsible for labelling assigned records without visibility into other annotators&apos; work.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Login via JWT / OAuth', 'View Assigned Tasks', 'Annotate Records', 'Resume Sessions', 'Track Progress', 'Update Profile', 'Receive Notifications'].map((chip, i) => (
                  <span key={i} className="inline-flex px-2.5 py-1 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full border border-purple-200/60 dark:border-purple-700/50">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-base font-bold text-gray-700 dark:text-gray-300 mb-3">Permission Comparison</p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300" style={{ borderColor: 'var(--color-border)' }}>
            {[
              { cap: 'Create / configure datasets', admin: true, annot: false },
              { cap: 'Upload CSV files', admin: true, annot: false },
              { cap: 'Clone & assign datasets', admin: true, annot: false },
              { cap: 'Annotate assigned records', admin: false, annot: true },
              { cap: 'View other annotators\' work', admin: true, annot: false },
              { cap: 'Review & resolve conflicts', admin: true, annot: false },
              { cap: 'Override consensus decisions', admin: true, annot: false },
              { cap: 'Manage user accounts', admin: true, annot: false },
              { cap: 'Export final dataset', admin: true, annot: false },
              { cap: 'View personal dashboard / notifications', admin: true, annot: true },
            ].map((perm, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-base font-medium text-gray-800 dark:text-gray-200">{perm.cap}</span>
                <div className="flex items-center gap-5">
                  <span className="flex items-center gap-1.5 text-sm">
                    {perm.admin ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
                    <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">Admin</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm">
                    {perm.annot ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
                    <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">Annotator</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

        {/* 2.4 */}
          <H2 id="fr-rules" data-subsection-id="fr-rules" num="2.4" color="rose">Business Rules</H2>
          <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            Business rules represent the non-negotiable logic that governs platform behaviour, independent of any specific screen or workflow. These rules are binding constraints on any future enhancement to the platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { num: 1, title: 'Schema Lock Rule', desc: 'Once a second CSV file has been uploaded into a dataset, the annotation field configuration for that dataset becomes permanently locked to prevent corruption of previously captured annotations.' },
              { num: 2, title: 'Blind Annotation Rule', desc: 'An annotator may never view, query, or infer the annotation values submitted by any other annotator for the same dataset prior to administrator-led consensus review.' },
              { num: 3, title: 'Administrator Override Authority', desc: 'The administrator\'s decision on a record is always treated as final and overrides any individual or unanimous annotator value.' },
              { num: 4, title: 'Automatic Agreement Rule', desc: 'A record shall be automatically marked as resolved without administrator intervention only when every annotator assigned to that record has submitted an identical value.' },
              { num: 5, title: 'Row Identity Rule', desc: 'Every record, regardless of how many times the source CSV is re-uploaded or cloned, retains a single, immutable system-generated Row ID for traceability.' },
              { num: 6, title: 'Clone Independence Rule', desc: 'Each annotator clone is a physically separate dataset copy; edits to one clone shall never directly alter another clone or the parent dataset, except through the administrator-controlled consensus generation process.' },
              { num: 7, title: 'User Status Lifecycle Rule', desc: 'A user account shall only exist in one of four defined states at any time — Pending, Active, Inactive, or Disabled — and all transitions must follow the defined lifecycle.' },
              { num: 8, title: 'Role Enforcement Rule', desc: 'All permission checks shall be enforced at the API layer in addition to the user interface, so that no role-restricted action can be performed by manipulating the client application alone.' },
            ].map((rule, i) => {
              const color = borderColors[i % borderColors.length];
              const icons = ['Lock', 'Eye', 'Shield', 'CheckCircle', 'Hash', 'GitBranch', 'UserCheck', 'Key'];
              return (
                <div
                  key={i}
                  className="relative bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300" style={{ borderColor: 'var(--color-border)' }}>
                  {/* Top bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
                  <div className="p-5">
                    {/* Rule number badge + title */}
                    <div className="flex items-start gap-3 mb-3">
                      <span
                        className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        {rule.num}
                      </span>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug pt-0.5">{rule.title}</h4>
                    </div>
                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pl-11 transition-transform duration-200 ease-in-out group-hover:translate-x-0.5">{rule.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
      </StaggerContent>
    </section>
  );
}
