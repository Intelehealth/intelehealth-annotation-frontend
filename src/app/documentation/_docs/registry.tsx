import { ComponentType } from 'react'
import * as C from './content'

export interface DocSection {
  id: string
  title: string
}

export interface DocPage {
  slug: string
  title: string
  /** one- or two-word label for the graph, where the full title will not fit */
  short: string
  group: 'Start' | 'Set up' | 'Work' | 'Quality' | 'Reference'
  summary: string
  /** the user stories this page exists to answer — shown at the top of the page */
  stories: string[]
  sections: DocSection[]
  /** slugs this page links onward to; these are the graph edges */
  related: string[]
  Body: ComponentType
}

// Order here is the sidebar order and the prev/next order.
export const pages: DocPage[] = [
  {
    slug: 'getting-started',
    short: 'Start',
    title: 'Getting started',
    group: 'Start',
    summary: 'What the platform is, and the six steps from a new account to an exported, reviewed dataset.',
    stories: [
      'As a new administrator, I want to set up my first dataset end to end without reading everything else first.',
      'As someone evaluating the platform, I want to know what it does and does not do.'
    ],
    sections: [
      { id: 'what-it-is', title: 'What Latent Verify is' },
      { id: 'first-dataset', title: 'Your first dataset in ten minutes' }
    ],
    related: ['datasets', 'schema', 'assigning', 'review', 'statistics'],
    Body: C.GettingStarted
  },
  {
    slug: 'datasets',
    short: 'Datasets',
    title: 'Datasets',
    group: 'Set up',
    summary: 'Creating a dataset, choosing its data type, controlling who can see it, and its settings.',
    stories: [
      'As an administrator, I want to create an image, audio, text or multi-modal dataset.',
      'As an administrator, I want to restrict a dataset to specific people.',
      'As an administrator, I want to understand what deleting a dataset does to work already done.'
    ],
    sections: [
      { id: 'create', title: 'Creating a dataset' },
      { id: 'access', title: 'Who can see a dataset' },
      { id: 'settings', title: 'Dataset settings' },
      { id: 'delete', title: 'Deleting a dataset' }
    ],
    related: ['schema', 'assigning', 'review'],
    Body: C.Datasets
  },
  {
    slug: 'schema',
    short: 'Schema',
    title: 'Designing the schema',
    group: 'Set up',
    summary: 'The nine field types, grouping and repeating fields, nested and conditional questions, and changing a schema later.',
    stories: [
      'As an administrator, I want a follow-up question to appear only when an earlier answer calls for it.',
      'As an administrator, I want annotators to record the same set of fields once per defect in an image.',
      'As an administrator, I want to add an option annotators keep asking for without breaking work in progress.'
    ],
    sections: [
      { id: 'fields', title: 'Field types' },
      { id: 'groups', title: 'Field groups and repeats' },
      { id: 'conditional', title: 'Nested and conditional questions' },
      { id: 'changes', title: 'Changing a schema after work has started' }
    ],
    related: ['annotating', 'statistics', 'datasets'],
    Body: C.Schema
  },
  {
    slug: 'assigning',
    short: 'Assigning',
    title: 'Assigning work',
    group: 'Set up',
    summary: 'Clones, assigning annotators with the right permissions, task statuses, and managing the team.',
    stories: [
      'As an administrator, I want to give five annotators the same dataset without them seeing each other’s answers.',
      'As an administrator, I want to know what each task status means and what happens next.',
      'As an administrator, I want to check an annotator’s progress without changing anything.'
    ],
    sections: [
      { id: 'clones', title: 'How assignment works: clones' },
      { id: 'assign', title: 'Assigning annotators' },
      { id: 'tasks', title: 'Tasks and their statuses' },
      { id: 'team', title: 'Managing the team' }
    ],
    related: ['annotating', 'review', 'roles'],
    Body: C.Assigning
  },
  {
    slug: 'annotating',
    short: 'Annotating',
    title: 'Annotating',
    group: 'Work',
    summary: 'The workbench for images, audio and text; conditional questions in practice; submitting, rework and proposing schema changes.',
    stories: [
      'As an annotator, I want to know how to move through items and where my answers are saved.',
      'As an annotator, my clone came back as Rework required — I want to know what to do.',
      'As an annotator, a question is missing the option I need — I want to get it added.'
    ],
    sections: [
      { id: 'workbench', title: 'The workbench' },
      { id: 'conditional-in-practice', title: 'Conditional questions in practice' },
      { id: 'submit', title: 'Submitting and rework' },
      { id: 'propose', title: 'Proposing a schema change' }
    ],
    related: ['review', 'schema', 'documents'],
    Body: C.Annotating
  },
  {
    slug: 'review',
    short: 'Review',
    title: 'Consensus & review',
    group: 'Quality',
    summary: 'Why several annotators per item, review requests, resolving conflicts, and the consensus settings.',
    stories: [
      'As a reviewer, an annotator submitted their clone — I want to approve it or send it back with notes.',
      'As a reviewer, two annotators disagree on an item — I want to see both answers and record the right one.',
      'As an administrator, I want to know what “Allow even reviewers” means before I turn it on.'
    ],
    sections: [
      { id: 'why', title: 'Why consensus' },
      { id: 'requests', title: 'Review requests' },
      { id: 'resolve', title: 'Resolving disagreements' },
      { id: 'config', title: 'Consensus configuration' }
    ],
    related: ['statistics', 'assigning', 'roles'],
    Body: C.Review
  },
  {
    slug: 'statistics',
    short: 'Statistics',
    title: 'Statistics & exports',
    group: 'Quality',
    summary: 'Computing statistics; what Agreement %, Krippendorff’s alpha and Health score mean; annotator performance; exporting.',
    stories: [
      'As an administrator, I want to know whether my labels are reliable enough to train on.',
      'As an administrator, agreement is 90% but alpha is 0.2 — I want to know which to believe.',
      'As an administrator, I want the labels and the statistics out of the platform as CSV or Excel.'
    ],
    sections: [
      { id: 'compute', title: 'Computing statistics' },
      { id: 'agreement', title: 'Reading the agreement numbers' },
      { id: 'annotators', title: 'Annotator performance' },
      { id: 'export', title: 'Exporting' }
    ],
    related: ['review', 'schema'],
    Body: C.Statistics
  },
  {
    slug: 'documents',
    short: 'Documents',
    title: 'Documents',
    group: 'Work',
    summary: 'Annotating long documents with the retrieval assistant, related questions and coverage; hosted or local models.',
    stories: [
      'As an annotator, I have a 40-page contract — I want to find the passage each question is about quickly.',
      'As an administrator, I want document text to stay on our own infrastructure.'
    ],
    sections: [
      { id: 'what', title: 'Annotating long documents' },
      { id: 'assistant', title: 'The retrieval assistant' },
      { id: 'models', title: 'Which model powers it' }
    ],
    related: ['annotating', 'schema'],
    Body: C.Documents
  },
  {
    slug: 'roles',
    short: 'Roles',
    title: 'Roles & permissions',
    group: 'Reference',
    summary: 'What administrators and annotators can each do, the rules the platform enforces, and accounts.',
    stories: [
      'As an administrator, I want to know exactly what an annotator can and cannot see.',
      'As an annotator, I want to know whether I can resolve conflicts on my own dataset.'
    ],
    sections: [
      { id: 'roles', title: 'The two roles' },
      { id: 'rules', title: 'Rules the platform enforces' },
      { id: 'accounts', title: 'Accounts' }
    ],
    related: ['assigning', 'review'],
    Body: C.Roles
  }
]

export const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p])) as Record<string, DocPage>

/** Serialisable shape for client components (no component references). */
export type NavPage = Omit<DocPage, 'Body'>
export const navPages: NavPage[] = pages.map(({ Body: _Body, ...rest }) => rest)
