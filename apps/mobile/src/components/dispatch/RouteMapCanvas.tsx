import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme';
import type { RouteStop } from '@/hooks/useCollectorRoute';

export interface RouteMapCanvasProps {
  base: { lat: number; lng: number };
  stops: RouteStop[];
}

const MAP_W = 320;
const MAP_H = 208;
const MAP_PAD = 32;

export const RouteMapCanvas = React.memo(function RouteMapCanvas({
  base,
  stops,
}: RouteMapCanvasProps) {
  const points = useMemo(() => {
    const all = [base, ...stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))];
    const lats = all.map((p) => p.lat);
    const lngs = all.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1e-6;
    const spanLng = maxLng - minLng || 1e-6;
    return all.map((p) => ({
      x: MAP_PAD + ((p.lng - minLng) / spanLng) * (MAP_W - MAP_PAD * 2),
      y: MAP_H - MAP_PAD - ((p.lat - minLat) / spanLat) * (MAP_H - MAP_PAD * 2),
    }));
  }, [base, stops]);

  const path = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const start = points[0];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Route map with ${stops.length} stops, starting from the collector base`}
      className="rounded-md border border-border bg-surface overflow-hidden"
      style={{ elevation: 2 }}
    >
      <Svg width="100%" height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        {/* Subtle graticule grid */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <Polyline
            key={`grid-v-${fraction}`}
            points={`${MAP_W * fraction},0 ${MAP_W * fraction},${MAP_H}`}
            fill="none"
            stroke={colors.surfaceMuted}
            strokeWidth={1}
          />
        ))}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <Polyline
            key={`grid-h-${fraction}`}
            points={`0,${MAP_H * fraction} ${MAP_W},${MAP_H * fraction}`}
            fill="none"
            stroke={colors.surfaceMuted}
            strokeWidth={1}
          />
        ))}

        {/* Dashed route from the base through every stop in visit order */}
        <Polyline
          points={path}
          fill="none"
          stroke={colors.leaf}
          strokeWidth={2.5}
          strokeDasharray="7 5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Start depot marker */}
        <Circle cx={start.x} cy={start.y} r={16} fill={colors.leafSoft} />
        <Circle cx={start.x} cy={start.y} r={10} fill={colors.leafDark} />
        <SvgText
          x={start.x}
          y={start.y + 3.5}
          fill={colors.surface}
          fontSize={10}
          fontWeight="800"
          textAnchor="middle"
        >
          GO
        </SvgText>

        {/* Numbered stop sequence pins */}
        {points.slice(1).map((point, index) => (
          <Circle
            key={`stop-${index}`}
            cx={point.x}
            cy={point.y}
            r={11}
            fill={colors.surface}
            stroke={colors.leaf}
            strokeWidth={2.5}
          />
        ))}
        {points.slice(1).map((point, index) => (
          <SvgText
            key={`stop-label-${index}`}
            x={point.x}
            y={point.y + 4}
            fill={colors.ink}
            fontSize={11}
            fontWeight="800"
            textAnchor="middle"
          >
            {index + 1}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
});
