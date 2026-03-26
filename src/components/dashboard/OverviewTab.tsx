import { useEffect, useState } from 'react';
import { BookMarked, Star, GitFork, AlertCircle } from 'lucide-react';
import { StatCard } from './StatCard';
import { LanguageChart } from './LanguageChart';
import { F1Race } from './F1Race';
import { githubApi } from '../../services/githubApi';
import { cacheService } from '../../services/cache';

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Ruby: '#701516',
  HTML: '#e34c26',
  CSS: '#563d7c',
  C: '#555555',
  'C++': '#f34b7d',
  Lua: '#000080',
};

export function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ repos: 0, stars: 0, forks: 0, issues: 0 });
  const [languages, setLanguages] = useState<any[]>([]);
  const [racers, setRacers] = useState<any[]>([]);
  const [topRepos, setTopRepos] = useState<any[]>([]);
  const [orgData, setOrgData] = useState<any>(null);
  
  const orgName = cacheService.getLastOrg();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [org, repos] = await Promise.all([
          githubApi.getOrgDetails(orgName),
          githubApi.getOrgRepos(orgName)
        ]);

        setOrgData(org);
        
        let totalStars = 0;
        let totalForks = 0;
        let totalIssues = 0;
        const langCounts: Record<string, number> = {};

        repos.forEach((repo: any) => {
          totalStars += repo.stargazers_count;
          totalForks += repo.forks_count;
          totalIssues += repo.open_issues_count;
          if (repo.language) {
            langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
          }
        });

        setStats({ repos: repos.length, stars: totalStars, forks: totalForks, issues: totalIssues });

        const formattedLangs = Object.entries(langCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({
            name,
            value,
            color: LANGUAGE_COLORS[name] || '#8b949e'
          }));
        
        setLanguages(formattedLangs);

        // Top repos
        const sortedRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count);
        setTopRepos(sortedRepos.slice(0, 5));

        // Get contributors from top 5 most recently active repos to avoid hitting API limit quickly
        const activeRepos = [...repos].sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()).slice(0, 5);
        
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

        const topContributors = Object.values(combinedContributors)
          .sort((a: any, b: any) => b.contributions - a.contributions)
          .slice(0, 5);
        
        setRacers(topContributors);

      } catch (error) {
        console.error("Failed to fetch overview data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgName]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-64 bg-github-border rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-github-border rounded-xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[380px] bg-github-border rounded-xl lg:col-span-1"></div>
          <div className="h-[380px] bg-github-border rounded-xl lg:col-span-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        {orgData?.avatar_url && (
          <img src={orgData.avatar_url} alt={orgName} className="w-16 h-16 sharp-border" />
        )}
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{orgData?.name || orgName}</h1>
          {orgData?.description && <p className="text-github-muted font-mono text-sm mt-1 tracking-wide">{orgData.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Repositories" value={stats.repos} icon={BookMarked} colorClass="text-[var(--color-aossie-yellow)]" delay={0.1} />
        <StatCard title="Total Stars" value={stats.stars.toLocaleString()} icon={Star} colorClass="text-yellow-400" delay={0.2} />
        <StatCard title="Total Forks" value={stats.forks.toLocaleString()} icon={GitFork} colorClass="text-[var(--color-aossie-green)]" delay={0.3} />
        <StatCard title="Open Issues" value={stats.issues.toLocaleString()} icon={AlertCircle} colorClass="text-red-400" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <LanguageChart data={languages} />
        
        <div className="sharp-border bg-github-dark p-6 flex flex-col h-[380px]">
          <F1Race contributors={racers} className="border-none p-0 flex-1 overflow-y-auto" />
        </div>
      </div>

      <div className="sharp-border bg-github-dark p-6">
        <h3 className="text-lg font-black tracking-tight text-white mb-6 flex items-center gap-2 uppercase">
          <Star className="w-5 h-5 text-[var(--color-aossie-yellow)]" /> Top 5 Starred Repositories
        </h3>
        <div className="space-y-4">
          {topRepos.map(repo => (
            <div key={repo.id} className="flex items-center justify-between p-4 bg-github-canvas sharp-interactive">
              <div>
                <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-[var(--color-aossie-green)] hover:text-white transition-colors font-bold text-lg uppercase tracking-wider block">
                  {repo.name}
                </a>
                <p className="text-github-muted font-mono text-xs mt-1">{repo.description || 'No description provided.'}</p>
              </div>
              <div className="flex items-center gap-6 text-xs font-mono font-bold text-github-muted">
                {repo.language && (
                  <span className="flex items-center gap-1.5 uppercase">
                    <span className="w-3 h-3 sharp-border" style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || '#8b949e' }}></span>
                    {repo.language}
                  </span>
                )}
                <span className="flex items-center gap-1"><Star className="w-4 h-4" /> {repo.stargazers_count}</span>
                <span className="flex items-center gap-1"><GitFork className="w-4 h-4" /> {repo.forks_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
