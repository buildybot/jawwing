import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../lib/theme';

const linking = {
  prefixes: ['jawwing://', 'https://jawwing.com'],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          index: '',
          post: 'new',
          profile: 'settings',
        },
      },
      'post/[id]': 'post/:id',
      constitution: 'constitution',
      about: 'about',
    },
  },
};

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="constitution" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="webview" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
