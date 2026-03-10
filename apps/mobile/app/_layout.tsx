import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { colors } from '../lib/theme';
import { isSignedIn } from '../lib/auth';
import { registerPushToken } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PREF_KEY = 'jw_notif_replies';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications() {
  try {
    // Only register if user has notifications enabled (or default = enabled)
    const pref = await AsyncStorage.getItem(NOTIF_PREF_KEY);
    if (pref === 'false') return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Only send push token if signed in
    const signedIn = await isSignedIn();
    if (!signedIn) return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(tokenData.data);
  } catch {
    // Push setup is non-critical — swallow errors
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Android notification channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    registerForPushNotifications();
  }, []);

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
        <Stack.Screen name="signin" options={{ headerShown: false }} />
        <Stack.Screen name="my-posts" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
