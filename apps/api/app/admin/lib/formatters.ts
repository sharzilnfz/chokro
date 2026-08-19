// Display helpers shared across the admin console: label/price/date formatting and small utilities.
import { getCategoryUnit, type Category, type Unit } from '@chokro/shared';

export type { Unit };

// Joins truthy class-name strings, mirroring a small cx utility.
export function cx(...parts: unknown[]): string {
  return parts.filter(Boolean).join(' ');
}

// Returns a safe, human-readable message from an unknown thrown value.
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Delegate to the shared domain mapping that picks the pricing unit for a category.
export function unitForCategory(category: Category | string): Unit {
  return getCategoryUnit(category);
}

// Converts snake_case enum values into readable title-case labels.
export function formatLabel(value: string): string {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
}

// Formats an amount as BDT currency with two fraction digits.
export function formatPrice(value: string | number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return `৳${new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue)}`;
}

// Formats an ISO timestamp as a localized medium date with short time, guarding against bad input.
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
