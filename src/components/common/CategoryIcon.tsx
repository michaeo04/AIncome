// Category Icon - Display custom image or emoji icon

import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { BORDER_RADIUS } from '../../theme/modernTheme';

interface CategoryIconProps {
  icon: string; // Emoji fallback
  iconUrl?: string; // Custom image URL
  size?: number;
  style?: ViewStyle;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({
  icon,
  iconUrl,
  size = 40,
  style,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {iconUrl ? (
        <Image
          source={{ uri: iconUrl }}
          style={[styles.image, { width: size, height: size }]}
        />
      ) : (
        <Text style={[styles.emoji, { fontSize: size * 0.6 }]}>
          {icon}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    borderRadius: BORDER_RADIUS.md,
  },
  emoji: {
    textAlign: 'center',
  },
});

export default CategoryIcon;
