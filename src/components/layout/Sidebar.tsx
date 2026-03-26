import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Users, 
  Key,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useRateLimit } from '../../hooks/useRateLimit';
import { cacheService } from '../../services/cache';

interface SidebarProps {
  className?: string;
  onConnectToken: () => void;
}

const navItems = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/repos', label: 'Repositories', icon: FolderGit2 },
  { path: '/contributors', label: 'Contributors', icon: Users },
];

export function Sidebar({ className, onConnectToken }: SidebarProps) {
  const { rateLimit, isLoading } = useRateLimit();
  const hasToken = !!cacheService.getToken();

  return (
    <aside className={cn("bg-github-dark flex flex-col h-full", className)}>
      <div className="p-6 border-b border-github-border">
        { /* Minimalist AOSSIE Logo section */ }
        <Link to="/" className="flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity">
          <h1 className="text-2xl font-black tracking-tighter text-white">
            <span className="text-[var(--color-aossie-yellow)]">A</span>
            <span className="text-[var(--color-aossie-green)] font-mono">{`{}`}</span>
            <span className="text-[var(--color-aossie-yellow)]">SIE</span>
          </h1>
        </Link>
        <p className="text-xs text-github-muted font-mono tracking-widest uppercase">OrgExplorer</p>
      </div>

      <nav className="flex-1 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors duration-200 border-l-2",
                isActive 
                  ? "border-[var(--color-aossie-green)] bg-github-border/30 text-white" 
                  : "border-transparent text-github-muted hover:border-[var(--color-aossie-yellow)] hover:bg-github-border/10 hover:text-white"
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-github-border">
        <div className="sharp-border bg-github-canvas p-4 tracking-tight">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-github-muted uppercase">
              API Status
            </span>
            {hasToken ? (
              <span className="flex items-center gap-1 text-xs font-mono text-[var(--color-aossie-green)]">
                <Key className="w-3 h-3" /> TOKEN_OK
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-mono text-[var(--color-aossie-yellow)]">
                <ShieldAlert className="w-3 h-3" /> ANONYMOUS
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-github-text">RATE_LIMIT</span>
              <span className={cn(
                rateLimit && rateLimit.remaining < 10 ? "text-red-500 font-bold" : "text-[var(--color-aossie-green)]"
              )}>
                [{isLoading ? '...' : `${rateLimit?.remaining || 0}/${rateLimit?.limit || 0}`}]
              </span>
            </div>
            
            <div className="w-full bg-github-border h-1 flex">
              <div 
                className={cn(
                  "h-full transition-all duration-300",
                  rateLimit && (rateLimit.remaining / rateLimit.limit) > 0.2 ? "bg-[var(--color-aossie-green)]" : "bg-red-500"
                )}
                style={{ 
                  width: rateLimit ? `${(rateLimit.remaining / rateLimit.limit) * 100}%` : '0%' 
                }}
              />
            </div>
            {!hasToken && (
              <button 
                onClick={onConnectToken}
                className="w-full mt-4 text-xs font-mono font-bold uppercase tracking-widest sharp-interactive bg-transparent text-white py-2"
              >
                CONNECT_TOKEN
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
