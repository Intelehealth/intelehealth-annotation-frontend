'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { workspacesAPI } from '@/lib/api/workspaces';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Cpu,
  Eye,
  EyeOff,
  FileText,
  Image,
  Table,
  Code,
  FileArchive,
  FileJson,
  Type,
  Globe,
  PaintBucket,
  Upload,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  MessageCircle,
  Send,
  Bot,
  LayoutDashboard,
  Settings,
  Loader2,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 18 },
  },
};

const DOCUMENT_TYPES = [
  { id: 'pdf', label: 'PDF', icon: FileText },
  { id: 'docx', label: 'DOCX', icon: FileText },
  { id: 'pptx', label: 'PPTX', icon: FileText },
  { id: 'csv', label: 'CSV', icon: Table },
  { id: 'zip', label: 'ZIP', icon: FileArchive },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'json', label: 'JSON', icon: FileJson },
  { id: 'txt', label: 'TXT', icon: Type },
];

const AI_MODULES = [
  { id: 'ocr', label: 'OCR Engine', description: 'Extract text from scanned documents and images' },
  { id: 'llm_extraction', label: 'LLM Extraction', description: 'Use LLMs to extract structured data' },
  { id: 'ner', label: 'NER', description: 'Named Entity Recognition for entities' },
  { id: 'pii_redaction', label: 'PII Redaction', description: 'Automatically detect and redact PII' },
];

const WORKFLOW_STAGES = [
  'Document Upload', 'Pre-processing', 'AI Extraction', 'Human Review', 'Quality Check', 'Export',
];

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private', desc: 'Only you can access' },
  { value: 'team', label: 'Team', desc: 'All team members can access' },
  { value: 'public', label: 'Public', desc: 'Anyone with the link' },
];

function ConfigureWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const template = searchParams.get('template');
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [themeColor, setThemeColor] = useState('#3b82f6');
  const [visibility, setVisibility] = useState('private');
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>(['pdf', 'docx']);
  const [enabledModules, setEnabledModules] = useState<string[]>(['ocr', 'llm_extraction']);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Template Preloading Effect
  useEffect(() => {
    if (template === 'healthcare') {
      setName('Healthcare Claims Intelligence');
      setDescription('HIPAA-compliant workspace for healthcare insurance claims processing and medical EMR OCR/extraction.');
      setThemeColor('#10b981'); // Emerald
      setVisibility('team');
      setSelectedDocTypes(['pdf', 'docx', 'images']);
      setEnabledModules(['ocr', 'llm_extraction', 'ner', 'pii_redaction']);
    } else if (template === 'banking') {
      setName('Banking Transactions Auditor');
      setDescription('PCI-compliant workspace for invoice processing, statement analysis, and compliance verification.');
      setThemeColor('#3b82f6'); // Blue
      setVisibility('team');
      setSelectedDocTypes(['pdf', 'csv', 'zip', 'images']);
      setEnabledModules(['ocr', 'llm_extraction', 'ner']);
    } else if (template === 'legal') {
      setName('Legal & Risk Workspace');
      setDescription('Contract lifecycle analysis, compliance checking, and risk validation module.');
      setThemeColor('#8b5cf6'); // Purple
      setVisibility('team');
      setSelectedDocTypes(['pdf', 'docx', 'txt', 'json']);
      setEnabledModules(['llm_extraction', 'ner', 'pii_redaction']);
    }
  }, [template]);

  const toggleDocType = (id: string) => {
    setSelectedDocTypes((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const toggleModule = (id: string) => {
    setEnabledModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast({ title: 'Validation Error', description: 'Workspace name is required.', type: 'error' });
      return;
    }
    if (selectedDocTypes.length === 0) {
      showToast({ title: 'Validation Error', description: 'At least one document type must be selected.', type: 'error' });
      return;
    }
    setCreating(true);
    try {
      // Map templates to valid NestJS schema industry enum values
      const industryValue = template === 'banking' ? 'financial' : (template === 'healthcare' || template === 'legal' ? template : 'custom');

      const res = await workspacesAPI.createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        industry: industryValue,
        themeColor,
        visibility: visibility as 'private' | 'organization' | 'public',
        supportedDocTypes: selectedDocTypes,
        enabledAiModules: enabledModules.map((m) => ({ name: m, enabled: true })),
        workflowStages: WORKFLOW_STAGES.map((name, i) => ({ name, order: i + 1 })),
      });
      if ('_isError' in res) {
        showToast({ title: 'Creation Failed', description: res.message, type: 'error' });
        return;
      }
      showToast({ title: 'Workspace Created', description: `${res.name} has been created successfully.`, type: 'success' });
      router.push(`/workspaces/${res._id}`);
    } catch (err: any) {
      showToast({ title: 'Creation Failed', description: err.message || 'Something went wrong.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      {/* Decorative gradient blur circles in background */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              <span>Workspaces</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">Configure</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Configure Workspace</h1>
                <p className="text-muted-foreground mt-1">
                  {template ? 'Customize your template-based workspace before launch.' : 'Set up your new workspace from scratch.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => router.push('/workspaces/templates')}>
                  <ArrowLeft className="h-4 w-4" /> Back to Templates
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-9 w-9"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="flex gap-6">
            {/* Left Panel */}
            <div className="flex-1 space-y-6 max-w-2xl">
              {/* Workspace Details */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl border p-6 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Workspace Details
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="ws-name">Workspace Name</Label>
                  <Input
                    id="ws-name"
                    placeholder="e.g. Medical Records Processing"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ws-desc">Description</Label>
                  <Textarea
                    id="ws-desc"
                    placeholder="Describe what this workspace will be used for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Workspace Logo</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 2MB</p>
                  </div>
                </div>

                {/* Theme Color */}
                <div className="space-y-2">
                  <Label>Theme Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{themeColor}</span>
                    <div className="flex gap-1.5 ml-2">
                      {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setThemeColor(c)}
                          className={cn(
                            'w-6 h-6 rounded-full border-2 transition-all',
                            themeColor === c ? 'border-gray-900 scale-125' : 'border-transparent',
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="flex gap-2">
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setVisibility(opt.value)}
                        className={cn(
                          'flex-1 p-3 rounded-xl border text-left transition-all',
                          visibility === opt.value
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-gray-200 hover:border-blue-300',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                            visibility === opt.value ? 'border-blue-500' : 'border-gray-300',
                          )}>
                            {visibility === opt.value && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                          <span className="text-sm font-medium text-foreground">{opt.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Document Types */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Supported Document Types
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DOCUMENT_TYPES.map((dt) => {
                    const active = selectedDocTypes.includes(dt.id);
                    const Icon = dt.icon;
                    return (
                      <button
                        key={dt.id}
                        onClick={() => toggleDocType(dt.id)}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-xl border text-left transition-all',
                          active
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-gray-200 hover:border-blue-300',
                        )}
                      >
                        <div className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                          active ? 'bg-blue-500 border-blue-500' : 'border-gray-300',
                        )}>
                          {active && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <Icon className={cn('h-4 w-4', active ? 'text-blue-600' : 'text-muted-foreground')} />
                        <span className={cn('text-sm', active ? 'text-blue-700 font-medium' : 'text-muted-foreground')}>
                          {dt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* AI Modules */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-blue-600" />
                  Enabled AI Modules
                </h2>
                <div className="space-y-3">
                  {AI_MODULES.map((mod) => {
                    const active = enabledModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border transition-all',
                          active ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50/30',
                        )}
                      >
                        <div className="flex-1">
                          <p className={cn('text-sm font-medium', active ? 'text-blue-700' : 'text-foreground')}>
                            {mod.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                        </div>
                        <button
                          onClick={() => toggleModule(mod.id)}
                          className={cn(
                            'relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0',
                            active ? 'bg-blue-600' : 'bg-gray-300',
                          )}
                        >
                          <div className={cn(
                            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                            active ? 'translate-x-[22px]' : 'translate-x-[2px]',
                          )} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Workflow Stages */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Workflow Stages
                </h2>
                <div className="space-y-2">
                  {WORKFLOW_STAGES.map((stage, i) => (
                    <div key={stage} className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                        i < WORKFLOW_STAGES.length - 1 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700',
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 h-10 flex items-center px-4 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-sm text-foreground">{stage}</span>
                      </div>
                      {i < WORKFLOW_STAGES.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Create Button */}
              <motion.div variants={itemVariants} className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-600/20 px-8"
                    onClick={handleCreate}
                    disabled={creating || !name.trim() || selectedDocTypes.length === 0}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {creating ? 'Creating...' : 'Create Workspace'}
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.push('/workspaces/templates')}>
                    Cancel
                  </Button>
                </div>
                {selectedDocTypes.length === 0 && (
                  <p className="text-xs text-red-500 font-medium animate-pulse">
                    * Select at least one supported document type to enable creation.
                  </p>
                )}
                {!name.trim() && (
                  <p className="text-xs text-red-500 font-medium">
                    * Workspace Name is required.
                  </p>
                )}
              </motion.div>
            </div>

            {/* Right Panel - Live Preview */}
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden xl:block w-[380px] flex-shrink-0"
              >
                <div className="sticky top-24 space-y-4">
                  <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
                    {/* Preview Header */}
                    <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50" style={{ borderLeft: `4px solid ${themeColor}` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColor }} />
                        <h3 className="text-sm font-bold text-foreground truncate">{name || 'Workspace Name'}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {description || 'Workspace description will appear here...'}
                      </p>
                    </div>

                    {/* KPI Tiles */}
                    <div className="p-4 grid grid-cols-2 gap-2">
                      {[
                        { label: 'Documents', value: '0', icon: FileText, color: 'blue' },
                        { label: 'Extractions', value: '0', icon: Activity, color: 'emerald' },
                        { label: 'Accuracy', value: '—', icon: BarChart3, color: 'violet' },
                        { label: 'Speed', value: '—', icon: TrendingUp, color: 'amber' },
                      ].map((kpi) => (
                        <div key={kpi.label} className={cn(
                          'p-3 rounded-xl border',
                          kpi.color === 'blue' && 'bg-blue-50/50 border-blue-100',
                          kpi.color === 'emerald' && 'bg-emerald-50/50 border-emerald-100',
                          kpi.color === 'violet' && 'bg-violet-50/50 border-violet-100',
                          kpi.color === 'amber' && 'bg-amber-50/50 border-amber-100',
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground font-medium">{kpi.label}</span>
                            <kpi.icon className={cn(
                              'h-3 w-3',
                              kpi.color === 'blue' && 'text-blue-600',
                              kpi.color === 'emerald' && 'text-emerald-600',
                              kpi.color === 'violet' && 'text-violet-600',
                              kpi.color === 'amber' && 'text-amber-600',
                            )} />
                          </div>
                          <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Nav Mapping */}
                    <div className="px-4 pb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Navigation Mapping
                      </p>
                      <div className="space-y-1">
                        {template === 'healthcare' ? (
                          <div className="flex justify-between items-center text-xs text-foreground py-1.5 px-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <span className="text-muted-foreground">Default Records</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-semibold text-emerald-700">Healthcare: Patients</span>
                          </div>
                        ) : template === 'banking' ? (
                          <div className="flex justify-between items-center text-xs text-foreground py-1.5 px-2 rounded-lg bg-blue-50/50 border border-blue-100">
                            <span className="text-muted-foreground">Default Records</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-semibold text-blue-700">Banking: Invoices</span>
                          </div>
                        ) : template === 'legal' ? (
                          <div className="flex justify-between items-center text-xs text-foreground py-1.5 px-2 rounded-lg bg-purple-50/50 border border-purple-100">
                            <span className="text-muted-foreground">Default Records</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-semibold text-purple-700">Legal: Contracts</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-xs text-foreground py-1.5 px-2 rounded-lg bg-gray-50/50 border border-gray-150">
                            <span className="text-muted-foreground">Default Records</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-semibold text-gray-700">Custom Records</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active AI Modules in Preview */}
                    <div className="px-4 pb-2 pt-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Pipeline Active Modules
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {enabledModules.map((modId) => {
                          const label = AI_MODULES.find(m => m.id === modId)?.label || modId;
                          return (
                            <Badge key={modId} variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                              {label}
                            </Badge>
                          );
                        })}
                        {enabledModules.length === 0 && (
                          <span className="text-[11px] text-muted-foreground italic">No modules enabled</span>
                        )}
                      </div>
                    </div>

                    {/* Trend Chart Placeholder */}
                    <div className="px-4 pb-4 pt-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Accuracy Trend
                      </p>
                      <div className="h-16 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        <span className="text-xs text-muted-foreground ml-2">No data yet</span>
                      </div>
                    </div>

                    {/* Copilot Chat Preview */}
                    <div className="border-t">
                      <div className="p-4 flex items-center gap-2 bg-gray-50">
                        <Bot className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-semibold text-foreground">
                          {template === 'healthcare' ? 'Healthcare Copilot' : template === 'banking' ? 'Banking Copilot' : template === 'legal' ? 'Legal Copilot' : 'Workspace Copilot'}
                        </span>
                      </div>
                      <div className="px-4 pb-4 space-y-3">
                        {/* Suggested queries */}
                        <div className="flex flex-col gap-1.5 pt-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Queries</p>
                          <div className="flex flex-col gap-1 text-[11px]">
                            {template === 'healthcare' ? (
                              <>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"Show pending clinical audits"</button>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"Lookup MRN-8847 details"</button>
                              </>
                            ) : template === 'banking' ? (
                              <>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"Show top unpaid invoices"</button>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"Find compliance violations"</button>
                              </>
                            ) : template === 'legal' ? (
                              <>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"Find draft contract issues"</button>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"Extract liability clauses"</button>
                              </>
                            ) : (
                              <>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"List all ingested documents"</button>
                                <button disabled className="text-left py-1 px-2 rounded bg-gray-50 border hover:bg-gray-100 transition-colors truncate">"Show system extraction latency"</button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center px-3">
                            <span className="text-xs text-muted-foreground">Ask about your workspace...</span>
                          </div>
                          <button className="p-1.5 rounded-lg bg-blue-600 text-white cursor-not-allowed" disabled>
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ConfigureWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <ConfigureWorkspaceContent />
    </Suspense>
  );
}