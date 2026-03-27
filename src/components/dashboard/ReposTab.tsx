import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Star,
  GitFork,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { githubApi } from "../../services/githubApi";
import { cacheService } from "../../services/cache";
import { cn } from "../../lib/utils";
import { RepoDetailPanel } from "./RepoDetailPanel";

const ITEMS_PER_PAGE = 10;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  web: [
    "web",
    "frontend",
    "backend",
    "api",
    "site",
    "browser",
    "react",
    "next",
  ],
  crypto: ["crypto", "blockchain", "wallet", "ethereum", "solidity", "bitcoin"],
  ai: ["ai", "ml", "machine learning", "llm", "neural", "model", "inference"],
  data: ["data", "analytics", "pipeline", "etl", "visualization"],
  devtools: ["tooling", "cli", "devops", "lint", "build", "sdk", "plugin"],
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All" },
  { value: "web", label: "Web" },
  { value: "crypto", label: "Crypto" },
  { value: "ai", label: "AI" },
  { value: "data", label: "Data" },
  { value: "devtools", label: "Dev Tools" },
];

export function ReposTab() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [languageFilter, setLanguageFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortField, setSortField] = useState<
    "stargazers_count" | "forks_count" | "open_issues_count" | "updated_at"
  >("stargazers_count");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const orgNames = cacheService.getLastOrgs();

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      try {
        const reposArrays = await Promise.all(
          orgNames.map((org) => githubApi.getOrgRepos(org).catch(() => [])),
        );
        setRepos(reposArrays.flat());
      } catch (error) {
        console.error("Failed to fetch repos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, [JSON.stringify(orgNames)]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  const filteredAndSortedRepos = useMemo(() => {
    return repos
      .filter((repo) => {
        const searchableText = [
          repo.name || "",
          repo.description || "",
          repo.homepage || "",
          ...(repo.topics || []),
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          searchableText.includes(search.toLowerCase()) ||
          (repo.language &&
            repo.language.toLowerCase().includes(search.toLowerCase()));

        const matchesLang = languageFilter
          ? repo.language === languageFilter
          : true;

        const matchesCategory = categoryFilter
          ? CATEGORY_KEYWORDS[categoryFilter]?.some((keyword) =>
              searchableText.includes(keyword),
            )
          : true;

        return matchesSearch && matchesLang && matchesCategory;
      })
      .sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === "updated_at") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [repos, search, languageFilter, categoryFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedRepos.length / ITEMS_PER_PAGE);
  const paginatedRepos = filteredAndSortedRepos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset to first page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search, languageFilter, categoryFilter]);

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
      {/* ── header + search row ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-black tracking-tight text-white uppercase">
          Repositories{" "}
          <span className="text-github-muted text-lg font-mono ml-2">
            [{repos.length}]
          </span>
        </h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* language dropdown */}
          <div className="relative group">
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="appearance-none bg-github-canvas border border-github-border rounded-none py-2.5 pl-4 pr-10 text-sm text-white font-mono uppercase tracking-wider cursor-pointer transition-all duration-200 hover:border-[var(--color-aossie-green)] focus:outline-none focus:border-[var(--color-aossie-green)] focus:shadow-[0_0_8px_rgba(140,198,63,0.25)]"
            >
              <option value="">⬡ All Languages</option>
              {Array.from(
                new Set(repos.map((r) => r.language).filter(Boolean)),
              )
                .sort()
                .map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
            </select>
            {/* custom chevron */}
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-github-muted group-hover:text-[var(--color-aossie-green)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* search input */}
          <div className="relative flex-1 sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-github-muted group-focus-within:text-[var(--color-aossie-green)] transition-colors" />
            <input
              type="text"
              placeholder="Search repos, topics, descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-github-canvas border border-github-border rounded-none pl-10 pr-4 py-2.5 text-sm text-white font-mono placeholder:text-github-muted/60 transition-all duration-200 hover:border-[var(--color-aossie-green)] focus:outline-none focus:border-[var(--color-aossie-green)] focus:shadow-[0_0_8px_rgba(140,198,63,0.25)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-github-muted hover:text-white text-xs font-mono transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── category filter bar ──────────────────────────────────── */}
      <div className="bg-github-dark border border-github-border p-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono uppercase tracking-widest text-github-muted mr-1 shrink-0">
          Filter:
        </span>
        {CATEGORY_OPTIONS.map((option) => {
          const isActive = categoryFilter === option.value;
          const count = option.value
            ? repos.filter((repo) => {
                const text = [
                  repo.name || "",
                  repo.description || "",
                  ...(repo.topics || []),
                ]
                  .join(" ")
                  .toLowerCase();
                return CATEGORY_KEYWORDS[option.value]?.some((kw) =>
                  text.includes(kw),
                );
              }).length
            : repos.length;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => setCategoryFilter(option.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-widest border transition-all duration-200 shrink-0",
                isActive
                  ? "bg-[var(--color-aossie-yellow)]/10 text-[var(--color-aossie-yellow)] border-[var(--color-aossie-yellow)] shadow-[0_0_10px_rgba(247,209,0,0.15)]"
                  : "bg-github-canvas text-github-muted border-github-border hover:text-white hover:border-[var(--color-aossie-green)] hover:bg-github-canvas/80",
              )}
            >
              {option.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-sm",
                  isActive
                    ? "bg-[var(--color-aossie-yellow)]/20 text-[var(--color-aossie-yellow)]"
                    : "bg-github-border/50 text-github-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-github-dark sharp-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-github-canvas border-b border-github-border text-xs text-github-muted uppercase tracking-widest font-mono">
                <th className="px-6 py-4 font-bold">Repository</th>
                <th
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort("stargazers_count")}
                >
                  <div className="flex items-center gap-1">
                    Stars{" "}
                    <ArrowUpDown
                      className={cn(
                        "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                        sortField === "stargazers_count" &&
                          "opacity-100 text-[var(--color-aossie-yellow)]",
                      )}
                    />
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort("forks_count")}
                >
                  <div className="flex items-center gap-1">
                    Forks{" "}
                    <ArrowUpDown
                      className={cn(
                        "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                        sortField === "forks_count" &&
                          "opacity-100 text-[var(--color-aossie-green)]",
                      )}
                    />
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort("open_issues_count")}
                >
                  <div className="flex items-center gap-1">
                    Issues{" "}
                    <ArrowUpDown
                      className={cn(
                        "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                        sortField === "open_issues_count" &&
                          "opacity-100 text-red-400",
                      )}
                    />
                  </div>
                </th>
                <th className="px-6 py-4 font-bold">Language</th>
                <th
                  className="px-6 py-4 font-bold cursor-pointer hover:text-white transition-colors group"
                  onClick={() => toggleSort("updated_at")}
                >
                  <div className="flex items-center gap-1">
                    Last Updated{" "}
                    <ArrowUpDown
                      className={cn(
                        "w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity",
                        sortField === "updated_at" && "opacity-100 text-white",
                      )}
                    />
                  </div>
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
                      <p className="text-github-muted text-sm line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-github-text">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Star className="w-4 h-4 text-github-muted" />{" "}
                      {repo.stargazers_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-github-text">
                    <div className="flex items-center gap-1.5 font-mono">
                      <GitFork className="w-4 h-4 text-github-muted" />{" "}
                      {repo.forks_count}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-github-text">
                    <div className="flex items-center gap-1.5 font-mono">
                      <AlertCircle className="w-4 h-4 text-github-muted" />{" "}
                      {repo.open_issues_count}
                    </div>
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
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-github-muted font-mono uppercase tracking-widest"
                  >
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
              SHOWING{" "}
              <span className="text-white">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              TO{" "}
              <span className="text-white">
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredAndSortedRepos.length,
                )}
              </span>{" "}
              OF{" "}
              <span className="text-white">
                {filteredAndSortedRepos.length}
              </span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 sharp-interactive bg-github-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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
