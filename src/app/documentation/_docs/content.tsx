import { H2, H3, Steps, Step, Callout, Table, D } from './primitives'

// User-facing documentation bodies. Everything here describes what the app
// actually does today (screens, labels and statuses are taken from the code).
// Section ids must match the `sections` declared for the page in registry.tsx.

export function GettingStarted() {
  return (
    <>
      <H2 id="what-it-is">What Latent Verify is</H2>
      <p>
        Latent Verify is a multi-annotator data annotation platform. An administrator creates a dataset,
        defines the questions annotators must answer for each item, and assigns the work. Annotators label
        their own isolated copy of the data; the platform then measures how far they agree and gives the
        administrator a review flow to resolve the differences, so the exported labels come with an agreement
        figure attached.
      </p>
      <p>
        It handles image, audio, text and multi-modal datasets, and supports nested and conditional questions,
        so a follow-up question can appear only when an earlier answer calls for it.
      </p>

      <H2 id="first-dataset">Your first dataset in ten minutes</H2>
      <Steps>
        <Step title="Create an account and log in">
          New accounts go through email verification. Administrators can also set an initial password for
          annotators they invite.
        </Step>
        <Step title="Create a dataset">
          From the dashboard, choose <strong>Add dataset</strong>, give it a name and a short description, and
          pick the data type: image, audio, text or multi-modal. Upload the data or a CSV of items. See{' '}
          <D to="datasets">Datasets</D>.
        </Step>
        <Step title="Design the questions">
          Add fields for what annotators should record: text, numbers, dates, dropdowns, radio buttons,
          multi-select checkboxes, single checkboxes or star ratings. Group fields, and make a field conditional
          on an earlier answer where needed. See <D to="schema">Designing the schema</D>.
        </Step>
        <Step title="Assign annotators">
          Use <strong>Clone &amp; assign</strong> to give each annotator their own working copy and the
          permissions they need. See <D to="assigning">Assigning work</D>.
        </Step>
        <Step title="Label a few items yourself">
          Before inviting anyone, label a handful of items to confirm the schema reads the way you intended.
        </Step>
        <Step title="Review and export">
          When annotators submit, resolve disagreements in <D to="review">Consensus &amp; review</D>, check the
          agreement numbers in <D to="statistics">Statistics</D>, and export.
        </Step>
      </Steps>
    </>
  )
}

export function Datasets() {
  return (
    <>
      <H2 id="create">Creating a dataset</H2>
      <p>
        Choose <strong>Add dataset</strong> from the dashboard. A dataset has a unique name, an optional
        description, a data type and an access setting.
      </p>
      <Table
        head={['Data type', 'What goes in it']}
        rows={[
          ['Image dataset', 'Image files, labelled one image at a time.'],
          ['Audio dataset', 'Audio clips, with a waveform view for time-aligned answers.'],
          ['Text dataset', 'Text records, typically rows of a CSV; each row is one item.'],
          ['Multi-modal dataset', 'Items that combine more than one medium, such as an image with accompanying text.']
        ]}
      />
      <Callout>Dataset names must be unique in your workspace; you will be asked to pick another if one is taken.</Callout>

      <H2 id="access">Who can see a dataset</H2>
      <p>Each dataset has an access type, changed later under <strong>Settings → Access management</strong>.</p>
      <Table
        head={['Access', 'Meaning']}
        rows={[
          ['Private', 'Only you (the creating administrator) can open it.'],
          ['Specific users', 'Only the users you list can open it.'],
          ['Public', 'Anyone with an account in the workspace can open it.']
        ]}
      />
      <p>
        Assignment is separate from access: an annotator works on a <strong>clone</strong> of the dataset that is
        created for them (see <D to="assigning">Assigning work</D>), so access controls who can browse the
        source, not who is labelling.
      </p>

      <H2 id="settings">Dataset settings</H2>
      <ul>
        <li><strong>Basic information</strong> — name, description and data type.</li>
        <li><strong>Access management</strong> — the access type above.</li>
        <li>
          <strong>Consensus annotation</strong> — whether items are labelled by more than one annotator so agreement
          can be measured. See <D to="review">Consensus &amp; review</D>.
        </li>
        <li><strong>Consensus review</strong> — which users may act as reviewers when annotators disagree.</li>
      </ul>

      <H2 id="delete">Deleting a dataset</H2>
      <p>
        Deleting is permanent and asks for confirmation. Clones created for annotators are separate datasets, so
        deleting a source does not remove work already done in its clones — delete those individually if you
        mean to.
      </p>
    </>
  )
}

