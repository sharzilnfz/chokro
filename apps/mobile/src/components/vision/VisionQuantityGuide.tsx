import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { CATEGORIES, categoryLabel, getCategoryUnit, type Category } from '@/types';

export interface VisionQuantityGuideProps {
  knowsQty: boolean;
  onToggleKnowsQty: () => void;
  qtyCategory: Category;
  onChangeQtyCategory: (category: Category) => void;
  qtyText: string;
  onChangeQtyText: (text: string) => void;
}

export const VisionQuantityGuide = React.memo(function VisionQuantityGuide({
  knowsQty,
  onToggleKnowsQty,
  qtyCategory,
  onChangeQtyCategory,
  qtyText,
  onChangeQtyText,
}: VisionQuantityGuideProps) {
  const qtyUnit = getCategoryUnit(qtyCategory);

  return (
    <View
      className="bg-surface border border-border rounded-md p-[16px] mt-[13px] shadow-card"
      style={{ elevation: 2 }}
    >
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="I know the quantity"
        accessibilityState={{ checked: knowsQty }}
        className="flex-row items-center gap-[9px] min-h-[44px] active:opacity-[0.72]"
        onPress={onToggleKnowsQty}
      >
        <Ionicons
          name={knowsQty ? 'checkbox' : 'square-outline'}
          size={21}
          color={knowsQty ? colors.leaf : colors.muted}
        />
        <Text className="text-ink text-[15px] font-bold flex-1">I know the quantity</Text>
        <Text className="text-muted text-[12px] font-semibold">optional</Text>
      </Pressable>

      {knowsQty ? (
        <View className="mt-[6px]">
          <Text className="text-muted text-[12px] font-bold mb-[8px]">
            Which scrap is it? This also guides the AI.
          </Text>
          <View className="flex-row flex-wrap gap-[7px]">
            {CATEGORIES.map((item) => {
              const selected = qtyCategory === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityLabel={categoryLabel(item)}
                  accessibilityState={{ checked: selected }}
                  className={`min-h-[40px] px-[11px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
                    selected ? 'bg-leaf-soft border-leaf' : 'bg-background border-border'
                  }`}
                  onPress={() => onChangeQtyCategory(item)}
                >
                  <Text
                    className={`text-[12px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}
                  >
                    {categoryLabel(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="flex-row mt-[11px]">
            <TextInput
              accessibilityLabel={
                qtyUnit === 'kg' ? 'Declared weight in kilograms' : 'Declared number of pieces'
              }
              className="flex-1 min-h-[50px] border border-r-0 border-border rounded-tl-[12px] rounded-bl-[12px] bg-background text-ink text-[16px] px-[13px]"
              placeholder={qtyUnit === 'kg' ? 'e.g. 2.5' : 'e.g. 1'}
              placeholderTextColor={colors.muted}
              keyboardType={qtyUnit === 'kg' ? 'decimal-pad' : 'number-pad'}
              value={qtyText}
              onChangeText={onChangeQtyText}
            />
            <View className="min-w-[64px] min-h-[50px] bg-surface-muted border border-border rounded-tr-[12px] rounded-br-[12px] items-center justify-center px-[12px]">
              <Text className="text-ink text-[14px] font-bold">{qtyUnit}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
});
