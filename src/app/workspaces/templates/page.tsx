'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Cpu,
  Clock,
  ArrowRight,
  Sparkles,
  Shield,
  Layers,
  GitBranch,
  Settings,
  ChevronRight,
  X,
  Building2,
  Stethoscope,
  Scale,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 100, damping: 18 },
  },
};

const FILTERS = ['All Industries', 'Healthcare', 'Financial Services', 'Legal & Risk'];

const TEMPLATES = [
  {
    id: 'healthcare',
    name: 'Healthcare',
    industry: 'Healthcare',
    description: 'HIPAA-compliant workspace for medical document processing, clinical NLP, and patient data extraction.',
    subLabel: 'Clinical Document Processing',
    setupTime: '~5 min',
    icon: Stethoscope,
    gradient: 'from-emerald-500 to-teal-600',
    categories: ['Healthcare'],
    complianceTags: ['HIPAA', 'FDA', 'HITECH'],
    modules: ['OCR Engine', 'LLM Extraction', 'NER', 'PII Redaction'],
    pipelineStages: ['Upload', 'OCR', 'Extract', 'Redact', 'Review', 'Export'],
  },
  {
    id: 'banking',
    name: 'Banking',
    industry: 'Financial Services',
    description: 'PCI-compliant workspace for loan processing, statement analysis, and financial document automation.',
    subLabel: 'Financial Document Automation',
    setupTime: '~5 min',
    icon: Building2,
    gradient: 'from-blue-500 to-indigo-600',
    categories: ['Financial Services'],
    complianceTags: ['PCI', 'SOX', 'GLBA'],
    modules: ['OCR Engine', 'LLM Extraction', 'NER', 'Table Detection'],
    pipelineStages: ['Upload', 'Classify', 'Extract', 'Validate', 'Approve', 'Archive'],
  },
  {
    id: 'legal',
    name: 'Legal',
    industry: 'Legal & Risk',
    description: 'Enterprise workspace for contract analysis, eDiscovery, and compliance document review.',
    subLabel: 'Contract & Compliance Review',
    setupTime: '~5 min',
    icon: Scale,
    gradient: 'from-amber-500 to-orange-600',
    categories: ['Legal & Risk'],
    complianceTags: ['GDPR', 'SOC 2', 'ISO 27001'],
    modules: ['LLM Extraction', 'NER', 'PII Redaction', 'RAG Engine'],
    pipelineStages: ['Upload', 'Analyze', 'Extract', 'Review', 'Approve', 'Export'],
  },
];

const PIPELINE_LIFECYCLE_DESCRIPTIONS: Record<string, string> = {
  'Upload': 'Ingest files via API, drag-and-drop, or cloud storage connectors.',
  'OCR': 'Extract raw text and spatial coordinates from scanned PDFs and images.',
  'Classification': 'Determine document types and route to appropriate pipeline sub-flows.',
  'Field Extraction': 'Identify and extract critical schema fields using structured LLMs.',
  'Annotation': 'Review and verify extracted fields with human annotators.',
  'Consensus': 'Resolve conflicts between multiple annotators with automated rules.',
  'Analytics': 'Run calculations and gather insights across processed datasets.',
  'Reports': 'Export structured clean data in CSV, Excel, or JSON formats.',
  'Extract': 'Extract structured data fields using specialized extractors.',
  'Redact': 'Identify and redact sensitive PII/PHI information dynamically.',
  'Review': 'Expert validation queue for verification of low-confidence fields.',
  'Export': 'Generate clean reports and export to external destinations.',
  'Classify': 'Categorize documents automatically based on visual/text cues.',
  'Validate': 'Apply business logic checks and schema validation constraints.',
  'Approve': 'Final approval checkpoint for data compliance verification.',
  'Archive': 'Secure long-term retention and audit log preservation.',
  'Analyze': 'Run semantic analyses and generate aggregate quality reports.'
};

