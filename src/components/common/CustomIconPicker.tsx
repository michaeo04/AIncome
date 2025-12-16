// Custom Icon Picker - Upload and select custom images for icons

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
// Use legacy API to keep readAsStringAsync support on Expo SDK 54
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

interface CustomIconPickerProps {
  currentIcon?: string; // Emoji icon
  currentIconUrl?: string; // Custom image URL
  onIconSelected: (emoji: string, iconUrl?: string) => void;
  type?: 'category' | 'budget';
}

const CustomIconPicker: React.FC<CustomIconPickerProps> = ({
  currentIcon,
  currentIconUrl,
  onIconSelected,
  type = 'category',
}) => {
  const { user } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | undefined>(currentIconUrl);

  // Request permissions and pick image
  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to upload custom icons.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square crop
        quality: 0.7, // Compress to reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  // Upload image to Supabase Storage
  const uploadImage = async (uri: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload images');
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      // Read file as base64 using expo-file-system
      const base64 = await FileSystem.readAsStringAsync(uri, {
        // Using literal string for compatibility across Expo versions
        encoding: 'base64',
      });

      // Convert base64 to ArrayBuffer for Supabase
      const arrayBuffer = decode(base64);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('icons')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        const bucketMissing =
          error.name === 'StorageApiError' &&
          typeof error.message === 'string' &&
          error.message.toLowerCase().includes('bucket not found');

        if (bucketMissing) {
          Alert.alert(
            'Icons bucket missing',
            'Storage bucket "icons" is not found. Please create a public bucket named "icons" in Supabase Storage or run migration 009_add_custom_icons.sql, then try again.'
          );
          return;
        }

        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('icons')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      setSelectedImageUri(publicUrl);
      onIconSelected('🖼️', publicUrl); // Use picture emoji as fallback

      Alert.alert('Success', 'Icon uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove custom image
  const removeCustomImage = () => {
    setSelectedImageUri(undefined);
    onIconSelected(currentIcon || '📦', undefined);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Icon</Text>

      <View style={styles.iconContainer}>
        {/* Current Icon Display */}
        <View style={styles.currentIcon}>
          {selectedImageUri || currentIconUrl ? (
            <Image
              source={{ uri: selectedImageUri || currentIconUrl }}
              style={styles.iconImage}
            />
          ) : (
            <Text style={styles.emojiIcon}>{currentIcon || '📦'}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.uploadIcon}>📤</Text>
                <Text style={styles.uploadText}>Upload Custom</Text>
              </>
            )}
          </TouchableOpacity>

          {(selectedImageUri || currentIconUrl) && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeCustomImage}
              disabled={isUploading}
            >
              <Text style={styles.removeText}>❌ Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.hint}>
        Upload a custom image (recommended: 256x256px) or use emoji icons
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  currentIcon: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceHover,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emojiIcon: {
    fontSize: 40,
  },
  iconImage: {
    width: 76,
    height: 76,
    borderRadius: BORDER_RADIUS.md,
  },
  actions: {
    flex: 1,
    gap: SPACING.sm,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  uploadIcon: {
    fontSize: 20,
  },
  uploadText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textWhite,
  },
  removeButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  removeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
});

export default CustomIconPicker;
