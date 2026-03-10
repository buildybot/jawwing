"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "jawwing_blocked_users";

function loadBlocked(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveBlocked(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* noop */ }
}

export function useBlockedUsers() {
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    setBlocked(loadBlocked());
  }, []);

  const blockUser = useCallback((userId: string) => {
    setBlocked((prev) => {
      if (prev.includes(userId)) return prev;
      const next = [...prev, userId];
      saveBlocked(next);
      return next;
    });
  }, []);

  const unblockAll = useCallback(() => {
    setBlocked([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  const isBlocked = useCallback(
    (userId: string) => blocked.includes(userId),
    [blocked]
  );

  return { blocked, blockedCount: blocked.length, blockUser, unblockAll, isBlocked };
}
