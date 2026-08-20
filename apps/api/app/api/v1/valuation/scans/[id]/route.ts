import { apiData, apiError, safeRoute, OPTIONS } from '@/lib/http';
import { valuationScansRepo } from '@/lib/repos/valuationScans';

export const GET = safeRoute(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const scan = await valuationScansRepo.findById(id);

  if (!scan) {
    return apiError('Valuation scan record not found', 404);
  }

  return apiData({ scan });
});

export { OPTIONS };
