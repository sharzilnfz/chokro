import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/services/api';
import { useMessages } from '@/hooks/useMessages';
import { StateView } from '@/components/ui/StateView';
import type { Conversation } from '@/hooks/useStartConversation';

type ChatScreenProps = {
  conversation: Conversation;
  onBack: () => void;
};

export function ChatScreen({ conversation, onBack }: ChatScreenProps) {
  const { user } = useAuth();
  const { data: messages, isLoading, error, refetch, isRefetching, sendMessage, isSending } = useMessages(conversation.id);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');
  const listRef = useRef<FlatList>(null);

  const canSend = draft.trim().length > 0 && !isSending;

  useEffect(() => {
    if (messages?.length) {
      // Scroll to the latest message after load and after sending.
      const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
      return () => clearTimeout(t);
    }
  }, [messages?.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setSendError('');
    try {
      await sendMessage(body);
      setDraft('');
    } catch (err) {
      setSendError(getErrorMessage(err, 'Could not send your message.'));
    }
  };

  const renderMessage = ({ item }: { item: NonNullable<typeof messages>[number] }) => {
    const mine = item.senderId === user?.id;
    return (
      <View className={`max-w-[82%] mb-[8px] ${mine ? 'self-end' : 'self-start'}`}>
        <View
          className={`rounded-[16px] px-[14px] py-[9px] ${mine ? 'bg-leaf' : 'bg-surface border border-border'}`}
        >
          <Text className={`text-[15px] leading-[20px] ${mine ? 'text-surface' : 'text-ink'}`}>{item.body}</Text>
        </View>
        <Text className={`text-[10px] text-muted mt-[3px] ${mine ? 'text-right' : ''}`}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="min-h-[60px] flex-row items-center px-[12px] border-b border-border bg-surface">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to conversations"
          hitSlop={8}
          className="w-10 h-10 items-center justify-center rounded-full active:opacity-[0.72]"
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={22} color={colors.leafDark} />
        </Pressable>
        <View className="flex-1 ml-[4px]">
          <Text className="text-ink text-[16px] font-extrabold" numberOfLines={1}>{conversation.peerEmail}</Text>
          <Text className="text-muted text-[12px]" numberOfLines={1}>
            {conversation.listingCategory} listing
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        className="flex-1 px-[16px] pt-[14px]"
        data={messages ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            colors={[colors.leaf]}
            tintColor={colors.leaf}
          />
        }
        ListEmptyComponent={
          <StateView
            isLoading={isLoading}
            loadingTitle="Loading messages"
            error={error}
            errorTitle="Messages are unavailable"
            onRetry={() => void refetch()}
            isEmpty={!isLoading && !error && (messages?.length ?? 0) === 0}
            emptyIcon="chatbubble-ellipses-outline"
            emptyTitle="No messages yet"
            emptyMessage="Say hello and arrange the handover."
            containerClassName="min-h-[220px] px-[22px] py-[30px]"
          />
        }
        ListFooterComponent={
          sendError ? (
            <Text accessibilityRole="alert" className="text-danger text-[13px] leading-[18px] mb-[8px]">{sendError}</Text>
          ) : null
        }
      />

      <View className="flex-row items-end gap-[8px] px-[12px] py-[10px] border-t border-border bg-surface">
        <TextInput
          accessibilityLabel="Message"
          className="flex-1 min-h-[46px] max-h-[120px] border border-border rounded-[14px] bg-background text-ink text-[15px] px-[14px] py-[10px]"
          placeholder="Write a message..."
          placeholderTextColor={colors.muted}
          multiline
          value={draft}
          onChangeText={setDraft}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend, busy: isSending }}
          className={`min-w-[46px] h-[46px] rounded-[14px] items-center justify-center active:opacity-[0.72] ${canSend ? 'bg-leaf' : 'bg-surface-muted'}`}
          disabled={!canSend}
          onPress={() => void handleSend()}
        >
          {isSending ? <ActivityIndicator color={colors.surface} size="small" /> : <Ionicons name="send" size={18} color={canSend ? colors.surface : colors.muted} />}
        </Pressable>
      </View>
    </View>
  );
}
