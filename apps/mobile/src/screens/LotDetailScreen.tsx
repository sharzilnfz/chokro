// M10: LotDetailScreen — B2B Bulk Scrap Lot Detail, Anti-Snipe Floor & Escrow Hold Surface
import React, { useState } from 'react';
import { View } from 'react-native';
import { LotDetailView } from '@/components/auctions/LotDetailView';
import { DisputeScreen } from './DisputeScreen';
import { useAuctionLot } from '@/hooks/useAuctionLot';
import { useAuth } from '@/context/AuthContext';

export interface LotDetailScreenProps {
  lotId: string;
  onBack: () => void;
}

export function LotDetailScreen({ lotId, onBack }: LotDetailScreenProps) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const { user } = useAuth();
  const { data: lotDetail } = useAuctionLot(lotId);

  if (disputeOpen && lotDetail?.lot) {
    return (
      <DisputeScreen
        sourceType="AUCTION_LOT"
        sourceId={lotId}
        againstUserId={lotDetail.lot.created_by}
        onBack={() => setDisputeOpen(false)}
      />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <LotDetailView lotId={lotId} onBack={onBack} />
    </View>
  );
}
