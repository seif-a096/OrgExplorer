import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

interface F1RaceProps {
  contributors: Contributor[];
  className?: string;
}

const CAR_COLORS = [
  'bg-red-500', // Ferrari red
  'bg-[#00D2BE]', // Mercedes 'petronas' green
  'bg-blue-600', // Alpine / Williams
  'bg-[#FF8700]', // McLaren orange
  'bg-[#F596C8]', // Racing point pink
];

export function F1Race({ contributors, className }: F1RaceProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Take top 5 for the race
  const racers = contributors.slice(0, 5);
  const maxContributions = Math.max(...racers.map(r => r.contributions), 1);

  if (racers.length === 0) {
    return (
      <div className={cn("bg-github-dark border border-github-border rounded-xl p-4 flex flex-col items-center justify-center h-full min-h-[200px]", className)}>
        <Flag className="w-8 h-8 text-github-muted mb-2" />
        <p className="text-github-muted text-sm">No racers (contributors) found.</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-github-dark border border-github-border rounded-xl p-6 relative overflow-visible", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[var(--color-aossie-yellow)]" />
          RACE: TOP ACTIVITY
        </h3>
        <Flag className="w-5 h-5 text-white" />
      </div>

      <div className="relative border-l-4 border-r-4 border-dashed border-github-border px-2 py-4 space-y-6">
        {/* Track lines representation */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_99%,rgba(255,255,255,0.05)_100%)] bg-[length:10%_100%] pointer-events-none" />
        
        {racers.map((racer, index) => {
          // Calculate width percentage relative to the max contributor (winner gets 100%)
          const progress = (racer.contributions / maxContributions) * 100;
          const carColor = CAR_COLORS[index % CAR_COLORS.length];

          return (
            <div 
              key={racer.login} 
              className="relative w-full h-[40px] flex items-center group"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Lane */}
              <div className="absolute inset-0 bg-github-border/30" />
              
              {/* Box Car & Avatar */}
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: index * 0.1 }}
                className={cn("h-full relative flex items-center justify-end border-r-2 border-white", carColor)}
              >
                {/* Avatar (Driver) */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 sharp-border bg-github-canvas z-10 cursor-pointer overflow-hidden transition-transform">
                  <img src={racer.avatar_url} alt={racer.login} className="w-full h-full object-cover grayscale hover:grayscale-0" />
                </div>
              </motion.div>

              {/* Popup Details */}
              <AnimatePresence>
                {hoveredIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute -top-10 right-0 bg-github-dark sharp-border px-3 py-1 z-50 flex items-center gap-2 whitespace-nowrap"
                    style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--color-aossie-yellow)]">{racer.login}</span>
                    <span className="text-xs font-mono text-github-muted border-l border-github-border pl-2">{racer.contributions} CMTS</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      
      {/* Starting line visual */}
      <div className="absolute left-6 top-16 bottom-6 w-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz4KPHJlY3QgeD0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzAwMCIvPgo8cmVjdCB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIi8+Cjwvc3ZnPg==')] opacity-50 z-0"></div>
    </div>
  );
}
