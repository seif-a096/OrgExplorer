import { useEffect, useState } from "react";
import {
  X,
  Star,
  GitFork,
  AlertCircle,
  GitCommit,
  ExternalLink,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { githubApi } from "../../services/githubApi";
import { cacheService } from "../../services/cache";

interface RepoDetailPanelProps {
  repo: any | null;
  onClose: () => void;
}

export function RepoDetailPanel({ repo, onClose }: RepoDetailPanelProps) {
  const [contributors, setContributors] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repo) return;

    const fetchData = async () => {
      setLoading(true);
      const orgName = repo.owner?.login || cacheService.getLastOrgs()[0];
      try {
        const [contribsData, activityData] = await Promise.all([
          githubApi.getRepoContributors(orgName, repo.name).catch(() => []),
          githubApi.getRepoActivity(orgName, repo.name).catch(() => []),
        ]);

        setContributors(contribsData.slice(0, 5)); // Top 5 contributors for this repo

        // Format activity data for 52 weeks (last year)
        if (Array.isArray(activityData) && activityData.length > 0) {
          const formattedActivity = activityData
            .map((week) => ({
              week: new Date(week.week * 1000).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
              commits: week.total,
            }))
            .slice(-52); // strict 52 weeks
          setActivity(formattedActivity);
        } else {
          setActivity([]);
        }
      } catch (error) {
        console.error("Failed to fetch repo details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [repo]);

  if (!repo) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-github-dark border-l border-github-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-start justify-between p-6 border-b border-github-border bg-github-canvas sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tighter mb-1">
              {repo.name}
            </h2>
            <p className="text-sm font-mono text-github-muted">
              {repo.description || "NO DESCRIPTION"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 sharp-interactive text-github-muted hover:text-white transition-colors ml-4 bg-github-dark"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-github-canvas sharp-border p-4 flex flex-col items-center">
              <Star className="w-4 h-4 text-[var(--color-aossie-yellow)] mb-2" />
              <span className="text-xl font-black text-white">
                {repo.stargazers_count}
              </span>
              <span className="text-xs font-mono text-github-muted uppercase">
                Stars
              </span>
            </div>
            <div className="bg-github-canvas sharp-border p-4 flex flex-col items-center">
              <GitFork className="w-4 h-4 text-[var(--color-aossie-green)] mb-2" />
              <span className="text-xl font-black text-white">
                {repo.forks_count}
              </span>
              <span className="text-xs font-mono text-github-muted uppercase">
                Forks
              </span>
            </div>
            <a
              href={`${repo.html_url}/issues`}
              target="_blank"
              rel="noreferrer"
              className="bg-github-canvas sharp-interactive p-4 flex flex-col items-center group"
            >
              <AlertCircle className="w-4 h-4 text-white mb-2" />
              <span className="text-xl font-black text-[var(--color-aossie-yellow)] flex items-center gap-1">
                {repo.open_issues_count}{" "}
                <ExternalLink className="w-3 h-3 text-github-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
              <span className="text-xs font-mono text-github-muted uppercase">
                Issues
              </span>
            </a>
          </div>

          {/* Commit Activity Graph */}
          <div className="space-y-3">
            <h3 className="font-bold uppercase tracking-widest text-white text-sm flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-[var(--color-aossie-green)]" />{" "}
              Activity [52 WEEKS]
            </h3>
            <div className="bg-github-canvas sharp-border p-4 h-48 flex items-end">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center animate-pulse">
                  <div className="h-4 w-4 bg-[var(--color-aossie-green)]" />
                </div>
              ) : activity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activity}>
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{
                        backgroundColor: "#0d1117",
                        borderColor: "#30363d",
                        borderRadius: "0",
                      }}
                      labelStyle={{ color: "#8b949e", fontFamily: "monospace" }}
                      itemStyle={{ color: "#F7D100", fontFamily: "monospace" }}
                    />
                    <Bar
                      dataKey="commits"
                      fill="#8CC63F"
                      radius={[0, 0, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full text-center text-github-muted text-sm my-auto">
                  No activity data available.
                </div>
              )}
            </div>
          </div>

          {/* Top Contributors */}
          <div className="space-y-3">
            <h3 className="font-bold uppercase tracking-widest text-white text-sm">
              Top Contributors
            </h3>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-pulse bg-github-canvas sharp-border p-3"
                  >
                    <div className="w-10 h-10 bg-github-border" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-github-border w-1/3" />
                      <div className="h-2 bg-github-border w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contributors.length > 0 ? (
              <div className="space-y-2">
                {contributors.map((contributor) => (
                  <a
                    key={contributor.login}
                    href={contributor.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-github-canvas sharp-interactive group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={contributor.avatar_url}
                        alt={contributor.login}
                        className="w-10 h-10 sharp-border grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                      <div>
                        <p className="font-bold text-white group-hover:text-[var(--color-aossie-yellow)] transition-colors flex items-center uppercase tracking-wider text-sm gap-1">
                          {contributor.login}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-bold text-[var(--color-aossie-green)] bg-github-dark px-2 py-1 sharp-border">
                      {contributor.contributions} CMTS
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 border border-dashed border-github-border text-github-muted text-xs font-mono">
                NO CONTRIBUTORS DATA.
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-github-border bg-github-dark">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 sharp-interactive hover:bg-[var(--color-aossie-green)] hover:text-black hover:border-[var(--color-aossie-green)] text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2"
          >
            Open GitHub <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </>
  );
}
