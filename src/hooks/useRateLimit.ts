import { useState, useEffect } from 'react';
import { githubApi } from '../services/githubApi';
import type { RateLimitInfo } from '../services/githubApi';

export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRateLimit = async () => {
    setIsLoading(true);
    const limitInfo = await githubApi.getRateLimit();
    setRateLimit(limitInfo);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRateLimit();

    const handleLimitHit = () => {
      fetchRateLimit();
    };

    window.addEventListener('github-api-limit', handleLimitHit);
    
    // Poll every 5 minutes or on tab focus
    const interval = setInterval(fetchRateLimit, 5 * 60 * 1000);
    window.addEventListener('focus', fetchRateLimit);

    return () => {
      window.removeEventListener('github-api-limit', handleLimitHit);
      window.removeEventListener('focus', fetchRateLimit);
      clearInterval(interval);
    };
  }, []);

  return { rateLimit, isLoading, refetch: fetchRateLimit };
}
