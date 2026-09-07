'use client';

import { Network, Monitor, Server, HardDrive, Database, Search, BarChart3, CheckCircle2, ExternalLink, ArrowRight, BookOpen, Shield, FileText, Users, Lock, GitBranch, Cpu, Package } from 'lucide-react';
import { SectionPill, H2, ZoomBlock, StaggerContent, Reveal, TiltCard, tokens } from './_components';

export default function SystemDependencies() {
  const INK = 'var(--color-ink)';
  const INDIGO = 'var(--color-indigo)';

  return (
    <section id="system-dependencies" data-section-id="system-dependencies" className="scroll-mt-28">
      <ZoomBlock delay={0}>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2 py-1 rounded"
            style={{ background: '#EEF1F8', color: INDIGO, fontFamily: "'IBM Plex Mono', monospace" }}>§ 06</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #D0CBBE, transparent)' }} />
        </div>
        <h1 className="text-4xl font-bold mb-3 leading-tight"
          style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>
          System Dependencies
        </h1>
        <p className="text-lg leading-relaxed mb-10" style={{ color: '#5B6478', maxWidth: '62ch' }}>
          External APIs, third-party libraries, frameworks, backend services, and database technologies the platform depends on.
        </p>
      </ZoomBlock>

      <StaggerContent className="space-y-6" baseDelay={0.3}>
        {/* 6.1 */}
          <H2 num="6.1" color="blue" id="deps-apis" data-subsection-id="deps-apis">External APIs</H2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            All external services, libraries, and infrastructure components DataAnnotate depends on are catalogued below.
          </p>

          <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-white text-lg font-bold">G</span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">Google OAuth 2.0</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Authentication provider for Google-based login and identity verification</p>
                </div>
              </div>
              <span className="inline-flex px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200/60 flex-shrink-0">
                Passport Google Strategy
              </span>
            </div>

          <div className="mt-3 bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-gray-400 font-mono">.env</span>
            </div>
            <pre className="px-4 py-3 text-xs font-mono leading-relaxed text-gray-100 overflow-x-auto whitespace-pre-wrap">
GOOGLE_CLIENT_ID=••••••••••••••••••••••.apps.googleusercontent.com{'\n'}
GOOGLE_CLIENT_SECRET=GOCSPX-••••••••••••••••••••••{'\n'}
GOOGLE_CALLBACK_URL=&lt;YOUR_BACKEND_URL&gt;/auth/google/callback
            </pre>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 rounded-lg px-4 py-2.5 text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">Future integrations (cloud storage, webhooks, LLM providers) are scoped for v2.0.</span>
          </div>
          {/* 6.2 */}
          <H2 num="6.2" color="purple" id="deps-libraries" data-subsection-id="deps-libraries">Third-Party Libraries</H2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            All external services, libraries, and infrastructure components DataAnnotate depends on are catalogued below.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Frontend</span>
                <div className="flex-1 h-px bg-blue-200/40 dark:bg-blue-800/40" />
              </div>
              <div className="space-y-2">
                {[
                  { name: 'React', desc: 'UI component library', color: 'bg-blue-100 text-blue-700' },
                  { name: 'Tailwind CSS', desc: 'Utility-first styling framework', color: 'bg-blue-100 text-blue-700' },
                  { name: 'ShadCN UI', desc: 'Accessible component primitives', color: 'bg-blue-100 text-blue-700' },
                  { name: 'Axios', desc: 'HTTP client for API calls', color: 'bg-blue-100 text-blue-700' },
                  { name: 'React Hook Form', desc: 'Performant form state management', color: 'bg-blue-100 text-blue-700' },
                  { name: 'Zod', desc: 'Type-safe schema validation', color: 'bg-blue-100 text-blue-700' },
                ].map((lib, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-lg shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-base font-bold text-gray-900 dark:text-white flex-shrink-0">{lib.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{lib.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Backend</span>
                <div className="flex-1 h-px bg-purple-200/40 dark:bg-purple-800/40" />
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Passport', desc: 'Authentication strategy middleware', color: 'bg-purple-100 text-purple-700' },
                  { name: 'Mongoose', desc: 'MongoDB ODM with schema validation', color: 'bg-purple-100 text-purple-700' },
                  { name: 'class-validator', desc: 'Decorator-based payload validation', color: 'bg-purple-100 text-purple-700' },
                  { name: 'Swagger', desc: 'OpenAPI documentation generation', color: 'bg-purple-100 text-purple-700' },
                  { name: 'Jest', desc: 'Unit and integration test runner', color: 'bg-purple-100 text-purple-700' },
                ].map((lib, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-lg shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
                    <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="text-base font-bold text-gray-900 dark:text-white flex-shrink-0">{lib.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{lib.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* 6.3 */}
          <H2 num="6.3" color="amber" id="deps-frameworks" data-subsection-id="deps-frameworks">Frameworks</H2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            All external services, libraries, and infrastructure components DataAnnotate depends on are catalogued below.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl p-6 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
              <div className="flex flex-col items-center text-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shadow-sm">
                  <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">Next.js 15</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Frontend Framework</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {['Routing', 'SSR', 'Build Tooling'].map((chip, i) => (
                  <span key={i} className="inline-flex px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold rounded-full">{chip}</span>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl p-6 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
              <div className="flex flex-col items-center text-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shadow-sm">
                  <Server className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">NestJS</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Backend Framework</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {['Dependency Injection', 'Decorators', 'Module Organisation'].map((chip, i) => (
                  <span key={i} className="inline-flex px-3 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 text-xs font-bold rounded-full">{chip}</span>
                ))}
              </div>
            </div>
          </div>
          {/* 6.4 */}
          <H2 num="6.4" color="green" id="deps-backend" data-subsection-id="deps-backend">Backend Dependencies</H2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            All external services, libraries, and infrastructure components DataAnnotate depends on are catalogued below.
          </p>

          <div className="space-y-3">
            {[
              { title: 'MongoDB Connection', desc: 'A running MongoDB instance must be reachable at the configured connection string for all data persistence operations.' },
              { title: 'ConsensusReview Collection', desc: 'A dedicated MongoDB collection stores per-row consensus calculations, field reviews, annotator comparisons, and admin override decisions for every dataset.' },
              { title: 'JWT Secret', desc: 'A cryptographically strong secret key must be provided via environment variable for token signing and verification.' },
              { title: 'Google OAuth Credentials', desc: 'Valid OAuth 2.0 client ID and client secret must be registered in the Google Cloud Console and configured in the environment.' },
              { title: 'ConsensusService Module', desc: 'NestJS module implementing the consensus generation algorithm (3-stage evaluation, branch mismatch detection, row classification) and review lifecycle (NOT_STARTED through OVERRIDDEN).' },
              { title: 'Schema Synchronization Engine', desc: 'Handles schema version increments, clone synchronization, answer preservation for compatible fields, PENDING_UPDATE marking for incompatible fields, field archiving, and updates to Generate Consensus, Review Consensus, Exports, and Statistics.' },
              { title: 'Node.js Runtime', desc: 'The NestJS backend requires Node.js runtime with support for ES2022 features and decorator metadata reflection.' },
              { title: 'Container Networking', desc: 'Docker Compose must be configured so the frontend, backend, and database containers can communicate over an internal bridge network.' },
            ].map((dep, i) => (
              <div key={i} className="flex items-start gap-3 p-5 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 rounded-lg shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden" style={{ borderLeft: '3px solid #22c55e' }}>
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{dep.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{dep.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* 6.5 */}
          <H2 num="6.5" color="cyan" id="deps-database" data-subsection-id="deps-database">Database Dependencies</H2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 text-lg transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">
            All external services, libraries, and infrastructure components DataAnnotate depends on are catalogued below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Database, title: 'MongoDB Server', desc: 'A MongoDB 8 instance — either standalone or replica set — must be available and configured as the primary data store.', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-900/30', iconColor: 'text-purple-600' },
              { icon: BarChart3, title: 'Query Indexes', desc: 'Database indexes on frequently queried fields — including dataset ID, user ID, and clone status — are required for acceptable read performance at scale.', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-900/30', iconColor: 'text-blue-600' },
              { icon: HardDrive, title: 'Backup & Restore', desc: 'Regular mongodump snapshots and a documented restore procedure must be in place for disaster recovery and data integrity compliance.', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/30', iconColor: 'text-amber-600' },
              { icon: Search, title: 'Admin Tooling', desc: 'A MongoDB GUI tool such as Compass or MongoSH is recommended for direct database inspection during development and troubleshooting.', bg: 'bg-gray-50', darkBg: 'dark:bg-gray-800/30', iconColor: 'text-gray-600', badge: 'Dev Only' },
            ].map((item, i) => (
              <div key={i} className="relative bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl p-5 shadow-sm transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg cursor-default transform-gpu overflow-hidden">
                {item.badge && (
                  <span className="absolute top-3 right-3 inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-full">{item.badge}</span>
                )}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.darkBg} flex items-center justify-center`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{item.title}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-transform duration-200 ease-in-out hover:scale-[1.02] transform-gpu cursor-default">{item.desc}</p>
              </div>
            ))}
          </div>


      </StaggerContent>
    </section>
  );
}
