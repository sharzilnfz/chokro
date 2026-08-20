import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { getErrorMessage } from '@/services/api';
import { useConversations } from '@/hooks/useConversations';
import { useStartConversation, type Conversation } from '@/hooks/useStartConversation';
import { StateView } from '@/components/ui/StateView';
import { ChatScreen } from '@/screens/ChatScreen';
import { categoryLabel } from '@/types';

export type MessagesTarget = {
  listingId: string;
  peerEmail: string;
  listingCategory: string;
};

type MessagesScreenProps = {
  target: MessagesTarget | null;
  onTargetHandled: () => void;
};

export function MessagesScreen({ target, onTargetHandled }: MessagesScreenProps) {
  const { data: conversations, isLoading, error, refetch, isRefetching } = useConversations();
  const startConversation = useStartConversation();
  const [active, setActive] = useState<Conversation | null>(null);
  const [startError, setStartError] = useState('');
  const handledTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!target) return;
    if (handledTargetRef.current === target.listingId) return;
    handledTargetRef.current = target.listingId;

    let cancelled = false;
    setStartError('');
    void (async () => {
      try {
        const conversation = await startConversation.mutateAsync(target.listingId);
        if (!cancelled) setActive(conversation);
      } catch (err) {
        if (!cancelled) setStartError(getErrorMessage(err, 'Could not start a conversation with this seller.'));
      } finally {
        onTargetHandled();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [target, startConversation, onTargetHandled]);

  const items = conversations ?? [];

  const renderRow = ({ item }: { item: Conversation }) => {
    const timeText = item.lastMessageAt
      ? new Date(item.lastMessageAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${item.peerEmail}`}
        className="bg-surface border border-border rounded-md p-[14px] mb-[12px] shadow-card active:opacity-[0.72]"
        style={{ elevation: 2 }}
        onPress={() => {
          setStartError('');
          setActive(item);
        }}
      >
        <View className="flex-row items-center gap-[12px]">
          <View className="w-11 h-11 rounded-full bg-leaf-soft items-center justify-center">
            <Ionicons name="person" size={20} color={colors.leafDark} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between gap-[8px]">
              <Text className="flex-1 text-ink text-[15px] font-extrabold" numberOfLines={1}>{item.peerEmail}</Text>
              {timeText ? <Text className="text-muted text-[11px]">{timeText}</Text> : null}
            </View>
            <Text className="text-muted text-[12px] mt-[2px]" numberOfLines={1}>
              {categoryLabel(item.listingCategory)} · {item.lastMessageBody || 'No messages yet'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (active) {
    return <ChatScreen conversation={active} onBack={() => setActive(null)} />;
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        className="flex-1"
        contentContainerStyle={[{ padding: 20, paddingBottom: 32 }, items.length === 0 && { flexGrow: 1 }]}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
        ListHeaderComponent={
          <View>
            <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">CONVERSATIONS</Text>
            <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">Messages</Text>
            <Text className="text-muted text-[14px] leading-[21px] mt-[7px] mb-[18px]">Talk to buyers and sellers before handover.</Text>
          </View>
        }
        ListEmptyComponent={
          <StateView
            isLoading={isLoading || startConversation.isPending}
            loadingTitle={startConversation.isPending ? 'Opening conversation' : 'Loading conversations'}
            error={startError || error}
            errorTitle="Messages are unavailable"
            onRetry={() => void refetch()}
            isEmpty={!isLoading && !startConversation.isPending && !startError && !error && items.length === 0}
            emptyIcon="chatbubbles-outline"
            emptyTitle="No conversations yet"
            emptyMessage="Tap 'Contact seller' on a listing to start a chat."
            containerClassName="flex-1 min-h-[240px] px-[22px] py-[34px]"
          />
        }
      />
    </View>
  );
}
