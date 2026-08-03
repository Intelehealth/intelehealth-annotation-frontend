'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cpu,
  Search,
  Plus,
  Minus,
  Bot,
  Send,
  FileText,
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Layers,
  Eye,
  EyeOff,
  GitBranch,
  Shield,
  Settings,
  Image,
  Network,
  Loader2,
  Sparkles,
  BookOpen,
  PenTool,
  Braces,
  Workflow,
  Upload,
  Users,
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

const MODULE_CATEGORIES = [
  { id: 'all', label: 'All Modules' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'annotation', label: 'Annotation' },
  { id: 'automation', label: 'Automation' },
];

const MARKETPLACE_MODULES = [
  { id: 'neural_ocr', name: 'Neural OCR', category: 'intelligence', description: 'Deep learning-based OCR for handwritten and printed text', icon: Image, popular: true },
  { id: 'table_detection', name: 'Table Detection', category: 'intelligence', description: 'Automatic table structure recognition and extraction', icon: BarChart3, popular: true },
  { id: 'llm_extraction', name: 'LLM Extraction', category: 'intelligence', description: 'Extract structured data using large language models', icon: Brain, popular: true },
  { id: 'rag_engine', name: 'RAG Engine', category: 'intelligence', description: 'Retrieval-Augmented Generation for document Q&A', icon: Braces, popular: false },
  { id: 'human_in_loop', name: 'Human-in-Loop', category: 'annotation', description: 'Manual review and correction of AI predictions', icon: PenTool, popular: true },
  { id: 'ner_tagger', name: 'NER Tagger', category: 'annotation', description: 'Named Entity Recognition tagging interface', icon: BookOpen, popular: true },
  { id: 'pii_redaction', name: 'PII Redaction', category: 'annotation', description: 'Automated PII detection and redaction', icon: Shield, popular: false },
  { id: 'classification', name: 'Classification', category: 'annotation', description: 'Document and text classification workflows', icon: Layers, popular: false },
  { id: 'auto_export', name: 'Auto Export', category: 'automation', description: 'Schedule automated exports to any destination', icon: Zap, popular: false },
  { id: 'workflow_engine', name: 'Workflow Engine', category: 'automation', description: 'Custom workflow automation with triggers', icon: Workflow, popular: true },
  { id: 'monitoring', name: 'Monitoring', category: 'automation', description: 'Real-time pipeline monitoring and alerts', icon: Activity, popular: false },
];

function Brain(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" />
      <path d="M12 12c-3.3 0-6 2.7-6 6v2h12v-2c0-3.3-2.7-6-6-6z" />
      <path d="M9 16h6" />
      <path d="M9 20h6" />
      <path d="M9 12V8" />
      <path d="M15 12V8" />
    </svg>
  );
}

