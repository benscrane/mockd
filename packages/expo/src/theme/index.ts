import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Custom colors that match the web app's Tailwind/daisyUI theme
const customColors = {
  primary: '#6366F1', // Indigo-500 (matches web primary)
  secondary: '#8B5CF6', // Violet-500
  tertiary: '#EC4899', // Pink-500
  error: '#EF4444', // Red-500
  success: '#22C55E', // Green-500
  warning: '#F59E0B', // Amber-500
  info: '#3B82F6', // Blue-500
};

// Dark theme (matches web's slate dark mode)
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: customColors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#4338CA',
    onPrimaryContainer: '#E0E7FF',
    secondary: customColors.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#6D28D9',
    onSecondaryContainer: '#EDE9FE',
    tertiary: customColors.tertiary,
    onTertiary: '#FFFFFF',
    error: customColors.error,
    onError: '#FFFFFF',
    errorContainer: '#B91C1C',
    onErrorContainer: '#FEE2E2',
    background: '#0F172A', // Slate-900
    onBackground: '#F1F5F9', // Slate-100
    surface: '#1E293B', // Slate-800
    onSurface: '#F1F5F9',
    surfaceVariant: '#334155', // Slate-700
    onSurfaceVariant: '#CBD5E1', // Slate-300
    outline: '#475569', // Slate-600
    outlineVariant: '#334155',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#F1F5F9',
    inverseOnSurface: '#0F172A',
    inversePrimary: '#4338CA',
    elevation: {
      level0: 'transparent',
      level1: '#1E293B',
      level2: '#273449',
      level3: '#2E3E57',
      level4: '#334155',
      level5: '#3B4963',
    },
    surfaceDisabled: 'rgba(241, 245, 249, 0.12)',
    onSurfaceDisabled: 'rgba(241, 245, 249, 0.38)',
    backdrop: 'rgba(15, 23, 42, 0.4)',
  },
};

// Light theme (for completeness, though app defaults to dark)
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: customColors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0E7FF',
    onPrimaryContainer: '#312E81',
    secondary: customColors.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: '#EDE9FE',
    onSecondaryContainer: '#4C1D95',
    tertiary: customColors.tertiary,
    onTertiary: '#FFFFFF',
    error: customColors.error,
    onError: '#FFFFFF',
    background: '#FFFFFF',
    onBackground: '#0F172A',
    surface: '#F8FAFC', // Slate-50
    onSurface: '#0F172A',
    surfaceVariant: '#E2E8F0', // Slate-200
    onSurfaceVariant: '#475569',
    outline: '#94A3B8', // Slate-400
    outlineVariant: '#E2E8F0',
  },
};

export { customColors };
