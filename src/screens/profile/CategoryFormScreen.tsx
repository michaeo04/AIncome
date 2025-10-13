// Category Form Screen - Add/Edit Category

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { CATEGORY_COLORS, DEFAULT_ICONS } from '../../constants';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

type CategoryFormScreenNavigationProp = StackNavigationProp<
  ProfileStackParamList,
  'CategoryForm'
>;
type CategoryFormScreenRouteProp = RouteProp<ProfileStackParamList, 'CategoryForm'>;

const CategoryFormScreen: React.FC = () => {
  const navigation = useNavigation<CategoryFormScreenNavigationProp>();
  const route = useRoute<CategoryFormScreenRouteProp>();
  const { user } = useAuthStore();

  const categoryId = route.params?.categoryId;
  const initialType = route.params?.type || 'expense';
  const isEditMode = !!categoryId;

  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('💰');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // Available icons based on type
  const availableIcons =
    type === 'income' ? DEFAULT_ICONS.income : DEFAULT_ICONS.expense;

  // Fetch category if editing
  useEffect(() => {
    if (isEditMode) {
      fetchCategory();
    }
  }, []);

  const fetchCategory = async () => {
    if (!user || !categoryId) return;

    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setType(data.type);
        setName(data.name);
        setSelectedIcon(data.icon);
        setSelectedColor(data.color);
      }
    } catch (error: any) {
      console.error('Error fetching category:', error);
      Alert.alert('Error', 'Failed to load category');
      navigation.goBack();
    } finally {
      setIsFetching(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Invalid Name', 'Please enter a category name');
      return false;
    }

    if (name.trim().length < 2) {
      Alert.alert('Invalid Name', 'Category name must be at least 2 characters');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsLoading(true);
    try {
      const categoryData = {
        user_id: user.id,
        name: name.trim(),
        type,
        icon: selectedIcon,
        color: selectedColor,
        is_default: false,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', categoryId)
          .eq('user_id', user.id);

        if (error) throw error;
        Alert.alert('Success', 'Category updated successfully');
      } else {
        // Check for duplicate name
        const { data: existing, error: checkError } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', name.trim())
          .eq('type', type)
          .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
          Alert.alert(
            'Duplicate Name',
            'A category with this name already exists for this type'
          );
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.from('categories').insert([categoryData]);

        if (error) throw error;
        Alert.alert('Success', 'Category created successfully');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving category:', error);
      Alert.alert('Error', error.message || 'Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading category...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Category' : 'New Category'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <Text style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Type Selection (only for new categories) */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Type</Text>
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'income' && styles.typeButtonActive,
                ]}
                onPress={() => setType('income')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'expense' && styles.typeButtonActive,
                ]}
                onPress={() => setType('expense')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g., Groceries, Rent, Salary"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            editable={!isLoading}
            maxLength={50}
          />
        </View>

        {/* Icon Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {availableIcons.map((icon, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.iconButton,
                  selectedIcon === icon && styles.iconButtonSelected,
                ]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Text style={styles.iconText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.colorGrid}>
            {CATEGORY_COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorButtonSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview with Gradient */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preview</Text>
          <LinearGradient
            colors={[selectedColor + '20', selectedColor + '40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <LinearGradient
              colors={[selectedColor + '60', selectedColor + '80']}
              style={styles.previewIcon}
            >
              <Text style={styles.previewIconText}>{selectedIcon}</Text>
            </LinearGradient>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{name || 'Category Name'}</Text>
              <Text style={styles.previewType}>
                {type === 'income' ? '💰 Income' : '💸 Expense'}
              </Text>
            </View>
            <View
              style={[styles.previewColor, { backgroundColor: selectedColor }]}
            />
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  saveButtonDisabled: {
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  nameInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  iconButton: {
    width: '16.66%',
    aspectRatio: 1,
    margin: '1.5%',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  iconText: {
    fontSize: 28,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  colorButton: {
    width: 48,
    height: 48,
    margin: 4,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#1F2937',
    borderWidth: 3,
  },
  colorCheckmark: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  previewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewIconText: {
    fontSize: 24,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  previewType: {
    fontSize: 14,
    color: '#6B7280',
  },
  previewColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 8,
  },
});

export default CategoryFormScreen;
