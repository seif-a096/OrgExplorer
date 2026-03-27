import { useState, useEffect } from "react";
import { githubApi } from "../../services/githubApi";
import { cacheService } from "../../services/cache";
import {
  ContributorRepoGraph,
  type GraphNode,
  type GraphLink,
} from "./ContributorRepoGraph";

/* ─────────────────────────────────────────────────────────────────── */

export function ContributorsTab() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ contributors: 0, repos: 0, edges: 0 });

  const orgNames = cacheService.getLastOrgs();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        /* 1. fetch repos for all tracked orgs */
        const repoArrays = await Promise.all(
          orgNames.map((org) => githubApi.getOrgRepos(org).catch(() => [])),
        );
        const allRepos = repoArrays.flat();

        /* 2. pick top‑20 most recently active repos */
        const activeRepos = [...allRepos]
          .sort(
            (a, b) =>
              new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
          )
          .slice(0, 20);

        /* 3. build repo nodes */
        const repoNodes: GraphNode[] = activeRepos.map((repo: any) => ({
          id: `repo:${repo.full_name}`,
          type: "repo",
          label: repo.name,
          value: Math.max(
            1,
            repo.stargazers_count + repo.forks_count + repo.open_issues_count,
          ),
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          daysSinceActive: Math.floor(
            (Date.now() - new Date(repo.pushed_at).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        }));

        /* 4. fetch contributors per repo */
        const contribsByRepo = await Promise.all(
          activeRepos.map((repo: any) =>
            githubApi
              .getRepoContributors(
                repo.owner?.login || repo.owner_name,
                repo.name,
              )
              .catch(() => []),
          ),
        );

        /* 5. aggregate contributor data + build links */
        const contribMap: Record<
          string,
          {
            id: string;
            label: string;
            totalCommits: number;
            avatarUrl: string;
            profileUrl: string;
            repos: Set<string>;
            recencyDays: number[];
          }
        > = {};

        const rawLinks: GraphLink[] = [];

        activeRepos.forEach((repo: any, i: number) => {
          const repoId = `repo:${repo.full_name}`;
          const repoDays = Math.floor(
            (Date.now() - new Date(repo.pushed_at).getTime()) /
              (1000 * 60 * 60 * 24),
          );

          (contribsByRepo[i] || []).forEach((c: any) => {
            if (!c?.login) return;
            const cid = `contrib:${c.login}`;

            if (!contribMap[cid]) {
              contribMap[cid] = {
                id: cid,
                label: c.login,
                totalCommits: 0,
                avatarUrl: c.avatar_url,
                profileUrl: c.html_url,
                repos: new Set(),
                recencyDays: [],
              };
            }

            contribMap[cid].totalCommits += c.contributions;
            contribMap[cid].repos.add(repoId);
            contribMap[cid].recencyDays.push(repoDays);

            rawLinks.push({
              source: cid,
              target: repoId,
              weight: c.contributions,
            });
          });
        });

        /* 6. pick top 50 contributors by commits */
        const contribNodes: GraphNode[] = Object.values(contribMap)
          .sort((a, b) => b.totalCommits - a.totalCommits)
          .slice(0, 50)
          .map((entry) => {
            const avgRecency =
              entry.recencyDays.length > 0
                ? Math.floor(
                    entry.recencyDays.reduce((s, d) => s + d, 0) /
                      entry.recencyDays.length,
                  )
                : 90;
            return {
              id: entry.id,
              type: "contributor" as const,
              label: entry.label,
              value: entry.totalCommits,
              avatarUrl: entry.avatarUrl,
              profileUrl: entry.profileUrl,
              reposTouched: entry.repos.size,
              daysSinceActive: avgRecency,
            };
          });

        /* 7. prune links: keep top‑4 per contributor, min weight 1 */
        const contribIds = new Set(contribNodes.map((n) => n.id));
        const repoIds = new Set(repoNodes.map((n) => n.id));

        const byContrib = new Map<string, GraphLink[]>();
        rawLinks.forEach((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          if (!contribIds.has(s) || !repoIds.has(t)) return;
          const arr = byContrib.get(s) || [];
          arr.push(l);
          byContrib.set(s, arr);
        });

        const prunedLinks = Array.from(byContrib.values())
          .flatMap((ls) =>
            ls
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 4),
          )
          .filter((l) => l.weight >= 1);

        if (cancelled) return;

        setNodes([...repoNodes, ...contribNodes]);
        setLinks(prunedLinks);
        setStats({
          contributors: contribNodes.length,
          repos: repoNodes.length,
          edges: prunedLinks.length,
        });
      } catch (err) {
        console.error("ContributorsTab fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(orgNames)]);

  /* ─── loading skeleton ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-1/3 bg-github-border rounded-lg" />
        <div className="h-[720px] bg-github-border rounded-xl" />
      </div>
    );
  }

  /* ─── render ────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
          Contributor ↔ Repo Graph
        </h1>
        <div className="flex items-center gap-3">
          {[
            { label: "Contributors", val: stats.contributors, color: "#8CC63F" },
            { label: "Repositories", val: stats.repos, color: "#F7D100" },
            { label: "Edges", val: stats.edges, color: "#8b949e" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 bg-github-dark border border-github-border px-3 py-1.5 text-xs font-mono uppercase tracking-widest"
            >
              <span
                className="inline-block w-2 h-2"
                style={{ backgroundColor: s.color, borderRadius: 2 }}
              />
              <span className="text-github-muted">{s.label}</span>
              <span className="text-white font-bold">{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* graph container */}
      <div className="bg-github-dark border border-github-border p-1 relative overflow-hidden" style={{ borderRadius: 4 }}>
        <p className="absolute top-3 left-4 z-30 text-[10px] font-mono uppercase tracking-widest text-github-muted pointer-events-none">
          Edge thickness = contribution volume · Recently active nodes float higher
        </p>

        <ContributorRepoGraph nodes={nodes} links={links} />
      </div>
    </div>
  );
}
