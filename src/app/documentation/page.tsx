'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, ExternalLink, ChevronDown, Search, BookOpen, Database, Sun, Moon,
  LayoutDashboard, ClipboardList, BarChart3, Palette, Lightbulb, SlidersHorizontal,
  Code2, CheckSquare, ChevronRight
} from 'lucide-react';
import PlatformOverview from './platform-overview';
import FunctionalRequirements from './functional-requirements';
import SuccessMetrics from './success-metrics';
import UiUxDesign from './ui-ux-design';
import ProjectAssumptions from './project-assumptions';
import SystemDependencies from './system-dependencies';

const GITHUB_REPO_URL = 'https://github.com/anomalyco/dyno-annotation-platform';

const INK     = 'var(--color-ink)';
const INDIGO  = 'var(--color-indigo)';
const BRONZE  = 'var(--color-bronze)';
const PARCH   = 'var(--color-parch)';

const sections = [
  { id: 'platform-overview',        label: 'Platform Overview',        icon: LayoutDashboard },
  { id: 'functional-requirements',  label: 'Functional Requirements',  icon: ClipboardList },
  { id: 'success-metrics',          label: 'Success Metrics',          icon: BarChart3 },
  { id: 'ui-ux-design',             label: 'UI / UX Design',           icon: Palette },
  { id: 'project-assumptions',      label: 'Project Assumptions',      icon: Lightbulb },
  { id: 'system-dependencies',      label: 'System Dependencies',      icon: SlidersHorizontal },
];

const subsectionMap: Record<string, { label: string; id: string }[]> = {
  'platform-overview': [
    { label: 'Project Overview',        id: 'project-overview' },
    { label: 'Business Purpose',        id: 'business-purpose' },
    { label: 'Objectives',              id: 'objectives' },
    { label: 'Scope',                   id: 'scope' },
    { label: 'Business Workflow',       id: 'business-workflow' },
  ],
  'functional-requirements': [
    { label: 'Functional Requirements', id: 'fr-intro' },
    { label: 'Non-Functional Req.',     id: 'fr-nonfunctional' },
    { label: 'User Roles',              id: 'fr-roles' },
    { label: 'Business Rules',          id: 'fr-rules' },
  ],
  'success-metrics': [
    { label: 'Acceptance Criteria',     id: 'sm-acceptance' },
  ],
  'ui-ux-design': [
    { label: 'High-Level Architecture', id: 'design-architecture' },
    { label: 'System Components',       id: 'design-components' },
    { label: 'Database Design',         id: 'design-database' },
    { label: 'API Flow',                id: 'design-api' },
    { label: 'Module Breakdown',        id: 'design-modules' },
    { label: 'UI Flow',                 id: 'design-ui' },
    { label: 'Data Flow',               id: 'design-data' },
    { label: 'Product Documentation',   id: 'design-product-docs' },
  ],
  'project-assumptions': [
    { label: 'Technical Assumptions',   id: 'assumptions-technical' },
    { label: 'Business Assumptions',    id: 'assumptions-business' },
    { label: 'User Assumptions',        id: 'assumptions-user' },
  ],
  'system-dependencies': [
    { label: 'External APIs',           id: 'deps-apis' },
    { label: 'Third-Party Libraries',   id: 'deps-libraries' },
    { label: 'Frameworks',              id: 'deps-frameworks' },
    { label: 'Backend Dependencies',    id: 'deps-backend' },
    { label: 'Database Dependencies',   id: 'deps-database' },
  ],
};

const parentMap: Record<string, string> = {};
sections.forEach(s => {
  (subsectionMap[s.id] || []).forEach(sub => { parentMap[sub.id] = s.id; });
});

