// Toast Notification System - User feedback utility

import { Alert, Platform } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title?: string;
  message: string;
  duration?: number;
  type?: ToastType;
}

// Icon mapping for different toast types
const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
};

// Title mapping for different toast types
const TOAST_TITLES: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
  warning: 'Warning',
};

/**
 * Show a toast notification
 * On mobile: Uses Alert with appropriate styling
 * On web: Could be enhanced with a custom toast component
 */
export const showToast = ({
  title,
  message,
  duration = 3000,
  type = 'info',
}: ToastOptions) => {
  const toastTitle = title || TOAST_TITLES[type];
  const icon = TOAST_ICONS[type];

  // For now, use Alert.alert which works on all platforms
  // In production, you might want to use a library like react-native-toast-message
  Alert.alert(
    `${icon} ${toastTitle}`,
    message,
    [{ text: 'OK', style: type === 'error' ? 'destructive' : 'default' }],
    { cancelable: true }
  );
};

// Convenience methods
export const toast = {
  success: (message: string, title?: string) =>
    showToast({ message, title, type: 'success' }),

  error: (message: string, title?: string) =>
    showToast({ message, title, type: 'error' }),

  info: (message: string, title?: string) =>
    showToast({ message, title, type: 'info' }),

  warning: (message: string, title?: string) =>
    showToast({ message, title, type: 'warning' }),
};

/**
 * Show a confirmation dialog
 */
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  destructive?: boolean;
}

export const showConfirm = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmOptions) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};
