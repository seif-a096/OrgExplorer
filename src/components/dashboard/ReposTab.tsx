import { useState, useEffect, useMemo } from 'react';
import { Search, Star, GitFork, AlertCircle, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { githubApi } from '../../services/githubApi';
import { cacheService } from '../../services/cache';
import { cn } from '../../lib/utils';
import { RepoDetailPanel } from './RepoDetailPanel';

const ITEMS_PER_PAGE = 10;

export function ReposTab() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [sortField, setSortField] = useState<'stargazers_count' | 'forks_count' | 'open_issues_count' | 'updated_at'>('stargazers_count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const orgName = cacheService.getLastOrg();

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      try {
        const data = await githubApi.getOrgRepos(orgName);
        setRepos(data);
      } catch (error) {
        console.error("Failed to fetch repos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, [orgName]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  const filteredAndSortedRepos = useMemo(() => {
    return repos
      .filter(repo => repo.name.toLowerCase().includes(search.toLowerCase()) || 
                      (repo.description && repo.description.toLowerCase().includes(search.toLowerCase())) ||
                      (repo.language && repo.language.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'updated_at') {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [repos, search, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedRepos.length / ITEMS_PER_PAGE);
  const paginatedRepos = filteredAndSortedRepos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to first page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-github-border rounded-none"></div>
        <div className="h-[600px] bg-github-border rounded-none"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase">Repositories <span className="text-github-muted text-lg font-mono ml-2">[{repos.length}]</span></h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-github-muted" />
          <input
            type="text"
            placeholder="Find a repository..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sharp-interactive bg-github-canvas pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-aossie-yellow)]"
          />
        </div>
      </div>

      <div className="bg-github-dark sharp-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-github-canvas border-b border-github-border text-xs text-github-muted uppercase tracking-widest font-mono">
                <th className="px-6 py-4 font-bold">Repository</th>
                <th 
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort('stargazers_count')}
                >
                  <div className="flex items-center gap-1">Stars <ArrowUpDown className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", sortField === 'stargazers_count' && 'opacity-100 text-[var(--color-aossie-yellow)]')} /></div>
                </th>
                <th 
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort('forks_count')}
                >
                  <div className="flex items-center gap-1">Forks <ArrowUpDown className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", sortField === 'forks_count' && 'opacity-100 text-[var(--color-aossie-green)]')} /></div>
                </th>
                <th 
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort('open_issues_count')}
                >
                  <div className="flex items-center gap-1">Issues <ArrowUpDown className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", sortField === 'open_issues_count' && 'opacity-100 text-red-400')} /></div>
                </th>
                <th className="px-6 py-4 font-bold">Language</th>
                <th 
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort('updated_at')}
                >
                  <div className="flex items-center gap-1">Last Updated <ArrowUpDown className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", sortField === 'updated_at' && 'opacity-100 text-white')} /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-github-border">
              {paginatedRepos.map((repo) => (
                <tr 
                  key={repo.id} 
                  className="hover:bg-github-canvas/50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedRepo(repo)}
                >
                  <td className="px-6 py-4">
                    <span className="text-[var(--color-aossie-green)] font-bold text-base mb-1 block uppercase tracking-wide">
                      {repo.name}
                    </span>
                    {repo.description && (
                      <p className="text-github-muted text-sm line-clamp-1">{repo.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-github-text">
                    <div className="flex items-center gap-1.5 font-mono"><Star className="w-4 h-4 text-github-muted" /> {repo.stargazers_count}</div>
                  </td>
                  <td className="px-6 py-4 text-github-text">
                    <div className="flex items-center gap-1.5 font-mono"><GitFork className="w-4 h-4 text-github-muted" /> {repo.forks_count}</div>
                  </td>
                  <td className="px-6 py-4 text-github-text">
                    <div className="flex items-center gap-1.5 font-mono"><AlertCircle className="w-4 h-4 text-github-muted" /> {repo.open_issues_count}</div>
                  </td>
                  <td className="px-6 py-4 text-github-text">
                    {repo.language ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold font-mono tracking-wider border border-github-border text-white">
                        {repo.language}
                      </span>
                    ) : (
                      <span className="text-github-muted text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-github-muted text-sm font-mono">
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {paginatedRepos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-github-muted font-mono uppercase tracking-widest">
                    No repositories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-github-border bg-github-canvas flex items-center justify-between">
            <span className="text-sm font-mono text-github-muted">
              SHOWING <span className="text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> TO <span className="text-white">{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedRepos.length)}</span> OF <span className="text-white">{filteredAndSortedRepos.length}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 sharp-interactive bg-github-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 sharp-interactive bg-github-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <RepoDetailPanel 
        repo={selectedRepo} 
        onClose={() => setSelectedRepo(null)} 
      />
    </div>
  );
}
