import React from 'react';
import { getErrorMessage } from '@/services/api';
import { StateView } from '@/components/ui/StateView';
import { isCollectorPartner, usePartnerMe } from '@/hooks/usePartnerMe';
import { CollectorRouteConsole } from '@/components/dispatch/CollectorRouteConsole';
import { CustomerPickupBooking } from '@/components/dispatch/CustomerPickupBooking';

export function PickupScreen() {
  const partnerQuery = usePartnerMe();
  const partner = partnerQuery.data ?? null;

  if (partnerQuery.isLoading) {
    return (
      <StateView
        fullScreen
        isLoading
        loadingTitle="Preparing dispatch"
        loadingSubtitle="Checking whether you collect pickups or book them."
      />
    );
  }

  return isCollectorPartner(partner) && partner ? (
    <CollectorRouteConsole partner={partner} />
  ) : (
    <CustomerPickupBooking />
  );
}
