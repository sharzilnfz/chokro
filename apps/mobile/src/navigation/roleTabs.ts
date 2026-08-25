import type { User } from '@/types';

export type Tab =
  | 'browse'
  | 'list'
  | 'messages'
  | 'demands'
  | 'pickup'
  | 'auctions'
  | 'vision'
  | 'rates'
  | 'wallet'
  | 'scan'
  | 'console';

export type PersonaLabel = 'Collector' | 'Recycler' | 'Partner' | 'Admin' | 'Individual';

const INDIVIDUAL_TABS: Tab[] = ['browse', 'list', 'demands', 'messages', 'vision', 'pickup', 'rates', 'wallet', 'scan'];
const COLLECTOR_TABS: Tab[] = ['pickup', 'browse', 'demands', 'messages', 'rates', 'wallet', 'scan'];
const RECYCLER_TABS: Tab[] = ['demands', 'auctions', 'pickup', 'browse', 'messages', 'rates', 'wallet'];
// Superset of the single-type sets; used when partner types are still loading or unknown.
const PARTNER_ALL_TABS: Tab[] = ['demands', 'auctions', 'pickup', 'browse', 'messages', 'rates', 'wallet', 'scan'];
const ADMIN_TABS: Tab[] = ['browse', 'demands', 'rates', 'wallet'];

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
