
'use client';

import { motion, Variants } from 'framer-motion';
import * as Icons from 'lucide-react';

// Animation configs for the container and pop-up icons
const containerVariants: Variants = {
  initial: {},
  hover: { 
    scale: 1.08,
    transition: { type: "spring", stiffness: 400, damping: 17 }
  }
};

const iconPopUp: Variants = {
  initial: { scale: 0, opacity: 0, y: 15 },
  hover: (i: number) => ({
    scale: 1,
    opacity: 1,
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 300,
      damping: 20,
      delay: i * 0.1, 
    }
  })
};

// Map topics to specific icons and emojis
const iconsMap: Record<string, (React.ReactNode)[]> = {
  auth: [<Icons.Lock size={16} />, <Icons.Key size={16}/>, '🔐'],
  database: [<Icons.Database size={16} />, <Icons.Server size={16} />, '💾'],
  business: [<Icons.Target size={16} />, <Icons.TrendingUp size={16} />, '🎯'],
  architecture: [<Icons.Cpu size={16} />, <Icons.Layers size={16} />, <Icons.Box size={16} />],
  solution: [<Icons.ShieldAlert size={16} />, <Icons.CheckCircle size={16} />, '✅'],
  goals: [<Icons.ClipboardCheck size={16} />, <Icons.Zap size={16} />, '🏆'],
  rules: [<Icons.GitBranch size={16} />, <Icons.RefreshCw size={16} />, '📜'],
  uiux: [<Icons.Palette size={16} />, <Icons.Eye size={16} />, <Icons.Monitor size={16} />],
  system: [<Icons.Server size={16} />, <Icons.Network size={16} />, <Icons.HardDrive size={16} />],
  assumptions: [<Icons.Lightbulb size={16} />, <Icons.AlertCircle size={16} />, '📋'],
  default: [<Icons.Info size={16} />, '✨'],
};

export function SmartParagraph({ type, title, children, className }: { type: string, title: React.ReactNode, children: React.ReactNode, className?: string }) {
  const selectedIcons = iconsMap[type] || [];

  return (
    <motion.div 
      initial="initial"
      whileHover="hover"
      variants={containerVariants}
      className={`relative p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-blue-500/10 ${className}`}
    >
      {/* Floating Icons Container */}
      <motion.div className="absolute -top-4 right-5 flex gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-md">
        {selectedIcons.map((icon, idx) => (
          <motion.span variants={iconPopUp} custom={idx} key={idx} className="text-blue-500 dark:text-blue-400 text-sm flex items-center">
            {icon}
          </motion.span>
        ))}
      </motion.div>
      
      {typeof title === 'string' ? (
        <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-100">{title}</h3>
      ) : title}

      <div className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}
