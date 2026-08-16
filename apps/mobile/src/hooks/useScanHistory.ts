import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Condition, Path } from '@/types';

export type ValuationScanRow = {
  id: string;
  user_id: string | null;
  image_url: string | null;
  detected_category: Category;
  detected_condition: Condition;
  estimated_quantity: string;
  unit: 'kg' | 'piece';
  next_life_path: Path;
  is_ewaste_hazard: boolean;
  confidence: string;
  estimated_value_bdt: string;
  reasoning_rationale: string;
  suggested_action: string | null;
  created_at: string;
};

export function useScanHistory(limit = 10) {
  return useQuery<ValuationScanRow[]>({
    queryKey: ['vision-scans', limit],
    queryFn: async () => {
      const data = await apiRequest<{ scans: ValuationScanRow[] }>(
        `/api/v1/valuation/scans?limit=${limit}`,
      );
      return data.scans;
    },
  });
}

export function useScanDetail(scanId: string | null) {
  return useQuery<ValuationScanRow | null>({
    queryKey: ['vision-scan', scanId],
    enabled: scanId !== null,
    queryFn: async () => {
      if (!scanId) return null;
      const data = await apiRequest<{ scan: ValuationScanRow }>(
        `/api/v1/valuation/scans/${scanId}`,
      );
      return data.scan;
    },
  });
}

export function timeAgo(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(then)) return 'recently';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
