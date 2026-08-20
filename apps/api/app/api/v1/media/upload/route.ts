// POST /api/v1/media/upload — zero-trust privacy-safe media upload endpoint (Spec 16 / Ticket 03)
import { requireAuth } from '@/lib/auth';
import { apiData, apiError, safeRoute, OPTIONS } from '@/lib/http';
import { MediaDomain } from '@/lib/domain/MediaDomain';

export { OPTIONS };

export const POST = safeRoute(async (req: Request) => {
  const auth = requireAuth(req);
  if (auth.response) return auth.response;

  const contentType = req.headers.get('content-type') || '';
  let buffer: Buffer;
  let filename = 'image.jpg';
  let mimeType = 'image/jpeg';
  let purpose: 'LISTING' | 'DEPOSIT_EVIDENCE' | 'DISPUTE_PROOF' | undefined;
  let listingId: string | undefined;
  let category: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return apiError('No file provided in form data', 400);
    }
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    filename = file.name || 'image.jpg';
    mimeType = file.type || 'image/jpeg';
    purpose = (formData.get('purpose') as any) || undefined;
    listingId = (formData.get('listingId') as string) || (formData.get('listing_id') as string) || undefined;
    category = (formData.get('category') as string) || undefined;
  } else if (contentType.includes('application/json')) {
    const json = await req.json();
    if (!json.file && !json.dataUri && !json.base64) {
      return apiError('No image payload provided', 400);
    }
    const raw = json.file || json.dataUri || json.base64;
    if (typeof raw === 'string' && raw.startsWith('data:')) {
      const parts = raw.split(',');
      const match = parts[0].match(/:(.*?);/);
      mimeType = match ? match[1] : 'image/jpeg';
      buffer = Buffer.from(parts[1], 'base64');
    } else {
      buffer = Buffer.from(raw, 'base64');
    }
    filename = json.filename || 'image.jpg';
    purpose = json.purpose;
    listingId = json.listingId || json.listing_id;
    category = json.category;
  } else {
    // Raw binary stream
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return apiError('Empty media payload', 400);
    }
    buffer = Buffer.from(arrayBuffer);
    mimeType = contentType || 'image/jpeg';
  }

  const result = await MediaDomain.processAndStore({
    buffer,
    originalFilename: filename,
    mimeType,
    uploaderId: auth.user.userId,
    listingId,
    category,
    purpose,
  });

  return apiData(result, 201);
});
