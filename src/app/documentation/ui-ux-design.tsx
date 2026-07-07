'use client';

import { useState } from 'react';

import { PanelsTopLeft, LayoutDashboard, Database, ScanEye, Users, NotebookPen, ClipboardList, CheckCircle2, Monitor, Shield, Cpu, HardDrive, Server, FileText, GitBranch, Bell, ExternalLink, BarChart3, ArrowRight, ArrowDown, ChevronDown, ChevronRight, ChevronLeft, Key, AlertCircle, Eye, Download, Upload, RefreshCw, Edit3, Clock, UserCheck, UserX, Home, List, BookOpen, Lock, Activity, Zap, Package, Code2, Wrench, Type, Hash, Layers, HelpCircle, Wand2 } from 'lucide-react';
import { SectionPill, H2, colorMap, type BadgeColor, StatusBadge, StyledTable, ZoomBlock, StaggerContent, Reveal, TiltCard, tokens } from './_components';

const INK = 'var(--color-ink)';
const INDIGO = 'var(--color-indigo)';

const layers = [
  {
    label: 'Client', icon: Monitor, gradient: 'from-blue-500/10 to-blue-50/30 dark:from-blue-900/50 dark:to-indigo-900/50', pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', border: 'border-blue-200/60 dark:border-blue-800/60',
    chips: ['Next.js 15', 'React 19', 'TypeScript 5', 'Tailwind CSS 4', 'Lucide Icons'],
  },
  {
    label: 'API Gateway', icon: Shield, gradient: 'from-purple-500/10 to-purple-50/30 dark:from-purple-900/50 dark:to-purple-900/50', pill: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', border: 'border-purple-200/60 dark:border-purple-800/60',
    chips: ['NestJS Middleware', 'JWT Validation', 'Role Guard', 'Rate Limiting'],
  },
  {
    label: 'Service Layer', icon: Cpu, gradient: 'from-amber-500/10 to-amber-50/30 dark:from-amber-900/50 dark:to-amber-900/50', pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', border: 'border-amber-200/60 dark:border-amber-800/60',
    chips: ['Auth Service', 'Dataset Service', 'Clone Service', 'Annotation Service', 'Consensus Service', 'User Service', 'Notification Service', 'Export Service'],
  },
  {
    label: 'Data', icon: Database, gradient: 'from-green-500/10 to-green-50/30 dark:from-green-900/50 dark:to-green-900/50', pill: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300', border: 'border-green-200/60 dark:border-green-800/60',
    chips: ['MongoDB 8', 'Mongoose 8', 'Document Store', 'Schema Validation'],
  },
  {
    label: 'Infrastructure', icon: HardDrive, gradient: 'from-gray-500/10 to-gray-50/30 dark:from-gray-800/50 dark:to-gray-800/50', pill: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300', border: 'border-gray-200/60 dark:border-gray-700/60',
    chips: ['Docker', 'Docker Compose', 'Container Runtime'],
  },
];

const dbCollections = [
  { name: 'Users', color: 'blue' as BadgeColor, purpose: 'Stores user accounts, credentials, roles, and profile information', icon: Users },
  { name: 'Datasets', color: 'purple' as BadgeColor, purpose: 'Dataset metadata, source CSV references, and lifecycle state', icon: Database },
  { name: 'AnnotationFields', color: 'amber' as BadgeColor, purpose: 'Configured schema fields, validation rules, and lock state per dataset', icon: FileText },
  { name: 'UploadHistory', color: 'amber' as BadgeColor, purpose: 'CSV upload events with file name, row count, and status per dataset', icon: Upload },
  { name: 'CloneHistory', color: 'green' as BadgeColor, purpose: 'Clone creation records linking parent datasets to annotator copies', icon: GitBranch },
  { name: 'DatasetAssignments', color: 'green' as BadgeColor, purpose: 'Annotator-to-clone mapping for access control and progress tracking', icon: List },
  { name: 'MergedRows', color: 'indigo' as BadgeColor, purpose: 'Consolidated annotation values after clone reconciliation', icon: Edit3 },
  { name: 'ConsensusResults', color: 'emerald' as BadgeColor, purpose: 'Final, authoritative record values with resolution method metadata', icon: CheckCircle2 },
  { name: 'ConsensusReview', color: 'emerald' as BadgeColor, purpose: 'Per-row consensus calculations, field reviews, annotator comparisons, branch mismatch flags, and admin override decisions', icon: CheckCircle2 },
  { name: 'Notifications', color: 'rose' as BadgeColor, purpose: 'In-app notification queue for assignment and consensus events', icon: Bell },
];

