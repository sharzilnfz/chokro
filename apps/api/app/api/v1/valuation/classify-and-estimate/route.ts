import { apiData, apiError, safeRoute } from '@/lib/http';
import { getAuthUser } from '@/lib/auth';
import { ValuationDomain } from '@/lib/domain/ValuationDomain';

export const POST = safeRoute(async (req: Request) => {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }

  const authUser = getAuthUser(req);

  const imageUrl = body.imageUrl || body.image_url;
  const imageBase64 = body.imageBase64 || body.image_base64;
  const promptNotes = body.promptNotes || body.prompt_notes || body.notes;
  const categoryHint = body.categoryHint || body.category_hint || body.category;
  const conditionHint = body.conditionHint || body.condition_hint || body.condition;
  const declaredQuantity = body.declaredQuantity || body.declared_quantity || body.quantity || body.weight || body.piece_count || body.pieceCount;

  try {
    const result = await ValuationDomain.classifyAndEstimate({
      userId: authUser?.userId || null,
      imageUrl,
      imageBase64,
      promptNotes,
      categoryHint,
      conditionHint,
      declaredQuantity: declaredQuantity ? Number(declaredQuantity) : undefined,
    });

    return apiData(result, 201);
  } catch (error: any) {
    return apiError(error.message || 'Vision classification failed', 500);
  }
});

export { OPTIONS } from '@/lib/http';
