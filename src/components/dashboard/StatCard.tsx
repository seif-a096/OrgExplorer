import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass?: string;
  delay?: number;
}

export function StatCard({ title, value, icon: Icon, colorClass = "text-github-text", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-github-dark sharp-interactive p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-github-muted mb-2">{title}</p>
          <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
        </div>
        <div className={cn("p-3 sharp-border bg-github-canvas", colorClass)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
