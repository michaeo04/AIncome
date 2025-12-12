// Edit Profile Screen - Update User Information and Avatar

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { supabase } from '../../services/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

type EditProfileScreenNavigationProp = StackNavigationProp<
  ProfileStackParamList,
  'EditProfile'
>;

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
      paddingTop: theme.spacing.sm,
    },
    cancelButton: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    saveButton: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.primary,
    },
    saveButtonDisabled: {
      color: theme.colors.textTertiary,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxxl,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: theme.spacing.lg,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 48,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textWhite,
    },
    uploadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    avatarActionButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    avatarActionText: {
      color: theme.colors.textWhite,
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
    },
    removeButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.danger,
    },
    removeButtonText: {
      color: theme.colors.danger,
    },
    formSection: {
      marginBottom: theme.spacing.xxl,
    },
    label: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 14,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.lg,
    },
    inputDisabled: {
      backgroundColor: theme.colors.surfaceHover,
      color: theme.colors.textSecondary,
    },
    hint: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: -12,
      marginBottom: theme.spacing.lg,
    },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    },
    infoIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    infoText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
  }));

  useEffect(() => {
    loadProfile();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload photos.'
        );
      }
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (avatarUrl) {
      if (avatarUrl.startsWith('http')) {
        return avatarUrl;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
      return data.publicUrl;
    }
    return null;
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Fetch the image as a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Read as array buffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Generate unique filename
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update avatar URL in state
      setAvatarUrl(filePath);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', user.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Avatar updated successfully');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', error.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user || !avatarUrl) return;

    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from storage if it's a stored file (not external URL)
              if (!avatarUrl.startsWith('http')) {
                await supabase.storage.from('avatars').remove([avatarUrl]);
              }

              // Update profile
              const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user.id);

              if (error) throw error;

              setAvatarUrl(null);
              Alert.alert('Success', 'Avatar removed successfully');
            } catch (error: any) {
              console.error('Error removing avatar:', error);
              Alert.alert('Error', 'Failed to remove avatar');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {getAvatarUrl() ? (
              <Image source={{ uri: getAvatarUrl()! }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {fullName
                    ? fullName.charAt(0).toUpperCase()
                    : user?.email?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.textWhite} />
              </View>
            )}
          </View>

          <View style={styles.avatarActions}>
            <TouchableOpacity
              style={styles.avatarActionButton}
              onPress={pickImage}
              disabled={isUploading}
            >
              <Text style={styles.avatarActionText}>
                {avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>
            {avatarUrl && (
              <TouchableOpacity
                style={[styles.avatarActionButton, styles.removeButton]}
                onPress={removeAvatar}
                disabled={isUploading}
              >
                <Text style={[styles.avatarActionText, styles.removeButtonText]}>
                  Remove
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={theme.colors.textTertiary}
            value={fullName}
            onChangeText={setFullName}
            editable={!isSaving}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={user?.email}
            editable={false}
          />
          <Text style={styles.hint}>Email cannot be changed</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Profile Visibility</Text>
            <Text style={styles.infoText}>
              Your profile information is private and only visible to you.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default EditProfileScreen;
