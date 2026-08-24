import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ApiError, getErrorMessage } from '@/services/api';
import {
  formatQuantityWithUnit,
  getCategoryUnit,
  type Category,
  type Condition,
} from '@/types';
import { EstimatorCard } from '@/components/EstimatorCard';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useEstimate } from '@/hooks/useEstimate';
import { CategoryConditionSelector } from '@/components/ratecard/CategoryConditionSelector';
import { QuantityInputBox } from '@/components/ratecard/QuantityInputBox';

export const RateCardEstimator = React.memo(function RateCardEstimator() {
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
    }, 350);
    return () => clearTimeout(timer);
  }, [unit, validWeight, parsedWeight]);

  const selectCategory = useCallback((next: Category) => {
    setCategory(next);
    setWeightText('');
    setDebouncedWeight(undefined);
    setPieceCount(1);
  }, []);

  const adjustPieceCount = useCallback((delta: number) => {
    setPieceCount((prev) => Math.max(1, prev + delta));
  }, []);

  const weightParam = unit === 'kg' ? debouncedWeight : undefined;
  const pieceParam = unit === 'piece' ? pieceCount : undefined;
  const { data: estimate, isFetching, error } = useEstimate(category, condition, weightParam, pieceParam);

  const notFound = error instanceof ApiError && error.status === 404;
  const estimateError = error && !notFound ? getErrorMessage(error, 'Could not load the estimate.') : '';
  const hasQuantity = unit === 'piece' ? true : debouncedWeight !== undefined;
  const quantityLabel = formatQuantityWithUnit(unit, unit === 'piece' ? pieceCount : debouncedWeight);

  return (
    <View className="gap-[16px]">
      {estimateError ? <ErrorBanner message={estimateError} /> : null}

      <CategoryConditionSelector
        category={category}
        onSelectCategory={selectCategory}
        condition={condition}
        onSelectCondition={setCondition}
      />

      <QuantityInputBox
        unit={unit}
        weightText={weightText}
        onChangeWeightText={setWeightText}
        pieceCount={pieceCount}
        onAdjustPieceCount={adjustPieceCount}
      />

      <EstimatorCard
        estimate={estimate ?? null}
        isLoading={isFetching}
        notFound={notFound}
        hasQuantity={hasQuantity}
        quantityLabel={quantityLabel}
        category={category}
        condition={condition}
      />
    </View>
  );
});
