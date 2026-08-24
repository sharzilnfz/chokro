import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import { StateView } from '@/components/ui/StateView';
import { useCollectorRoute, type RouteStop } from '@/hooks/useCollectorRoute';
import { useUpdatePickupStatus, type PickupStatus } from '@/hooks/usePickups';
import type { PartnerProfile } from '@/hooks/usePartnerMe';
import { RouteMapCanvas } from '@/components/dispatch/RouteMapCanvas';
import { CollectorStopCard } from '@/components/dispatch/CollectorStopCard';

export interface CollectorRouteConsoleProps {
  partner: PartnerProfile;
}

export const CollectorRouteConsole = React.memo(function CollectorRouteConsole({
  partner,
}: CollectorRouteConsoleProps) {
  const routeQuery = useCollectorRoute(true);
  const updateStatus = useUpdatePickupStatus();

  const route = routeQuery.data ?? null;
  const stops = route?.stops ?? [];
  const totalKm = stops.reduce((sum, stop) => sum + stop.distance_from_previous_km, 0);
  const totalEta = stops.length > 0 ? stops[stops.length - 1].cumulative_eta_minutes : 0;
  const routingSource = route?.routing_source ?? 'haversine_fallback';
  const liveRouting = routingSource === 'mapbox' || routingSource === 'osrm';
  const routingLabel =
    routingSource === 'mapbox'
      ? 'Mapbox live routing'
      : routingSource === 'osrm'
      ? 'OSRM OpenStreetMap routing'
      : 'Offline haversine routing';

  const advance = useCallback(
    (stop: RouteStop, status: PickupStatus) => {
      updateStatus.mutate({ id: stop.order_id, status });
    },
    [updateStatus],
  );

  return (
    <StateView
      fullScreen
      isLoading={routeQuery.isLoading}
      loadingTitle="Optimizing your route"
      loadingSubtitle="Ordering stops by driving distance and time."
      error={routeQuery.error}
      errorTitle="Route unavailable"
      errorMessage={
        routeQuery.error
          ? getErrorMessage(routeQuery.error, 'Could not load the collector route.')
          : undefined
      }
      onRetry={() => void routeQuery.refetch()}
      retryLabel="Try again"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={routeQuery.isRefetching}
            onRefresh={() => void routeQuery.refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
      >
        <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">
          COLLECTOR CONSOLE
        </Text>
        <Text
          accessibilityRole="header"
          className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"
        >
          {partner.org_name}
        </Text>
        <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">
          Your optimized pickup route for today, refreshed live every 30 seconds.
        </Text>

        {/* Route status pills */}
        <View className="flex-row flex-wrap gap-[8px] mb-[14px]">
          <View
            className={`flex-row items-center gap-[5px] rounded-pill px-[12px] py-[5px] border ${
              liveRouting ? 'bg-leaf-soft border-leaf' : 'bg-amber-soft border-amber'
            }`}
            accessibilityRole="text"
            accessibilityLabel={routingLabel}
          >
            <Ionicons
              name={liveRouting ? 'git-network-outline' : 'cloud-offline-outline'}
              size={13}
              color={liveRouting ? colors.leafDark : colors.amber}
            />
            <Text
              className={`text-[12px] font-extrabold ${
                liveRouting ? 'text-leaf-dark' : 'text-amber'
              }`}
            >
              {routingLabel}
            </Text>
          </View>
          <View className="flex-row items-center gap-[5px] bg-surface border border-border rounded-pill px-[12px] py-[5px]">
            <Ionicons name="location-outline" size={13} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[12px] font-bold">{stops.length} stops</Text>
          </View>
          <View className="flex-row items-center gap-[5px] bg-surface border border-border rounded-pill px-[12px] py-[5px]">
            <Ionicons name="resize-outline" size={13} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[12px] font-bold">{totalKm.toFixed(2)} km</Text>
          </View>
          <View className="flex-row items-center gap-[5px] bg-surface border border-border rounded-pill px-[12px] py-[5px]">
            <Ionicons name="time-outline" size={13} color={colors.leafDark} />
            <Text className="text-leaf-dark text-[12px] font-bold">{totalEta} min total</Text>
          </View>
        </View>

        {updateStatus.error ? (
          <Text
            accessibilityRole="alert"
            className="text-danger bg-danger-soft p-[12px] rounded-[10px] mb-[14px] text-[13px] leading-[19px]"
          >
            {getErrorMessage(updateStatus.error, 'Could not update this pickup.')}
          </Text>
        ) : null}

        {stops.length === 0 ? (
          <StateView
            isEmpty
            emptyIcon="navigate-outline"
            emptyTitle="No stops on today's route"
            emptyMessage="New pickups assigned to you will appear here the moment they are booked."
            containerClassName="border border-border rounded-md bg-surface"
          />
        ) : (
          <>
            <Animated.View entering={FadeInUp.duration(500)} className="mb-[16px]">
              <RouteMapCanvas base={route?.base ?? { lat: 0, lng: 0 }} stops={stops} />
            </Animated.View>
            <View className="gap-[12px]">
              {stops.map((stop) => (
                <CollectorStopCard
                  key={stop.order_id}
                  stop={stop}
                  onAdvance={advance}
                  advancing={
                    updateStatus.isPending && updateStatus.variables?.id === stop.order_id
                  }
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </StateView>
  );
});
