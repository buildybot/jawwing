"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "jawwing_blocked_users";
const BLOCK_EVENT = "jawwing:blocked_updated";

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
    window.dispatchEvent(new CustomEvent(BLOCK_EVENT));
  } catch { /* noop */ }
}

export function useBlockedUsers() {
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    setBlocked(loadBlocked());
    const handler = () => setBlocked(loadBlocked());
    window.addEventListener(BLOCK_EVENT, handler);
    return () => window.removeEventListener(BLOCK_EVENT, handler);
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
