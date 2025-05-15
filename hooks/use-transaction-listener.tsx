import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type TransactionListenerContextType = {
  addTxHash: (hash: `0x${string}`, message?: string) => void;
};

const TransactionListenerContext = createContext<TransactionListenerContextType | undefined>(undefined);

export function TransactionListenerProvider({ children, onConfirmed }: { children: React.ReactNode, onConfirmed: (hash: `0x${string}`, message?: string) => void }) {
  const [txHashes, setTxHashes] = useState<{ hash: `0x${string}`; message?: string }[]>([]);

  useEffect(() => {
    // For each hash, set up a listener
    const timers = txHashes.map(tx => {
      // Simulate confirmation (replace with real logic)
      const timer = setTimeout(() => {
        onConfirmed(tx.hash, tx.message);
        setTxHashes(prev => prev.filter(h => h.hash !== tx.hash));
      }, 5000);
      return timer;
    });
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [txHashes, onConfirmed]);

  const addTxHash = useCallback((hash: `0x${string}`, message?: string) => {
    setTxHashes(prev => (prev.some(tx => tx.hash === hash) ? prev : [...prev, { hash, message }]));
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