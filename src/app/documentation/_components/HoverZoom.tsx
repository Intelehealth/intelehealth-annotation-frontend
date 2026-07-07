
'use client';

import { motion } from 'framer-motion';

export function HoverZoom({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={false}
      whileHover={{ 
        scale: 1.08, 
        transition: { type: "spring", stiffness: 400, damping: 17 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
