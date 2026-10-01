import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';

interface PasswordInputProps extends TextInputProps {}

export const PasswordInput: React.FC<PasswordInputProps> = ({ style, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View className="relative justify-center">
      <TextInput
        {...props}
        secureTextEntry={!visible}
        style={[{ paddingRight: 48 }, style]}
        className={`${props.className ?? ''}`}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        className="absolute right-0 h-full justify-center px-4"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        hitSlop={8}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
      </Pressable>
    </View>
  );
};