export default function WorkspaceTemplatesPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All Industries');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      // Auto-highlight Healthcare by default
      setSelectedTemplate(TEMPLATES[0]);
      setDetailOpen(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = activeFilter === 'All Industries'
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.categories.includes(activeFilter));

  const handleSelectTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSelectedTemplate(tpl);
    setDetailOpen(true);
  };

  const handleUseTemplate = (tplId: string) => {
    router.push(`/workspaces/configure?template=${tplId}`);
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
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <span>Workspaces</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">Templates</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Workspace Templates</h1>
              <p className="text-muted-foreground mt-1">
                Start with a pre-configured workspace tailored to your industry.
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => router.push('/workspaces/create')}>
              <Settings className="h-4 w-4" />
              Custom Setup
            </Button>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  activeFilter === f
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600',
                )}
              >
                {f}
              </button>
            ))}
          </motion.div>

          {/* Template Grid + Detail Panel */}
          <div className="flex gap-6">
            {/* Grid */}
            <div className={cn('flex-1 grid gap-6', detailOpen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
              {loading ? (
                // Shimmer state
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-full pt-2" />
                  </div>
                ))
              ) : (
                filtered.map((tpl) => (
                  <motion.div
                    key={tpl.id}
                    variants={itemVariants}
                    layout
                    onClick={() => handleSelectTemplate(tpl)}
                    className={cn(
                      'group relative rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 cursor-pointer',
                      'hover:shadow-lg hover:-translate-y-1',
                      selectedTemplate?.id === tpl.id && 'ring-2 ring-blue-500 border-blue-300',
                    )}
                  >
                    {/* Gradient icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br shadow-lg',
                      tpl.gradient,
                    )}>
                      <tpl.icon className="h-6 w-6 text-white" />
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1">{tpl.name}</h3>
                    <p className="text-xs font-medium text-blue-600 mb-2">{tpl.subLabel}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                      {tpl.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Setup: {tpl.setupTime}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {tpl.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-[10px]">
                          {cat}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      onClick={(e) => { e.stopPropagation(); handleUseTemplate(tpl.id); }}
                      className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-600/20"
                    >
                      Use Template <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))
              )}

              {/* Custom Workspace Card */}
              <motion.div
                variants={itemVariants}
                className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 p-6 shadow-sm transition-all duration-300 hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-md flex flex-col items-center justify-center text-center min-h-[320px]"
              >
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Custom Workspace</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Build a workspace from scratch with full control over modules, document types, and workflow stages.
                </p>
                <Button
                  variant="outline"
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => router.push('/workspaces/create')}
                >
                  Start Manual Setup <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Detail Panel */}
            <AnimatePresence>
              {detailOpen && selectedTemplate && (
                <motion.div
                  initial={{ opacity: 0, x: 40, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 380 }}
                  exit={{ opacity: 0, x: 40, width: 0 }}
                  transition={{ type: 'spring' as const, stiffness: 120, damping: 20 }}
                  className="hidden lg:block flex-shrink-0"
                >
                  <div className="w-[380px] bg-white rounded-2xl border shadow-lg p-6 sticky top-24 space-y-5">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg',
                        selectedTemplate.gradient,
                      )}>
                        <selectedTemplate.icon className="h-6 w-6 text-white" />
                      </div>
                      <button
                        onClick={() => setDetailOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-foreground">{selectedTemplate.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                    </div>

                    {/* Compliance Tags */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Compliance</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTemplate.complianceTags.map((tag) => (
                          <Badge key={tag} className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
                            <Shield className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Modules */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        <Layers className="h-3 w-3 inline mr-1" />
                        Enabled Modules
                      </p>
                      <div className="space-y-2">
                        {selectedTemplate.modules.map((mod) => (
                          <div key={mod} className="flex items-center gap-2 text-sm text-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {mod}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Pipeline Stages */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        <GitBranch className="h-3 w-3 inline mr-1" />
                        Pipeline Stages
                      </p>
                      <div className="space-y-3">
                        {selectedTemplate.pipelineStages.map((stage, i) => (
                          <div key={stage} className="flex items-start gap-2.5">
                            <div className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0',
                              i < selectedTemplate.pipelineStages.length - 1
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700',
                            )}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-tight">{stage}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                                {PIPELINE_LIFECYCLE_DESCRIPTIONS[stage] || 'Pipeline processing stage.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-600/20"
                      onClick={() => handleUseTemplate(selectedTemplate.id)}
                    >
                      Use This Template <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}