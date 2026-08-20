// Dynamic OpenGraph image endpoint for badge awards. Returns high-res SVG badge preview.
import { safeRoute, apiError } from '@/lib/http';
import { BadgeDomain } from '@/lib/domain/BadgeDomain';
import { generateBadgeSvg } from '@/lib/badgeImage';
import { userRepo } from '@/lib/repos/users';

export const GET = safeRoute(async (_req: Request, context: { params: Promise<{ awardId: string }> | { awardId: string } }) => {
  const params = await context.params;
  const { awardId } = params;

  if (!awardId) {
    return apiError('Award ID is required', 400);
  }

  const badge = await BadgeDomain.getBadgeById(awardId);
  if (!badge) {
    return apiError('Badge award not found', 404);
  }

  const user = await userRepo.findById(badge.user_id);

  const svg = generateBadgeSvg({
    badgeType: badge.badge_type,
    title: badge.definition?.title,
    description: badge.definition?.description,
    points: badge.award_points,
    awardedAt: badge.awarded_at,
    recipientEmail: user?.email,
    institutionId: user?.institution_id || undefined,
  });

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
});
