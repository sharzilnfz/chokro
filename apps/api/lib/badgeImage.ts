// Pure SVG generator for dynamic OpenGraph badge previews and share cards.
import { BADGE_DEFINITIONS, type BadgeType } from '@chokro/shared';

export interface BadgeSvgOptions {
  badgeType: BadgeType;
  title?: string;
  description?: string;
  points?: string | number;
  awardedAt?: string;
  recipientEmail?: string;
  institutionId?: string;
}

export function generateBadgeSvg(options: BadgeSvgOptions): string {
  const definition = BADGE_DEFINITIONS[options.badgeType] || {
    title: options.title || 'Chokro Milestone',
    description: options.description || 'Verified environmental circularity contribution',
    icon: 'star',
    criteria: 'Verified circular action',
  };

  const title = options.title || definition.title;
  const description = options.description || definition.description;
  const points = options.points ? `${options.points} BDT` : 'Verified Milestone';
  const campus = options.institutionId ? `Campus: ${options.institutionId}` : 'Chokro Circular Network';
  const dateStr = options.awardedAt ? new Date(options.awardedAt).toLocaleDateString('en-GB') : 'Verified';

  // SVG badge card (1200x630 OpenGraph dimensions)
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064E3B" />
      <stop offset="50%" stop-color="#047857" />
      <stop offset="100%" stop-color="#022C22" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F5132" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#062E1F" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="cardShadow" x="-20" y="-20" width="1240" height="670" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Background with subtle texture -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <circle cx="1100" cy="100" r="350" fill="#10B981" opacity="0.15" />
  <circle cx="100" cy="550" r="280" fill="#059669" opacity="0.2" />

  <!-- Inner Badge Container Card -->
  <g filter="url(#cardShadow)">
    <rect x="80" y="60" width="1040" height="510" rx="28" fill="url(#cardGrad)" stroke="#34D399" stroke-opacity="0.3" stroke-width="2" />
  </g>

  <!-- Chokro Branding Header -->
  <g transform="translate(140, 110)">
    <rect width="44" height="44" rx="12" fill="#10B981" />
    <text x="22" y="31" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle">C</text>
    <text x="58" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">CHOKRO</text>
    <text x="175" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500" fill="#A7F3D0">Circular Economy Badge</text>
  </g>

  <!-- Badge Emblem / Shield Center Left -->
  <g transform="translate(140, 200)">
    <circle cx="90" cy="90" r="85" fill="#047857" stroke="url(#goldGrad)" stroke-width="6" />
    <circle cx="90" cy="90" r="72" fill="#064E3B" />
    <polygon points="90,45 102,75 135,78 110,100 118,132 90,114 62,132 70,100 45,78 78,75" fill="url(#goldGrad)" />
    <circle cx="90" cy="90" r="20" fill="#065F46" />
    <text x="90" y="96" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#FCD34D" text-anchor="middle">✓</text>
  </g>

  <!-- Badge Details Center Right -->
  <g transform="translate(360, 210)">
    <rect x="0" y="0" width="130" height="32" rx="16" fill="#065F46" stroke="#10B981" stroke-opacity="0.4" />
    <text x="65" y="21" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#6EE7B7" text-anchor="middle">VERIFIED BADGE</text>
    
    <text x="0" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#FFFFFF">${escapeXml(title)}</text>
    
    <text x="0" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="400" fill="#D1FAE5">${escapeXml(description)}</text>
    
    <g transform="translate(0, 150)">
      <rect x="0" y="0" width="220" height="42" rx="10" fill="#064E3B" stroke="#047857" stroke-width="1" />
      <text x="15" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#9CA3AF">Value / Reward:</text>
      <text x="135" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#FCD34D">${escapeXml(points)}</text>
    </g>
  </g>

  <!-- Footer Metadata & Proof Details -->
  <g transform="translate(140, 480)">
    <line x1="0" y1="0" x2="920" y2="0" stroke="#065F46" stroke-width="1.5" />
    <text x="0" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600" fill="#6EE7B7">${escapeXml(campus)}</text>
    <text x="920" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500" fill="#A7F3D0" text-anchor="end">Awarded: ${escapeXml(dateStr)} • Verified by Chokro Protocol</text>
  </g>
</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
