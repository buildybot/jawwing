import { Redirect } from 'expo-router';

// Auth is no longer required — redirect to main feed
export default function AuthScreen() {
  return <Redirect href="/(tabs)" />;
}
