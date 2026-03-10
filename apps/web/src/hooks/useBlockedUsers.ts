"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "jawwing_blocked_users";
const BLOCK_EVENT = "jawwing:blocked_updated";

function loadLocalBlocked(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveLocalBlocked(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(BLOCK_EVENT));
  } catch { /* noop */ }
}

async function fetchBlockedFromAPI(): Promise<string[]> {
  try {
    const res = await fetch("/api/v1/blocks");
    if (!res.ok) return [];
    const data = await res.json() as { blocked: string[] };
    return data.blocked ?? [];
  } catch {
    return [];
  }
}

async function addBlockToAPI(userId: string): Promise<void> {
  try {
    await fetch("/api/v1/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_user_id: userId }),
    });
  } catch { /* best-effort */ }
}

async function removeBlockFromAPI(userId: string): Promise<void> {
  try {
    await fetch("/api/v1/blocks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked_user_id: userId }),
    });
  } catch { /* best-effort */ }
}

export function useBlockedUsers() {
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    // Start with local storage, then sync from API
    setBlocked(loadLocalBlocked());
    fetchBlockedFromAPI().then((apiList) => {
      if (apiList.length > 0) {
        // Merge API list with local (API is source of truth)
        const merged = Array.from(new Set([...loadLocalBlocked(), ...apiList]));
        setBlocked(merged);
        saveLocalBlocked(merged);
      }
    });

    const handler = () => setBlocked(loadLocalBlocked());
    window.addEventListener(BLOCK_EVENT, handler);
    return () => window.removeEventListener(BLOCK_EVENT, handler);
  }, []);

  const blockUser = useCallback((userId: string) => {
    setBlocked((prev) => {
      if (prev.includes(userId)) return prev;
      const next = [...prev, userId];
      saveLocalBlocked(next);
      addBlockToAPI(userId);
      return next;
    });
  }, []);

  const unblockUser = useCallback((userId: string) => {
    setBlocked((prev) => {
      const next = prev.filter((id) => id !== userId);
      saveLocalBlocked(next);
      removeBlockFromAPI(userId);
      return next;
    });
  }, []);

  const unblockAll = useCallback(() => {
    setBlocked((prev) => {
      // Remove all from API
      for (const userId of prev) {
        removeBlockFromAPI(userId);
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
      return [];
    });
  }, []);

  const isBlocked = useCallback(
    (userId: string) => blocked.includes(userId),
    [blocked]
  );

  return { blocked, blockedCount: blocked.length, blockUser, unblockUser, unblockAll, isBlocked };
}
