import { NavLink, Link } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  LayoutDashboard,
  FolderGit2,
  Users,
  Key,
  ShieldAlert,
  Search,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useRateLimit } from "../../hooks/useRateLimit";
import { cacheService } from "../../services/cache";

interface SidebarProps {
  className?: string;
  onConnectToken: () => void;
}

const navItems = [
  { path: "/overview", label: "Overview", icon: LayoutDashboard },
  { path: "/repos", label: "Repositories", icon: FolderGit2 },
  { path: "/contributors", label: "Contributors", icon: Users },
];

export function Sidebar({ className, onConnectToken }: SidebarProps) {
  const { rateLimit, isLoading } = useRateLimit();
  const hasToken = !!cacheService.getToken();

  const [orgsInput, setOrgsInput] = useState(
    cacheService.getLastOrgs().join(", "),
  );

  const handleOrgSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!orgsInput.trim()) return;
    const orgs = orgsInput
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (orgs.length > 0) {
      cacheService.setLastOrgs(orgs);
      window.location.reload();
    }
  };

  const clearCacheAndRefresh = async () => {
    // Basic forceful refresh, could be made more elegant
    const dbs = await window.indexedDB.databases();
    for (const db of dbs) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name);
      }
    }
    window.location.reload();
  };

  return (
    <aside className={cn("bg-github-dark flex flex-col h-full", className)}>
      <div className="p-6 border-b border-github-border">
        {/* Minimalist AOSSIE Logo section */}
        <Link
          to="/"
          className="flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity"
        >
          <h1 className="text-2xl font-black tracking-tighter text-white">
            <span className="text-[var(--color-aossie-yellow)]">A</span>
            <span className="text-[var(--color-aossie-green)] font-mono">{`{}`}</span>
            <span className="text-[var(--color-aossie-yellow)]">SIE</span>
          </h1>
        </Link>
        <p className="text-xs text-github-muted font-mono tracking-widest uppercase mb-4">
          OrgExplorer
        </p>

        <form onSubmit={handleOrgSubmit} className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-github-muted" />
          <input
            type="text"
            placeholder="AOSSIE-Org, other..."
            value={orgsInput}
            onChange={(e) => setOrgsInput(e.target.value)}
            className="w-full bg-github-canvas border border-github-border rounded text-sm px-8 py-2 text-white placeholder:text-github-muted focus:outline-none focus:border-[var(--color-aossie-green)] transition-colors"
          />
        </form>
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
                  : "border-transparent text-github-muted hover:border-[var(--color-aossie-yellow)] hover:bg-github-border/10 hover:text-white",
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
              <span
                className={cn(
                  rateLimit && rateLimit.remaining < 10
                    ? "text-red-500 font-bold"
                    : "text-[var(--color-aossie-green)]",
                )}
              >
                [
                {isLoading
                  ? "..."
                  : `${rateLimit?.remaining || 0}/${rateLimit?.limit || 0}`}
                ]
              </span>
            </div>

            <div className="w-full bg-github-border h-1 flex">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  rateLimit && rateLimit.remaining / rateLimit.limit > 0.2
                    ? "bg-[var(--color-aossie-green)]"
                    : "bg-red-500",
                )}
                style={{
                  width: rateLimit
                    ? `${(rateLimit.remaining / rateLimit.limit) * 100}%`
                    : "0%",
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

            <button
              onClick={clearCacheAndRefresh}
              className="w-full mt-2 flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase tracking-widest bg-github-border/20 hover:bg-github-border/40 text-white py-2 transition-colors border border-github-border rounded"
            >
              <RefreshCw className="w-3 h-3" /> MANUAL_REFRESH
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
