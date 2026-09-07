export interface NavItem {
  label: string
  href: string
  children?: { label: string; href: string; description: string }[]
}

// Every href is a real route under src/app or an anchor on the landing page.
export const navigationData: NavItem[] = [
  {
    label: 'Platform',
    href: '/dashboard',
    children: [
      { label: 'Annotation workspace', href: '/dashboard', description: 'Every modality, one workbench' },
      { label: 'Datasets', href: '/dataset', description: 'Upload, schema, assignment' },
      { label: 'Consensus review', href: '/assignments/review', description: 'Resolve disagreement, not average it' },
      { label: 'Tasks', href: '/tasks', description: 'What is queued for you' }
    ]
  },
  {
    label: 'Services',
    href: '#deliver',
    children: [
      { label: 'What we annotate', href: '#annotate', description: 'Image, video, audio, text' },
      { label: 'Produce', href: '#produce', description: 'Workspace & document intelligence' },
      { label: 'Verify', href: '#verify', description: 'Consensus, QA and analytics' },
      { label: 'Evaluate', href: '#evaluate', description: 'Agentic evaluation & LLM judges' }
    ]
  },
  { label: 'FAQ', href: '#faq' },
  { label: 'Docs', href: '/documentation' }
]
