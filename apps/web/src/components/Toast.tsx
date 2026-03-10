"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  message: string;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, duration?: number) => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, duration = 2000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "32px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Single Toast Item ─────────────────────────────────────────────────────────

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const showTimer = setTimeout(() => setVisible(true), 10);
    // Fade out
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 200);
    }, item.duration - 200);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.6875rem",
        letterSpacing: "0.08em",
        color: "#000000",
        background: "#FFFFFF",
        border: "1px solid #FFFFFF",
        padding: "8px 16px",
        whiteSpace: "nowrap",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 200ms ease, transform 200ms ease",
        pointerEvents: "none",
      }}
    >
      {item.message.toUpperCase()}
    </div>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Imperative singleton (for use outside React tree) ────────────────────────

type ToastFn = (message: string, duration?: number) => void;
let _globalShow: ToastFn | null = null;

export function registerGlobalToast(fn: ToastFn) {
  _globalShow = fn;
}

export function toast(message: string, duration = 2000) {
  _globalShow?.(message, duration);
}
