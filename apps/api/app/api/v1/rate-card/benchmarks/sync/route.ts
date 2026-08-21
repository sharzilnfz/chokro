import { apiData, apiSuccess, safeRoute, OPTIONS } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { ValuationDomain } from '@/lib/domain/ValuationDomain';

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAdmin(req);
  if (auth.response) return auth.response;

  let fxRate = 122.50;
  try {
    const body = await req.json();
    if (body.fx_rate && Number(body.fx_rate) > 0) {
      fxRate = Number(body.fx_rate);
    }
  } catch {
    // Body is optional
  }

  const synced = await ValuationDomain.syncBenchmarks(fxRate);
  return apiSuccess('Commodity benchmarks synced successfully', { count: synced.length, benchmarks: synced }, 200);
});

export { OPTIONS };
