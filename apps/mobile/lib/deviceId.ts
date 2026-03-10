import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'jw_device_id';

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'anon-';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }
    const newId = generateId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    cachedId = newId;
    return newId;
  } catch {
    return 'anon-fallback';
  }
}

export async function clearDeviceId(): Promise<void> {
  cachedId = null;
  await AsyncStorage.removeItem(DEVICE_ID_KEY);
}