const apiSteps = [
  { label: 'Client Request', icon: Monitor, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  { label: 'JWT Validation', icon: Key, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { label: 'Role Check', icon: Shield, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  { label: 'Payload Validation', icon: FileText, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { label: 'Service Layer', icon: Cpu, color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  { label: 'DB Response', icon: Database, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
];

const apiOutcomes = [
  { label: '200 Success', desc: 'Request processed and data returned', color: 'bg-green-50 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/60' },
  { label: '400 Bad Request', desc: 'Malformed payload or validation failure', color: 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/60' },
  { label: '401 Unauthorized', desc: 'Missing or invalid JWT token', color: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/60' },
  { label: '403 Forbidden', desc: 'Valid token but insufficient role permissions', color: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/60' },
];

const timelineSteps = [
  { step: 1, actor: 'Admin', label: 'Uploads CSV dataset', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { step: 2, actor: 'System', label: 'Validates and ingests records', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  { step: 3, actor: 'Admin', label: 'Configures annotation schema', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { step: 4, actor: 'Admin', label: 'Clones dataset and assigns annotators', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { step: 5, actor: 'Annotator A', label: 'Annotates assigned records independently', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { step: 6, actor: 'Annotator B', label: 'Annotates assigned records independently', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { step: 7, actor: 'System', label: 'Schema Synchronization — auto-increments version, syncs clones, preserves compatible answers, marks PENDING_UPDATE', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  { step: 8, actor: 'System', label: 'Detects agreement, generates skeleton reviews (zero-blocking), flags conflicts, assigns field status lifecycle', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  { step: 9, actor: 'Admin', label: 'Opens Generate Consensus (always available) and resolves conflicts using dynamic type-aware widgets', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { step: 10, actor: 'Admin', label: 'Reviews hierarchical comparison matrix in Review Consensus — all rows and fields visible even if unstarted', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { step: 11, actor: 'System', label: 'Generates final consensus dataset with current schema, including admin decisions and status', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
];

const tiers = [
  {
    label: 'Core', color: 'blue' as BadgeColor, chips: ['Authentication', 'User Management', 'Role-Based Access'],
  },
  {
    label: 'Workflow', color: 'purple' as BadgeColor, chips: ['Dataset Management', 'Field Configuration', 'Dataset Cloning'],
  },
  {
    label: 'Quality', color: 'amber' as BadgeColor, chips: ['Annotation Workbench', 'Consensus Engine', 'Review Workspace'],
  },
  {
    label: 'Support', color: 'green' as BadgeColor, chips: ['Notifications', 'Dashboards', 'Data Export'],
  },
];

const moduleDetails = [
  { name: 'Authentication', role: 'Verifies user identity and enforces role-based access', actions: ['JWT login', 'Google OAuth', 'Session management'], color: 'blue' as BadgeColor },
  { name: 'Dataset Management', role: 'Governs CSV ingestion and dataset lifecycle', actions: ['CSV upload', 'Duplicate detection', 'Row ID assignment'], color: 'purple' as BadgeColor },
  { name: 'Field Configuration', role: 'Defines annotation schema and validation rules', actions: ['Field types', 'Required fields', 'Schema lock'], color: 'amber' as BadgeColor },
  { name: 'Dataset Cloning', role: 'Creates isolated copies for each annotator', actions: ['Clone creation', 'Annotator assignment', 'Row propagation'], color: 'green' as BadgeColor },
  { name: 'Annotation Workbench', role: 'Primary interface for data labeling', actions: ['Autosave', 'Keyboard nav', 'Progress tracking'], color: 'indigo' as BadgeColor },
  { name: 'Consensus Engine', role: 'Detects agreement, generates skeleton reviews, and resolves conflicts with zero-blocking access', actions: ['Auto-accept', 'Conflict flagging', 'Admin override', 'Skeleton generation', 'Branch mismatch detection'], color: 'emerald' as BadgeColor },
  { name: 'Generate Consensus', role: 'Interactive resolution console with type-aware dynamic value pickers and skeleton review support', actions: ['Zero-blocking open', 'Skeleton review', 'Field override', 'Schema sync'], color: 'emerald' as BadgeColor },
  { name: 'Review Consensus', role: 'Read-only hierarchical comparison matrix matching Annotation Workbench tree exactly', actions: ['Tree hierarchy', 'NOT_STARTED display', 'PENDING_UPDATE', 'Status filter'], color: 'emerald' as BadgeColor },
  { name: 'Schema Synchronization', role: 'Auto-increments version, syncs clones, preserves compatible answers, marks PENDING_UPDATE on schema changes', actions: ['Version increment', 'Clone sync', 'Answer preservation', 'Field archive'], color: 'indigo' as BadgeColor },
  { name: 'User Management', role: 'Manages accounts and access permissions', actions: ['Invitations', 'Status lifecycle', 'Search & filter'], color: 'cyan' as BadgeColor },
  { name: 'Notifications', role: 'Alerts users to assignment and consensus events', actions: ['Clone alerts', 'Consensus updates', 'Dashboard feeds'], color: 'rose' as BadgeColor },
  { name: 'Data Export', role: 'Produces final, model-ready CSV output', actions: ['CSV generation', 'Field inclusion', 'Audit trail'], color: 'sky' as BadgeColor },
];

const adminScreens = [
  { name: 'Dashboard', desc: 'Consolidated platform metrics overview', icon: LayoutDashboard },
  { name: 'Datasets', desc: 'List with search, filter, and CRUD', icon: Database },
  { name: 'Dataset Detail', desc: 'Upload history, field config, clones', icon: FileText },
  { name: 'Clone Assignment', desc: 'Clone creation and annotator assignment', icon: GitBranch },
  { name: 'Generate Consensus', desc: 'Skeleton review generation with dynamic override widgets (never blocks)', icon: Wand2 },
  { name: 'Review Consensus', desc: 'Hierarchical tree comparison matrix matching workbench exactly', icon: ScanEye },
  { name: 'User Management', desc: 'Search, invite, enable, disable, delete', icon: Users },
  { name: 'User Invitation', desc: 'Bulk invite form for new users', icon: UserCheck },
  { name: 'Settings', desc: 'Profile and account configuration', icon: BookOpen },
];

const annotatorScreens = [
  { name: 'Dashboard', desc: 'Assigned tasks and progress summary', icon: LayoutDashboard },
  { name: 'Annotation Workbench', desc: 'Record-by-record labeling interface', icon: NotebookPen },
  { name: 'Settings', desc: 'Profile and account configuration', icon: BookOpen },
];

const dataFlowStages = [
  { label: 'CSV Upload', icon: Upload, color: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300' },
  { label: 'Validation', icon: Shield, color: 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
  { label: 'Master Dataset', icon: Database, color: 'bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
  { label: 'Cloning', icon: GitBranch, color: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
  { label: 'Annotation', icon: Edit3, color: 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
  { label: 'Merged Rows', icon: List, color: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' },
  { label: 'Schema Sync', icon: RefreshCw, color: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' },
  { label: 'Consensus Engine', icon: Cpu, color: 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300' },
  { label: 'Generate Consensus', icon: Wand2, color: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
  { label: 'Review Consensus', icon: ScanEye, color: 'bg-purple-50 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
  { label: 'Consensus Results', icon: CheckCircle2, color: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
  { label: 'Export', icon: Download, color: 'bg-teal-50 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300' },
];

const lifecycleStates = [
  { state: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700', transition: 'Invite sent' },
  { state: 'Active', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', transition: 'First login' },
  { state: 'Inactive', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300 border-gray-300 dark:border-gray-700', transition: 'Logout / timeout' },
  { state: 'Disabled', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700', transition: 'Admin action' },
];

const docPages = [
  {
    title: 'Getting Started',
    purpose: 'Quick onboarding guide for new users to access and navigate the platform.',
    reader: 'All Roles (Administrators and Annotators)',
    features: ['Authentication Strategy', 'Dashboard Overview', 'Profile Management'],
    steps: [
      'Navigate to the application URL in a supported desktop browser.',
      'Enter your registered email and password on the Login page, or click "Sign in with Google" to authenticate via OAuth.',
      'Upon successful authentication, you will be redirected to your dashboard depending on your designated role.'
    ],
    practices: [
      'Use strong passwords and keep credentials secure.',
      'Bookmark your dashboard for easy daily access.'
    ],
    errors: [
      'Invalid Credentials: Double-check email spelling or password casing.',
      'Session Expired: Refresh the browser and log back in to renew your JWT token.'
    ],
    related: ['Platform Overview', 'Profile Settings']
  },
  {
    title: 'Platform Overview',
    purpose: 'Provides a high-level understanding of the architecture, workflow phases, and business goals.',
    reader: 'Managers, Administrators, Technical Stakeholders',
    features: ['Three-Phase Workflow', 'Role-Based Authentication', 'Centralized Configuration'],
    steps: [
      'Explore the main workflow diagram to understand data staging, cloning, and merging phases.',
      'Check the dataset count on the dashboard to see active annotation pipelines.',
      'Verify the user list to ensure annotators are assigned appropriate roles.'
    ],
    practices: [
      'Understand the blind annotation process to avoid bias.',
      'Map your project requirements to supported field types before creating datasets.'
    ],
    errors: [
      'Roles Mismatch: Ensure you are logged into an account with the correct role properties.'
    ],
    related: ['Getting Started', 'Creating Dataset']
  },
  {
    title: 'Creating Dataset',
    purpose: 'Explains how administrators initialize and name new datasets in the system.',
    reader: 'Administrators',
    features: ['Dataset Creation Form', 'Descriptive Metadata Fields', 'Status Initialization'],
    steps: [
      'Navigate to the Datasets page and click the "New Dataset" button.',
      'Enter a unique name, a description, and select the dataset status.',
      'Click "Save Dataset" to create the entry and initialize its upload history.'
    ],
    practices: [
      'Use clear, consistent naming conventions for datasets.',
      'Provide detailed descriptions so other administrators know the purpose of the dataset.'
    ],
    errors: [
      'Duplicate Dataset Name: The database rejects duplicate names; modify your title.'
    ],
    related: ['Uploading CSV', 'Configuring Fields']
  },
  {
    title: 'Uploading CSV',
    purpose: 'Ingestion of raw dataset records from external CSV files.',
    reader: 'Administrators',
    features: ['CSV Drag-and-Drop Ingestion', 'File Structural Validation', 'Row ID Auto-Assignment'],
    steps: [
      'Open your dataset from the Datasets list and click on the "Upload" tab.',
      'Drag and drop your UTF-8 encoded CSV file, or select it from your file explorer.',
      'Click "Confirm Ingest" and monitor the row count indicators until the upload reaches "Complete" status.'
    ],
    practices: [
      'Always check that your CSV files are formatted as UTF-8.',
      'Ensure the CSV headers contain no special characters or trailing spaces.'
    ],
    errors: [
      'Malformed CSV Structure: Check for unmatched quotes or inconsistent column counts in rows.',
      'Ingestion Timeout: For massive files, slice the CSV into smaller files and upload them sequentially.'
    ],
    related: ['Creating Dataset', 'System Dependencies']
  },
  {
    title: 'Configuring Fields',
    purpose: 'Guides the administrator on defining the annotation targets and validation rules.',
    reader: 'Administrators',
    features: ['Visual Schema Builder', 'Field Validation Toggles', 'Dynamic Layout Customizer', 'Automatic Schema Version Increment', 'Clone Synchronization Engine'],
    steps: [
      'Go to the "Field Configuration" tab of your target dataset.',
      'Add target fields by selecting a type: Text, Number, Dropdown, or Group.',
      'Provide labels, custom help text, toggle validations (e.g. required), and save the configuration.',
      'After saving, the system auto-increments the schema version and syncs all active annotator clones.',
    ],
    practices: [
      'Include clear tooltips and validation messages for every field to guide annotators.',
      'Lock the schema after production use to avoid data corruption.',
      'After any schema change, verify Generate Consensus and Review Consensus pages reflect the updated hierarchy correctly.',
    ],
    errors: [
      'Schema Locked: Structural changes are blocked once multiple CSVs are uploaded or cloning has begun.',
      'PENDING_UPDATE Fields: After schema changes, affected clone fields display PENDING_UPDATE until annotators revisit them.',
    ],
    related: ['Field Type Data Schema', 'Best Practices', 'Schema Synchronization']
  },
  {
    title: 'Assigning Annotators',
    purpose: 'Distributing dataset copies (clones) to annotators for independent labeling.',
    reader: 'Administrators',
    features: ['Annotator Assignment Checklist', 'Physical Cloning Trigger', 'Progress Metric Tracing'],
    steps: [
      'Navigate to the "Clones & Assignments" tab of your dataset.',
      'Check the boxes next to the annotators you wish to assign.',
      'Click "Assign & Clone" to trigger the physical copy pipeline in the database.'
    ],
    practices: [
      'Assign at least two annotators to each dataset to enable consensus calculation.',
      'Monitor clone progress status in real-time on the assignment panel.'
    ],
    errors: [
      'Cloning Failed: Verify that the database is responsive and the annotator holds an Active status.'
    ],
    related: ['Dataset Cloning & Assignment', 'User Management']
  },
  {
    title: 'Annotation Workbench',
    purpose: 'Primary workspace where annotators enter label values for assigned datasets.',
    reader: 'Annotators',
    features: ['Dynamic Form Renderer', 'Keyboard Navigation Hooks', 'Live Background Autosave'],
    steps: [
      'Click on an assigned dataset from the Annotator Dashboard to launch the workbench.',
      'Fill in the dynamically rendered fields according to the schema definitions.',
      'Use hotkeys to navigate, resolve validation errors in red, and mark records as complete.'
    ],
    practices: [
      'Use the keyboard shortcuts to skip mouse clicks and double your labeling speed.',
      'Check the completion progress bar to track your daily progress.'
    ],
    errors: [
      'Autosave Failed: Check network connectivity. The workbench will block navigation until connection is restored.'
    ],
    related: ['Keyboard Shortcuts', 'Troubleshooting']
  },
  {
    title: 'Consensus Review',
    purpose: 'Tabular read-only grid displaying comparison results across all annotator workbenches, matching the workbench tree hierarchy exactly. Never empty — always renders all rows and fields.',
    reader: 'Administrators, Project Managers',
    features: ['Hierarchical Row Matrix', 'Unstarted/Pending Annotator Flags', 'Field Status Indicator Lifecycle (NOT_STARTED → PENDING → PARTIAL → AGREED/CONFLICT → ADMIN_CONFIRMED/OVERRIDDEN)', 'Original CSV Side-by-Side Display', 'Zero-Blocking Skeleton Generation', 'PENDING_UPDATE Schema Sync Detection'],
    steps: [
      'Navigate to the "Review Consensus" page for the parent dataset — the page always opens and never displays "No reviews" when empty.',
      'Review every row and field in the hierarchy: CSV columns, questions, groups, nested groups, repeat groups, repeat instances, and conditional branches.',
      'Each field displays exactly one status: NOT_STARTED (no annotator has worked), PENDING (incomplete), PARTIAL, AGREED, CONFLICT, ADMIN_CONFIRMED, or OVERRIDDEN.',
      'Inspect original CSV source data alongside annotators\' submitted values for side-by-side comparison.',
      'Check for any PENDING_UPDATE warnings caused by post-cloning schema configurations — new fields, changed types, modified options, or branch logic changes.',
    ],
    practices: [
      'Never hide unanswered fields or incomplete rows to keep overview metrics accurate.',
      'Identify under-performing annotators who have not started or remain in PENDING state.',
      'All fields must render even when zero annotators have started — never skip hierarchy levels.',
    ],
    errors: [
      'Schema Mismatch: Triggered when admin adds or edits questions, rendering older clone rows as PENDING_UPDATE.',
      'Empty Review: If no ConsensusReview documents exist, the system auto-generates a temporary skeleton — report if page remains blank.',
    ],
    related: ['Generate Consensus', 'Export Dataset']
  },
  {
    title: 'Generate Consensus',
    purpose: 'Action-oriented workflow allowing administrators to generate review skeletons and override annotator conflicts. Always available — never blocks access.',
    reader: 'Administrators',
    features: ['Zero-Blocking Skeleton Review Generator', 'Conflict Resolution Panel with Quick-Action Buttons', 'Schema Synchronization Engine', 'Dynamic Type-Aware Value Override Widget (Rating, Range, Multi-select, Select, Boolean, Textarea, Text)'],
    steps: [
      'Navigate to the "Generate Consensus" page for the parent dataset — the system never blocks opening.',
      'If clones are incomplete or no ConsensusReview documents exist, a skeleton review is created automatically showing every row and field.',
      'For each conflicted field, select either Annotator 1 or Annotator 2 values via quick-action buttons, or choose "Accept Suggestion" for agreed fields.',
      'Click "Choose Another" to manually override any field value using the dynamic datatype input widget matched to the field\'s schema type.',
      'Use Regenerate to recalculate agreements after clone updates, or download Final CSV / Audit CSV for the resolved dataset.',
    ],
    practices: [
      'Admin must always be able to review any row regardless of annotator completion rate.',
      'Ensure any newly added fields or groups are synchronized to clones automatically before generating.',
      'Use Audit CSV export to maintain a side-by-side comparison record for stakeholder reviews.',
    ],
    errors: [
      'Autosave Mismatch: Verify connection status if custom override overrides fail to commit to MergedRows.',
      'Skeleton Generation Failure: If the page fails to render, ensure the schema version and clone configurations are valid.',
    ],
    related: ['Consensus Review', 'Export Dataset']
  },
  {
    title: 'Schema Synchronization',
    purpose: 'Automatic propagation of schema changes across all annotator clones and consensus pages.',
    reader: 'Administrators',
    features: ['Schema Version Increment', 'Automatic Clone Synchronization', 'Compatible Answer Preservation', 'PENDING_UPDATE Marking for Incompatible Fields', 'Field Archiving (Soft Delete)', 'Cross-Module Update (Workbench, Tasks, Generate Consensus, Review Consensus, Exports, Statistics)'],
    steps: [
      'Administrator makes a schema configuration change — add/delete/rename question, change type/options/branch logic, add/delete group, nested group, or repeat group.',
      'System automatically increments the schema version number.',
      'Every annotator clone is synchronized: compatible existing answers are preserved, incompatible answers are marked as PENDING_UPDATE.',
      'Newly created fields insert placeholders in all clones; deleted fields are archived (not removed) for audit history.',
      'All dependent modules update simultaneously: Annotation Workbench, Task Cards (Pending Update badge), Generate Consensus, Review Consensus, Exports, Statistics, and Audit History.',
    ],
    practices: [
      'Always verify that schema changes are reflected correctly in both Generate Consensus and Review Consensus pages.',
      'Communicate schema changes to annotators before syncing, as their open PENDING_UPDATE fields will require revisiting.',
    ],
    errors: [
      'Partial Sync: If some clones fail to receive the update, the schema version will mismatch — trigger a manual re-sync from the admin panel.',
      'Compatible Answer Loss: Ensure field type and option changes are backward-compatible to avoid unnecessary PENDING_UPDATE flags.',
    ],
    related: ['Consensus Review', 'Generate Consensus', 'Field Configuration']
  },
  {
    title: 'Generate Consensus',
    purpose: 'Action-oriented workflow allowing administrators to generate review skeletons and override annotator conflicts.',
    reader: 'Administrators',
    features: ['Skeleton Review Generator', 'Conflict Resolution Panel', 'Schema Synchronization Engine', 'Dynamic Value Override Widget'],
    steps: [
      'Navigate to the "Generate Consensus" tab on the dataset console.',
      'Note: The system never blocks opening; if clones are incomplete, a skeleton review is created automatically.',
      'Select either Annotator 1 or Annotator 2 values, or choose "Accept Suggestion" for agreed fields.',
      'Click "Choose Another" to manually override any field value using the dynamic datatype input widget.'
    ],
    practices: [
      'Admin must always be able to review any row regardless of annotator completion rate.',
      'Ensure any newly added fields or groups are synchronized to clones automatically.'
    ],
    errors: [
      'Autosave Mismatch: Verify connection status if custom override overrides fail to commit to MergedRows.'
    ],
    related: ['Consensus Review', 'Export Dataset']
  },
  {
    title: 'Export Dataset',
    purpose: 'Extracting and downloading the final consensus-resolved dataset.',
    reader: 'Administrators',
    features: ['CSV File Compiler', 'Row ID Mapping', 'Audit Trait Integration'],
    steps: [
      'Go to the dataset detail page and verify that consensus is 100% complete.',
      'Click the "Export Dataset" tab.',
      'Select target columns and click "Download CSV" to save the model-ready dataset file.'
    ],
    practices: [
      'Keep exported files in secure directories as they contain model-ready labels.',
      'Document the consensus audit parameters if audit logs are requested by stakeholders.'
    ],
    errors: [
      'Empty Export: Occurs if consensus generation has not been run or all records are unreviewed.'
    ],
    related: ['Consensus Review', 'Generate Consensus', 'Data Export']
  },
  {
    title: 'User Management',
    purpose: 'Enables administrators to invite, query, search, disable, and delete users.',
    reader: 'Administrators',
    features: ['User Search and In-place Filter', 'Email Invitation Trigger', 'Account Status Controls'],
    steps: [
      'Navigate to the "User Management" page in the header bar.',
      'Click "Invite User", fill in the email address, select a role, and submit.',
      'Use the search bar to query active users, or click "Deactivate" to suspend platform access.'
    ],
    practices: [
      'Deactivate departing staff accounts immediately to maintain platform security.',
      'Regularly review pending invitations and resend expired tokens.'
    ],
    errors: [
      'Invitation Failed: Verify SMTP configurations are set in environment variables.'
    ],
    related: ['Getting Started', 'Profile Settings']
  },
  {
    title: 'Notifications',
    purpose: 'Delivers real-time assignment notifications and consensus alerts to users.',
    reader: 'All Roles',
    features: ['Real-time Header Bell Icon', 'In-App Alert Notification Queue', 'Actionable Deep-linking'],
    steps: [
      'Monitor the bell icon in the upper right header for indicator counts.',
      'Click the bell icon to open the dropdown list of unread alerts.',
      'Click on any notification to directly navigate to the relevant dataset or task page.'
    ],
    practices: [
      'Clear notifications regularly to maintain a clean workspace dashboard.',
      'Enable email notifications in profile settings for critical alerts.'
    ],
    errors: [
      'Notifications Not Loading: Clear browser cache or check WebSocket server status.'
    ],
    related: ['Dashboard', 'Getting Started']
  },
  {
    title: 'Dashboard',
    purpose: 'Aggregated analytics and tracking hub tailored to the active user\'s role.',
    reader: 'All Roles',
    features: ['KPI Status Metric Cards', 'Live In-Progress Grid', 'Recent Notifications Feed'],
    steps: [
      'Log into the platform to automatically load your role-based dashboard.',
      'Review overall completion rates, active assignments, and recent notifications.',
      'Click on any active item row to resume work immediately.'
    ],
    practices: [
      'Use the dashboard as your starting point to check daily performance and goals.',
      'Administrators should watch the review queue counts to plan conflict resolution.'
    ],
    errors: [
      'Out-of-Sync Dashboard: Reload the browser or check server API status to refresh websocket connections.'
    ],
    related: ['Platform Overview', 'Success Metrics']
  },
  {
    title: 'Profile Settings',
    purpose: 'Managing individual profile details, passwords, and user preferences.',
    reader: 'All Roles',
    features: ['Name and Details Editor', 'Security Password Form', 'Appearance Theme Selector'],
    steps: [
      'Click on your avatar in the upper right and select "Profile Settings".',
      'Update your details or fill in the password forms to change credentials.',
      'Select Light or Dark mode, then click "Update Settings".'
    ],
    practices: [
      'Change passwords regularly and make sure they conform to security strength guidelines.',
      'Upload an avatar image to help administrators identify your reviews.'
    ],
    errors: [
      'Update Failed: Ensure your current password is input correctly when changing passwords.'
    ],
    related: ['Getting Started', 'User Management']
  },
  {
    title: 'Keyboard Shortcuts',
    purpose: 'Details the Hotkeys configured to enable high-speed data labeling.',
    reader: 'Annotators',
    features: ['Workspace Overlay Guide', 'Navigation Hotkeys', 'Input Hotkeys'],
    steps: [
      'Inside the Annotation Workbench, click the "Keyboard" icon in the lower bar or press Shift+?.',
      'Review the list of shortcuts available.',
      'Press Alt+Enter to submit, Alt+Right to move to next, or Alt+L to focus the first field.'
    ],
    practices: [
      'Memorize Alt+Enter and Alt+Right as they are used in 95% of the workbench flow.',
      'Avoid overriding system hotkeys in your local browser settings.'
    ],
    errors: [
      'Shortcuts Not Responding: Make sure text fields are unfocused when pressing navigation shortcuts.'
    ],
    related: ['Annotation Workbench', 'Troubleshooting']
  },
  {
    title: 'Frequently Asked Questions',
    purpose: 'A collection of standard questions and answers regarding platform capabilities.',
    reader: 'All Roles',
    features: ['FAQ Topic Categories', 'Search & Expand Accordion', 'Feedback Form Link'],
    steps: [
      'Navigate to the Help page and select the FAQ tab.',
      'Search questions by keyword or select categories (e.g. Ingestion, Consensus).',
      'Click the target question card to expand and read the answers.'
    ],
    practices: [
      'Check the FAQ first before raising support tickets.',
      'Administrators should update local FAQs as project guidelines evolve.'
    ],
    errors: [
      'Category Empty: Reset filters to display all standard platform questions.'
    ],
    related: ['Troubleshooting']
  },
  {
    title: 'Troubleshooting',
    purpose: 'Practical solutions to solve common UI, network, and application issues.',
    reader: 'All Roles',
    features: ['Diagnostic Logs Panel', 'Common Error Glossary', 'Cache Cleaner Guide'],
    steps: [
      'Go to the Help page and select the Troubleshooting tab.',
      'Identify your issue using the list of error messages (e.g. Schema Lock, Ingestion Error).',
      'Follow the numbered list of debugging steps provided.'
    ],
    practices: [
      'Record the exact error code and take screenshots before reaching out to support.',
      'If the workbench behaves unexpectedly, verify your internet connection speed.'
    ],
    errors: [
      'Troubleshooter Connection Fail: Ensure the backend logs are accessible on standard ports.'
    ],
    related: ['Frequently Asked Questions', 'System Dependencies']
  },
  {
    title: 'Swagger API Documentation',
    purpose: 'Interactive OpenAPI sandbox environment describing all backend endpoints.',
    reader: 'Developers, System Administrators',
    features: ['OpenAPI Swagger UI Sandbox', 'Dynamic Endpoint Tester', 'JSON Schema Models List'],
    steps: [
      'Navigate to the Swagger documentation path (usually /api/docs) in your browser.',
      'Click the "Authorize" button, paste your valid JWT token, and confirm.',
      'Choose an endpoint (e.g. GET /datasets), click "Try it out", fill params, and execute.'
    ],
    practices: [
      'Always test new API calls in a staging environment before running against production databases.',
      'Inspect endpoint JSON schemas to understand correct request body shapes.'
    ],
    errors: [
      '401 Unauthorized: JWT token is expired, missing, or lacks required administrator roles.'
    ],
    related: ['API Flow', 'System Dependencies']
  },
  {
    title: 'Docker Deployment Guide',
    purpose: 'Explains how to compile, configure, deploy, and monitor the containerized platform.',
    reader: 'DevOps Engineers, System Administrators',
    features: ['Docker Compose Configuration', 'Environment Schema Guide', 'Volume Backup Strategy'],
    steps: [
      'Ensure Docker and Docker Compose are installed on your target host.',
      'Create and configure your local env file with database credentials and secrets.',
      'Execute "docker compose up -d" to launch front-end, back-end, and database services.'
    ],
    practices: [
      'Verify database volume backup strategies are scheduled daily in production.',
      'Monitor container memory limits to adjust backend resources as needed.'
    ],
    errors: [
      'Database Connection Fail: Ensure that the MongoDB container is fully healthy before backend initialization.',
      'Port Conflict Error: Ensure ports 80, 443, 3000, or 8080 are not in use by other local system processes.'
    ],
    related: ['Project Assumptions', 'System Dependencies']
  }
];

const docCategories = [
  {
    name: 'Onboarding & Core',
    icon: BookOpen,
    color: 'blue',
    pageIndices: [0, 1, 12, 14, 15]
  },
  {
    name: 'Dataset & Schema',
    icon: Database,
    color: 'purple',
    pageIndices: [2, 4, 17, 18]
  },
  {
    name: 'Labeling Workflow',
    icon: NotebookPen,
    color: 'green',
    pageIndices: [3, 5, 6, 7, 8]
  },
  {
    name: 'Management & Ops',
    icon: Users,
    color: 'amber',
    pageIndices: [9, 10, 11, 13, 16]
  }
];

const configCategories = [
  {
    name: 'General Configuration',
    items: [
      { name: 'Label', desc: 'Displays the field name. Keep it short and descriptive so annotators immediately understand the field\'s purpose.', types: ['All Types'], mockType: 'label' },
      { name: 'Description', desc: 'Provides secondary explanation text directly under the label, offering definition details.', types: ['All Types'], mockType: 'desc' },
      { name: 'Placeholder', desc: 'Displays faded inline hint text inside empty text or numeric inputs (e.g. "Enter name...").', types: ['Text', 'Number'], mockType: 'placeholder' },
      { name: 'Default Value', desc: 'Pre-fills the input with a predefined value when a record is first opened, saving typing effort.', types: ['Text', 'Number', 'Dropdown'], mockType: 'default' },
      { name: 'Display Order', desc: 'An integer used to arrange fields from top to bottom. Lower numbers render first.', types: ['All Types'], mockType: 'order' },
      { name: 'Field Width', desc: 'Controls grid layout allocation (e.g. half-width columns for side-by-side inputs, full-width for textareas).', types: ['All Types'], mockType: 'width' },
      { name: 'Read Only', desc: 'Prevents annotator input on a target field while keeping the value visible for context.', types: ['All Types'], mockType: 'readonly' },
    ]
  },
  {
    name: 'Validation Rules',
    items: [
      { name: 'Required', desc: 'Blocks record saving and marks the record as incomplete if the target field is left empty or unselected.', types: ['All Types'], mockType: 'required' },
      { name: 'Minimum / Maximum Length', desc: 'Restricts text inputs to a specific range of characters, avoiding empty inputs or excessively long essays.', types: ['Text'], mockType: 'length' },
      { name: 'Minimum / Maximum Value', desc: 'Restricts numeric inputs mathematically (e.g. age must be between 0 and 120).', types: ['Number'], mockType: 'value' },
      { name: 'Regex Validation', desc: 'Validates inputs against standard regular expressions (e.g. email patterns, phone number strings, codes).', types: ['Text'], mockType: 'regex' },
      { name: 'Validation Message', desc: 'A custom error string shown underneath the input field when any validation rule is violated.', types: ['All Types'], mockType: 'message' },
    ]
  },
  {
    name: 'Helper & Context UI',
    items: [
      { name: 'Tooltip', desc: 'A hoverable info circle icon rendering markdown-compatible examples or complex instructions.', types: ['All Types'], mockType: 'tooltip' },
      { name: 'Help Text', desc: 'Static small text displayed under the input element to provide immediate visual guidance.', types: ['All Types'], mockType: 'help' },
      { name: 'Visibility', desc: 'Conditional logical statements triggering show/hide states of fields based on preceding field values.', types: ['All Types'], mockType: 'visibility' },
    ]
  },
  {
    name: 'Choice & Structure Options',
    items: [
      { name: 'Dropdown Options', desc: 'A collection of string values configuring selection menus. Can be loaded dynamically or statically.', types: ['Dropdown'], mockType: 'options' },
      { name: 'Multi Select', desc: 'Enables a multi-select mode in dropdown fields, converting choices into tags or checklists.', types: ['Dropdown'], mockType: 'multi' },
      { name: 'Nested Fields', desc: 'Defines the structural blueprint (type, label, and validation) of child fields inside groups.', types: ['Repeatable Group'], mockType: 'nested' },
      { name: 'Repeatable Group', desc: 'Enables repeating a block of inputs dynamically, allowing lists of nested records to be added.', types: ['Repeatable Group'], mockType: 'repeat' },
    ]
  }
];

const renderMockUI = (type: string) => {
  switch (type) {
    case 'label':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Customer Feedback</label>
          <input key="mock-input-label" disabled className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-205 dark:border-gray-755 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" value="Interactive feedback goes here..." readOnly />
        </div>
      );
    case 'desc':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Full Name</label>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block leading-tight">Enter your name as it appears on your passport or ID.</span>
          <input key="mock-input-desc" disabled className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-202 dark:border-gray-702 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" placeholder="John Doe" readOnly />
        </div>
      );
    case 'placeholder':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Email Address</label>
          <input key="mock-input-placeholder" disabled className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-not-allowed" placeholder="name@company.com" readOnly />
        </div>
      );
    case 'default':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Country</label>
          <input key="mock-input-default" disabled className="w-full bg-white dark:bg-gray-800 border border-blue-500 rounded-lg px-3 py-2 text-sm text-blue-600 font-medium cursor-not-allowed" value="United States (Pre-loaded)" readOnly />
        </div>
      );
    case 'order':
      return (
        <div className="space-y-2">
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/40 p-2.5 rounded-lg text-xs flex justify-between items-center text-blue-700 dark:text-blue-300">
            <span className="font-bold">1. First Name</span>
            <span className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-[10px]">Rank: 1</span>
          </div>
          <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/40 p-2.5 rounded-lg text-xs flex justify-between items-center text-purple-700 dark:purple-300">
            <span className="font-bold">2. Last Name</span>
            <span className="bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 rounded text-[10px]">Rank: 2</span>
          </div>
        </div>
      );
    case 'width':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-55 dark:bg-gray-800 border border-gray-205 dark:border-gray-705 p-3 rounded-lg text-center text-xs text-gray-500">
              <span className="font-bold block">First Name</span>
              <span className="text-[10px]">Width: 50%</span>
            </div>
            <div className="bg-gray-55 dark:bg-gray-800 border border-gray-205 dark:border-gray-705 p-3 rounded-lg text-center text-xs text-gray-500">
              <span className="font-bold block">Last Name</span>
              <span className="text-[10px]">Width: 50%</span>
            </div>
          </div>
          <div className="bg-gray-55 dark:bg-gray-800 border border-gray-205 dark:border-gray-705 p-3 rounded-lg text-center text-xs text-gray-500">
            <span className="font-bold block">Detailed Address Description</span>
            <span className="text-[10px]">Width: 100%</span>
          </div>
        </div>
      );
    case 'readonly':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Unique Database Token</label>
          <div className="relative">
            <input key="mock-input-readonly" disabled className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed select-all" value="token_987654321_x2_db" readOnly />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-405 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">Locked</span>
          </div>
        </div>
      );
    case 'required':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider flex items-center gap-1">
            Phone Number <span className="text-red-500 font-bold">*</span>
          </label>
          <input key="mock-input-required" disabled className="w-full bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800/80 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" placeholder="Value is required..." readOnly />
          <span className="text-[10px] text-red-500 font-semibold block">⚠️ Input required before completing row.</span>
        </div>
      );
    case 'length':
      return (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Bio Description</label>
            <span className="text-[9px] text-amber-505 font-bold bg-amber-50 dark:bg-amber-955/20 px-1.5 py-0.5 rounded">Min 10 / Max 200</span>
          </div>
          <textarea key="mock-input-length" disabled className="w-full bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-900/60 rounded-lg px-3 py-2 text-xs text-gray-500 h-16 cursor-not-allowed resize-none" value="Too short" readOnly />
          <div className="flex justify-between text-[10px]">
            <span className="text-amber-505 font-semibold">⚠️ Bio must have at least 10 characters.</span>
            <span className="text-gray-400 font-bold">9/200</span>
          </div>
        </div>
      );
    case 'value':
      return (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Discount Percent</label>
            <span className="text-[9px] text-purple-500 font-bold bg-purple-50 dark:bg-purple-950/20 px-1.5 py-0.5 rounded">Range: 0 - 100</span>
          </div>
          <input key="mock-input-value" disabled className="w-full bg-white dark:bg-gray-800 border border-purple-400 rounded-lg px-3 py-2 text-sm text-purple-700 font-bold cursor-not-allowed" value="125" readOnly />
          <span className="text-[10px] text-purple-505 font-semibold block">⚠️ Maximum allowed value is 100.</span>
        </div>
      );
    case 'regex':
      return (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">ZIP Code</label>
            <span className="text-[9px] text-indigo-505 font-mono bg-indigo-50 dark:bg-indigo-955/20 px-1.5 py-0.5 rounded">Pattern: ^\d{5}$</span>
          </div>
          <input key="mock-input-regex" disabled className="w-full bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800/80 rounded-lg px-3 py-2 text-sm text-gray-550 cursor-not-allowed" value="9021-A" readOnly />
          <span className="text-[10px] text-red-500 font-semibold block">⚠️ ZIP code must match numeric format (#####).</span>
        </div>
      );
    case 'message':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">ID Number</label>
          <input key="mock-input-message" disabled className="w-full bg-white dark:bg-gray-800 border border-red-500 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed" value="invalid_id" readOnly />
          <span className="text-[10px] text-red-550 font-bold block">❌ Custom Validation Error: "Please input exactly 8 digits."</span>
        </div>
      );
    case 'tooltip':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Tax Identifier</label>
            <div className="relative group/tool">
              <span className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-955 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center cursor-help border border-blue-200 dark:border-blue-800">?</span>
              <div className="absolute left-6 -top-2 w-48 bg-gray-900 dark:bg-gray-955 text-white text-[9px] p-2 rounded-lg shadow-xl opacity-90 leading-normal z-50">
                <strong>Example:</strong> Formatted as XX-XXXXXXX. Look at Box 4a on your invoice form.
              </div>
            </div>
          </div>
          <input key="mock-input-tooltip" disabled className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" placeholder="Hover question mark for details..." readOnly />
        </div>
      );
    case 'help':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-955 dark:text-white uppercase tracking-wider block">Access Key</label>
          <input key="mock-input-help" disabled className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-750 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" placeholder="Enter key..." readOnly />
          <p className="text-[10px] text-gray-400 leading-snug">Note: Keys are case-sensitive and expire every 24 hours.</p>
        </div>
      );
    case 'visibility':
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider block">Has Vehicle?</label>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer">Yes</span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs font-bold rounded-lg cursor-pointer">No</span>
            </div>
          </div>
          <div className="space-y-1 border-l-2 border-blue-500 pl-3 animate-fade-in">
            <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">License Number (Visible)</label>
            <input key="mock-input-visibility" disabled className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed" placeholder="Enter license..." readOnly />
          </div>
        </div>
      );
    case 'options':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider block">Select Priority</label>
          <div className="border border-gray-205 dark:border-gray-705 bg-white dark:bg-gray-850 rounded-lg p-1.5 space-y-1">
            {['High (Priority 1)', 'Medium (Priority 2)', 'Low (Priority 3)'].map((opt, i) => (
              <div key={i} className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded text-xs text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5 cursor-pointer">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {opt}
              </div>
            ))}
          </div>
        </div>
      );
    case 'multi':
      return (
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider block">Selected Tags</label>
          <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[40px]">
            {['React', 'NestJS', 'MongoDB'].map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-md border border-blue-100 dark:border-blue-900/40">
                {tag}
                <span className="text-[9px] text-blue-400 font-bold hover:text-blue-600 cursor-pointer">×</span>
              </span>
            ))}
          </div>
        </div>
      );
    case 'nested':
      return (
        <div className="bg-gray-50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-3 space-y-2">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block">Blueprinted Child Fields</span>
          <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-800 border border-gray-150 p-2 rounded-lg">
            <div>
              <span className="font-bold block">City</span>
              <span className="text-[10px] text-gray-400">Type: Text</span>
            </div>
            <div>
              <span className="font-bold block">Pincode</span>
              <span className="text-[10px] text-gray-400">Type: Number</span>
            </div>
          </div>
        </div>
      );
    case 'repeat':
      return (
        <div className="space-y-2">
          <div className="border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl bg-white dark:bg-gray-800 text-xs relative">
            <span className="font-bold block mb-1">Repetition #1</span>
            <span className="text-gray-500">City: New York | Zip: 10001</span>
            <span className="absolute right-2.5 top-2.5 text-[9px] text-red-500 font-bold hover:underline cursor-pointer">Delete</span>
          </div>
          <button className="w-full py-1.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-950/10 hover:bg-blue-50/40 transition-colors">+ Add Item</button>
        </div>
      );
    default:
      return null;
  }
};

export default function UiUxDesign({ searchQuery = '' }: { searchQuery?: string }) {
  const [activeDocPage, setActiveDocPage] = useState(0);
  const [activeDocCat, setActiveDocCat] = useState<string>('Onboarding & Core');
  const [docViewerSlide, setDocViewerSlide] = useState(0);
  const [activeFieldTab, setActiveFieldTab] = useState<'text' | 'number' | 'dropdown' | 'group'>('text');
  const [activeConfigCat, setActiveConfigCat] = useState<string>('General Configuration');
  const [activeConfigProp, setActiveConfigProp] = useState<string>('Label');
  const showAllDocs = searchQuery.trim().length > 0;
  return (
    <section id="ui-ux-design" data-section-id="ui-ux-design" className="scroll-mt-28">
      <ZoomBlock delay={0}>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-1 rounded"
            style={{ background: '#EEF1F8', color: INDIGO, fontFamily: "'IBM Plex Mono', monospace" }}>§ 04</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #D0CBBE, transparent)' }} />
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight"
          style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>
          UI / UX Design
        </h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: '#5B6478', maxWidth: '62ch' }}>
          High-level architecture, system components, database design, API flow, module breakdown, and data flow diagrams.
        </p>
      </ZoomBlock>

      <StaggerContent className="space-y-6" baseDelay={0.3}>
        {/* 4.1 */}
        <H2 id="design-architecture" data-subsection-id="design-architecture" num="4.1" color="blue">High-Level Architecture</H2>
        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          The platform follows a layered architecture that separates concerns across the client, API, service, data, and infrastructure tiers for modularity and independent scaling.
        </p>

                <div className="relative flex flex-col items-center">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-gray-300" />
          {layers.map((layer, i) => (
            <div key={i} className="relative w-full mb-3 last:mb-0">
              <div className={`relative bg-gradient-to-r ${layer.gradient} border ${layer.border} rounded-xl p-5 shadow-sm`}>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${layer.pill} text-sm font-bold rounded-full flex-shrink-0`}>
                    <layer.icon className="h-3.5 w-3.5" />
                    {layer.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {layer.chips.map((chip, j) => (
                      <span key={j} className="inline-flex px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-200/70 dark:border-gray-700 shadow-sm">
                        {chip}
                      </span>
))}
        </div>
        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 text-center mb-8">End-to-End Data Flow</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 4.2 */}
        <H2 id="design-components" data-subsection-id="design-components" num="4.2" color="purple">System Components</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          The platform is composed of modular components organised by architectural tier, each with a clearly defined responsibility and technology stack.
        </p>

        {[
          { tier: 'Frontend', icon: Monitor, color: 'blue' as BadgeColor, items: [
            { name: 'Next.js Application', icon: Monitor, desc: 'Server-rendered and client-side UI components', tech: 'Next.js 15 + React 19' },
            { name: 'UI Component Library', icon: LayoutDashboard, desc: 'Reusable Tailwind-based design system', tech: 'Tailwind CSS 4 + shadcn/ui' },
            { name: 'State & Auth Layer', icon: Lock, desc: 'Client-side auth context and API integration', tech: 'JWT + Context API' },
          ]},
          { tier: 'Backend', icon: Server, color: 'purple' as BadgeColor, items: [
            { name: 'NestJS API Server', icon: Server, desc: 'Modular REST API with Swagger documentation', tech: 'NestJS 11' },
            { name: 'Auth Service', icon: Key, desc: 'JWT token issuance and Google OAuth integration', tech: 'JWT + Passport' },
            { name: 'Business Logic Modules', icon: Cpu, desc: 'Domain services for all platform operations', tech: 'NestJS Modules' },
          ]},
          { tier: 'Data', icon: Database, color: 'green' as BadgeColor, items: [
            { name: 'MongoDB Database', icon: Database, desc: 'Document-oriented data store for all entities', tech: 'MongoDB 8' },
            { name: 'Mongoose ODM', icon: FileText, desc: 'Schema modeling and validation layer', tech: 'Mongoose 8' },
          ]},
          { tier: 'Infrastructure', icon: Package, color: 'amber' as BadgeColor, items: [
            { name: 'Docker Containers', icon: HardDrive, desc: 'Containerised services for consistent deployment', tech: 'Docker' },
            { name: 'Docker Compose', icon: Package, desc: 'Multi-container orchestration for all tiers', tech: 'Docker Compose' },
          ]},
        ].map((group) => {
          const c = colorMap[group.color];
          const groupDarkText: Record<string, string> = { blue: 'dark:text-blue-400', purple: 'dark:text-purple-400', green: 'dark:text-green-400', amber: 'dark:text-amber-400' };
          const groupDarkBg: Record<string, string> = { blue: 'dark:bg-blue-900/50', purple: 'dark:bg-purple-900/50', green: 'dark:bg-green-900/50', amber: 'dark:bg-amber-900/50' };
          const groupDarkText3: Record<string, string> = { blue: 'dark:text-blue-300', purple: 'dark:text-purple-300', green: 'dark:text-green-300', amber: 'dark:text-amber-300' };
          return (
            <div key={group.tier} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <group.icon className={`h-4 w-4 ${c.icon} ${groupDarkText[group.color]}`} />
                <span className={`text-sm font-bold ${c.text} ${groupDarkText[group.color]} uppercase tracking-wider`}>{group.tier}</span>
                <div className="flex-1 h-px bg-gray-200/60 dark:bg-gray-700/60" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((item, j) => (
                  <div key={j} className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl p-5 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${c.bg} ${groupDarkBg[group.color]} flex items-center justify-center`}>
                        <item.icon className={`h-4 w-4 ${c.icon} ${groupDarkText[group.color]}`} />
                      </div>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{item.name}</p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-2 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{item.desc}</p>
                    <span className={`inline-flex px-2 py-0.5 ${c.bg} ${groupDarkBg[group.color]} ${c.text} ${groupDarkText3[group.color]} text-xs font-medium rounded`}>{item.tech}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 4.3 */}
        <H2 id="design-database" data-subsection-id="design-database" num="4.3" color="amber">Database Design</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          The platform uses MongoDB as its primary data store, with Mongoose schemas defining the structure and validation for each collection. The document model is designed around the annotation workflow to minimise complex joins and keep read performance predictable. The following Entity Relationship Diagram (ERD) illustrates the relationships between the core collections used throughout the platform.
        </p>

        <div className="flex flex-col items-center gap-3 min-w-[600px]">
          <div className={`rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/30 p-3 w-48 text-center shadow-sm`}>
            <Users className="h-4 w-4 text-blue-500 mx-auto mb-1" />
            <span className="text-xs font-bold text-blue-700">Users</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 -rotate-90" />
          <div className="flex items-center gap-4">
            <div className={`rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/30 p-3 w-48 text-center shadow-sm`}>
              <Database className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-purple-700">Datasets</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <div className={`rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/30 p-3 w-48 text-center shadow-sm`}>
              <FileText className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-amber-700">AnnotationFields</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/30 p-3 w-48 text-center shadow-sm`}>
              <Upload className="h-4 w-4 text-amber-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-amber-700">UploadHistory</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <div className={`rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/30 p-3 w-48 text-center shadow-sm`}>
              <GitBranch className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-green-700">CloneHistory</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/30 p-3 w-48 text-center shadow-sm`}>
              <List className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-green-700">DatasetAssignments</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <div className={`rounded-xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/30 p-3 w-48 text-center shadow-sm`}>
              <Edit3 className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-indigo-700">MergedRows</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300 -rotate-90" />
          <div className="flex items-center gap-4">
            <div className={`rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/30 p-3 w-48 text-center shadow-sm`}>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-emerald-700">ConsensusResults</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <div className={`rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/30 p-3 w-48 text-center shadow-sm`}>
              <Bell className="h-4 w-4 text-rose-500 mx-auto mb-1" />
              <span className="text-xs font-bold text-rose-700">Notifications</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {dbCollections.map((col, i) => {
            const c = colorMap[col.color];
            return (
              <div key={i} className="bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300" style={{ borderColor: 'var(--color-border)' }}>
                <div className={`px-3 py-2 ${c.bg} dark:bg-opacity-40 border-b ${c.border} dark:border-opacity-40`}>
                  <div className="flex items-center gap-2">
                    <col.icon className={`h-3.5 w-3.5 ${c.icon}`} />
                    <span className={`text-sm font-bold ${c.text}`}>{col.name}</span>
                  </div>
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{col.purpose}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4.3.1 */}
        <H2 id="design-field-schema" data-subsection-id="design-field-schema" num="4.3.1" color="indigo">Field Type Data Schema</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          Every annotation field in DataAnnotate is modeled dynamically and stored within MongoDB as a sub-document. Select a field type below to view its schema details.
        </p>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'text', label: 'Text Field', icon: Type, color: 'blue' },
            { id: 'number', label: 'Number Field', icon: Hash, color: 'purple' },
            { id: 'dropdown', label: 'Dropdown Field', icon: ChevronDown, color: 'amber' },
            { id: 'group', label: 'Repeatable Group', icon: Layers, color: 'green' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFieldTab === tab.id;
            const colorClasses = {
              blue: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
              purple: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300',
              amber: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300',
              green: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300',
            }[tab.color as 'blue' | 'purple' | 'amber' | 'green'];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveFieldTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-all duration-200 ${
                  isActive
                    ? `${colorClasses} shadow-sm scale-102`
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Selected Tab Content Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm mb-8 transition-all duration-300">
          {activeFieldTab === 'text' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <Type className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Text Field</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Stores free-form text entered by the annotator, such as entity names, descriptions, or short transcriptions.
                </p>
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Supported Validations</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Required', 'Maximum Length', 'Minimum Length', 'Regex Pattern'].map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-md border border-green-200/50 dark:border-green-900/30">✓ {v}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Example Value</span>
                      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-400">"John Doe"</code>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">UI Representation</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Single line input / multi-line text area</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Storage Format</span>
                    <span className="text-xs text-gray-650 dark:text-gray-350">Stored as a BSON String inside the parent row's annotation document.</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-950 border-b border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">MONGO DOCUMENT SCHEMA</span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono leading-relaxed text-gray-100 overflow-x-auto">
{`{
  "_id": "64b0f3e1a0b5c123456789ab",
  "type": "text",
  "label": "Person Name",
  "required": true,
  "value": "John Doe"
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeFieldTab === 'number' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                    <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Number Field</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Stores numeric values (either integers or decimals) such as ages, quantities, confidence scores, or measurements.
                </p>
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Supported Validations</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Integer', 'Decimal', 'Minimum', 'Maximum'].map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-md border border-green-200/50 dark:border-green-900/30">✓ {v}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Example Value</span>
                      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-400">25</code> or <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-400">98.6</code>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">UI Representation</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Spinner number input box with controls</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Storage Format</span>
                    <span className="text-xs text-gray-650 dark:text-gray-350">Stored as a BSON Double or Int32 property within the parent document.</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-950 border-b border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">MONGO DOCUMENT SCHEMA</span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono leading-relaxed text-gray-100 overflow-x-auto">
{`{
  "type": "number",
  "label": "Age",
  "required": true,
  "min": 0,
  "max": 120,
  "value": 25
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeFieldTab === 'dropdown' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                    <ChevronDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dropdown Field</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Provides a predefined set of options for annotators to select a single value or multiple values (classification tags).
                </p>
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Supported Validations</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Required', 'Allowed Values'].map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-md border border-green-200/50 dark:border-green-900/30">✓ {v}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Example Value</span>
                      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-400">"Male"</code> or <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-400">["Male", "Female"]</code>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">UI Representation</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Searchable dropdown select menu</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Storage Format</span>
                    <span className="text-xs text-gray-650 dark:text-gray-350">Stored as a BSON String (single select) or Array of BSON Strings (multi-select).</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-950 border-b border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">MONGO DOCUMENT SCHEMA</span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono leading-relaxed text-gray-100 overflow-x-auto">
{`{
  "type": "dropdown",
  "label": "Gender",
  "options": [
    "Male",
    "Female",
    "Other"
  ],
  "required": true,
  "value": "Male"
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeFieldTab === 'group' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
                    <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-950 dark:text-white">Repeatable Group</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Groups multiple related fields (nested fields) together. It can repeat multiple times to capture structured list data.
                </p>
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Supported Validations</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Required', 'Allowed Values', 'Minimum Repetitions', 'Maximum Repetitions'].map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-semibold rounded-md border border-green-200/50 dark:border-green-900/30">✓ {v}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Example Value</span>
                      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-400">{`[{ "City": "Boston", "Pincode": 2108 }]`}</code>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">UI Representation</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Visual block container with dynamic "Add Item" button</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Storage Format</span>
                    <span className="text-xs text-gray-650 dark:text-gray-350 leading-relaxed">Stores child field values as an array of sub-documents representing repetition blocks.</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 flex flex-col justify-center">
                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-950 border-b border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 font-mono">MONGO DOCUMENT SCHEMA</span>
                  </div>
                  <pre className="p-3 text-[11px] font-mono leading-relaxed text-gray-100 overflow-x-auto">
{`{
  "type": "group",
  "label": "Address",
  "repeatable": true,
  "fields": [
    { "type": "text", "label": "City" },
    { "type": "number", "label": "Pincode" }
  ]
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>



        <H2 id="design-field-config" data-subsection-id="design-field-config" num="4.3.2" color="amber">Field Configuration Types</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          Every configurable property available while creating annotation fields is detailed in this interactive configuration sandbox. Select a category and property below to preview its live UI demo.
        </p>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm mb-8 space-y-6">
          {/* Category Tabs (Horizontal Grid) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {configCategories.map((cat) => {
              const isActive = activeConfigCat === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setActiveConfigCat(cat.name);
                    if (cat.items.length > 0) {
                      setActiveConfigProp(cat.items[0].name);
                    }
                  }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                    isActive
                      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300 shadow-sm font-extrabold'
                      : 'bg-white dark:bg-gray-900 border-gray-250 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Property Pills (Flat list of pills inside active category - NO SCROLLBARS!) */}
          <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/50 dark:border-gray-800/80">
            {(() => {
              const activeCat = configCategories.find(c => c.name === activeConfigCat);
              if (!activeCat) return null;
              return activeCat.items.map((item) => {
                const isActive = activeConfigProp === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveConfigProp(item.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isActive
                        ? 'bg-white dark:bg-gray-800 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm font-bold'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-850/50'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              });
            })()}
          </div>

          {/* Active Property Details & Live UI Demonstration */}
          {(() => {
            // Find active item
            let activeItem: any = null;
            for (const cat of configCategories) {
              const found = cat.items.find(it => it.name === activeConfigProp);
              if (found) {
                activeItem = found;
                break;
              }
            }

            if (!activeItem) return null;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 border-t border-gray-100 dark:border-gray-750 transition-all duration-300">
                {/* Details Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{activeItem.name}</h3>
                    <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-100 dark:border-amber-800/40">
                      {activeConfigCat}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Description</span>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{activeItem.desc}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Supported Field Types</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeItem.types.map((t: string) => (
                        <span key={t} className="inline-flex px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-md border border-gray-200/50 dark:border-gray-700/50 animate-fade-in">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Demonstration Column */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">Live UI Demonstration</span>
                  <div className="bg-gray-50 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-700 p-5 rounded-xl min-h-[120px] flex flex-col justify-center shadow-inner">
                    {renderMockUI(activeItem.mockType)}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 4.3.3 */}
        <H2 id="design-field-validation" data-subsection-id="design-field-validation" num="4.3.3" color="green">Field Validation Flow</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          Every field configuration follows a strict lifecycle. Data is validated on entry and before saving to secure the integrity of the target datasets.
        </p>

        {/* Flowchart Timeline */}
        <div className="relative pl-6 sm:pl-10 space-y-6 mb-8">
          <div className="absolute left-[19px] sm:left-[27px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-emerald-500 rounded-full" />
          {[
            { step: '1', title: 'Administrator Creates Field', desc: 'Admin configures field types, constraints (e.g. required, range boundaries, regex), and custom error messages in the field configuration page.', badge: 'Setup', color: 'border-blue-500' },
            { step: '2', title: 'Configuration Saved', desc: 'The configuration schema is persisted to MongoDB inside the AnnotationFields collection and locked if annotations have already started.', badge: 'Database', color: 'border-indigo-500' },
            { step: '3', title: 'Annotator Opens Workbench', desc: 'The workbench client retrieves active field definitions from the API and dynamically compiles corresponding React input components.', badge: 'Interface', color: 'border-violet-500' },
            { step: '4', title: 'Input Validation Triggered', desc: 'As the annotator types, standard event listeners (on change or on blur) execute validation algorithms client-side to assert formatting and rules.', badge: 'Client Validation', color: 'border-fuchsia-500' },
            { step: '5', title: 'Valid / Invalid Logic Check', desc: 'If checks pass, saving is allowed. If checks fail, a Validation Error message is displayed in red, and the next/previous navigation buttons are disabled.', badge: 'Logic Decision', color: 'border-pink-500' },
            { step: '6', title: 'Autosave Persistence', desc: 'Once the input matches all rules and is marked valid, an asynchronous HTTP PUT request is triggered in the background to update the user\'s physical clone document.', badge: 'Autosave', color: 'border-rose-500' },
            { step: '7', title: 'Consensus Engine Processing', desc: 'The Consensus Engine merges the isolated clones — generating skeleton reviews if annotations are incomplete, never blocking access, and ensuring structural compatibility using the active validation rules. Every field is assigned a lifecycle status: NOT_STARTED, PENDING, PARTIAL, AGREED, CONFLICT, ADMIN_CONFIRMED, or OVERRIDDEN.', badge: 'Consensus', color: 'border-emerald-500' },
          ].map((item, i) => (
            <div key={i} className="relative flex items-start gap-4">
              <div className="absolute -left-[35px] sm:-left-[43px] z-10 w-[30px] h-[30px] sm:w-[38px] sm:h-[38px] rounded-full bg-white dark:bg-gray-800 border-2 border-indigo-400 dark:border-indigo-600 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.step}</span>
              </div>
              <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200/75 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-base text-gray-900 dark:text-white leading-snug">{item.title}</h4>
                  <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">{item.badge}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-5 text-center tracking-wider uppercase mb-12">Dynamic Schema Field Validation Workflow</p>

        {/* 4.4 */}
        <H2 id="design-api" data-subsection-id="design-api" num="4.4" color="indigo">API Flow</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          Every API request passes through a consistent pipeline that validates identity, authorisation, and payload integrity before reaching the service layer.
        </p>

        {/* Outcome cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {apiOutcomes.map((outcome, i) => (
            <div key={i} className={`${outcome.color} rounded-xl px-4 py-3 border shadow-sm transition-all duration-200 hover:shadow-md cursor-default`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold">{outcome.label}</span>
                <div className={`w-2 h-2 rounded-full ${outcome.color.includes('green') ? 'bg-green-500' : outcome.color.includes('orange') ? 'bg-orange-500' : 'bg-red-500'}`} />
              </div>
              <p className="text-xs opacity-80 leading-relaxed">{outcome.desc}</p>
            </div>
          ))}
        </div>

        {/* Pipeline diagram */}
        <div className="overflow-x-auto pb-4 mb-6">
          <div className="flex items-center min-w-max">
            {apiSteps.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                  <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center shadow-sm border border-gray-200/50 dark:border-gray-700/50`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] font-bold ${step.color} px-2 py-0.5 rounded-full whitespace-nowrap`}>{step.label}</span>
                </div>
                {i < apiSteps.length - 1 && (
                  <div className="flex items-center mx-2">
                    <div className="h-0.5 w-8 bg-gradient-to-r from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700" />
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 -ml-1 flex-shrink-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 text-center tracking-wider uppercase mb-8">API Request Pipeline</p>

        {/* Timeline */}
        <div className="relative">
          {/* Central line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-indigo-400 via-indigo-300 to-indigo-200 dark:from-indigo-600 dark:via-indigo-700 dark:to-indigo-800 rounded-full" />
          <div className="space-y-3">
            {timelineSteps.map((item, i) => (
              <div key={i} className="relative flex items-start gap-5">
                {/* Step number circle */}
                <div className="relative z-10 w-[38px] h-[38px] rounded-full bg-white dark:bg-gray-800 border-2 border-indigo-300 dark:border-indigo-700 flex items-center justify-center flex-shrink-0 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 cursor-default">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.step}</span>
                </div>
                {/* Content card */}
                <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl p-3.5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 cursor-default">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className={`inline-flex px-2.5 py-0.5 ${item.color} text-[11px] font-bold rounded-full`}>{item.actor}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-5 text-center tracking-wider uppercase">End-to-End Request Timeline</p>

        {/* 4.5 */}
        <H2 id="design-modules" data-subsection-id="design-modules" num="4.5" color="emerald">Module Breakdown</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          Platform functionality is organised into four tiers, each grouping related modules that together deliver end-to-end business capabilities.
        </p>

        {/* Tier bands */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {(() => {
            const tierIcons: Record<string, string> = { Core: '⚡', Workflow: '🔁', Quality: '✓', Support: '🛟' };
            return tiers.map((tier, i) => {
              const c = colorMap[tier.color];
              return (
                <div key={i} className={`relative overflow-hidden rounded-xl border ${c.border} dark:border-opacity-40 bg-white dark:bg-gray-800 shadow-sm transition-all duration-200 hover:shadow-md cursor-default`}>
                  <div className={`h-1.5 w-full ${c.bg}`} />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg ${c.bg} dark:bg-opacity-40 flex items-center justify-center text-base`}>{tierIcons[tier.label]}</div>
                      <span className={`text-sm font-bold ${c.text}`}>{tier.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tier.chips.map((chip, j) => (
                        <span key={j} className={`inline-flex px-2.5 py-1 ${c.bg} dark:bg-opacity-30 ${c.text} text-xs font-bold rounded-full border ${c.border} dark:border-opacity-50`}>{chip}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Module detail cards */}
        <div className="relative">
          {/* Decorative background line */}
          <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-700 dark:to-transparent rounded-full hidden md:block" />
          <div className="space-y-4">
            {moduleDetails.map((mod, i) => {
              const hex: Record<string, string> = { blue: '#3b82f6', purple: '#a855f7', amber: '#f59e0b', green: '#22c55e', indigo: '#6366f1', emerald: '#10b981', cyan: '#06b6d4', rose: '#f43f5e', sky: '#0ea5e9' };
              const c = colorMap[mod.color];
              return (
                <div key={i} className="relative flex items-start gap-4 md:gap-6 group">
                  {/* Timeline dot */}
                  <div className="relative z-10 hidden md:flex w-[46px] h-[46px] rounded-full bg-white dark:bg-gray-800 border-2 flex-shrink-0 items-center justify-center shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-105" style={{ borderColor: hex[mod.color] }}>
                    <span className="text-xs font-bold" style={{ color: hex[mod.color] }}>{i + 1}</span>
                  </div>
                  {/* Card */}
                  <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl p-5 shadow-sm transition-all duration-200 group-hover:shadow-md cursor-default" style={{ borderLeft: `4px solid ${hex[mod.color]}` }}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hex[mod.color] }} />
                          <p className="text-base font-bold text-gray-900 dark:text-white">{mod.name}</p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{mod.role}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                        {mod.actions.map((action, j) => (
                          <span key={j} className={`inline-flex px-2.5 py-1 ${c.bg} dark:bg-opacity-30 ${c.text} dark:dark-text-opacity-90 text-xs font-bold rounded-full border ${c.border} dark:border-opacity-50 shadow-sm`}>{action}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4.6 */}
        <H2 id="design-ui" data-subsection-id="design-ui" num="4.6" color="sky">UI Flow</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          The platform provides distinct screen flows for administrators and annotators, with each role seeing only the interfaces relevant to their permissions.
        </p>

                {/* Flowchart container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Admin Flow */}
          <div className="relative">
            {/* Role header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30">
                <Shield className="h-5 w-5 text-white" />
                <span className="text-base font-bold text-white tracking-wide">Administrator Screens</span>
              </div>
            </div>
            {/* Flow nodes */}
            <div className="relative flex flex-col items-center">
              {/* Pipeline line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-blue-300 to-blue-200 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 -translate-x-1/2 rounded-full" />
              {adminScreens.map((screen, i) => (
                <div key={i} className="relative mb-6 last:mb-0 w-full max-w-xs">
                  {/* Connector dot */}
                  <div className="absolute left-1/2 -top-3 w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 border-4 border-white dark:border-gray-900 shadow-md -translate-x-1/2 z-10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{i + 1}</span>
                  </div>
                  {/* Arrow line */}
                  {i > 0 && (
                    <div className="absolute left-1/2 -top-6 w-0.5 h-3 bg-blue-300 dark:bg-blue-700 -translate-x-1/2" />
                  )}
                  {/* Card */}
                  <div className="mt-3 bg-white dark:bg-gray-800 border border-blue-200/70 dark:border-blue-800/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 cursor-default transform-gpu">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <screen.icon className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{screen.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{screen.desc}</p>
                      </div>
                    </div>
                  </div>
                  {/* Step connector arrow */}
                  {i < adminScreens.length - 1 && (
                    <div className="flex justify-center mt-2">
                      <svg className="w-4 h-4 text-blue-300 dark:text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Annotator Flow */}
          <div className="relative">
            {/* Role header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                <UserCheck className="h-5 w-5 text-white" />
                <span className="text-base font-bold text-white tracking-wide">Annotator Screens</span>
              </div>
            </div>
            {/* Flow nodes */}
            <div className="relative flex flex-col items-center">
              {/* Pipeline line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-200 dark:from-amber-600 dark:via-amber-700 dark:to-amber-800 -translate-x-1/2 rounded-full" />
              {annotatorScreens.map((screen, i) => (
                <div key={i} className="relative mb-6 last:mb-0 w-full max-w-xs">
                  {/* Connector dot */}
                  <div className="absolute left-1/2 -top-3 w-6 h-6 rounded-full bg-amber-500 dark:bg-amber-400 border-4 border-white dark:border-gray-900 shadow-md -translate-x-1/2 z-10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{i + 1}</span>
                  </div>
                  {/* Arrow line */}
                  {i > 0 && (
                    <div className="absolute left-1/2 -top-6 w-0.5 h-3 bg-amber-300 dark:bg-amber-700 -translate-x-1/2" />
                  )}
                  {/* Card */}
                  <div className="mt-3 bg-white dark:bg-gray-800 border border-amber-200/70 dark:border-amber-800/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 cursor-default transform-gpu">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <screen.icon className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{screen.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{screen.desc}</p>
                      </div>
                    </div>
                  </div>
                  {/* Step connector arrow */}
                  {i < annotatorScreens.length - 1 && (
                    <div className="flex justify-center mt-2">
                      <svg className="w-4 h-4 text-amber-300 dark:text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4.7 */}
        <H2 id="design-data" data-subsection-id="design-data" num="4.7" color="teal">Data Flow</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          Data moves through a defined pipeline from raw CSV upload through validation, isolated annotation, and consensus generation, producing a single authoritative dataset ready for model training. Each stage enforces specific business rules that guarantee data integrity and auditability throughout the lifecycle.
        </p>

        <div className="flex flex-col items-center gap-1.5 mb-8">
          {dataFlowStages.map((stage, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`flex items-center gap-2 px-4 py-2.5 ${stage.color} text-sm font-bold rounded-xl border-2 shadow-sm min-w-[180px] justify-center`}>
                <stage.icon className="h-4 w-4" />
                {stage.label}
              </div>
              {i < dataFlowStages.length - 1 && <ChevronRight className="h-4 w-4 text-gray-300 -rotate-90 my-0.5" />}
            </div>
          ))}
        </div>
        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 text-center mb-8">End-to-End Data Flow</p>

        <div className="flex items-center justify-center gap-3">
          {lifecycleStates.map((state, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`px-4 py-2 ${state.color} text-sm font-bold rounded-full border-2 shadow-sm`}>
                {state.state}
              </div>
              {i < lifecycleStates.length - 1 && (
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                  {state.transition && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-nowrap">{state.transition}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {lifecycleStates[2].transition && (
          <div className="flex items-center justify-center gap-1 mt-3 mb-2">
            <RefreshCw className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            <span className="text-xs text-gray-400 dark:text-gray-500">Login reactivates Active state</span>
          </div>
        )}
        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 text-center">User Account Lifecycle</p>

  

        {/* 4.8 */}
        <H2 id="design-product-docs" data-subsection-id="design-product-docs" num="4.8" color="purple">Product Documentation</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          DataAnnotate includes integrated, context-sensitive in-product documentation covering the entire annotation workflow, user settings, configuration options, and deployment guides.
        </p>

        {/* Interactive Documentation Browser with Animated Video Background */}
        <div className="relative border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden mb-8 shadow-xl min-h-[500px]">
          {/* Background Video */}
          <video
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 dark:opacity-20"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/lgpageanimation.mp4" type="video/mp4" />
          </video>

          {/* Dark/Light Gradient overlay on top of video */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-purple-50/50 dark:from-[#0b1d3a]/80 dark:via-[#1a427b]/30 dark:to-[#15335e]/60 z-0" />

          {/* Glassmorphic Top glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80 z-10" />

          {/* Interactive Content (Z-INDEX 10) wrapper */}
          <div className="relative z-10 w-full h-full backdrop-blur-md bg-white/75 dark:bg-gray-950/75 flex flex-col lg:flex-row min-h-[500px]">
            {showAllDocs ? (
              /* Search Fallback: Render all pages sequentially in a flat list for in-DOM search text highlighting */
              <div className="p-6 space-y-8 w-full">
                {docPages.map((page, idx) => (
                  <div key={idx} className="border-b border-gray-150 dark:border-gray-800 pb-8 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">{page.title}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Purpose</p>
                        <p className="text-sm text-gray-655 dark:text-gray-305 leading-relaxed mt-1">{page.purpose}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Who Should Read It</p>
                        <span className="inline-flex px-2.5 py-1 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 text-xs font-bold rounded-full mt-1 border border-purple-200/50 dark:border-purple-800/30">{page.reader}</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-750/60 pt-4 mb-4">
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Features Covered</p>
                      <div className="flex flex-wrap gap-1.5">
                        {page.features.map((feature, fIdx) => (
                          <span key={fIdx} className="inline-flex px-2.5 py-0.5 bg-gray-105 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md">{feature}</span>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-750/60 pt-4 mb-4">
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Step-by-Step Instructions</p>
                      <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600 dark:text-gray-350">
                        {page.steps.map((step, sIdx) => (
                          <li key={sIdx} className="leading-relaxed">{step}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-750/60 pt-4">
                      <div>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <span>✓</span> Best Practices
                        </p>
                        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-350 list-disc list-inside">
                          {page.practices.map((practice, pIdx) => (
                            <li key={pIdx} className="leading-relaxed">{practice}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <span>⚠️</span> Common Errors
                        </p>
                        <ul className="space-y-1 text-sm text-gray-605 dark:text-gray-350 list-disc list-inside">
                          {page.errors.map((error, eIdx) => (
                            <li key={eIdx} className="leading-relaxed">{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Premium Split Workspace Pane - NO SCROLLBARS! */
              <div className="flex flex-col lg:flex-row min-h-[500px] w-full">
                {/* Left Column: Category and Category Pages */}
                <div className="w-full lg:w-72 border-r border-gray-250 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-5 space-y-5 flex-shrink-0">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-455 dark:text-gray-500 uppercase tracking-wider block px-1">Categories</span>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
                      {docCategories.map((cat) => {
                        const CatIcon = cat.icon;
                        const isActive = activeDocCat === cat.name;
                        const colorClasses = {
                          blue: 'bg-blue-50/60 text-blue-700 border-blue-200/50 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/40',
                          purple: 'bg-purple-50/60 text-purple-700 border-purple-200/50 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800/40',
                          green: 'bg-green-50/60 text-green-700 border-green-200/50 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/40',
                          amber: 'bg-amber-50/60 text-amber-700 border-amber-200/50 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800/40',
                        }[cat.color as 'blue' | 'purple' | 'green' | 'amber'];

                        return (
                          <button
                            key={cat.name}
                            onClick={() => {
                              setActiveDocCat(cat.name);
                              if (cat.pageIndices.length > 0) {
                                setActiveDocPage(cat.pageIndices[0]);
                                setDocViewerSlide(0);
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-2 text-left text-xs font-bold rounded-xl border transition-all ${
                              isActive
                                ? `${colorClasses} shadow-sm font-extrabold`
                                : 'bg-white/60 dark:bg-gray-800/60 border-gray-205 dark:border-gray-755 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <CatIcon className="h-4 w-4" />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-gray-200 dark:border-gray-850">
                    <span className="text-[10px] font-bold text-gray-455 dark:text-gray-500 uppercase tracking-wider block px-1">Pages in Category</span>
                    <div className="space-y-1">
                      {(() => {
                        const activeCat = docCategories.find(c => c.name === activeDocCat);
                        if (!activeCat) return null;
                        return activeCat.pageIndices.map((idx) => {
                          const page = docPages[idx];
                          const isSelected = activeDocPage === idx;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setActiveDocPage(idx);
                                setDocViewerSlide(0);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold animate-fade-in'
                                  : 'text-gray-600 dark:text-gray-450 hover:bg-white/50 dark:hover:bg-gray-850/50'
                              }`}
                            >
                              <span>{page.title}</span>
                              <ChevronRight className={`h-3 w-3 transition-transform ${isSelected ? 'translate-x-0.5 text-blue-500' : 'text-gray-400 opacity-60'}`} />
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Right Column: Premium Active Page Viewer */}
                <div className="flex-1 p-6 space-y-6">
                  {(() => {
                    const page = docPages[activeDocPage];
                    if (!page) return null;

                    return (
                      <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm animate-pulse" />
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{page.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Who Should Read:</span>
                            <span className="px-2.5 py-0.5 bg-purple-55 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 text-[10px] font-bold rounded-full border border-purple-200/50 dark:border-purple-800/30">
                              {page.reader}
                            </span>
                          </div>
                        </div>

                        {/* Step Tracker */}
                        <div className="flex items-center gap-1.5 mb-5 border-b border-gray-100 dark:border-gray-750 pb-4">
                          {['Overview', 'Roadmap', 'Quality & Hazards'].map((stepTitle, stepIdx) => {
                            const isCurrent = docViewerSlide === stepIdx;
                            const isPast = docViewerSlide > stepIdx;
                            return (
                              <button
                                key={stepIdx}
                                onClick={() => setDocViewerSlide(stepIdx)}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all text-center ${
                                  isCurrent
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                    : isPast
                                    ? 'bg-blue-50/50 border-blue-200/50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400'
                                    : 'bg-white/40 border-gray-200/40 text-gray-500 hover:bg-white/60 dark:bg-gray-900/40 dark:border-gray-800/40'
                                }`}
                              >
                                {stepIdx + 1}. {stepTitle}
                              </button>
                            );
                          })}
                        </div>

                        {/* Slide Content with Animation */}
                        <div className="min-h-[290px] flex flex-col justify-between">
                          {docViewerSlide === 0 && (
                            <div className="space-y-4 animate-fade-in">
                              <div className="space-y-1 bg-white/30 dark:bg-white/5 p-4 rounded-xl border border-white/20">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Purpose</span>
                                <p className="text-sm text-gray-750 dark:text-gray-200 leading-relaxed font-semibold">{page.purpose}</p>
                              </div>

                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider block">Features Covered</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {page.features.map((feature, fIdx) => (
                                    <div key={fIdx} className="flex items-center gap-2 p-2.5 bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                      {feature}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {docViewerSlide === 1 && (
                            <div className="space-y-3 animate-fade-in">
                              <span className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider block">Step-by-Step Instructions</span>
                              <div className="space-y-2.5">
                                {page.steps.map((step, sIdx) => (
                                  <div key={sIdx} className="flex gap-3 items-start p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm transition-transform duration-300 hover:scale-[1.01]">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-inner">
                                      {sIdx + 1}
                                    </span>
                                    <p className="text-xs text-gray-650 dark:text-gray-300 leading-relaxed font-medium">{step}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {docViewerSlide === 2 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                              <div className="space-y-4">
                                <div className="bg-green-50/40 dark:bg-green-950/10 border border-green-200/60 dark:border-green-900/40 p-4 rounded-xl space-y-2 backdrop-blur-sm">
                                  <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>✓</span> Best Practices
                                  </span>
                                  <ul className="space-y-1.5 text-xs text-gray-655 dark:text-gray-355 list-disc list-inside">
                                    {page.practices.map((practice, pIdx) => (
                                      <li key={pIdx} className="leading-relaxed">{practice}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="bg-red-50/40 dark:bg-red-950/10 border border-red-200/60 dark:border-red-900/40 p-4 rounded-xl space-y-2 backdrop-blur-sm">
                                  <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>⚠️</span> Common Errors
                                  </span>
                                  <ul className="space-y-1.5 text-xs text-gray-655 dark:text-gray-355 list-disc list-inside">
                                    {page.errors.map((error, eIdx) => (
                                      <li key={eIdx} className="leading-relaxed">{error}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                  <span className="text-[10px] font-bold text-gray-455 dark:text-gray-550 uppercase tracking-wider block mb-1.5">Related Pages</span>
                                  <div className="flex flex-wrap gap-2">
                                    {page.related.map((r, rIdx) => {
                                      const pageIndex = docPages.findIndex(p => p.title.toLowerCase() === r.toLowerCase());
                                      return (
                                        <button
                                          key={rIdx}
                                          onClick={() => {
                                            if (pageIndex !== -1) {
                                              setActiveDocPage(pageIndex);
                                              const cat = docCategories.find(c => c.pageIndices.includes(pageIndex));
                                              if (cat) {
                                                setActiveDocCat(cat.name);
                                              }
                                              setDocViewerSlide(0);
                                            }
                                          }}
                                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 animate-pulse"
                                        >
                                          {r}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Controller */}
                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-750 pt-4 mt-6">
                          <button
                            disabled={docViewerSlide === 0}
                            onClick={() => setDocViewerSlide(prev => prev - 1)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-405 hover:bg-white/40 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Back
                          </button>

                          <div className="flex gap-1.5">
                            {[0, 1, 2].map((idx) => (
                              <button
                                key={idx}
                                onClick={() => setDocViewerSlide(idx)}
                                className={`h-2 rounded-full transition-all ${
                                  docViewerSlide === idx ? 'bg-blue-600 w-4' : 'bg-gray-300 dark:bg-gray-700 w-2'
                                }`}
                              />
                            ))}
                          </div>

                          <button
                            onClick={() => {
                              if (docViewerSlide < 2) {
                                setDocViewerSlide(prev => prev + 1);
                              } else {
                                setDocViewerSlide(0);
                              }
                            }}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all"
                          >
                            {docViewerSlide === 2 ? 'Restart' : 'Next'}
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4.8.1 */}
        <H2 id="design-html-docs" data-subsection-id="design-html-docs" num="4.8.1" color="gray">HTML Documentation</H2>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
          DataAnnotate features an integrated HTML documentation module available directly in the user interface. This enables developers and stakeholders to access high-quality reference guides without leaving the workbench environment.
        </p>

        <div className="bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm mb-6">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Key Features of the Integrated Documentation Module:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Responsive documentation pages scaling from mobile views to large monitors.',
              'Interactive sidebar navigation with hover expanders and active scroll-spy highlighting.',
              'Search functionality indexing in-DOM text elements with multi-match highlighting.',
              'Syntax highlighted code blocks mimicking local terminal themes.',
              'Formatted data and comparison tables using design system border tokens.',
              'High-fidelity system component and workflow diagrams.',
              'Deep linking support to scroll directly to specific sections or tables.',
              'One-click copy-to-clipboard buttons on all snippet containers.',
              'Role-based dashboard deep links that route users to context-specific documentation pages.',
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700 rounded-xl shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <span className="text-sm text-gray-650 dark:text-gray-350 leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Integrated Documentation Architecture</h4>
        <div className="overflow-x-auto pb-4 mb-6">
          <div className="flex items-center min-w-max justify-center py-4">
            {[
              { label: 'Browser', desc: 'Renders UI & triggers search events', color: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300' },
              { label: 'HTML Docs', desc: 'React wrapper holding view states', color: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-900/30 dark:text-purple-300' },
              { label: 'Markdown Renderer', desc: 'Converts Markdown assets to HTML elements', color: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300' },
              { label: 'React Components', desc: 'Applies theme classes and layouts', color: 'bg-green-50 text-green-700 border-green-200/60 dark:bg-green-900/30 dark:text-green-300' },
              { label: 'Search Index', desc: 'Extracts and stores text nodes for querying', color: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-300' },
              { label: 'Documentation Pages', desc: 'Source guides formatted as code models', color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300' },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-2 max-w-[150px] text-center">
                  <div className={`px-4 py-2.5 rounded-xl border ${step.color} shadow-sm font-bold text-sm min-h-[50px] flex items-center justify-center`}>
                    {step.label}
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1 leading-snug">{step.desc}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex items-center mx-2.5">
                    <div className="h-0.5 w-6 bg-gray-300 dark:bg-gray-700" />
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 -ml-1 flex-shrink-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </StaggerContent>
    </section>
  );
}
