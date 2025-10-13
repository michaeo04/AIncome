// Skeleton Loader Components - Loading placeholders

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Skeleton for transaction list item
export const TransactionSkeleton: React.FC = () => (
  <View style={styles.transactionSkeleton}>
    <View style={styles.transactionLeft}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.transactionInfo}>
        <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
        <Skeleton width={80} height={12} />
      </View>
    </View>
    <View style={styles.transactionRight}>
      <Skeleton width={80} height={18} style={{ marginBottom: 4 }} />
      <Skeleton width={60} height={12} />
    </View>
  </View>
);

// Skeleton for budget card
export const BudgetSkeleton: React.FC = () => (
  <View style={styles.budgetSkeleton}>
    <View style={styles.budgetHeader}>
      <View style={styles.budgetLeft}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.budgetInfo}>
          <Skeleton width={100} height={16} style={{ marginBottom: 4 }} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
    <View style={styles.budgetProgress}>
      <Skeleton width="100%" height={10} borderRadius={5} style={{ marginTop: 12 }} />
      <View style={styles.budgetAmounts}>
        <Skeleton width={60} height={14} />
        <Skeleton width={60} height={14} />
        <Skeleton width={60} height={14} />
      </View>
    </View>
  </View>
);

// Skeleton for goal card
export const GoalSkeleton: React.FC = () => (
  <View style={styles.goalSkeleton}>
    <View style={styles.goalHeader}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.goalInfo}>
        <Skeleton width={140} height={18} style={{ marginBottom: 4 }} />
        <Skeleton width={100} height={14} />
      </View>
      <Skeleton width={70} height={24} borderRadius={12} />
    </View>
    <View style={styles.goalProgress}>
      <Skeleton width="100%" height={10} borderRadius={5} style={{ marginVertical: 12 }} />
      <View style={styles.goalStats}>
        <Skeleton width={80} height={14} />
        <Skeleton width={80} height={14} />
        <Skeleton width={80} height={14} />
      </View>
    </View>
  </View>
);

// Skeleton for category item
export const CategorySkeleton: React.FC = () => (
  <View style={styles.categorySkeleton}>
    <View style={styles.categoryLeft}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <Skeleton width={100} height={16} style={{ marginLeft: 12 }} />
    </View>
    <Skeleton width={30} height={30} borderRadius={15} />
  </View>
);

// Skeleton for chart card
export const ChartSkeleton: React.FC = () => (
  <View style={styles.chartSkeleton}>
    <Skeleton width={140} height={20} style={{ marginBottom: 16 }} />
    <Skeleton width="100%" height={220} borderRadius={12} />
  </View>
);

// Skeleton for profile card
export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profileSkeleton}>
    <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: 16 }} />
    <Skeleton width={160} height={20} style={{ marginBottom: 8 }} />
    <Skeleton width={200} height={14} style={{ marginBottom: 16 }} />
    <View style={styles.profileStats}>
      <Skeleton width={80} height={40} borderRadius={8} />
      <Skeleton width={80} height={40} borderRadius={8} />
      <Skeleton width={80} height={40} borderRadius={8} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  transactionSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  budgetSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetInfo: {
    marginLeft: 12,
  },
  budgetProgress: {
    marginTop: 12,
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  goalSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  goalProgress: {
    marginTop: 12,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categorySkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  profileSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
  },
});
