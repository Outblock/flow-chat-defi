import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type TransactionListenerContextType = {
  addTxHash: (hash: `0x${string}`) => void;
};

const TransactionListenerContext = createContext<TransactionListenerContextType | undefined>(undefined);

export function TransactionListenerProvider({ children, onConfirmed }: { children: React.ReactNode, onConfirmed: (hash: `0x${string}`) => void }) {
  const [txHashes, setTxHashes] = useState<`0x${string}`[]>([]);

  useEffect(() => {
    // For each hash, set up a listener
    const timers = txHashes.map(hash => {
      // Simulate confirmation (replace with real logic)
      const timer = setTimeout(() => {
        onConfirmed(hash);
        setTxHashes(prev => prev.filter(h => h !== hash));
      }, 5000);
      return timer;
    });
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [txHashes, onConfirmed]);

  const addTxHash = useCallback((hash: `0x${string}`) => {
    setTxHashes(prev => (prev.includes(hash) ? prev : [...prev, hash]));
  }, []);

  return (
    <TransactionListenerContext.Provider value={{ addTxHash }}>
      {children}
    </TransactionListenerContext.Provider>
  );
}

export function useTransactionListenerContext() {
  const ctx = useContext(TransactionListenerContext);
  if (!ctx) throw new Error('useTransactionListenerContext must be used within TransactionListenerProvider');
  return ctx;
}