export const CATEGORIES = [
  'CLOTHES',
  'BOOKS',
  'PLASTICS',
  'PAPER',
  'METAL',
  'GLASS',
  'FURNITURE',
  'APPLIANCES',
  'E_WASTE',
] as const;

export const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] as const;
export const LISTING_STATUSES = ['DRAFT', 'ACTIVE', 'CANCELLED', 'MATCHED', 'EXPIRED'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export type User = {
  id: string;
  email: string;
  role: 'INDIVIDUAL' | 'PARTNER' | 'ADMIN';
  institutionId?: string | null;
};

export type AuthSession = {
  token: string;
  user: User;
};

export function categoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
