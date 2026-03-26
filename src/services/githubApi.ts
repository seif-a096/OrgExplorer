import { cacheService } from './cache';

const API_BASE = 'https://api.github.com';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

class GitHubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const githubApi = {
  getRateLimit: async (): Promise<RateLimitInfo | null> => {
    try {
      const response = await fetch(`${API_BASE}/rate_limit`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: data.rate.reset,
      };
    } catch {
      return null;
    }
  },

  fetchWithCache: async <T>(
    url: string,
    storeName: 'repos' | 'contributors' | 'activity',
    cacheKey: string
  ): Promise<T> => {
    const cached = await cacheService.get(storeName, cacheKey);
    if (cached) {
      return cached as T;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        // Trigger generic rate limit event
        window.dispatchEvent(new CustomEvent('github-api-limit', { detail: response.headers }));
      }
      throw new GitHubApiError(response.status, `GitHub API Error: ${response.statusText}`);
    }

    const data = await response.json();
    await cacheService.set(storeName, cacheKey, data);
    return data;
  },

  getOrgDetails: async (org: string) => {
    // Standard fetch, small enough to bypass idb cache or cache separately
    const response = await fetch(`${API_BASE}/orgs/${org}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Org not found');
    return response.json();
  },

  getOrgRepos: async (org: string) => {
    // Using fetchWithCache allows us to cache the entire repo list
    // Note: A real implementation might need to handle pagination if an org has >100 repos.
    // We'll fetch the first 100 for simplicity in this demo.
    return githubApi.fetchWithCache<any[]>(
      `/orgs/${org}/repos?per_page=100&sort=pushed&direction=desc`,
      'repos',
      org
    );
  },

  getRepoContributors: async (org: string, repo: string) => {
    return githubApi.fetchWithCache<any[]>(
      `/repos/${org}/${repo}/contributors?per_page=100`,
      'contributors',
      `${org}_${repo}`
    );
  },
  
  getRepoActivity: async (org: string, repo: string) => {
    return githubApi.fetchWithCache<any[]>(
      `/repos/${org}/${repo}/stats/commit_activity`,
      'activity',
      `${org}_${repo}`
    );
  }
};

function getHeaders() {
  const token = cacheService.getToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
