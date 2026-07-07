'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

/* ============================================================
   DESIGN TOKENS — "Consulting Deliverable" system
   Ink navy / signal indigo / bronze accent / parchment ground
   ============================================================ */

export type BadgeColor = 'blue' | 'purple' | 'amber' | 'green' | 'indigo' | 'emerald' | 'cyan' | 'sky' | 'rose' | 'teal' | 'orange' | 'gray';

// Every former hue is remapped onto a disciplined enterprise palette:
// cool neutrals (ink/indigo) for structural info, bronze for emphasis,
// emerald for positive/status, rose for risk — nothing else competes with those.
export const colorMap: Record<BadgeColor, { bg: string; text: string; border: string; icon: string; solid: string }> = {
  blue:    { bg: 'bg-[#EEF1F8]',   text: 'text-[#26365E]', border: 'border-[#C9D3E8]', icon: 'text-[#3A5088]', solid: '#3A5088' },
  indigo:  { bg: 'bg-[#EBEDF9]',   text: 'text-[#2A2F6B]', border: 'border-[#CBCFEE]', icon: 'text-[#3D45A0]', solid: '#3D45A0' },
  purple:  { bg: 'bg-[#F0EBF6]',   text: 'text-[#4A2E63]', border: 'border-[#D9C8E8]', icon: 'text-[#6B4A8A]', solid: '#6B4A8A' },
  amber:   { bg: 'bg-[#FBF3E4]',   text: 'text-[#7A5417]', border: 'border-[#E9D3A3]', icon: 'text-[#B8863A]', solid: '#B8863A' },
  orange:  { bg: 'bg-[#FBF0E4]',   text: 'text-[#7A4517]', border: 'border-[#E9C7A3]', icon: 'text-[#B87A3A]', solid: '#B87A3A' },
  green:   { bg: 'bg-[#EAF4EE]',   text: 'text-[#1F5A3D]', border: 'border-[#BFE0CD]', icon: 'text-[#1F7A5C]', solid: '#1F7A5C' },
  emerald: { bg: 'bg-[#E9F5EF]',   text: 'text-[#175A42]', border: 'border-[#BBE2D0]', icon: 'text-[#1A8A62]', solid: '#1A8A62' },
  teal:    { bg: 'bg-[#E9F3F4]',   text: 'text-[#155054]', border: 'border-[#BBDEE1]', icon: 'text-[#17797F]', solid: '#17797F' },
  cyan:    { bg: 'bg-[#E9F2F6]',   text: 'text-[#154A5E]', border: 'border-[#BCDBE8]', icon: 'text-[#1C7A9C]', solid: '#1C7A9C' },
  sky:     { bg: 'bg-[#EBF1F8]',   text: 'text-[#1E4570]', border: 'border-[#C4D8ED]', icon: 'text-[#2E6CA8]', solid: '#2E6CA8' },
  rose:    { bg: 'bg-[#FAEBEC]',   text: 'text-[#7A2530]', border: 'border-[#EAC0C4]', icon: 'text-[#A8394A]', solid: '#A8394A' },
  gray:    { bg: 'bg-[#F1F0EC]',   text: 'text-[#3C4656]', border: 'border-[#DEDBD1]', icon: 'text-[#5B6478]', solid: '#5B6478' },
};

export const tokens = {
  ink: 'var(--color-ink)',
  indigo: 'var(--color-indigo)',
  bronze: 'var(--color-bronze)',
  parchment: 'var(--color-parch)',
  graphite: '#3C4656',
};

/* ------------------------------------------------------------
   Reveal — scroll-triggered rise/fade. Replaces ad-hoc motion.
   ------------------------------------------------------------ */
