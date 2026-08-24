import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';

export interface GenerateHandoverResult {
  message: string;
  handover: {
    id: string;
    task_id: string;
    giver_user_id: string;
    collector_partner_id: string;
    status: string;
    expires_at: string;
    created_at: string;
  };
  otpCode?: string;
  isExisting: boolean;
}

export interface VerifyHandoverInput {
  taskId: string;
  otpCode: string;
  verifiedQuantity?: number | null;
  verifiedCondition?: string | null;
  notes?: string | null;
}

export interface VerifyHandoverResult {
  message: string;
  success: boolean;
  handover: any;
  order: any;
  creditTxn: any;
  trustDecision: any;
}

export function useGenerateHandoverOtp() {
  const queryClient = useQueryClient();

  return useMutation<GenerateHandoverResult, Error, { taskId: string }>({
    mutationFn: (input) =>
      apiRequest<GenerateHandoverResult>('/api/v1/handovers/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pickups'] });
      void queryClient.invalidateQueries({ queryKey: ['collector-route'] });
    },
  });
}

export function useVerifyHandoverOtp() {
  const queryClient = useQueryClient();

  return useMutation<VerifyHandoverResult, Error, VerifyHandoverInput>({
    mutationFn: (input) =>
      apiRequest<VerifyHandoverResult>('/api/v1/handovers/verify-otp', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pickups'] });
      void queryClient.invalidateQueries({ queryKey: ['collector-route'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      void queryClient.invalidateQueries({ queryKey: ['wallet-history'] });
    },
  });
}
