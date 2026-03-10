import AsyncStorage from '@react-native-async-storage/async-storage';

const BLOCKED_KEY = 'jawwing_blocked_users';

let cache: string[] | null = null;

export async function getBlockedUsers(): Promise<string[]> {
  if (cache) return cache;
  try {
    const data = await AsyncStorage.getItem(BLOCKED_KEY);
    cache = data ? (JSON.parse(data) as string[]) : [];
    return cache;
  } catch {
    return [];
  }
}

export async function blockUser(userId: string): Promise<void> {
  const blocked = await getBlockedUsers();
  if (!blocked.includes(userId)) {
    blocked.push(userId);
    cache = blocked;
    await AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(blocked));
  }
}

export async function unblockAll(): Promise<void> {
  cache = [];
  await AsyncStorage.removeItem(BLOCKED_KEY);
}

export function invalidateBlockedCache(): void {
  cache = null;
}
