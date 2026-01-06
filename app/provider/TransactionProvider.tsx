import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useWalletConnect } from './WalletConnectProvider';

/**
 * Generic EIP-712 TypedData structure
 */
export interface TypedData {
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract?: string;
  };
  message: Record<string, any>;
}

/**
 * Transaction Error
 */
export interface TransactionError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Transaction State - Signing functionality only
 */
interface TransactionState {
  /** Sign a message with the connected wallet */
  signMessage: (message: string) => Promise<string | null>;
  /** Loading state for message signing */
  isLoading: boolean;
  /** Last signature from message signing */
  lastSignature: string | null;
  /** Last error */
  error: TransactionError | null;
  /** Clear error */
  clearError: () => void;
}

const TransactionContext = createContext<TransactionState | null>(null);

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const { client, session } = useWalletConnect();

  const [isLoading, setIsLoading] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [error, setError] = useState<TransactionError | null>(null);

  /**
   * Helper: Get account and chain info from session
   */
  const getAccountInfo = useCallback(() => {
    if (!session) {
      throw new Error('No active session');
    }

    const namespace = session.namespaces.viasecurechain;
    if (!namespace) {
      throw new Error('viasecurechain namespace not found');
    }

    const account = namespace.accounts[0];
    if (!account) {
      throw new Error('No account found in session');
    }

    const [namespace_prefix, chainId, address] = account.split(':');

    return {
      address,
      chainId: `${namespace_prefix}:${chainId}`,
      namespaceConfig: namespace
    };
  }, [session]);

  /**
   * Helper: Check if a method is available in the namespace
   */
  const checkMethodAvailable = useCallback((method: string, namespaceConfig: any): boolean => {
    const methods = namespaceConfig.methods || [];
    return methods.includes(method);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Sign a message using personal_sign
   */
  const signMessage = async (message: string): Promise<string | null> => {
    if (!client || !session) {
      console.error('WalletConnect not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setLastSignature(null);
      clearError();

      // Validate active session
      const activeSessions = client.session.getAll();
      const hasActiveSession = activeSessions.some(s => s.topic === session.topic);

      if (!hasActiveSession) {
        throw new Error('Session not found in active sessions. Please reconnect your wallet.');
      }

      const { address, chainId, namespaceConfig } = getAccountInfo();

      // Check if personal_sign is available
      if (!checkMethodAvailable('personal_sign', namespaceConfig)) {
        const availableMethods = namespaceConfig.methods || [];
        throw new Error(`personal_sign method not available. Available methods: [${availableMethods.join(', ')}]. Your wallet may not support message signing.`);
      }

      console.log('Requesting signature for message:', message);

      const result = await client.request({
        topic: session.topic,
        chainId,
        request: {
          method: 'personal_sign',
          params: [message, address]
        }
      });

      const signature = result as string;
      console.log('Signature received:', signature);

      setLastSignature(signature);
      return signature;

    } catch (err: any) {
      console.error('Message signing failed:', err);
      const error: TransactionError = {
        code: err.code || 'SIGNING_FAILED',
        message: err.message || 'Failed to sign message',
        details: err
      };
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const value: TransactionState = {
    signMessage,
    isLoading,
    lastSignature,
    error,
    clearError,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = (): TransactionState => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within TransactionProvider');
  }
  return context;
};