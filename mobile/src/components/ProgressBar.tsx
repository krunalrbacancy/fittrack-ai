import React from 'react';
import { Text, View } from 'react-native';

interface ProgressBarProps {
  percentage: number;
  color: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, color }) => {
  const displayPercentage = Math.min(100, percentage);
  const label = `${displayPercentage.toFixed(1)}%`;

  return (
    <View className="h-6 w-full overflow-hidden rounded-full bg-gray-200">
      <View
        className="h-6 items-center justify-center rounded-full"
        style={{ width: `${displayPercentage}%`, backgroundColor: color }}
      >
        {displayPercentage >= 10 && <Text className="text-xs font-semibold text-white">{label}</Text>}
      </View>
      {displayPercentage < 10 && (
        <Text className="absolute inset-0 pl-2 text-xs font-semibold leading-6 text-gray-700">{label}</Text>
      )}
    </View>
  );
};
