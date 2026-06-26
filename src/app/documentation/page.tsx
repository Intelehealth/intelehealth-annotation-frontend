'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Search,
  ChevronRight,
  Shield,
  User,
  Settings,
  Database,
  Wand2,
  FileCode,
  Sparkles,
} from 'lucide-react';

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    {
      title: 'Platform Overview',
      icon: Sparkles,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
      description: 'Learn the foundational architecture of DataAnnotate, an enterprise-grade collaborative data labeling platform.',
      content: (
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <p>
            DataAnnotate is designed to bridge the gap between dataset managers (<strong>Admins</strong>) and labelers (<strong>Annotators</strong>). The system operates on an isolated-workspace model to ensure labeling bias is eliminated and consensus can be calculated mathematically.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-150 mt-2">
            <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-2">Key Lifecycle Flow</h5>
            <ol className="list-decimal list-inside space-y-2 font-medium">
              <li>Admin seeds or uploads a parent CSV dataset.</li>
              <li>Admin configures fields (schema definitions) for labeling.</li>
              <li>Admin assigns 2–5 annotators to the dataset.</li>
              <li>The system generates isolated <strong>Physical Clones</strong> of the dataset for each annotator.</li>
              <li>Annotators complete their tasks on their independent clones.</li>
              <li>Admin reviews progress, generates consensus, resolves conflicts, and exports final data.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      title: 'Admin Operations',
      icon: Shield,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      description: 'Manage users, seed datasets, assign tasks, and maintain data integrity.',
      content: (
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <div>
            <h4 className="font-bold text-gray-950 text-sm mb-1">User Lifecycle & Visibility (Option A)</h4>
            <p>
              To maintain strict operational security, only users explicitly invited/created by an administrator can register or sign up (both locally and via Google OAuth). Uninvited users are immediately rejected at registration with a <code>403 Forbidden</code> error, ensuring they never clutter the user list.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-950 text-sm mb-1">Field Configuration & Schema Locking</h4>
            <p>
              When a dataset has a single CSV upload, admins are free to add, modify, or delete fields. However, as soon as a <strong>second CSV batch</strong> is uploaded, the schema is automatically <strong>locked</strong>. This prevents schema mismatches and guards against corruption of existing annotations across different batches.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-950 text-sm mb-1">Physical Dataset Cloning</h4>
            <p>
              When you assign annotators, the backend creates a physical clone of the dataset, including deep copies of the merged rows and resets annotation configurations for each annotator. This ensures complete isolation.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Consensus & Review Workflow',
      icon: Wand2,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'How to generate consensus, review annotator discrepancies, and perform admin overrides.',
      content: (
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <p>
            Admins can generate and review consensus at <strong>any time</strong>—even if only a single row has been completed by one annotator. There is no need to wait for 100% completion.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="p-3 bg-green-50/30 border border-green-200 rounded-xl">
              <h5 className="font-bold text-green-800 text-xs uppercase mb-1">Auto-Agreement</h5>
              <p className="text-xs text-green-700">
                If all assigned annotators agree on an annotation value, the system automatically resolves it and marks the consensus status as <strong>Agreed (Green)</strong>.
              </p>
            </div>
            <div className="p-3 bg-red-50/30 border border-red-250 rounded-xl">
              <h5 className="font-bold text-red-800 text-xs uppercase mb-1">Disagreements & Conflict</h5>
              <p className="text-xs text-red-700">
                If annotators provide different values, it is marked as a <strong>Conflict (Red)</strong>. If some have annotated and others have not, it is marked as <strong>Partial (Yellow)</strong>.
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-950 text-sm mb-1">Admin Overrides (The Golden Rule)</h4>
            <p>
              The administrator's decision is absolute. Even if all annotators agreed (e.g., two annotators chose "Positive"), the admin can override the consensus value to a different option (e.g., "Neutral") or write a custom value. The admin override is autosaved instantly to the database and will be reflected in the final exported dataset.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Annotator Guidelines',
      icon: User,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
      description: 'Help annotators label data efficiently using the workbench and repeatable field groups.',
      content: (
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <p>
            Annotators log in to see their specific assignments. Clicking on a task opens the **Annotation Workbench**, displaying original CSV data on the left and input fields on the right.
          </p>
          <div>
            <h4 className="font-bold text-gray-950 text-sm mb-1">Repeatable Field Groups</h4>
            <p>
              For advanced tasks (e.g., object detection, entity extraction), fields can be grouped. Clicking the <strong>"Repeat Group"</strong> button allows annotators to dynamically duplicate the entire group of child fields inline, capturing multiple annotations for a single row without leaving their workspace.
            </p>
          </div>
          <div className="bg-teal-50/30 rounded-xl p-3 border border-teal-200/60">
            <h5 className="font-bold text-teal-800 text-xs uppercase mb-1">Best Practice Tip</h5>
            <p className="text-xs text-teal-700">
              Encourage annotators to use keyboard shortcuts and Tab keys to jump between fields, maximizing throughput and reducing fatigue during long labeling sessions.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: 'Developer API Reference',
      icon: FileCode,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      description: 'Integrate other services with DataAnnotate using our standard JSON REST API.',
      content: (
        <div className="space-y-4 text-sm text-gray-600 font-mono leading-relaxed">
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-800">1. Authenticate Request</p>
            <div className="bg-gray-950 text-gray-100 text-[11px] p-3 rounded-lg overflow-x-auto border border-gray-800">
              POST /auth/login<br />
              Headers: {'{ "Content-Type": "application/json" }'}<br />
              Body: {'{ "email": "admin@gmail.com", "password": "securepassword" }'}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-800">2. Enforce Invited-Only User Check (Option A)</p>
            <div className="bg-gray-950 text-gray-100 text-[11px] p-3 rounded-lg overflow-x-auto border border-gray-800">
              POST /auth/register<br />
              Returns 403 if email is not found in the administrator invitation database.
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-800">3. Resolve Consensus Field</p>
            <div className="bg-gray-950 text-gray-100 text-[11px] p-3 rounded-lg overflow-x-auto border border-gray-800">
              PATCH /datasets/:datasetId/consensus-reviews/:reviewId<br />
              Body: {'{ "fieldName": "sentiment", "finalDecision": "Neutral", "resolvedBy": "admin_id" }'}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = sections.filter(
    (sec) =>
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/60 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-950">System Documentation</h1>
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Comprehensive guide to the DataAnnotate platform workflows, architectures, and APIs
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full h-9 pl-9 pr-4 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs hover:border-gray-300 transition-colors"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Table of Contents / Main Grid */}
          <div className="space-y-6">
            {filteredSections.length === 0 ? (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-xs">
                <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No documentation matches your search.</p>
              </div>
            ) : (
              filteredSections.map((sec, idx) => {
                const IconComponent = sec.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200/90 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    {/* Section Header */}
                    <div className="p-5 border-b border-gray-100 flex items-start gap-4">
                      <div className={cn('p-2.5 rounded-xl border shrink-0', sec.color)}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-gray-950 text-base flex items-center gap-2">
                          {sec.title}
                          <ChevronRight className="h-4 w-4 text-gray-300" />
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">{sec.description}</p>
                      </div>
                    </div>

                    {/* Section Content */}
                    <div className="p-6 bg-gray-50/20">{sec.content}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