/* ─── 3D Layered Document Stack ─────────────────────────── */
function DocStack3D() {
  const layers = [
    { z: 0,    bg: '#0B1D33', label: 'System Dependencies',     color: '#6B8FBF' },
    { z: -20,  bg: '#162F50', label: 'Functional Requirements', color: '#7BA0CC' },
    { z: -40,  bg: '#1C3D63', label: 'Success Metrics',         color: '#8AB0D8' },
    { z: -60,  bg: '#234A78', label: 'Platform Overview',       color: '#99BDE0' },
  ];

  return (
    <motion.div
      className="relative w-56 h-36 select-none"
      style={{ perspective: 900, perspectiveOrigin: '50% 50%' }}
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateX: [8, 12, 8], rotateY: [-14, -8, -14] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-full h-full"
      >
        {layers.map((l, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-xl border flex flex-col justify-end p-3"
            style={{
              transform: `translateZ(${l.z}px)`,
              background: l.bg,
              borderColor: 'rgba(255,255,255,0.09)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
              backfaceVisibility: 'hidden',
            }}
            initial={{ opacity: 0, translateZ: l.z - 24 }}
            animate={{ opacity: i === 0 ? 1 : 0.72 - i * 0.08, translateZ: l.z }}
            transition={{ delay: 0.5 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col gap-1 mb-2">
              {[1,0.6,0.8,0.4].map((w, j) => (
                <div key={j} className="h-[3px] rounded-full" style={{ width: `${w*100}%`, background: l.color, opacity: 0.35 + j*0.05 }} />
              ))}
            </div>
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: l.color, fontFamily: "'IBM Plex Mono', monospace" }}>
              {l.label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ─── Hero Banner ─────────────────────────────────────────── */
function HeroBanner({ onNavigate }: { onNavigate: (id: string) => void }) {
  const stats = [
    { value: '6', label: 'Modules' },
    { value: '48', label: 'Requirements' },
    { value: '120+', label: 'Acceptance Criteria' },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-12"
      style={{ background: '#0B1D33' }}
    >
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${BRONZE}, #D4A85A, ${BRONZE})` }} />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10 p-10 lg:p-14">
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-[1.1] tracking-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              DataAnnotate<br />
              <span style={{ color: '#7B9FD4' }}>Platform</span>
            </h1>
            <p className="text-base text-white/55 leading-relaxed max-w-md mb-8">
              Enterprise annotation platform documentation — architecture, functional requirements, acceptance criteria, and system design.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('platform-overview')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-lg"
                style={{ background: INDIGO }}
              >
                Start Reading <ChevronRight className="h-4 w-4" />
              </button>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-[1.03]"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.14)' }}
              >
                GitHub <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>
        </div>

        <div className="flex-shrink-0">
          <DocStack3D />
        </div>
      </div>

      <div className="relative z-10 border-t px-10 lg:px-14 py-5 flex flex-wrap gap-6 lg:gap-12" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
            className="flex items-baseline gap-2"
          >
            <span className="text-2xl font-bold text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{s.value}</span>
            <span className="text-xs text-white/40 uppercase tracking-[0.1em]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.label}</span>
          </motion.div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-white/30 tracking-[0.08em] uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Confidential · Internal Use Only</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar Content (shared between desktop fixed & mobile overlay) ─── */
function SidebarContent({
  activeSection, activeSub, expandedSection, hoveredSection,
  onNavigate, onToggleSection, onSectionHover, onSetActiveSub, INK, INDIGO
}: {
  activeSection: string;
  activeSub: string;
  expandedSection: string;
  hoveredSection: string | null;
  onNavigate: (id: string) => void;
  onToggleSection: (id: string) => void;
  onSectionHover: (id: string | null) => void;
  onSetActiveSub: (id: string) => void;
  INK: string;
  INDIGO: string;
}) {
  const navRef = useRef<HTMLElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = navRef.current?.querySelectorAll('[role="treeitem"]');
    if (!items?.length) return;
    const current = Array.from(items).findIndex(el => el === document.activeElement);
    if (current === -1) return;
    const id = sections[current]?.id;
    if (!id) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        (items[(current + 1) % items.length] as HTMLElement).focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        (items[(current - 1 + items.length) % items.length] as HTMLElement).focus();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if ((subsectionMap[id] || []).length > 0) onToggleSection(id);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if ((subsectionMap[id] || []).length > 0 && expandedSection === id) {
          onToggleSection(id);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onNavigate(id);
        break;
    }
  };

  return (
    <>
      <div className="px-5 pt-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-4"
          style={{ color: 'var(--color-text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
          Documentation
        </p>
      </div>

      <nav
        ref={navRef}
        role="tree"
        aria-label="Documentation sections"
        onMouseLeave={() => onSectionHover(null)}
        onKeyDown={handleKeyDown}
        className="px-3"
      >
        {sections.map((section, idx) => {
          const Icon = section.icon;
          const subs = subsectionMap[section.id] || [];
          const isActive = activeSection === section.id;
          const isExpanded = hoveredSection === section.id || expandedSection === section.id;

          return (
            <div
              key={section.id}
              className="mb-0.5"
              onMouseEnter={() => onSectionHover(section.id)}
            >
              <div
                role="treeitem"
                aria-expanded={subs.length > 0 ? isExpanded : undefined}
                aria-selected={isActive}
                tabIndex={idx === 0 ? 0 : -1}
                className={`sidebar-link w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left ${isActive ? 'active' : ''}`}
                style={{ color: isActive ? INDIGO : 'var(--color-text-secondary)' }}
              >
                {isActive && (
                  <span className="absolute left-3 w-0.5 h-5 rounded-r-full" style={{ background: INDIGO }} />
                )}
                <button
                  onClick={() => onNavigate(section.id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left self-stretch"
                  style={{ color: 'inherit', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="truncate">{section.label}</span>
                </button>
                {subs.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSection(section.id); }}
                    className="flex items-center justify-center p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9C4B4' }}
                    aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                  >
                    <ChevronDown size={13} strokeWidth={2.5}
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                )}
              </div>

              {subs.length > 0 && (
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden ml-4 mr-1 mt-0.5 mb-1"
                    >
                      <div className="border-l pl-3 py-1 flex flex-col gap-0.5" style={{ borderColor: 'var(--color-border)' }}>
                        {subs.map(sub => (
                          <button
                            key={sub.id}
                            role="treeitem"
                            tabIndex={-1}
                            onClick={() => { onNavigate(sub.id); onSetActiveSub(sub.id); }}
                            className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all hover:bg-[#EEF1F8] hover:text-[#2643B0] ${activeSub === sub.id ? 'bg-[#EEF1F8] text-[#2643B0] font-semibold' : ''}`}
                            style={{ color: activeSub === sub.id ? '#2643B0' : '#7A8296', fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function DocumentationPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeSection, setActiveSection]       = useState('platform-overview');
  const [activeSub, setActiveSub]               = useState('');
  const [expandedSection, setExpandedSection]   = useState('');
  const [hoveredSection, setHoveredSection]     = useState<string | null>(null);
  const [searchQuery, setSearchQuery]           = useState('');
  const [darkMode, setDarkMode]                 = useState(false);
  const [matchCount, setMatchCount]             = useState(0);
  const [highlightIndex, setHighlightIndex]     = useState(-1);
  const contentRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* ── Restore sidebar state from localStorage ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('docs-sidebar');
      if (saved) {
        const { section, sub } = JSON.parse(saved);
        if (section && sections.some(s => s.id === section)) {
          setExpandedSection(section);
          setActiveSection(section);
        }
        if (sub && parentMap[sub]) {
          setActiveSub(sub);
        }
      }
    } catch {}
    if (window.innerWidth >= 1024) setSidebarCollapsed(false);
  }, []);

  /* ── Persist sidebar state ── */
  useEffect(() => {
    try {
      localStorage.setItem('docs-sidebar', JSON.stringify({
        section: expandedSection,
        sub: activeSub,
      }));
    } catch {}
  }, [expandedSection, activeSub]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const q = searchQuery.toLowerCase().trim();
  const matchingSections = q
    ? sections.filter(s =>
        s.label.toLowerCase().includes(q) ||
        (subsectionMap[s.id] || []).some(sub => sub.label.toLowerCase().includes(q))
      ).map(s => s.id)
    : sections.map(s => s.id);
  const hasResults = q ? matchingSections.length > 0 : true;

  /* ── Hover with delay to prevent flickering ── */
  const handleSectionHover = useCallback((id: string | null) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (id === null) {
      hoverTimeoutRef.current = setTimeout(() => setHoveredSection(null), 200);
    } else {
      setHoveredSection(id);
    }
  }, []);

  const toggleSection = useCallback((id: string) => {
    setExpandedSection(prev => prev === id ? '' : id);
    setHoveredSection(prev => prev === id ? null : prev);
  }, []);

  /* ── Navigation: scroll + update URL ── */
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

  const scrollToSection = useCallback((id: string) => {
    if (window.innerWidth < 1024) setSidebarCollapsed(true);
    const parentId = parentMap[id] || id;
    setActiveSection(parentId);
    setExpandedSection(parentId);
    if (parentMap[id]) {
      setActiveSub(id);
    } else {
      setActiveSub('');
    }
    setPendingScroll(id);
    history.pushState(null, '', `#${id}`);
  }, []);

  /* ── Scroll after content mounts ── */
  useEffect(() => {
    if (pendingScroll) {
      const id = pendingScroll;
      setPendingScroll(null);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [pendingScroll]);

  /* ── IntersectionObserver for active section tracking ── */
  useEffect(() => {
    const allIds = [
      ...sections.map(s => s.id),
      ...Object.values(subsectionMap).flat().map(sub => sub.id),
    ];

    const sectionVisibility: Record<string, number> = {};
    let rafPending = false;

    function updateActive() {
      rafPending = false;
      let bestId = 'platform-overview';
      let bestRatio = 0;
      for (const [sid, ratio] of Object.entries(sectionVisibility)) {
        if (ratio > bestRatio) { bestRatio = ratio; bestId = sid; }
      }
      if (bestRatio > 0) {
        const parentId = parentMap[bestId] || bestId;
        setActiveSection(prev => prev !== parentId ? parentId : prev);
        if (parentMap[bestId]) {
          setActiveSub(prev => prev !== bestId ? bestId : prev);
        } else {
          setActiveSub(prev => prev !== '' ? '' : prev);
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => { sectionVisibility[entry.target.id] = entry.intersectionRatio; });
        if (!rafPending) { rafPending = true; requestAnimationFrame(updateActive); }
      },
      { rootMargin: '-80px 0px -40% 0px', threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5] }
    );

    allIds.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });

    return () => observer.disconnect();
  }, []);

  /* ── Auto-expand parent when activeSub changes ── */
  useEffect(() => {
    if (activeSub) {
      const parentId = parentMap[activeSub];
      if (parentId) setExpandedSection(parentId);
    }
  }, [activeSub]);

  useEffect(() => {
    if (q && matchingSections.length > 0) {
      setExpandedSection(matchingSections[0]);
      setTimeout(() => scrollToSection(matchingSections[0]), 100);
    }
  }, [q]);

  /* search highlight */
  useEffect(() => {
    const main = contentRef.current;
    if (!main) return;
    main.querySelectorAll('mark.sh').forEach(m => {
      const p = m.parentNode;
      if (p) { p.replaceChild(document.createTextNode(m.textContent || ''), m); p.normalize(); }
    });
    if (!q) { setMatchCount(0); setHighlightIndex(-1); return; }
    requestAnimationFrame(() => {
      const iter = document.createNodeIterator(main, NodeFilter.SHOW_TEXT, null);
      const nodes: Text[] = [];
      let n: Text | null;
      while ((n = iter.nextNode() as Text | null)) {
        const p = n.parentNode as HTMLElement | null;
        if (n.textContent?.toLowerCase().includes(q) && p && p.nodeName !== 'MARK' && p.nodeName !== 'SCRIPT' && p.nodeName !== 'STYLE') nodes.push(n);
      }
      let count = 0;
      nodes.forEach(node => {
        const p = node.parentNode as HTMLElement | null;
        if (!p) return;
        const text = node.textContent || '';
        const lower = text.toLowerCase();
        let pos = 0;
        const frag = document.createDocumentFragment();
        while (true) {
          const idx = lower.indexOf(q, pos);
          if (idx === -1) { if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos))); break; }
          count++;
          if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
          const mark = document.createElement('mark');
          mark.className = 'sh';
          mark.textContent = text.slice(idx, idx + q.length);
          frag.appendChild(mark);
          pos = idx + q.length;
        }
        p.replaceChild(frag, node);
      });
      setMatchCount(count);
      setHighlightIndex(-1);
      if (count > 0) setTimeout(() => main?.querySelector('mark.sh')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    });
  }, [q]);

  useEffect(() => {
    document.querySelectorAll('mark.sh').forEach((el, i) => el.classList.toggle('sh-active', i === highlightIndex));
  }, [highlightIndex]);

  useEffect(() => {
    if (!matchCount) return;
    function kd(e: KeyboardEvent) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const hs = document.querySelectorAll('mark.sh');
      if (!hs.length) return;
      e.preventDefault();
      setHighlightIndex(prev => {
        let next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
        if (next < 0) next = hs.length - 1;
        if (next >= hs.length) next = 0;
        hs[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return next;
      });
    }
    document.addEventListener('keydown', kd);
    return () => document.removeEventListener('keydown', kd);
  }, [matchCount]);

  return (
    <div className="min-h-screen transition-colors duration-200" style={{ background: PARCH, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');

        :root {
          color-scheme: light;
          --color-ink: #0B1D33;
          --color-indigo: #2643B0;
          --color-bronze: #B8863A;
          --color-parch: #F6F4EF;
          --color-sidebar-bg: #FDFCF9;
          --color-card-bg: #FFFFFF;
          --color-border: #E4E1D6;
          --color-border-light: #D8D4C8;
          --color-text-secondary: #5B6478;
          --color-text-muted: #A09885;
          --color-text-muted-2: #C9C4B4;
          --color-header-bg: rgba(246,244,239,0.94);
          --color-surface: #FFFFFF;
        }
        .dark {
          color-scheme: dark;
          --color-ink: #E1E7F5;
          --color-indigo: #7C9EE0;
          --color-bronze: #D4A76A;
          --color-parch: #0E1320;
          --color-sidebar-bg: #151B2E;
          --color-card-bg: #1C2440;
          --color-border: #2A3456;
          --color-border-light: #3A466E;
          --color-text-secondary: #8899C0;
          --color-text-muted: #5E73A0;
          --color-text-muted-2: #435885;
          --color-header-bg: rgba(14,19,32,0.94);
          --color-surface: #1C2440;
        }

        mark.sh        { background: #FDE68A; color: inherit; border-radius: 2px; padding: 0 1px; }
        mark.sh-active { background: #FBBF24; box-shadow: 0 0 0 2px #F59E0B; }
        .dark mark.sh        { background: #78350F; color: #FEF9C3; }
        .dark mark.sh-active { background: #92400E; box-shadow: 0 0 0 2px #F59E0B; }

        ::-webkit-scrollbar       { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #C9C4B4; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #A09885; }
        .dark ::-webkit-scrollbar-thumb { background: #3A466E; }
        .dark ::-webkit-scrollbar-thumb:hover { background: #5E73A0; }

        .dark .bg-white { background-color: var(--color-card-bg) !important; }
        .dark .text-gray-700,
        .dark .text-gray-600 { color: #CBD5E1 !important; }
        .dark .text-gray-500 { color: #94A3B8 !important; }
        .dark .text-gray-400 { color: #64748B !important; }

        .sidebar-link { transition: all 0.18s ease; }
        .sidebar-link:hover { background: rgba(38,67,176,0.07); color: var(--color-indigo); }
        .sidebar-link.active { background: rgba(38,67,176,0.10); color: var(--color-indigo); font-weight: 600; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ── Top Navbar ─────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-md border-b flex items-center"
        style={{ background: 'var(--color-header-bg)', borderColor: 'var(--color-border)', boxShadow: '0 1px 0 rgba(11,29,51,0.06)' }}
      >
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
      style={{ background: '#0B1D33' }}
              aria-label="Toggle sidebar"
            >
              <Database className="h-4 w-4 text-white" />
            </button>
            <span className="hidden sm:block text-base font-bold tracking-tight" style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>
              DataAnnotate
            </span>
          </div>

          <div className="relative flex-1 max-w-sm mx-4">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documentation…"
              className="w-full h-9 pl-8 pr-8 text-sm rounded-lg border bg-white/70 dark:bg-[#1C2440]/70 focus:bg-white dark:focus:bg-[#1C2440] focus:outline-none transition-all"
              style={{ borderColor: 'var(--color-border-light)', color: INK }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5" style={{ color: 'var(--color-text-muted)' }}>
                <X className="h-4 w-4" />
              </button>
            )}
            {searchQuery && matchCount > 0 && (
              <span className="absolute right-8 top-2.5 text-[11px] font-bold" style={{ color: BRONZE, fontFamily: "'IBM Plex Mono', monospace" }}>
                {matchCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.02]"
              style={{ color: INK, borderColor: 'var(--color-border-light)', background: 'var(--color-card-bg)' }}
            >
              <ExternalLink className="h-3.5 w-3.5" /> GitHub
            </a>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all hover:scale-105"
              style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-card-bg)', color: INK }}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="flex pt-16 min-h-screen">

        {/* ── Desktop Sidebar (always rendered, fixed) ─── */}
        <motion.aside
          animate={{ width: sidebarCollapsed ? 0 : 264 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="hidden lg:block fixed left-0 top-16 bottom-0 z-40 overflow-hidden"
          style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-sidebar-bg)' }}
        >
          <div className="w-[264px] h-full flex flex-col">
            <div className="flex-1 overflow-y-auto pb-4">
              <SidebarContent
                activeSection={activeSection}
                activeSub={activeSub}
                expandedSection={expandedSection}
                hoveredSection={hoveredSection}
                onNavigate={scrollToSection}
                onToggleSection={toggleSection}
                onSectionHover={handleSectionHover}
                onSetActiveSub={setActiveSub}
                INK={INK}
                INDIGO={INDIGO}
              />
            </div>
            <div className="px-3 py-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="sidebar-link w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <LayoutDashboard size={16} strokeWidth={2} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </motion.aside>

        {/* ── Mobile Sidebar (overlay) ─── */}
        <AnimatePresence initial={false}>
          {!sidebarCollapsed && (
            <motion.aside
              key="mobile-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 264, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-0 top-16 bottom-0 z-40 overflow-hidden lg:hidden"
              style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-sidebar-bg)' }}
            >
              <div className="w-[264px] h-full flex flex-col">
                <div className="flex-1 overflow-y-auto pb-4">
                  <SidebarContent
                    activeSection={activeSection}
                    activeSub={activeSub}
                    expandedSection={expandedSection}
                    hoveredSection={hoveredSection}
                    onNavigate={scrollToSection}
                    onToggleSection={toggleSection}
                    onSectionHover={handleSectionHover}
                    onSetActiveSub={setActiveSub}
                    INK={INK}
                    INDIGO={INDIGO}
                  />
                </div>
                <div className="px-3 py-3 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="sidebar-link w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <LayoutDashboard size={16} strokeWidth={2} />
                    <span>Back to Dashboard</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* overlay on mobile */}
        {!sidebarCollapsed && (
          <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarCollapsed(true)} />
        )}

        {/* ── Main Content ─── */}
        <main
          ref={contentRef}
          className="flex-1 min-w-0"
          style={{
            marginLeft: !sidebarCollapsed ? (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 264 : 0) : 0,
            transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14">

            <HeroBanner onNavigate={id => scrollToSection(id)} />

            {hasResults ? (
              <div className="space-y-0">
                {matchingSections.includes('platform-overview') && (
                  <><PlatformOverview />{matchingSections.filter(s => s !== 'platform-overview').length > 0 && <SectionDivider />}</>
                )}
                {matchingSections.includes('functional-requirements') && (
                  <><FunctionalRequirements />{matchingSections.filter(s => !['platform-overview','functional-requirements'].includes(s)).length > 0 && <SectionDivider />}</>
                )}
                {matchingSections.includes('success-metrics') && (
                  <><SuccessMetrics />{matchingSections.filter(s => !['platform-overview','functional-requirements','success-metrics'].includes(s)).length > 0 && <SectionDivider />}</>
                )}
                {matchingSections.includes('ui-ux-design') && (
                  <><UiUxDesign searchQuery={searchQuery} />{matchingSections.filter(s => !['platform-overview','functional-requirements','success-metrics','ui-ux-design'].includes(s)).length > 0 && <SectionDivider />}</>
                )}
                {matchingSections.includes('project-assumptions') && (
                  <><ProjectAssumptions />{matchingSections.filter(s => !['platform-overview','functional-requirements','success-metrics','ui-ux-design','project-assumptions'].includes(s)).length > 0 && <SectionDivider />}</>
                )}
                {matchingSections.includes('system-dependencies') && <SystemDependencies />}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: '#EEF1F8' }}>
                  <Search className="h-7 w-7" style={{ color: INDIGO }} />
                </div>
                <p className="text-lg font-semibold mb-1" style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>No results found</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No documentation matches "{searchQuery}"</p>
              </motion.div>
            )}

            <footer className="mt-20 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: INDIGO }}>
                  <Database className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold" style={{ color: INK, fontFamily: "'Fraunces', Georgia, serif" }}>DataAnnotate</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted-2)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Product Documentation · v1.0 · Confidential & Internal
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="my-16 flex items-center gap-4">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border-light) 40%, var(--color-border-light) 60%, transparent)' }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-bronze)', opacity: 0.6 }} />
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border-light) 40%, var(--color-border-light) 60%, transparent)' }} />
    </div>
  );
}
