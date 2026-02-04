import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

/**
 * Layout for unauthenticated screens (login, register).
 */
export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
