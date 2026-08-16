import { apiData, safeRoute } from '../../../../lib/http';
import { benchmarksRepo } from '../../../../lib/repos/benchmarks';

export const GET = safeRoute(async () => {
  const benchmarks = await benchmarksRepo.findAll();
  return apiData({ benchmarks });
});

export { OPTIONS } from '../../../../lib/http';