export function Schema() {
  return (
    <>
      <H2 id="fields">Field types</H2>
      <p>The schema is the list of questions an annotator answers for every item. Each question is a field.</p>
      <Table
        head={['Field', 'Use it for', 'Options']}
        rows={[
          ['Text input', 'Short free text: a name, a code, a phrase.', 'Placeholder, max length'],
          ['Long text (textarea)', 'Notes, transcriptions, longer descriptions.', 'Placeholder, max length'],
          ['Number', 'Counts, measurements, scores.', 'Minimum, maximum'],
          ['Date picker', 'A date visible in the item.', 'Minimum and maximum date'],
          ['Dropdown selection', 'One value from a longer list.', 'Options, default'],
          ['Radio button selection', 'One value from a short list that should all be visible.', 'Options, default'],
          ['Multi-select checkboxes', 'Several values from a list.', 'Options, max selections'],
          ['Single checkbox (boolean)', 'A yes/no.', 'Default selected'],
          ['Star rating', 'A 1–N quality or confidence score.', 'Number of stars']
        ]}
      />

      <H2 id="groups">Field groups and repeats</H2>
      <p>
        Related fields can be placed in a <strong>group</strong> with its own title (for example <em>Defect
        details</em>). A group can carry a <strong>repeat count</strong> from 1 to 50, so the same set of fields
        is answered once per occurrence — one block per defect, per speaker, per product in the frame. The
        live preview beside the editor shows exactly what annotators will see.
      </p>

      <H2 id="conditional">Nested and conditional questions</H2>
      <p>
        A field can be shown only when an earlier answer matches. A typical pattern: <em>Damaged?</em> as a
        checkbox, with <em>Severity</em> nested underneath and shown only when the box is ticked. Nesting can go
        several levels deep, and agreement statistics are reported at each level (see{' '}
        <D to="statistics" hash="agreement">Statistics</D>).
      </p>
      <Callout>
        Keep the parent question unambiguous. Every conditional child inherits the disagreement of its parent:
        if two annotators differ on <em>Damaged?</em>, they will never be compared on <em>Severity</em>.
      </Callout>

      <H2 id="changes">Changing a schema after work has started</H2>
      <p>
        Annotators can propose a schema change from their workbench — a missing option, a field that should be
        optional. Proposals appear for the administrator under <strong>Schema change requests</strong>, where
        each can be <strong>approved and merged</strong> or <strong>rejected with a message</strong> to the
        annotator. Until it is merged, the annotator keeps working against the current schema.
      </p>
    </>
  )
}

export function Assigning() {
  return (
    <>
      <H2 id="clones">How assignment works: clones</H2>
      <p>
        Annotators never edit the source dataset. When you assign work, the platform creates a{' '}
        <strong>clone</strong> — an isolated copy of the items and the schema — for each annotator. They see only
        their own clone, so their answers cannot be influenced by anyone else’s. This is what makes the
        agreement numbers in <D to="statistics">Statistics</D> meaningful.
      </p>

      <H2 id="assign">Assigning annotators</H2>
      <Steps>
        <Step title="Open the dataset and choose Clone & assign" />
        <Step title="Pick the target dataset">Usually the dataset you are in; the clones are created from it.</Step>
        <Step title="Select annotators">Search by name or email and add as many as you need.</Step>
        <Step title="Set permissions">
          Each annotator receives annotation rights on their clone. Tick <strong>Consensus review</strong> for
          anyone who should also be able to review and resolve disagreements.
        </Step>
        <Step title="Confirm">Tasks are created and appear on each annotator’s Tasks page.</Step>
      </Steps>

      <H2 id="tasks">Tasks and their statuses</H2>
      <p>Every assignment is a task. The Tasks page shows each one with a status:</p>
      <Table
        head={['Status', 'Meaning']}
        rows={[
          ['Not started', 'Assigned, no items labelled yet.'],
          ['In progress', 'Some items labelled.'],
          ['Submitted', 'The annotator has finished and sent the clone for review; waiting for administrator approval.'],
          ['Rework required', 'A reviewer sent it back with notes; the annotator must fix and resubmit.'],
          ['Approved', 'Accepted by the administrator.']
        ]}
      />
      <p>
        Administrators can open any annotator’s workbench <strong>read-only</strong> to inspect progress without
        changing anything.
      </p>

      <H2 id="team">Managing the team</H2>
      <p>
        The <strong>Team</strong> page lists everyone in the workspace with their role. Administrators invite
        users, set or reset passwords, and can see who is currently active. Roles and what they permit are
        described in <D to="roles">Roles &amp; permissions</D>.
      </p>
    </>
  )
}

