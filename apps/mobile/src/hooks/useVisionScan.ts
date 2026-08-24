import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import type { Category, Condition, Path } from '@/types';

export type VisionScanResult = {
  scan_id: string;
  classification: {
    category: Category;
    condition: Condition;
    unit: 'kg' | 'piece';
    quantity: number;
    confidence: number;
    is_ewaste_hazard: boolean;
  };
  valuation: {
    unit_price_bdt: number;
    total_estimated_bdt: number;
    market_benchmark_bdt?: number;
    drift_pct?: number;
    drift_status?: 'UNDER_MARKET' | 'OVER_MARKET' | 'IN_SYNC' | string;
  };
  recommendation: {
    next_life_path: Path;
    reasoning_rationale: string;
    suggested_action: string;
  };
};

export type VisionScanInput = {
  imageBase64: string;
  declaredQuantity?: number;
  categoryHint?: Category;
  conditionHint?: Condition;
};

export function useVisionScan() {
  const queryClient = useQueryClient();

  return useMutation<VisionScanResult, Error, VisionScanInput>({
    mutationFn: async (input) =>
      apiRequest<VisionScanResult>('/api/v1/valuation/classify-and-estimate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vision-scans'] });
    },
  });
}
