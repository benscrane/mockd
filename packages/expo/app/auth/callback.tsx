import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { useAuth } from '@/hooks/useAuth';

/**
 * OAuth callback handler for deep links.
 * Handles mockd://auth/callback?token=xxx
 */
export default function AuthCallback() {
  const theme = useTheme();
  const { token, error: errorParam } = useLocalSearchParams<{
    token?: string;
    error?: string;
  }>();
  const { handleOAuthCallback } = useAuth();

  useEffect(() => {
    async function processCallback() {
      if (errorParam) {
        // OAuth was denied or failed
        router.replace({
          pathname: '/(auth)/login',
          params: { error: errorParam },
        });
        return;
      }

      if (token) {
        try {
          await handleOAuthCallback(token);
          router.replace('/(app)/projects');
        } catch {
          router.replace({
            pathname: '/(auth)/login',
            params: { error: 'authentication_failed' },
          });
        }
      } else {
        // No token provided
        router.replace('/(auth)/login');
      }
    }

    processCallback();
  }, [token, errorParam, handleOAuthCallback]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text variant="bodyLarge" style={styles.text}>
        Completing sign in...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    marginTop: 16,
  },
});
