# Dashboard and visit-page definitions

Ticket C1 (2026-11-02): doctor-facing screens carry labels, values and states only. The explanations below
were removed from the site and are kept here for the team. Section titles are as on the AI dashboard.

## Base populations (short labels on the site)

- **visits (follow-ups excluded / included)**: the AI-metric base. Follow-up visits (the doctor's only diagnosis is
  "Follow-up visit") are left out by default; the dashboard switch puts them back.
- **visits with an AI list ("scored")**: visits where the AI returned a diagnosis list; the % for top 1 / 3 / 5 are of these.
- **TTx cases**: visits where the AI suggested medicines; a case counts once in each row that applies
  (one case can have an unchanged and a changed medicine).
- **All visits · follow-ups included**: Turnaround, Annotation, mismatch type, reject reasons, AI model table.

## Follow-up visits (T3)

A follow-up note only records whether the patient got and took the medicines and how they feel; it has no
symptoms or history for the AI to diagnose or treat from, so AI suggestions on follow-ups are not counted by
default. In "Included" mode expect lower Dx and TTx rates. They will be counted once follow-ups capture a proper
patient story. On the visit page a follow-up-only visit needs no verdict (Dx none, TTx optional).

## Turnaround time

Every visit counts, follow-ups included. Times come from OpenMRS: visit start, when the doctor opened the visit
note, and when the prescription was shared. Medians and the 90th percentile are shown because a few visits stay
open for days. TAT with vs without AI cannot be measured, as every visit now has AI.

## Tests, advice, referrals, follow-up

Entered by the doctor. The AI does not suggest tests, advice, referrals or follow-up yet; once it does, the same
picked / changed / not used comparison appears (generic treatment-plan item model, backend treatment-plan.ts).

## Picks and equivalents

A pick is the doctor clicking the AI diagnosis or typing the same name; a clinically equivalent but differently
worded diagnosis counts as not picked in the strict top 1 / 3 / 5. "Equivalent suggested, not picked" (D3) is a
separate metric: the AI listed a diagnosis matching the doctor's own by a named rule (backend dx-equivalence.ts).

## Removed section descriptions (verbatim, for reference)

