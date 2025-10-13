// Categories Screen - Manage Income and Expense Categories

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Category } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

type CategoriesScreenNavigationProp = StackNavigationProp<
  ProfileStackParamList,
  'Categories'
>;

const CategoriesScreen: React.FC = () => {
  const navigation = useNavigation<CategoriesScreenNavigationProp>();
  const { user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch categories
  const fetchCategories = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', selectedType)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    await fetchCategories();
    setIsLoading(false);
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCategories();
    setIsRefreshing(false);
  };

  // Load on mount and when type changes
  useEffect(() => {
    loadData();
  }, [selectedType]);

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [selectedType])
  );

  // Navigate to add category
  const handleAddCategory = () => {
    navigation.navigate('CategoryForm', { type: selectedType });
  };

  // Navigate to edit category
  const handleEditCategory = (categoryId: string) => {
    navigation.navigate('CategoryForm', { categoryId });
  };

  // Delete category
  const handleDeleteCategory = (category: Category) => {
    // Check if it's a default category
    if (category.is_default) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This will affect all transactions using this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(category.id),
        },
      ]
    );
  };

  const confirmDelete = async (categoryId: string) => {
    if (!user) return;

    try {
      // Check if category is used in transactions
      const { data: transactions, error: checkError } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', categoryId)
        .limit(1);

      if (checkError) throw checkError;

      if (transactions && transactions.length > 0) {
        Alert.alert(
          'Cannot Delete',
          'This category is being used in transactions. Please reassign or delete those transactions first.'
        );
        return;
      }

      // Delete category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Category deleted successfully');
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      Alert.alert('Error', error.message || 'Failed to delete category');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity onPress={handleAddCategory}>
          <Text style={styles.addButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Type Toggle with Gradients */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={styles.typeButtonContainer}
          onPress={() => setSelectedType('income')}
          activeOpacity={0.8}
        >
          {selectedType === 'income' ? (
            <LinearGradient
              colors={[COLORS.success, COLORS.successDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.typeButton}
            >
              <Text style={styles.typeButtonTextActive}>💰 Income</Text>
            </LinearGradient>
          ) : (
            <View style={styles.typeButtonInactive}>
              <Text style={styles.typeButtonText}>💰 Income</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.typeButtonContainer}
          onPress={() => setSelectedType('expense')}
          activeOpacity={0.8}
        >
          {selectedType === 'expense' ? (
            <LinearGradient
              colors={[COLORS.danger, COLORS.dangerDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.typeButton}
            >
              <Text style={styles.typeButtonTextActive}>💸 Expense</Text>
            </LinearGradient>
          ) : (
            <View style={styles.typeButtonInactive}>
              <Text style={styles.typeButtonText}>💸 Expense</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Categories List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📂</Text>
            <Text style={styles.emptyStateText}>No categories yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the + button to create your first category
            </Text>
          </View>
        ) : (
          categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleEditCategory(category.id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[category.color + '15', category.color + '30']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoryGradient}
              >
                <View style={styles.categoryContent}>
                  <LinearGradient
                    colors={[category.color + '40', category.color + '60']}
                    style={styles.categoryIcon}
                  >
                    <Text style={styles.categoryIconText}>{category.icon}</Text>
                  </LinearGradient>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>⭐ Default</Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[styles.colorPreview, { backgroundColor: category.color }]}
                  />
                </View>

                {!category.is_default && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(category);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
    width: 60,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  addButton: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
    width: 60,
    textAlign: 'right',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  typeButtonContainer: {
    flex: 1,
  },
  typeButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  typeButtonInactive: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceHover,
  },
  typeButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textWhite,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  categoryCard: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  categoryIconText: {
    fontSize: FONT_SIZE.xxl,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  defaultBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.warning,
    fontWeight: FONT_WEIGHT.semibold,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.round,
    marginLeft: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  deleteButton: {
    padding: SPACING.lg,
  },
  deleteButtonText: {
    fontSize: FONT_SIZE.xl,
  },
});

export default CategoriesScreen;
