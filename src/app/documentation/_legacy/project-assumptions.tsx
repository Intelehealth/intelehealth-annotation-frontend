'use client';

import { Lightbulb, Monitor, BookOpen, UserCheck, Scale, HardDrive, Wifi, FileText, Database, FlaskConical, Box, Lock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SectionPill, H2, ZoomBlock, StaggerContent, Reveal, TiltCard, tokens } from './_components';

export default function ProjectAssumptions() {
  const INK = 'var(--color-ink)';
  const INDIGO = 'var(--color-indigo)';

  return (
    <section id="project-assumptions" data-section-id="project-assumptions" className="scroll-mt-28">
      <ZoomBlock delay={0}>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-1 rounded"
            style={{ background: '#EEF1F8', color: INDIGO, fontFamily: "'IBM Plex Mono', monospace" }}>§ 05</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #D0CBBE, transparent)' }} />
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight"
          style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>
          Project Assumptions
        </h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: '#5B6478', maxWidth: '62ch' }}>
          Technical, business, and user assumptions that constrain and guide the scope of this platform engagement.
        </p>
      </ZoomBlock>

      <StaggerContent className="space-y-6" baseDelay={0.3}>
        <p className="text-gray-700 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            The following assumptions underpin this document. Any that prove incorrect should be raised as a change request.
          </p>

          {/* 5.1 */}
          <div className="mb-8">
            <H2 id="assumptions-technical" data-subsection-id="assumptions-technical" num="5.1" color="blue">Technical Assumptions</H2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Box, title: 'Container Infrastructure', desc: 'The deployment target environment supports Docker and Docker Compose. The platform is fully containerised for portability across development, staging, and production.', bg: 'bg-gray-50', iconColor: 'text-gray-600' },
                { icon: Wifi, title: 'OAuth Connectivity', desc: 'All users have access to a stable internet connection. Google OAuth and SMTP email services are reachable from the deployment environment at all times.', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
                { icon: FileText, title: 'CSV File Format', desc: 'Source data is provided in standard CSV format with a header row. JSON, Excel, and Parquet formats require additional ingestion logic and are not assumed.', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
                { icon: Database, title: 'Single Datastore', desc: 'A single MongoDB instance serves all platform data. Multi-tenant database separation and sharded cluster configurations are not assumed for the baseline deployment.', bg: 'bg-purple-50', iconColor: 'text-purple-600' },
                { icon: FlaskConical, title: 'Test Suite Continuity', desc: 'The backend automated test suite is maintained and executed as part of the deployment pipeline to prevent regressions in core business logic.', bg: 'bg-green-50', iconColor: 'text-green-600' },
                { icon: HardDrive, title: 'Local File Storage', desc: 'Uploaded CSV files are stored within the container filesystem. External cloud storage integration and large-scale blob storage are not assumed.', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
                { icon: Lock, title: 'Environment Variables', desc: 'All deployment-specific configuration — database URI, JWT secret, OAuth credentials, and SMTP settings — is provided through environment variables.', bg: 'bg-rose-50', iconColor: 'text-rose-600' },
                { icon: RefreshCw, title: 'Schema Sync Idempotency', desc: 'Schema version increments and clone synchronization operations are idempotent — reapplying the same schema change does not corrupt existing annotations or duplicate fields.', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
                { icon: CheckCircle2, title: 'Consensus Zero-Blocking', desc: 'Generate Consensus and Review Consensus pages never require annotator completion to open. Skeleton reviews are always generated, and every field/row is always visible.', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-5 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300" style={{ borderColor: 'var(--color-border)' }}>
                  <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{item.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5.2 */}
          <div className="mb-8">
            <H2 id="assumptions-business" data-subsection-id="assumptions-business" num="5.2" color="amber">Business Assumptions</H2>
            <div className="space-y-3">
              {[
                { title: 'Annotator Onboarding Authority', desc: 'The organisation has the authority to assign annotators to datasets and expects those annotators to complete assigned work within agreed timelines.', border: '#3b82f6' },
                { title: 'Supported Field Types', desc: 'The annotation schema types — text, numeric, dropdown, and repeatable group — are sufficient to capture the required labelling data for the intended AI training use cases.', border: '#a855f7' },
                { title: 'Single Admin Authority', desc: 'A single administrator role is sufficient to govern dataset creation, annotator assignment, consensus resolution, and user management within each organisation deployment.', border: '#f59e0b' },
                { title: 'Non-Regulated Data', desc: 'The annotation data does not fall under regulatory frameworks that impose additional storage, encryption, or processing requirements beyond standard security best practices.', border: '#22c55e' },
                { title: 'Two-Role Model Sufficient', desc: 'The Administrator and Annotator role model covers all required access patterns. No additional roles such as Reviewer, Supervisor, or Read-Only Auditor are required.', border: '#6366f1' },
              { title: 'Admin Consensus Authority', desc: 'The administrator has full override authority on all consensus decisions. Annotator values are treated as suggestions and the admin makes the final determination, which is recorded for audit.', border: '#10b981' },
              { title: 'Skeleton Review Availability', desc: 'Generate Consensus and Review Consensus pages must always be accessible regardless of annotation progress. The system never requires 100% completion before allowing consensus operations.', border: '#f59e0b' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-5 bg-white border rounded-2xl shadow-[0_1px_3px_rgba(11,29,51,0.06)] hover:shadow-[0_8px_24px_-12px_rgba(11,29,51,0.18)] transition-shadow duration-300" style={{ borderColor: 'var(--color-border)', borderLeft: `4px solid ${item.border}` }}>
                  <p className="text-base font-bold text-gray-900 dark:text-white flex-shrink-0 w-52">{item.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5.3 */}
          <div>
            <H2 id="assumptions-user" data-subsection-id="assumptions-user" num="5.3" color="emerald">User Assumptions</H2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Monitor, title: 'Browser & Connectivity', desc: 'Users access the platform through a current major desktop browser with a stable internet connection. Offline or intermittently connected use is not supported.', bg: 'bg-blue-50 dark:bg-blue-900/30' },
                { icon: BookOpen, title: 'Domain Familiarity', desc: 'Users have basic computer literacy and form-based interface familiarity. No prior data annotation tool experience is assumed, and the English-language interface is acceptable.', bg: 'bg-purple-50 dark:bg-purple-900/30' },
                { icon: UserCheck, title: 'Registration Timeliness', desc: 'Invited users register and complete their first login within a reasonable window. Accounts that remain in Pending status for extended periods may require administrative follow-up.', bg: 'bg-amber-50 dark:bg-amber-900/30' },
                { icon: Scale, title: 'Override Judgement', desc: 'Annotators work independently on isolated clones and do not require real-time collaboration. The administrator exercises final override authority only when conflicts arise.', bg: 'bg-green-50 dark:bg-green-900/30' },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} border border-gray-200/70 dark:border-gray-700 rounded-xl p-6 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden text-center`}>
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                    <item.icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{item.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{item.desc}</p>
                </div>
              ))}
</div>
        </div>
      </StaggerContent>
    </section>
  );
}