export function Reveal({ children, className = '', delay = 0, y = 18 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px -80px 0px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------
   ZoomBlock / StaggerContent — kept as drop-in replacements for
   the same props used across every module, but swapped from an
   infinite "breathing" pulse to a single, dignified reveal.
   ------------------------------------------------------------ */
export function ZoomBlock({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <Reveal className={className} delay={delay}>{children}</Reveal>;
}

export function StaggerContent({ children, className = '', baseDelay = 0, staggerAmount = 0.08 }: { children: React.ReactNode; className?: string; baseDelay?: number; staggerAmount?: number }) {
  const arr = React.Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px 0px -60px 0px' });
  return (
    <div className={className} ref={ref}>
      {arr.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: baseDelay + Math.min(i, 8) * staggerAmount, ease: [0.16, 1, 0.3, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------
   TiltCard — subtle mouse-tracked 3D perspective tilt.
   Used underneath the card primitives below.
   ------------------------------------------------------------ */
export function TiltCard({ children, className = '', max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), { stiffness: 300, damping: 28 });
  const rY = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), { stiffness: 300, damping: 28 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: rX, rotateY: rY, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------
   AnimatedCounter — count up when scrolled into view
   ------------------------------------------------------------ */
export function AnimatedCounter({ value, suffix = '', duration = 1.2, className = '' }: { value: number; suffix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px 0px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    let raf: number;
    const step = (t: number) => {
      if (start === null) start = t;
      const progress = Math.min((t - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return <span ref={ref} className={className}>{display}{suffix}</span>;
}

/* ------------------------------------------------------------
   Badges / pills / numbering
   ------------------------------------------------------------ */
export function SectionPill({ label, icon: Icon, color = 'blue' }: { label: string; icon?: React.ElementType; color?: BadgeColor }) {
  const c = colorMap[color];
  return (
    <div className="mb-3">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${c.bg} ${c.text} text-xs font-bold tracking-[0.08em] uppercase rounded-full border ${c.border}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
    </div>
  );
}

export function SubsectionNumber({ num, color = 'blue' }: { num: string; color?: BadgeColor }) {
  const c = colorMap[color];
  return (
    <span
      className={`w-9 h-9 rounded-md ${c.bg} ${c.text} flex items-center justify-center text-sm font-bold flex-shrink-0 border ${c.border}`}
      style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
    >
      {num}
    </span>
  );
}

export function H2({ num, children, color = 'blue', id, ...rest }: { num: string; children: React.ReactNode; color?: BadgeColor; id?: string; [key: string]: any }) {
  const c = colorMap[color];
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px 0px' });
  return (
    <motion.h2
      id={id}
      ref={ref}
      {...rest}
      initial={{ opacity: 0, x: -14 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="scroll-mt-28 text-2xl font-bold mb-4 flex items-center gap-2.5 leading-snug relative"
      style={{ fontFamily: "'Fraunces', Georgia, serif", color: tokens.ink }}
    >
      <SubsectionNumber num={num} color={color} />
      <span className="relative">
        {children}
        <span
          className="absolute -bottom-1.5 left-0 h-[2px] rounded-full"
          style={{ width: '38%', background: c.solid, opacity: 0.55 }}
        />
      </span>
    </motion.h2>
  );
}

export function H3Icon({ children, icon: Icon, color = 'blue' }: { children: React.ReactNode; icon: React.ElementType; color?: BadgeColor }) {
  const c = colorMap[color];
  return (
    <h3
      className="text-xl font-bold mb-3 flex items-center gap-2 leading-snug"
      style={{ fontFamily: "'Fraunces', Georgia, serif", color: tokens.ink }}
    >
      <Icon className={`h-4 w-4 ${c.icon}`} />
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------
   Table
   ------------------------------------------------------------ */
export function StyledTable({ headers, rows, colWidths }: {
  headers: string[];
  rows: { [key: string]: React.ReactNode }[];
  colWidths?: string[];
}) {
  const keys = headers.map(h => h.toLowerCase().replace(/\s+/g, ''));
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-x-auto rounded-2xl border shadow-[0_1px_2px_rgba(11,29,51,0.04),0_8px_24px_-12px_rgba(11,29,51,0.10)] bg-white"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: tokens.ink }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-[0.09em] text-white/90 ${colWidths?.[i] || ''}`}
                style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#F7F5EF] dark:hover:bg-[#1E293B] transition-colors even:bg-[#FBFAF6] dark:even:bg-[#151B2E]">
              {keys.map((key, j) => (
                <td key={j} className="px-4 py-2.5 text-[#3C4656] dark:text-[#CBD5E1] text-sm">{row[key] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

export function IDBadge({ id, color = 'blue' }: { id: string; color?: BadgeColor }) {
  const c = colorMap[color];
  return <span className={`inline-flex px-2 py-0.5 ${c.bg} ${c.text} text-xs font-bold rounded`} style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>{id}</span>;
}

export function StatusBadge({ label, variant = 'yes' }: { label: string; variant?: 'yes' | 'no' }) {
  const isYes = label === 'Yes' || variant === 'yes';
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${isYes ? 'bg-[#E9F5EF] dark:bg-[#064E3B] text-[#175A42] dark:text-[#6EE7B7]' : 'bg-[#FAEBEC] dark:bg-[#7F1D1D] text-[#A8394A] dark:text-[#FCA5A5]'}`}>
      {label}
    </span>
  );
}

export function TechBadge({ label }: { label: string }) {
  return <span className="inline-flex px-2 py-0.5 bg-[#EBEDF9] dark:bg-[#1E1B4B] text-[#2A2F6B] dark:text-[#A5B4FC] text-xs font-medium rounded">{label}</span>;
}

export function NFRBadge({ label }: { label: string }) {
  return <span className="inline-flex px-2 py-0.5 bg-[#E9F3F4] dark:bg-[#164E63] text-[#155054] dark:text-[#67E8F9] text-xs font-bold rounded">{label}</span>;
}

export function RoleBadge({ label, color = 'blue' }: { label: string; color?: BadgeColor }) {
  const c = colorMap[color];
  return <span className={`inline-flex px-2 py-0.5 ${c.bg} ${c.text} text-xs font-bold rounded`}>{label}</span>;
}

/* ------------------------------------------------------------
   Cards — all get a gentle 3D tilt + one-time reveal
   ------------------------------------------------------------ */
export function CheckCard({ children }: { children: React.ReactNode }) {
  return (
    <TiltCard max={4} className="flex items-start gap-2.5 p-4 bg-[#F7FBF9] dark:bg-[#0C2D1D] border border-[#CDE7D9] dark:border-[#1A5C3A] rounded-xl hover:shadow-[0_10px_24px_-14px_rgba(31,122,92,0.35)] transition-shadow">
      <CheckCircle2 className="h-4 w-4 text-[#1A8A62] dark:text-[#34D399] flex-shrink-0 mt-0.5" />
      <span className="text-base text-[#3C4656] dark:text-[#CBD5E1] leading-relaxed">{children}</span>
    </TiltCard>
  );
}

export function AlertCard({ children }: { children: React.ReactNode }) {
  return (
    <TiltCard max={4} className="flex items-start gap-2.5 p-4 bg-[#FDF7F7] dark:bg-[#2D1517] border border-[#F0CED2] dark:border-[#6B2D33] rounded-xl hover:shadow-[0_10px_24px_-14px_rgba(168,57,74,0.35)] transition-shadow">
      <AlertCircle className="h-4 w-4 text-[#A8394A] dark:text-[#FCA5A5] flex-shrink-0 mt-0.5" />
      <span className="text-base text-[#5B4A4C] dark:text-[#E2E8F0] leading-relaxed">{children}</span>
    </TiltCard>
  );
}

export function BizRuleCard({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <TiltCard max={5} className="flex items-start gap-3 p-4 bg-white border rounded-xl hover:shadow-[0_14px_30px_-16px_rgba(11,29,51,0.25)] transition-shadow duration-200" >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 mt-0.5 shadow-sm text-white"
        style={{ background: tokens.bronze, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
      >
        {num}
      </span>
      <div>
        <h4 className="font-bold text-base mb-0.5" style={{ color: tokens.ink }}>{title}</h4>
        <p className="text-sm text-[#5B6478] dark:text-[#94A3B8] leading-relaxed">{desc}</p>
      </div>
    </TiltCard>
  );
}

export function AssumptionCard({ num, children, color = 'blue' }: { num: number; children: React.ReactNode; color?: BadgeColor }) {
  const c = colorMap[color];
  return (
    <TiltCard max={5} className="flex items-start gap-3 p-4 bg-white border rounded-xl hover:shadow-[0_14px_30px_-16px_rgba(11,29,51,0.22)] transition-shadow duration-200 group" >
      <span
        className={`w-8 h-8 rounded-full ${c.bg} ${c.text} flex items-center justify-center text-base font-bold flex-shrink-0 mt-0.5 shadow-sm group-hover:scale-110 transition-transform`}
        style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
      >
        {num}
      </span>
      <div className="text-base text-[#5B6478] leading-relaxed">{children}</div>
    </TiltCard>
  );
}

export function ArrowDown() {
  return <ChevronRight className="h-5 w-5 my-0.5" style={{ color: 'var(--color-text-muted-2)', transform: 'rotate(90deg)' }} />;
}

export function ArrowRight() {
  return <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--color-text-muted-2)' }} />;
}
