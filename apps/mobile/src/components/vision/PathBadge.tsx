import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { Path } from '@/types';

export type PathVisual = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badgeClassName: string;
  textClassName: string;
  label: string;
  title: string;
  soft: string;
  solid: string;
};

const PATH_VISUALS: Record<Path, PathVisual> = {
  REUSE: {
    icon: 'refresh-circle',
    iconColor: colors.leafDark,
    badgeClassName: 'bg-leaf-soft border-leaf',
    textClassName: 'text-leaf-dark',
    label: 'Reuse',
    title: 'Direct Reuse',
    soft: colors.leafSoft,
    solid: colors.leafDark,
  },
  DONATE: {
    icon: 'heart',
    iconColor: colors.leafDark,
    badgeClassName: 'bg-leaf-soft border-leaf-dark',
    textClassName: 'text-leaf-dark',
    label: 'Donate',
    title: 'Community Donation',
    soft: colors.leafSoft,
    solid: colors.leafDark,
  },
  REPAIR: {
    icon: 'construct',
    iconColor: colors.amber,
    badgeClassName: 'bg-amber-soft border-amber',
    textClassName: 'text-amber',
    label: 'Repair',
    title: 'Repair & Upcycle',
    soft: colors.amberSoft,
    solid: colors.amber,
  },
  RESELL: {
    icon: 'trending-up',
    iconColor: colors.ink,
    badgeClassName: 'bg-surface-muted border-ink',
    textClassName: 'text-ink',
    label: 'Resell',
    title: 'Secondary Resale',
    soft: colors.surfaceMuted,
    solid: colors.ink,
  },
  RECYCLE: {
    icon: 'leaf',
    iconColor: colors.danger,
    badgeClassName: 'bg-danger-soft border-danger',
    textClassName: 'text-danger',
    label: 'Recycle',
    title: 'Material Recycling',
    soft: colors.dangerSoft,
    solid: colors.danger,
  },
};

export function pathVisual(path: Path | string): PathVisual {
  return PATH_VISUALS[path as Path] ?? PATH_VISUALS.RECYCLE;
}

export const PathBadge = React.memo(function PathBadge({
  path,
  big = false,
}: {
  path: Path | string;
  big?: boolean;
}) {
  const visual = pathVisual(path);
  return (
    <View
      accessibilityLabel={`Next life path: ${visual.label}`}
      className={`flex-row items-center gap-[7px] border rounded-pill self-start ${visual.badgeClassName} ${
        big ? 'px-[14px] min-h-[42px]' : 'px-[11px] py-[7px]'
      }`}
    >
      <Ionicons name={visual.icon} size={big ? 20 : 15} color={visual.iconColor} />
      <View>
        <Text className="text-muted text-[9px] font-extrabold tracking-[1px]">NEXT LIFE</Text>
        <Text className={`text-[13px] font-extrabold tracking-[0.4px] ${visual.textClassName}`}>
          {visual.label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
});
