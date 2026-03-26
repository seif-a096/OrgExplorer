import { useState, useEffect } from 'react';
import { githubApi } from '../../services/githubApi';
import { cacheService } from '../../services/cache';
import { GitCommit, ExternalLink } from 'lucide-react';

export function ContributorsTab() {
  const [contributors, setContributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const orgName = cacheService.getLastOrg();

  useEffect(() => {
    const fetchContributors = async () => {
      setLoading(true);
      try {
        const repos = await githubApi.getOrgRepos(orgName);
        
        // Fetch contributors for the top 10 most active repos to avoid massive limits but get a good sample
        const activeRepos = [...repos].sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()).slice(0, 10);
        
        const contributorPromises = activeRepos.map(r => githubApi.getRepoContributors(orgName, r.name).catch(() => []));
        const contributorsArrays = await Promise.all(contributorPromises);
        
        const combinedContributors: Record<string, any> = {};
        contributorsArrays.flat().forEach(c => {
          if (!c || !c.login) return;
          if (combinedContributors[c.login]) {
            combinedContributors[c.login].contributions += c.contributions;
          } else {
            combinedContributors[c.login] = { ...c };
          }
        });

        const sortedContributors = Object.values(combinedContributors)
          .sort((a: any, b: any) => b.contributions - a.contributions);
        
        setContributors(sortedContributors);
      } catch (error) {
        console.error("Failed to fetch contributors", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContributors();
  }, [orgName]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/4 bg-github-border rounded-lg"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="h-48 bg-github-border rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Top Contributors</h1>
        <p className="text-xs font-mono text-github-muted bg-github-dark px-3 py-1.5 sharp-border uppercase tracking-widest">
          Recent Activity
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {contributors.map((user, idx) => (
          <div 
            key={user.login} 
            className="bg-github-dark sharp-interactive p-6 flex flex-col items-center text-center hover:bg-github-canvas/50 transition-all group"
          >
            <div className="relative mb-4">
              <img 
                src={user.avatar_url} 
                alt={user.login} 
                className="w-20 h-20 sharp-border grayscale group-hover:grayscale-0 transition-all duration-300" 
              />
              <div className="absolute -bottom-2 -right-2 bg-[var(--color-aossie-yellow)] text-black text-xs font-bold w-7 h-7 flex items-center justify-center sharp-border">
                #{idx + 1}
              </div>
            </div>
            
            <a 
              href={user.html_url} 
              target="_blank" 
              rel="noreferrer"
              className="text-white font-bold hover:text-[var(--color-aossie-green)] flex items-center gap-1 transition-colors uppercase tracking-wider text-sm mt-2"
            >
              {user.login}
              <ExternalLink className="w-3 h-3 opacity-0 -ml-2 transition-all group-hover:opacity-100 group-hover:ml-0" />
            </a>
            
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-mono text-github-muted bg-github-canvas px-3 py-1.5 sharp-border w-full">
              <GitCommit className="w-3 h-3 text-[var(--color-aossie-green)]" />
              <span className="font-bold text-white">{user.contributions}</span> COMMITS
            </div>
          </div>
        ))}

        {contributors.length === 0 && (
          <div className="col-span-full text-center py-12 text-github-muted bg-github-dark border border-github-border rounded-xl">
            No contributors found.
          </div>
        )}
      </div>
    </div>
  );
}
