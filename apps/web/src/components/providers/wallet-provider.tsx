"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { WalletSession } from "@rwaforge/types";
import { connect, disconnect, getStoredSession, isWalletConnected } from "@rwaforge/stacks";

interface WalletContextValue {
  session: WalletSession | null;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (isWalletConnected()) {
      setSession(getStoredSession());
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await connect();
      setSession(result);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setSession(null);
  }, []);

  return (
    <WalletContext.Provider value={{ session, connecting, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
