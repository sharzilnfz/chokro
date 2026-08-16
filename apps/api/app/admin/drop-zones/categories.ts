// Shared category dropdown options reused by the rate card and drop zone forms.
import { CATEGORIES, type Category } from '@chokro/shared';
import { formatLabel } from '../lib/formatters';

// Builds the {value, label} option list once from the shared category enum.
export const CATEGORY_OPTIONS: readonly { value: Category; label: string }[] = CATEGORIES.map(
  (value) => ({
    value,
    label: formatLabel(value),
  }),
);