export function Annotating() {
  return (
    <>
      <H2 id="workbench">The workbench</H2>
      <p>
        Opening a task lands you in the workbench: the item on one side, the questions on the other, and a
        progress indicator for the clone. Move between items with the thumbnails or the next/previous
        controls. Answers save as you go.
      </p>
      <ul>
        <li><strong>Images</strong> — zoom and pan; metadata for the file is shown alongside.</li>
        <li><strong>Audio</strong> — a waveform with play/pause and scrubbing, so time-aligned answers can be checked against the sound.</li>
        <li><strong>Text</strong> — the record’s fields are shown with the questions beside them.</li>
      </ul>

      <H2 id="conditional-in-practice">Conditional questions in practice</H2>
      <p>
        Questions that depend on an earlier answer appear the moment that answer is given and disappear if it
        changes. You only ever see the questions that apply to the item in front of you.
      </p>

      <H2 id="submit">Submitting and rework</H2>
      <Steps>
        <Step title="Finish the clone">When every item has answers, submit it. The task moves to Submitted.</Step>
        <Step title="Wait for review">An administrator or reviewer checks the work (see <D to="review">Consensus &amp; review</D>).</Step>
        <Step title="Rework, if asked">
          If it comes back as <strong>Rework required</strong>, the reviewer’s note explains what to fix. Make the
          changes and submit again.
        </Step>
      </Steps>

      <H2 id="propose">Proposing a schema change</H2>
      <p>
        If a question is missing an option you keep needing, or a field does not fit the data, propose a schema
        change from the workbench. The administrator sees it under Schema change requests and either merges it or
        replies with a reason. See <D to="schema" hash="changes">Changing a schema</D>.
      </p>
    </>
  )
}

export function Review() {
  return (
    <>
      <H2 id="why">Why consensus</H2>
      <p>
        One annotator’s label tells you what they saw. Two or more independent labels tell you how reliable
        that label is. With <strong>Consensus annotation</strong> enabled on a dataset, items are labelled by
        several annotators on separate clones and the platform measures where they agree.
      </p>

      <H2 id="requests">Review requests</H2>
      <p>
        When an annotator submits a clone, a <strong>review request</strong> is created. The Review page lists
        them with who submitted, when, and from which clone. For each request a reviewer can:
      </p>
      <ul>
        <li><strong>Inspect</strong> the annotator’s workbench read-only.</li>
        <li><strong>Approve</strong> the work.</li>
        <li><strong>Request rework</strong>, with a note explaining what needs to change.</li>
        <li><strong>Reject a change request</strong>, with a reason, when the request itself is not appropriate.</li>
      </ul>

      <H2 id="resolve">Resolving disagreements</H2>
      <p>
        Where annotators gave different answers to the same question on the same item, the item is flagged as
        a <strong>conflict</strong>. Reviewers open the collaborative review grid, see each annotator’s answer
        side by side, and record the resolved answer. The dataset keeps both the original answers and the
        resolution, so agreement can be reported <em>before</em> and <em>after</em> review.
      </p>

      <H2 id="config">Consensus configuration</H2>
      <Table
        head={['Setting', 'What it controls']}
        rows={[
          ['Agreement method', 'How agreement is computed across annotators for each question.'],
          ['Allow even reviewers', 'Whether an even number of reviewers is permitted, which can produce ties that need a deciding vote.'],
          ['Consensus review (per user)', 'Which users may open the review grid and resolve conflicts. Set when assigning; see Assigning work.']
        ]}
      />
      <Callout kind="warn">
        Agreement is only as good as the independence of the annotators. Do not share clones between people, and
        do not let annotators see each other’s work before review.
      </Callout>
    </>
  )
}

