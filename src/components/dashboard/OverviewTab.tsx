import { useEffect, useState } from "react";
import {
  BookMarked,
  Star,
  GitFork,
  AlertCircle,
  Activity,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";
import { StatCard } from "./StatCard";
import { LanguageChart } from "./LanguageChart";
import { githubApi } from "../../services/githubApi";
import { cacheService } from "../../services/cache";

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Ruby: "#701516",
  HTML: "#e34c26",
  CSS: "#563d7c",
  C: "#555555",
  "C++": "#f34b7d",
  Lua: "#000080",
};

export function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    repos: 0,
    stars: 0,
    forks: 0,
    issues: 0,
  });
  const [languages, setLanguages] = useState<any[]>([]);
  const [activitySeries, setActivitySeries] = useState<any[]>([]);
  const [stagnantRepos, setStagnantRepos] = useState<any[]>([]);
  const [showStagnantRepos, setShowStagnantRepos] = useState(false);
  const [pinStagnantRepos, setPinStagnantRepos] = useState(false);
  const [orgData, setOrgData] = useState<any>(null);
  const [openSourceIndicator, setOpenSourceIndicator] = useState({
    percent: 0,
    contributorsLast3Months: 0,
    totalContributors: 0,
    status: "N/A",
  });
  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [projectVelocity, setProjectVelocity] = useState({
    avgCommitsPerWeek: 0,
    totalCommitsLast3Months: 0,
    busFactor: 0,
  });

  const orgNames = cacheService.getLastOrgs();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const orgsData = await Promise.all(
          orgNames.map((org) => githubApi.getOrgDetails(org).catch(() => null)),
        );
        const validOrgs = orgsData.filter(Boolean);
        const reposArrays = await Promise.all(
          orgNames.map((org) => githubApi.getOrgRepos(org).catch(() => [])),
        );

        const combinedOrgData = validOrgs.length > 0 ? validOrgs[0] : null; // simplified display of org details
        if (validOrgs.length > 1) {
          combinedOrgData.name = validOrgs
            .map((o) => o.name || o.login)
            .join(" + ");
          combinedOrgData.description =
            "Combined statistics for multiple organizations";
        }

        setOrgData(combinedOrgData);

        let totalStars = 0;
        let totalForks = 0;
        let totalIssues = 0;
        const langCounts: Record<string, number> = {};

        const repos = reposArrays.flat();
        repos.forEach((repo: any) => {
          totalStars += repo.stargazers_count;
          totalForks += repo.forks_count;
          totalIssues += repo.open_issues_count;
          if (repo.language) {
            langCounts[repo.language] = (langCounts[repo.language] || 0) + 1;
          }
        });

        setStats({
          repos: repos.length,
          stars: totalStars,
          forks: totalForks,
          issues: totalIssues,
        });

        const formattedLangs = Object.entries(langCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({
            name,
            value,
            color: LANGUAGE_COLORS[name] || "#8b949e",
          }));

        setLanguages(formattedLangs);

        const activeRepos = [...repos]
          .sort(
            (a, b) =>
              new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
          )
          .slice(0, 12);

        const today = new Date();
        const twelveWeeksAgo = new Date(
          today.getTime() - 84 * 24 * 60 * 60 * 1000,
        );
        const weekBuckets = Array.from({ length: 12 }).map((_, idx) => {
          const pointDate = new Date(
            twelveWeeksAgo.getTime() + idx * 7 * 24 * 60 * 60 * 1000,
          );
          return {
            weekStart: pointDate,
            label: pointDate.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
            prsOpened: 0,
            issuesOpened: 0,
            forks: 0,
            activeTotal: 0,
          };
        });

        const stagnant = repos
          .filter((repo: any) => {
            if (repo.archived) return false;
            const lastCommitAgeDays =
              (Date.now() - new Date(repo.pushed_at).getTime()) /
              (1000 * 60 * 60 * 24);
            return repo.open_issues_count > 0 && lastCommitAgeDays >= 90;
          })
          .sort((a: any, b: any) => b.open_issues_count - a.open_issues_count)
          .slice(0, 8);
        setStagnantRepos(stagnant);

        const eventsByRepo = await Promise.all(
          activeRepos.map((repo: any) =>
            githubApi
              .getRepoEvents(repo.owner?.login || repo.owner_name, repo.name)
              .catch(() => []),
          ),
        );

        const contributorsLast3Months = new Set<string>();

        eventsByRepo.flat().forEach((event: any) => {
          if (!event?.created_at || !event?.type) {
            return;
          }
          const eventDate = new Date(event.created_at);
          if (eventDate < twelveWeeksAgo || eventDate > today) {
            return;
          }
          const weekIndex = Math.min(
            11,
            Math.floor(
              (eventDate.getTime() - twelveWeeksAgo.getTime()) /
                (7 * 24 * 60 * 60 * 1000),
            ),
          );
          const weekBucket = weekBuckets[weekIndex];
          if (!weekBucket) {
            return;
          }

          if (event.type === "ForkEvent") {
            weekBucket.forks += 1;
          }
          if (
            event.type === "PullRequestEvent" &&
            event.payload?.action === "opened"
          ) {
            weekBucket.prsOpened += 1;
          }
          if (
            event.type === "IssuesEvent" &&
            event.payload?.action === "opened"
          ) {
            weekBucket.issuesOpened += 1;
          }

          if (event.actor?.login) {
            contributorsLast3Months.add(event.actor.login);
          }
        });

        weekBuckets.forEach((bucket) => {
          bucket.activeTotal =
            bucket.forks + bucket.prsOpened + bucket.issuesOpened;
        });
        setActivitySeries(weekBuckets);

        const contributorsByRepo = await Promise.all(
          activeRepos.map((repo: any) =>
            githubApi
              .getRepoContributors(
                repo.owner?.login || repo.owner_name,
                repo.name,
              )
              .catch(() => []),
          ),
        );

        const totalContributorsSet = new Set<string>();
        contributorsByRepo.flat().forEach((contributor: any) => {
          if (contributor?.login) {
            totalContributorsSet.add(contributor.login);
          }
        });

        const totalContributors = totalContributorsSet.size;
        const contributors3M = contributorsLast3Months.size;
        const percent =
          totalContributors > 0
            ? Math.round((contributors3M / totalContributors) * 100)
            : 0;
        const status =
          percent >= 60 ? "Healthy" : percent >= 35 ? "Watch" : "At Risk";

        setOpenSourceIndicator({
          percent,
          contributorsLast3Months: contributors3M,
          totalContributors,
          status,
        });

        // --- NEW: Top Contributors across all repos ---
        const contribMap: Record<string, { contributions: number; avatar_url: string; html_url: string }> = {};
        contributorsByRepo.flat().forEach((c: any) => {
          if (!c?.login) return;
          if (!contribMap[c.login]) {
            contribMap[c.login] = { contributions: 0, avatar_url: c.avatar_url, html_url: c.html_url };
          }
          contribMap[c.login].contributions += c.contributions;
        });

        const sortedTopContribs = Object.entries(contribMap)
          .sort((a, b) => b[1].contributions - a[1].contributions)
          .slice(0, 5)
          .map(([login, data]) => ({ login, ...data }));
        
        setTopContributors(sortedTopContribs);

        // --- NEW: Project Velocity & Bus Factor ---
        const totalCommitsLast3Months = weekBuckets.reduce((sum, b) => sum + b.activeTotal, 0); // Active score as proxy for velocity
        const avgCommitsPerWeek = Math.round(totalCommitsLast3Months / 12);
        
        // Simple Bus Factor: number of contributors who do > 40% of work
        let runningSum = 0;
        let busFactor = 0;
        const allContribsSorted = Object.values(contribMap).sort((a, b) => b.contributions - a.contributions);
        const totalAllCommits = allContribsSorted.reduce((sum, c) => sum + c.contributions, 0);
        
        for (const c of allContribsSorted) {
          runningSum += c.contributions;
          busFactor++;
          if (runningSum >= totalAllCommits * 0.5) break;
        }

        setProjectVelocity({
          avgCommitsPerWeek,
          totalCommitsLast3Months,
          busFactor: busFactor || 0,
        });
      } catch (error) {
        console.error("Failed to fetch overview data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(orgNames)]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-64 bg-github-border rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-github-border rounded-xl"></div>
          ))}
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
          <img
            src={orgData.avatar_url}
            alt="Org avatar"
            className="w-16 h-16 sharp-border"
          />
        )}
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            {orgData?.name || orgNames.join(", ")}
          </h1>
          {orgData?.description && (
            <p className="text-github-muted font-mono text-sm mt-1 tracking-wide">
              {orgData.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Repositories"
          value={stats.repos}
          icon={BookMarked}
          colorClass="text-[var(--color-aossie-yellow)]"
          delay={0.1}
        />
        <StatCard
          title="Total Stars"
          value={stats.stars.toLocaleString()}
          icon={Star}
          colorClass="text-yellow-400"
          delay={0.2}
        />
        <StatCard
          title="Total Forks"
          value={stats.forks.toLocaleString()}
          icon={GitFork}
          colorClass="text-[var(--color-aossie-green)]"
          delay={0.3}
        />
        <StatCard
          title="Open Issues"
          value={stats.issues.toLocaleString()}
          icon={AlertCircle}
          colorClass="text-red-400"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <LanguageChart data={languages} />

        <div className="sharp-border bg-github-dark p-6 flex flex-col h-[380px]">
          <h3 className="text-lg font-black tracking-tight text-white mb-2 uppercase">
            Organization Activity (Last 3 Months)
          </h3>
          <p className="text-xs text-github-muted mb-4">
            Active score = forks + PRs opened + issues opened
          </p>
          <div className="flex-1 overflow-hidden relative border border-github-border rounded bg-github-canvas p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activitySeries}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="label" stroke="#8b949e" fontSize={11} />
                <YAxis stroke="#8b949e" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#161b22",
                    border: "1px solid #30363d",
                    borderRadius: "6px",
                    color: "#f0f6fc",
                  }}
                  formatter={(value, name) => [
                    Number(value ?? 0),
                    String(name),
                  ]}
                  labelFormatter={(label) => `Week of ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="activeTotal"
                  name="Active Score"
                  stroke="#7ee787"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: "#facc15",
                    stroke: "#0d1117",
                    strokeWidth: 1,
                  }}
                  activeDot={{ r: 7, fill: "#facc15" }}
                />
                <Line
                  type="monotone"
                  dataKey="prsOpened"
                  name="PRs Opened"
                  stroke="#58a6ff"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="issuesOpened"
                  name="Issues Opened"
                  stroke="#f87171"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forks"
                  name="Forks"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="sharp-border bg-github-dark p-6">
        <h3 className="text-lg font-black tracking-tight text-white mb-6 flex items-center gap-2 uppercase">
          <Activity className="w-5 h-5 text-[var(--color-aossie-green)]" />{" "}
          Organization Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="relative">
            {(showStagnantRepos || pinStagnantRepos) && (
              <div className="absolute z-[80] left-0 right-0 bottom-full mb-3 bg-github-dark border border-github-border sharp-border p-3 max-h-64 overflow-y-auto shadow-2xl">
                <p className="text-[10px] uppercase tracking-widest text-github-muted mb-2">
                  Stagnant Repository List
                </p>
                <div className="space-y-2">
                  {stagnantRepos.length > 0 ? (
                    stagnantRepos.map((repo: any) => (
                      <a
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-github-canvas border border-github-border sharp-interactive p-3"
                      >
                        <h5 className="text-white font-bold uppercase tracking-wide text-xs">
                          {repo.name}
                        </h5>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-github-muted font-mono">
                          <span>Issues: {repo.open_issues_count}</span>
                          <span>
                            Last Commit:{" "}
                            {new Date(repo.pushed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-xs font-mono text-github-muted uppercase tracking-widest">
                      No stagnant repositories detected from current data.
                    </div>
                  )}
                </div>
              </div>
            )}
            <div
              className="bg-github-canvas p-4 border border-github-border rounded cursor-pointer"
              onMouseEnter={() => setShowStagnantRepos(true)}
              onMouseLeave={() => setShowStagnantRepos(false)}
              onClick={() => setPinStagnantRepos((prev) => !prev)}
            >
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" /> Potentially
                Stagnant Repos
              </h4>
              <p className="text-xs text-github-muted h-10">
                Repos with open issues but no commits in the last 3 months.
              </p>
              <div className="mt-3 text-3xl font-mono text-white">
                {stagnantRepos.length}
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-widest text-github-muted">
                Hover or click to inspect repos
              </p>
            </div>
          </div>
          <div className="bg-github-canvas p-4 border border-github-border rounded">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--color-aossie-green)]" /> Open
              Source Indicator
            </h4>
            <p className="text-xs text-github-muted h-10">
              Ratio of contributors active in the last 3 months.
            </p>
            <div className="mt-3 text-3xl font-mono text-white flex items-center gap-2">
              {openSourceIndicator.percent}%{" "}
              <span
                className={`text-xs px-2 py-1 rounded ${
                  openSourceIndicator.status === "Healthy"
                    ? "text-[var(--color-aossie-green)] bg-aossie-green/10"
                    : openSourceIndicator.status === "Watch"
                      ? "text-[var(--color-aossie-yellow)] bg-[var(--color-aossie-yellow)]/10"
                      : "text-red-400 bg-red-400/10"
                }`}
              >
                {openSourceIndicator.status}
              </span>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-github-muted">
              {openSourceIndicator.contributorsLast3Months} active of{" "}
              {openSourceIndicator.totalContributors} contributors
            </p>
          </div>
          <div className="bg-github-canvas p-4 border border-github-border rounded">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-aossie-yellow)]" /> Project Velocity
            </h4>
            <p className="text-xs text-github-muted h-10">
              Avg activity points per week and core team size.
            </p>
            <div className="mt-3 text-3xl font-mono text-white flex items-end gap-2">
              {projectVelocity.avgCommitsPerWeek}
              <span className="text-[10px] uppercase tracking-widest text-github-muted mb-1.5 font-sans">Points / Wk</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 border border-github-border text-white font-mono">
                BUS FACTOR: {projectVelocity.busFactor}
              </span>
              <span className="text-[10px] text-github-muted uppercase tracking-widest">
                Nodes for 50% work
              </span>
            </div>
          </div>
        </div>

        {/* Top Contributors Leaderboard */}
        <div className="mt-8 border-t border-github-border pt-8">
          <h3 className="text-lg font-black tracking-tight text-white mb-6 uppercase">
            Top contributors <span className="text-github-muted text-sm ml-2 font-mono">[All-Time Across Featured Repos]</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topContributors.map((c, idx) => (
              <a 
                key={c.login} 
                href={c.html_url}
                target="_blank"
                rel="noreferrer"
                className="bg-github-canvas border border-github-border sharp-interactive p-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={c.avatar_url} alt={c.login} className="w-12 h-12 grayscale group-hover:grayscale-0 transition-all" />
                    <div className="absolute -top-2 -left-2 bg-[var(--color-aossie-yellow)] text-black font-black text-[10px] w-5 h-5 flex items-center justify-center">
                      #{idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-black text-white truncate group-hover:text-[var(--color-aossie-yellow)] transition-colors">{c.login}</p>
                    <p className="text-[10px] font-mono text-github-muted uppercase tracking-widest">
                      {c.contributions} Commits
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
