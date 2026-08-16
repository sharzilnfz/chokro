import { apiData, safeRoute } from '../../../../lib/http';
import { getAuthUser } from '../../../../lib/auth';
import { valuationScansRepo } from '../../../../lib/repos/valuationScans';

export const GET = safeRoute(async (req: Request) => {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10))) : 20;

  const authUser = getAuthUser(req);
  
  let scans;
  if (authUser?.userId) {
    scans = await valuationScansRepo.findByUserId(authUser.userId, limit);
    if (scans.length === 0) {
      scans = await valuationScansRepo.findRecent(limit);
    }
  } else {
    scans = await valuationScansRepo.findRecent(limit);
  }

  return apiData({ scans });
});

export { OPTIONS } from '../../../../lib/http';