export function Statistics() {
  return (
    <>
      <H2 id="compute">Computing statistics</H2>
      <p>
        Open a dataset and choose <strong>Statistics</strong>, then <strong>Compute statistics</strong>. Results
        are calculated from the current state of all clones, so recompute after new submissions or after
        resolving conflicts.
      </p>

      <H2 id="agreement">Reading the agreement numbers</H2>
      <Table
        head={['Figure', 'Meaning']}
        rows={[
          ['Agreement %', 'The share of comparable answers on which annotators agreed. Reported per question, including nested questions at each level.'],
          ['Alpha score', 'Krippendorff’s alpha for the question: agreement corrected for what chance would produce. 1.0 is perfect; values near 0 mean answers are no better than random; negative values mean systematic disagreement.'],
          ['Agreed / Conflict', 'Counts of items where annotators agreed and where they did not.'],
          ['Agreement trend', 'How agreement has moved over time, which shows whether guidance to annotators is working.'],
          ['Health score', 'A single roll-up of agreement, completion and conflict rate for the dataset.']
        ]}
      />
      <Callout>
        A high agreement percentage with a low alpha usually means the question has one dominant answer, so
        agreeing on it is easy. Trust alpha for judging whether a question is well-defined.
      </Callout>

      <H2 id="annotators">Annotator performance</H2>
      <p>
        The <strong>Annotator performance</strong> table shows, per person, items completed, their agreement with
        the group, and time taken. The <strong>Activity timeline</strong> shows when work happened. Use these to
        spot someone who needs clearer guidance — not to rank people on speed.
      </p>

      <H2 id="export">Exporting</H2>
      <p>
        <strong>Export reports</strong> downloads the statistics; the dataset’s labels export as CSV, JSON or
        Excel from the dataset page. Exports include the resolved answers where conflicts were reviewed.
      </p>
    </>
  )
}

export function Documents() {
  return (
    <>
      <H2 id="what">Annotating long documents</H2>
      <p>
        For datasets built from documents — contracts, reports, papers — the workbench shows the document beside
        the questions, so each answer can be checked against the source. Long documents are split into pages
        you can move through while the questions stay in view.
      </p>

      <H2 id="assistant">The retrieval assistant</H2>
      <p>
        An assistant panel can retrieve the passages of the current document most relevant to the question you
        are on, with links back to where they appear. It is a finding aid: it does not answer for you, and
        nothing it surfaces is recorded until you enter it.
      </p>
      <ul>
        <li><strong>Related questions</strong> — other questions in the schema that touch the same passage.</li>
        <li><strong>Coverage</strong> — which questions have been answered for this document and which remain.</li>
      </ul>

      <H2 id="models">Which model powers it</H2>
      <p>
        The assistant can run against a hosted model or a locally hosted one; administrators choose this in the
        assistant’s configuration. With a local model, document text does not leave your infrastructure.
      </p>
    </>
  )
}

export function Roles() {
  return (
    <>
      <H2 id="roles">The two roles</H2>
      <p>
        Every user is an <strong>Administrator</strong> or an <strong>Annotator</strong>. Permissions are enforced
        in the interface and at the API, so the table below is what actually happens, not a guideline.
      </p>
      <Table
        head={['Action', 'Administrator', 'Annotator']}
        rows={[
          ['Create, edit and delete datasets', 'Yes', 'No'],
          ['Define and edit the schema', 'Yes', 'Propose changes only'],
          ['Assign work (clone & assign)', 'Yes', 'No'],
          ['Label items', 'Yes, on any clone', 'Yes, on their own clone'],
          ['See other annotators’ answers', 'Yes', 'No'],
          ['Inspect a workbench read-only', 'Yes', 'No'],
          ['Approve, request rework, resolve conflicts', 'Yes; and annotators granted Consensus review', 'Only if granted Consensus review'],
          ['View statistics and export', 'Yes', 'No'],
          ['Manage users and passwords', 'Yes', 'No']
        ]}
      />

      <H2 id="rules">Rules the platform enforces</H2>
      <ul>
        <li>Annotators work only on clones; the source dataset is never edited by an annotator.</li>
        <li>An annotator cannot see another annotator’s answers before review.</li>
        <li>A submitted clone is locked until a reviewer approves it or returns it for rework.</li>
        <li>Schema changes proposed by annotators take effect only after an administrator merges them.</li>
        <li>Resolved conflicts keep the original answers; nothing is overwritten.</li>
        <li>Dataset names are unique within a workspace.</li>
      </ul>

      <H2 id="accounts">Accounts</H2>
      <p>
        Accounts are created by administrators or by sign-up with email verification. Users can reset a
        forgotten password from the login page; administrators can set an initial password for an annotator
        when inviting them. Presence — who is currently active — is visible to administrators on the Team page.
      </p>
    </>
  )
}
