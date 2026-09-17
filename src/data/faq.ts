// FAQ content rules (from the Sidey SEO notes):
//   - the question is phrased the way a user types it — it *is* the keyword
//   - the answer stands alone in its first 2–3 sentences; no preamble, no links
//   - one question, one answer; specific over generic; honest, including "no"
//   - 6–10 real questions, not padding
// The same list renders on the page and in the FAQPage JSON-LD, so they can
// never drift apart.
export interface Faq {
  q: string
  a: string
}

export const faqs: Faq[] = [
  {
    q: 'What types of data can you annotate?',
    a: 'Images, video, audio, free text and tabular data such as CSV files. Typical tasks are bounding boxes and segmentation on images, object tracking across video frames, transcription and speaker diarization on audio, and entity, sentiment or classification labels on text.'
  },
  {
    q: 'How do you make sure the annotations are accurate?',
    a: 'Each item can be labelled independently by several annotators, and agreement is measured per question rather than per dataset. Where they disagree, a reviewer resolves the conflict in a shared review session, and the before and after agreement figures are kept with the dataset.'
  },
  {
    q: 'What is consensus annotation?',
    a: 'Consensus annotation means two or more people label the same item and the final label is settled by agreement, not by a single annotator. It costs more per item than single-pass labelling, but it is the only way to know how reliable a label actually is.'
  },
  {
    q: 'Can I use my own annotators on the platform?',
    a: 'Yes. You can invite your own team into a workspace, assign them datasets or individual tasks, and follow progress and agreement from the dashboard. Our annotators and yours can work on the same dataset if you want a mix.'
  },
  {
    q: 'Do you support conditional or nested questions?',
    a: 'Yes. A question can be shown only when an earlier answer matches, so a "Damaged?" answer of Yes can reveal a "Severity" follow-up while No skips it. Nesting can go several levels deep, and agreement statistics are reported at each level.'
  },
  {
    q: 'Can you annotate long documents like contracts or research papers?',
    a: 'Yes. Documents are uploaded and viewed alongside the questions, with a retrieval assistant that surfaces the relevant passage for each one and tracks which questions the document has covered. The assistant can run on a hosted model or a local one.'
  },
  {
    q: 'What is an LLM judge, and what do you mean by certified?',
    a: 'An LLM judge is a model that scores model outputs against a rubric instead of a person doing it. We call one certified only after it has been calibrated on a human-labelled set for that task and its agreement with human raters has been measured and reported. Judges are not used on a task before that number exists.'
  },
  {
    q: 'Where is my data stored?',
    a: 'Your data is held on servers in the Mumbai region. Datasets are scoped to your workspace, and access is controlled by per-user accounts with admin and annotator roles.'
  },
  {
    q: 'How do I get started?',
    a: 'Create an account, upload a dataset, and define the questions annotators should answer. You can label a first batch yourself to check the schema before inviting anyone else.'
  }
]
