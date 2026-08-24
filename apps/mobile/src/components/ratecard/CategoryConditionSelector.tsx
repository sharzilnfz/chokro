import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  CATEGORIES,
  CONDITIONS,
  categoryLabel,
  type Category,
  type Condition,
} from '@/types';

export interface CategoryConditionSelectorProps {
  category: Category;
  onSelectCategory: (category: Category) => void;
  condition: Condition;
  onSelectCondition: (condition: Condition) => void;
}

export const CategoryConditionSelector = React.memo(function CategoryConditionSelector({
  category,
  onSelectCategory,
  condition,
  onSelectCondition,
}: CategoryConditionSelectorProps) {
  return (
    <View className="gap-[16px]">
      {/* Category selector */}
      <View>
        <Text className="text-ink text-[12px] font-extrabold mb-[8px]">Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {CATEGORIES.map((item) => {
            const selected = category === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={categoryLabel(item)}
                accessibilityState={{ checked: selected }}
                className={`min-h-[44px] px-[14px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
                  selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'
                }`}
                onPress={() => onSelectCategory(item)}
              >
                <Text
                  className={`text-[13px] font-bold ${selected ? 'text-leaf-dark' : 'text-muted'}`}
                >
                  {categoryLabel(item)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Condition band selector */}
      <View>
        <Text className="text-ink text-[12px] font-extrabold mb-[8px]">Condition</Text>
        <View className="flex-row gap-[8px]">
          {CONDITIONS.map((item) => {
            const selected = condition === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={categoryLabel(item)}
                accessibilityState={{ checked: selected }}
                className={`flex-1 min-h-[44px] rounded-pill border items-center justify-center active:opacity-[0.72] ${
                  selected ? 'border-leaf bg-leaf-soft' : 'border-border bg-surface'
                }`}
                onPress={() => onSelectCondition(item)}
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
      </View>
    </View>
  );
});
