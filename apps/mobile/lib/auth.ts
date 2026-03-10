import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCOUNT_TOKEN_KEY = 'jw_account_token';

export async function getAccountToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCOUNT_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAccountToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACCOUNT_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export async function clearAccountToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACCOUNT_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function isSignedIn(): Promise<boolean> {
  const token = await getAccountToken();
  return token !== null && token.length > 0;
}
