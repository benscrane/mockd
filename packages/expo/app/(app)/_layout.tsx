import { Redirect, Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

/**
 * Layout for authenticated screens.
 * Redirects to login if not authenticated.
 */
export default function AppLayout() {
  const theme = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="projects/index"
        options={{
          title: 'Projects',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="projects/[projectId]/index"
        options={{
          title: 'Project',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="projects/[projectId]/endpoints/[endpointId]"
        options={{
          title: 'Endpoint',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