export default function CreateWorkspacePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(['neural_ocr', 'llm_extraction']);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    organization: false,
    security: false,
    ai_defaults: false,
  });
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Validate that at least one Document Intelligence module is selected
  const hasIntelligenceModule = selectedModules.some(modId => {
    const mod = MARKETPLACE_MODULES.find(m => m.id === modId);
    return mod?.category === 'intelligence';
  });

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const filteredModules = MARKETPLACE_MODULES.filter((mod) => {
    const matchesCategory = activeCategory === 'all' || mod.category === activeCategory;
    const matchesSearch = mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast({ title: 'Validation Error', description: 'Workspace name is required.', type: 'error' });
      return;
    }
    if (!hasIntelligenceModule) {
      showToast({ title: 'Validation Error', description: 'At least one Document Intelligence module must be selected.', type: 'error' });
      return;
    }
    setCreating(true);
    try {
      const res = await workspacesAPI.createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        industry: 'custom',
        enabledAiModules: selectedModules.map((m) => ({ name: m, enabled: true })),
        supportedDocTypes: ['pdf', 'docx', 'csv', 'json', 'txt'],
        workflowStages: [
          { name: 'Upload', order: 1 },
          { name: 'Process', order: 2 },
          { name: 'Review', order: 3 },
          { name: 'Export', order: 4 },
        ],
      });
      if ('_isError' in res) {
        showToast({ title: 'Creation Failed', description: res.message, type: 'error' });
        return;
      }
      showToast({ title: 'Workspace Created', description: `${res.name} has been created.`, type: 'success' });
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
              <span className="text-foreground font-medium">Create Custom</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Create Custom Workspace</h1>
                <p className="text-muted-foreground mt-1">
                  Build a workspace from scratch — choose modules, configure settings, and preview your pipeline.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2" onClick={() => router.push('/workspaces/templates')}>
                  <ArrowLeft className="h-4 w-4" /> Templates
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
              {/* Workspace Name + Description */}
              <motion.div variants={itemVariants} className="bg-white rounded-2xl border p-6 shadow-sm space-y-5">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Basic Info
                </h2>
                <div className="space-y-2">
                  <Label htmlFor="ws-name">Workspace Name</Label>
                  <Input
                    id="ws-name"
                    placeholder="e.g. Enterprise Document Processing"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ws-desc">Description</Label>
                  <Textarea
                    id="ws-desc"
                    placeholder="Describe the purpose of this workspace..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Collapsible: Organization */}
                <CollapsibleSection
                  title="Organization"
                  icon={Layers}
                  isOpen={!collapsedSections.organization}
                  onToggle={() => toggleSection('organization')}
                >
                  <div className="space-y-3 pt-3">
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input placeholder="e.g. Engineering, Operations" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex gap-2 flex-wrap">
                        {['production', 'experimental', 'compliance'].map((tag) => (
                          <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Collapsible: Security */}
                <CollapsibleSection
                  title="Security"
                  icon={Shield}
                  isOpen={!collapsedSections.security}
                  onToggle={() => toggleSection('security')}
                >
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-foreground">Encryption at Rest</p>
                        <p className="text-xs text-muted-foreground">AES-256 encryption for all stored data</p>
                      </div>
                      <div className="w-11 h-6 rounded-full bg-blue-600 relative flex-shrink-0">
                        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm translate-x-[22px]" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-foreground">Audit Logging</p>
                        <p className="text-xs text-muted-foreground">Track all workspace activity</p>
                      </div>
                      <div className="w-11 h-6 rounded-full bg-blue-600 relative flex-shrink-0">
                        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm translate-x-[22px]" />
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Collapsible: AI Defaults */}
                <CollapsibleSection
                  title="AI Defaults"
                  icon={Cpu}
                  isOpen={!collapsedSections.ai_defaults}
                  onToggle={() => toggleSection('ai_defaults')}
                >
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-foreground">Auto-Review Threshold</p>
                        <p className="text-xs text-muted-foreground">Confidence score above 95% auto-approves</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">95%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-foreground">Batch Size</p>
                        <p className="text-xs text-muted-foreground">Documents processed per batch</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">50</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-foreground">Retry Attempts</p>
                        <p className="text-xs text-muted-foreground">Maximum retries on extraction failure</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600">3</span>
                    </div>
                  </div>
                </CollapsibleSection>
              </motion.div>
            </div>

            {/* Center: Module Marketplace */}
            <motion.div variants={itemVariants} className="w-[400px] flex-shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Module Marketplace
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedModules.length} module{selectedModules.length !== 1 ? 's' : ''} selected
                  </p>
                </div>

                {/* Search */}
                <div className="p-4 pb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search modules..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
                  {MODULE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                        activeCategory === cat.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-muted-foreground hover:bg-gray-200',
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <Separator />

                {/* Module Cards */}
                <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredModules.length === 0 ? (
                    <div className="text-center py-10 space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">No modules match your search</p>
                      <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                        Reset Filters
                      </Button>
                    </div>
                  ) : (
                    filteredModules.map((mod) => {
                      const isSelected = selectedModules.includes(mod.id);
                      const Icon = mod.icon;
                      return (
                        <div
                          key={mod.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition-all',
                            isSelected
                              ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-500/20'
                              : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50',
                          )}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                            isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-muted-foreground',
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground truncate">{mod.name}</p>
                              {mod.popular && (
                                <Badge className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200">Popular</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                          </div>
                          <button
                            onClick={() => toggleModule(mod.id)}
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0',
                              isSelected
                                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                            )}
                          >
                            {isSelected ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Create Button */}
                <div className="p-4 border-t bg-gray-50 space-y-2">
                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-600/20"
                    onClick={handleCreate}
                    disabled={creating || !name.trim() || !hasIntelligenceModule}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    {creating ? 'Creating...' : 'Create Workspace'}
                  </Button>
                  {!hasIntelligenceModule && (
                    <p className="text-[10px] text-red-500 font-medium text-center leading-normal animate-pulse">
                      * Select at least one Document Intelligence module (Neural OCR, Table Detection, or LLM Extraction).
                    </p>
                  )}
                  {!name.trim() && (
                    <p className="text-[10px] text-red-500 font-medium text-center leading-normal">
                      * Workspace Name is required.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right Panel - Live Preview */}
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden xl:block w-[340px] flex-shrink-0"
              >
                <div className="sticky top-24 space-y-4">
                  {/* Sample Document Render */}
                  <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
                    <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        Sample Document
                      </span>
                      <Badge variant="outline" className="text-[9px]">Preview</Badge>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="h-2 w-3/4 bg-gray-200 rounded" />
                      <div className="h-2 w-1/2 bg-gray-200 rounded" />
                      <div className="h-2 w-5/6 bg-gray-200 rounded" />
                      <div className="h-2 w-2/3 bg-gray-200 rounded" />
                      <div className="h-2 w-4/5 bg-gray-200 rounded mt-3" />
                      <div className="h-2 w-1/3 bg-gray-200 rounded" />
                      <div className="flex gap-2 mt-3">
                        <div className="h-12 w-12 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center">
                          <Image className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 w-full bg-gray-200 rounded" />
                          <div className="h-2 w-3/4 bg-gray-200 rounded" />
                          <div className="h-2 w-1/2 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-white rounded-2xl border shadow-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accuracy & Speed</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <p className="text-[10px] text-emerald-600 font-medium">Accuracy</p>
                        <p className="text-lg font-bold text-emerald-700">—</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <p className="text-[10px] text-blue-600 font-medium">Speed</p>
                        <p className="text-lg font-bold text-blue-700">—</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-[10px] text-amber-600 font-medium">Documents Processed</p>
                      <p className="text-lg font-bold text-amber-700">0</p>
                    </div>
                  </div>

                  {/* Orchestration Flow */}
                  <div className="bg-white rounded-2xl border shadow-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <GitBranch className="h-3 w-3 text-blue-600" />
                      Orchestration Flow
                    </p>
                    <div className="space-y-3 pt-2">
                      {/* Step 1: Upload Ingest */}
                      <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/30 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <Upload className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Upload Ingest</p>
                          <p className="text-[10px] text-muted-foreground">Accepts configured document formats</p>
                        </div>
                      </div>

                      <div className="flex justify-center my-0.5">
                        <div className="w-0.5 h-4 bg-gray-200 border-dashed border-l" />
                      </div>

                      {/* Step 2: Intelligence Hub */}
                      <div className={cn(
                        "p-3 rounded-xl border flex items-center gap-3",
                        selectedModules.some(modId => MARKETPLACE_MODULES.find(m => m.id === modId)?.category === 'intelligence')
                          ? "border-emerald-100 bg-emerald-50/30" 
                          : "border-gray-200 bg-gray-50/50"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          selectedModules.some(modId => MARKETPLACE_MODULES.find(m => m.id === modId)?.category === 'intelligence') ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                        )}>
                          <Cpu className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">Intelligence Hub</p>
                          {selectedModules.some(modId => MARKETPLACE_MODULES.find(m => m.id === modId)?.category === 'intelligence') ? (
                            <p className="text-[10px] text-emerald-700 font-medium truncate">
                              Active: {selectedModules.filter(modId => MARKETPLACE_MODULES.find(m => m.id === modId)?.category === 'intelligence').map(modId => MARKETPLACE_MODULES.find(m => m.id === modId)?.name).join(', ')}
                            </p>
                          ) : (
                            <p className="text-[10px] text-red-500 italic animate-pulse">
                              Requires intelligence module
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center my-0.5">
                        <div className="w-0.5 h-4 bg-gray-200 border-dashed border-l" />
                      </div>

                      {/* Step 3: Expert Review */}
                      <div className={cn(
                        "p-3 rounded-xl border flex items-center gap-3",
                        selectedModules.includes('human_in_loop') || selectedModules.includes('ner_tagger')
                          ? "border-purple-100 bg-purple-50/30" 
                          : "border-gray-200 bg-gray-50/50 opacity-60"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          selectedModules.includes('human_in_loop') || selectedModules.includes('ner_tagger') ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"
                        )}>
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">Expert Review</p>
                          <p className="text-[10px] text-muted-foreground">
                            {selectedModules.includes('human_in_loop') || selectedModules.includes('ner_tagger') ? "Human-in-the-Loop review queue active" : "Automated bypass to output"}
                          </p>
                        </div>
                      </div>

                      {selectedModules.includes('auto_export') && (
                        <>
                          <div className="flex justify-center my-0.5">
                            <div className="w-0.5 h-4 bg-gray-200 border-dashed border-l" />
                          </div>
                          {/* Step 4: Export */}
                          <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                              <Zap className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Automated Export</p>
                              <p className="text-[10px] text-muted-foreground">Schedule automatic downstream exports</p>
                            </div>
                          </div>
                        </>
                      )}
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

function CollapsibleSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}