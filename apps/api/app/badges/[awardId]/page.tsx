// Public share landing page for verified milestone badges with dynamic OpenGraph social metadata.
import type { Metadata } from 'next';
import { BadgeDomain } from '@/lib/domain/BadgeDomain';
import { userRepo } from '@/lib/repos/users';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ awardId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { awardId } = await params;
  const badge = await BadgeDomain.getBadgeById(awardId);

  if (!badge) {
    return {
      title: 'Badge Not Found | Chokro',
      description: 'The requested sustainability badge award could not be located.',
    };
  }

  const title = badge.definition?.title || 'Circular Economy Milestone';
  const description = badge.definition?.description || 'Verified environmental impact on the Chokro platform.';

  return {
    title: `${title} | Chokro Verified Badge`,
    description,
    openGraph: {
      title: `${title} | Chokro Verified Circularity Badge`,
      description,
      images: [
        {
          url: `/api/badges/${awardId}/og`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Chokro Verified Badge`,
      description,
      images: [`/api/badges/${awardId}/og`],
    },
  };
}

export default async function BadgeSharePage({ params }: PageProps) {
  const { awardId } = await params;
  const badge = await BadgeDomain.getBadgeById(awardId);

  if (!badge) {
    return (
      <main className="min-h-screen bg-emerald-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold mb-3">Badge Not Found</h1>
        <p className="text-emerald-300 mb-6">This sustainability badge award ID does not exist or has expired.</p>
        <Link href="/" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl transition">
          Return Home
        </Link>
      </main>
    );
  }

  const user = await userRepo.findById(badge.user_id);
  const title = badge.definition?.title || 'Circularity Milestone';
  const description = badge.definition?.description || 'Verified environmental action on the Chokro platform.';
  const awardedDate = new Date(badge.awarded_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-xl w-full bg-emerald-900/60 backdrop-blur-md border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header badge pill */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-emerald-950 text-sm">
              C
            </span>
            <span className="font-bold tracking-wider text-sm uppercase text-emerald-200">Chokro Verified</span>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-800 text-emerald-300 border border-emerald-600/40">
            {badge.award_points} BDT Award
          </span>
        </div>

        {/* Badge graphic preview */}
        <div className="relative mb-6 rounded-2xl overflow-hidden border border-emerald-500/20 shadow-inner bg-emerald-950/80 aspect-[1200/630]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/badges/${awardId}/og`}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Badge description */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{title}</h1>
            <p className="text-emerald-200/90 text-sm sm:text-base mt-1.5">{description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-800/80 text-sm">
            <div>
              <span className="text-xs text-emerald-400 block font-medium">Campus</span>
              <span className="font-semibold text-white">{user?.institution_id || 'Inter-Campus Contributor'}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-400 block font-medium">Awarded On</span>
              <span className="font-semibold text-white">{awardedDate}</span>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="mt-8 pt-6 border-t border-emerald-800/60 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-3 px-4 rounded-xl text-center text-sm transition shadow-lg shadow-emerald-950/50"
          >
            Join the Green Circularity Drive
          </Link>
        </div>
      </div>
    </main>
  );
}
