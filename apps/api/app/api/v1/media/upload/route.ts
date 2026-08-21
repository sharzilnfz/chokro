// POST /api/v1/media/upload — zero-trust privacy-safe media upload endpoint (Spec 16 / Ticket 03)
import { requireAuth } from '@/lib/auth';
import { apiData, safeRoute, OPTIONS } from '@/lib/http';
import { MediaDomain } from '@/lib/domain/MediaDomain';

export { OPTIONS };

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const upload = await MediaDomain.parseUploadRequest(req);
  const result = await MediaDomain.processAndStore({
    ...upload,
    uploaderId: auth.user.userId,
  });

  return apiData(result, 201);
});
