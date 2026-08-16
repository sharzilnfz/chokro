import type { User } from '@/types';

export type Tab =
  | 'browse'
  | 'list'
  | 'pickup'
  | 'auctions'
  | 'vision'
  | 'rates'
  | 'wallet'
  | 'scan';

export type PersonaLabel = 'Collector' | 'Recycler' | 'Partner' | 'Admin' | 'Individual';

const INDIVIDUAL_TABS: Tab[] = ['browse', 'list', 'vision', 'pickup', 'rates', 'wallet', 'scan'];
const COLLECTOR_TABS: Tab[] = ['pickup', 'browse', 'rates', 'wallet', 'scan'];
const RECYCLER_TABS: Tab[] = ['auctions', 'pickup', 'browse', 'rates', 'wallet'];
// Superset of the single-type sets; used when partner types are still loading or unknown.
const PARTNER_ALL_TABS: Tab[] = ['auctions', 'pickup', 'browse', 'rates', 'wallet', 'scan'];
const ADMIN_TABS: Tab[] = ['browse', 'rates', 'wallet'];

export function getVisibleTabs(role: User['role'], partnerTypes: string[] | null): Tab[] {
  if (role === 'ADMIN') return ADMIN_TABS;
  if (role !== 'PARTNER') return INDIVIDUAL_TABS;

  const isCollector = partnerTypes?.includes('COLLECTOR') ?? false;
  const isRecycler = partnerTypes?.includes('RECYCLER') ?? false;
  if (isCollector && !isRecycler) return COLLECTOR_TABS;
  if (isRecycler && !isCollector) return RECYCLER_TABS;
  return PARTNER_ALL_TABS;
}

export function getPersonaLabel(role: User['role'], partnerTypes: string[] | null): PersonaLabel {
  if (role === 'ADMIN') return 'Admin';
  if (role !== 'PARTNER') return 'Individual';

  const isCollector = partnerTypes?.includes('COLLECTOR') ?? false;
  const isRecycler = partnerTypes?.includes('RECYCLER') ?? false;
  if (isCollector && !isRecycler) return 'Collector';
  if (isRecycler && !isCollector) return 'Recycler';
  return 'Partner';
}