- **Diagnosis (DDx)** (dashboard.tsx): Scored over visits with an AI list (<value>; see the note at the bottom). A pick is the doctor clicking the AI diagnosis or typing the same name; a clinically equivalent but differently worded diagnosis counts as not picked.
- **Treatment (TTx)** (dashboard.tsx): Base: TTx cases = <visits, follow-ups excluded or included per the switch> where the AI suggested medicines. Counted per case: a case counts once in each row that applies (one case can have an unchanged and a changed medicine).
- **Diagnosis: top 1 / 3 / 5 over time** (dashboard.tsx): % of visits with an AI list (<visits, follow-ups excluded or included per the switch>), by <day / week / month>
- **Treatment: medicines picked over time** (dashboard.tsx): % of TTx cases (<visits, follow-ups excluded or included per the switch> with AI medicines), by <day / week / month>
- **Paediatric vs adult" description={`Paediatric** (dashboard.tsx): Paediatric = age <value> or under. Base: <visits, follow-ups excluded or included per the switch>; visits without an age are counted only in “All”.
- **Top 1 / 3 / 5 by ${grain** (dashboard.tsx): Visits = <visits, follow-ups excluded or included per the switch>; Scored = those with an AI list; % are of Scored
- **Top 1 / 3 / 5 by doctor and day** (dashboard.tsx): Visits = <visits, follow-ups excluded or included per the switch>; % are of visits with an AI list
- **Report by diagnosis** (dashboard.tsx): Grouped by the doctor's final diagnosis (<visits, follow-ups excluded or included per the switch>): how often the AI list contained it, and how often the doctor added a diagnosis of their own; % are of visits with an AI list
- **Equivalent suggested, not picked** (dashboard.tsx): Separate from the strict top 1/3/5: the AI listed a diagnosis that matches the doctor's own by one of the rules below, but the doctor did not pick it. Base: <value> visits with an AI list.
- **Type of change** (dashboard.tsx): AI medicines the doctor kept but changed (<visits, follow-ups excluded or included per the switch>), compared field by field with the prescription. One medicine can have several changes.
- **Medicines doctors added, by diagnosis** (dashboard.tsx): Doctor's diagnosis → medicine the doctor added (not suggested by the AI) · <visits, follow-ups excluded or included per the switch>
- **Report by AI medicine** (dashboard.tsx): Each AI-suggested medicine, <visits, follow-ups excluded or included per the switch>; % are of the times it was suggested
- **Medicines the doctor added** (dashboard.tsx): Not suggested by the AI (<visits, follow-ups excluded or included per the switch>). Most common dose, frequency and duration as prescribed (count in brackets).
- **AI use by doctor** (dashboard.tsx): Consulting doctor in OpenMRS, by pseudo id. Visits = <visits, follow-ups excluded or included per the switch>; Dx % are of visits with an AI list; TTx % are of TTx cases.
- **Paediatric vs adult" description="Every visit** (dashboard.tsx): Every visit in the period, follow-ups included
- **New vs follow-up visits** (dashboard.tsx): Follow-up = the doctor's only diagnosis is “Follow-up visit” (same rule as the AI metrics) · every visit in the period
- **By doctor: new vs follow-up** (dashboard.tsx): Consulting doctor in OpenMRS, by pseudo id · every visit in the period
- **By doctor" description="Consulting doctor in OpenMRS, by pseudo id · every visit** (dashboard.tsx): Consulting doctor in OpenMRS, by pseudo id · every visit in the period, follow-ups included
- **By month** (dashboard.tsx): Every visit, follow-ups included
- **By doctor and month** (dashboard.tsx): Every visit, follow-ups included
- **By day** (dashboard.tsx): Every visit, follow-ups included
- **Referred to** (dashboard.tsx): Destination, with the facility type it was referred to · <visits, follow-ups excluded or included per the switch>
- **Most common advice** (dashboard.tsx): As written in the prescription; the local-language version is shown underneath · <visits, follow-ups excluded or included per the switch>
- **Mismatch type** (dashboard.tsx): Every visit in the period, follow-ups included
- **Doctor rejected the AI (stated reason)** (dashboard.tsx): Every visit in the period, follow-ups included
- **Why the equivalent AI suggestion was not picked** (dashboard.tsx): Annotators' answers on visits flagged “Equivalent suggested, not picked”
- **By AI model / engine** (dashboard.tsx): From the AI call log; visits without a log entry are grouped as “Not logged” · every visit in the period, follow-ups included
- **Mismatches and annotator verdicts by doctor** (insights.tsx): Doctor who saw the patient in OpenMRS, shown by pseudo id. Visits and mismatches = every visit in the period, follow-ups included; verdicts count only reviewed visits. AI agreement rates (follow-ups excluded) are in the table above.
- **Annotator progress** (insights.tsx): <value> annotations made in this range, counted by the day they were made · <value> mismatches from this range still open
- **Is the AI's confidence label calibrated?** (insights.tsx): Every AI suggestion (ranks 1-5) on visits with an AI list (<follow-up mode>), grouped by the likelihood label the AI gave it. If the labels mean something, “Doctor picked it” should fall from High to Low. Label spellings are merged (e.g. “Moderate to High” → Moderate-High).
- **Most common misses** (insights.tsx): AI's #1 → the doctor's diagnosis, when the doctor's diagnosis was not in the AI top 5 · visits with an AI list, <follow-up mode>
- **Most common “right list, wrong order”** (insights.tsx): AI's #1 → the doctor's diagnosis, when the doctor picked the AI's #2–#5 · visits with an AI list, <follow-up mode>
- **When the AI says X first, how often does the doctor agree?** (insights.tsx): Per AI #1 diagnosis, most frequent first · visits with an AI list, <follow-up mode>
- **By specialty** (insights.tsx): Adults (General Physician) vs children (Pediatrician) and others · visits with an AI list, <follow-up mode>
