import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, getErrorMessage } from '@/services/api';
import { colors } from '@/theme';
import {
  CATEGORIES,
  CONDITIONS,
  categoryLabel,
  formatQuantityWithUnit,
  getCategoryUnit,
  type Category,
  type Condition,
} from '@/types';
import { EstimatorCard } from '@/components/EstimatorCard';
import { RateCardRow } from '@/components/RateCardRow';
import { StateView } from '@/components/ui/StateView';
import { useEstimate } from '@/hooks/useEstimate';
import { useRateCard, type RowRate } from '@/hooks/useRateCard';

type Mode = 'estimate' | 'browse';

const MODES: { key: Mode; label: string }[] = [
  { key: 'estimate', label: 'Estimate' },
  { key: 'browse', label: 'Browse rates' },
];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      className={`min-h-[48px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'}`}
      onPress={onPress}
    >
      <Text className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}>{label}</Text>
    </Pressable>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View
      className="flex-row bg-surface-muted border border-border rounded-pill p-[4px] mb-[18px]"
      accessibilityRole="tablist"
      accessibilityLabel="Rates modes"
    >
      {MODES.map(({ key, label }) => {
        const selected = mode === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            className={`flex-1 min-h-[44px] rounded-pill items-center justify-center ${selected ? 'bg-surface shadow-card' : ''}`}
            onPress={() => onChange(key)}
          >
            <Text className={`text-[13px] font-bold ${selected ? 'text-ink' : 'text-muted'}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScreenHeader({
  title,
  subtitle,
  mode,
  onModeChange,
}: {
  title: string;
  subtitle: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}) {
  return (
    <View>
      <Text className="text-leaf text-[11px] font-extrabold tracking-[1.3px]">MARKET-BENCHMARKED RATES</Text>
      <Text accessibilityRole="header" className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]">{title}</Text>
      <Text className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]">{subtitle}</Text>
      <ModeSwitch mode={mode} onChange={onModeChange} />
    </View>
  );
}

function EstimateMode({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
  const [category, setCategory] = useState<Category>('PLASTICS');
  const [condition, setCondition] = useState<Condition>('GOOD');
  const [weightText, setWeightText] = useState('');
  const [pieceCount, setPieceCount] = useState(1);
  const [debouncedWeight, setDebouncedWeight] = useState<number | undefined>(undefined);

  const unit = getCategoryUnit(category);
  const parsedWeight = Number.isFinite(parseFloat(weightText)) ? parseFloat(weightText) : NaN;
  const validWeight = Number.isFinite(parsedWeight) && parsedWeight >= 0.1;

  useEffect(() => {
    if (unit !== 'kg') return;
    const timer = setTimeout(() => {
      setDebouncedWeight(validWeight ? parsedWeight : undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [unit, validWeight, parsedWeight]);

  const selectCategory = useCallback((next: Category) => {
    setCategory(next);
    setWeightText('');
    setDebouncedWeight(undefined);
    setPieceCount(1);
  }, []);

  const weightParam = unit === 'kg' ? debouncedWeight : undefined;
  const pieceParam = unit === 'piece' ? pieceCount : undefined;
  const { data: estimate, isFetching, error } = useEstimate(category, condition, weightParam, pieceParam);

  const notFound = error instanceof ApiError && error.status === 404;
  const estimateError = error && !notFound ? getErrorMessage(error, 'Could not load the estimate.') : '';
  const hasQuantity = unit === 'piece' ? true : debouncedWeight !== undefined;
  const quantityLabel = formatQuantityWithUnit(unit, unit === 'piece' ? pieceCount : debouncedWeight);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title="What's it worth?"
        subtitle="Pick a category and condition, tell us how much you have, and see the live value against the market benchmark."
        mode={mode}
        onModeChange={onModeChange}
      />

      <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 13 }}>
        {CATEGORIES.map((item) => (
          <Chip
            key={item}
            label={categoryLabel(item)}
            selected={category === item}
            onPress={() => selectCategory(item)}
          />
        ))}
      </ScrollView>

      <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Condition</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 13 }}>
        {CONDITIONS.map((item) => (
          <Chip
            key={item}
            label={categoryLabel(item)}
            selected={condition === item}
            onPress={() => setCondition(item)}
          />
        ))}
      </ScrollView>

      {unit === 'piece' ? (
        <View className="mb-[18px]">
          <Text className="text-ink text-[12px] font-extrabold mb-[7px]">How many pieces?</Text>
          <View className="flex-row items-center gap-[14px]">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove one piece"
              accessibilityState={{ disabled: pieceCount <= 1 }}
              disabled={pieceCount <= 1}
              onPress={() => setPieceCount((count) => Math.max(1, count - 1))}
              className={`h-[48px] w-[48px] rounded-sm border border-border bg-surface items-center justify-center active:opacity-[0.72] ${pieceCount <= 1 ? 'opacity-[0.45]' : ''}`}
            >
              <Ionicons name="remove" size={18} color={colors.ink} />
            </Pressable>
            <Text
              accessibilityRole="text"
              accessibilityLabel={`${pieceCount} ${pieceCount === 1 ? 'piece' : 'pieces'}`}
              className="text-ink text-[24px] font-black tracking-tight min-w-[72px] text-center"
            >
              {pieceCount}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add one piece"
              onPress={() => setPieceCount((count) => Math.min(999, count + 1))}
              className="h-[48px] w-[48px] rounded-sm border border-border bg-surface items-center justify-center active:opacity-[0.72]"
            >
              <Ionicons name="add" size={18} color={colors.ink} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="mb-[18px]">
          <Text className="text-ink text-[12px] font-extrabold mb-[7px]">Weight</Text>
          <View className="flex-row items-center border border-border rounded-sm bg-surface min-h-[52px] px-[14px]">
            <TextInput
              className="flex-1 text-ink text-[16px] font-bold min-w-0"
              value={weightText}
              onChangeText={setWeightText}
              keyboardType="decimal-pad"
              placeholder="e.g. 12.5"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Weight in kilograms"
              accessibilityHint="Minimum 0.1 kg"
            />
            <Text className="text-muted text-[14px] font-bold ml-[8px]">kg</Text>
          </View>
          {weightText !== '' && !validWeight ? (
            <Text accessibilityRole="alert" className="text-danger text-[12px] font-semibold mt-[6px]">
              Enter a weight of at least 0.1 kg.
            </Text>
          ) : null}
        </View>
      )}

      {estimateError ? (
        <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] mb-[14px] text-[13px] leading-[19px]">
          {estimateError}
        </Text>
      ) : null}

      <EstimatorCard
        estimate={estimate ?? null}
        isLoading={isFetching && !estimate}
        notFound={notFound}
        hasQuantity={hasQuantity}
        quantityLabel={quantityLabel}
        category={category}
        condition={condition}
      />
    </ScrollView>
  );
}

function BrowseMode({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
  const { data: rows = [], isLoading, error, refetch, isRefetching } = useRateCard();
  const errorMessage = error ? getErrorMessage(error, 'Could not load the current rate card.') : '';

  const renderItem = useCallback(({ item }: { item: RowRate }) => <RateCardRow item={item} />, []);

  return (
    <StateView
      fullScreen
      isLoading={isLoading}
      loadingTitle="Loading current rates"
      loadingSubtitle="Only the currently effective published rate is shown per category."
      error={rows.length === 0 ? error : null}
      errorTitle="Rate card unavailable"
      errorMessage={errorMessage}
      onRetry={() => void refetch()}
      retryLabel="Try again"
    >
      <FlatList
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        data={rows}
        keyExtractor={(item) => item.category}
        renderItem={renderItem}
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
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
            <ScreenHeader
              title="Today's rates"
              subtitle="Values are per unit — by piece for appliances and e-waste, by kilogram for everything else. The dot next to each rate shows how it compares with the market benchmark. The final condition and value are confirmed by a person before a listing is matched."
              mode={mode}
              onModeChange={onModeChange}
            />
            {errorMessage ? <Text accessibilityRole="alert" className="text-danger bg-danger-soft p-[12px] rounded-[10px] my-[12px] text-[13px] leading-[19px]">{errorMessage}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <StateView
            isEmpty
            emptyIcon="pricetags-outline"
            emptyTitle="No published rates yet"
            emptyMessage="An admin will publish rates once the network is live."
            containerClassName="border border-border rounded-md bg-surface"
          />
        }
      />
    </StateView>
  );
}

export function RateCardScreen() {
  const [mode, setMode] = useState<Mode>('estimate');
  const handleModeChange = useCallback((next: Mode) => setMode(next), []);

  return (
    <View className="flex-1 bg-background">
      {mode === 'estimate' ? (
        <EstimateMode mode={mode} onModeChange={handleModeChange} />
      ) : (
        <BrowseMode mode={mode} onModeChange={handleModeChange} />
      )}
    </View>
  );
}
