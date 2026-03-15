'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Call } from 'starknet';
import type { WalletInterface } from 'starkzap';

interface StarkzapContextType {
  wallet: WalletInterface | null;
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  username: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  openProfile: () => void;
  error: string | null;
}

const StarkzapContext = createContext<StarkzapContextType | undefined>(undefined);

const LOAN_CONTRACT = process.env.NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS || '';
const STRK_TOKEN = process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

export function StarkzapProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [controller, setController] = useState<any>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { StarkZap, OnboardStrategy } = await import('starkzap');

      const sdk = new StarkZap({
        network: (process.env.NEXT_PUBLIC_STARKZAP_NETWORK as 'sepolia' | 'mainnet') || 'sepolia',
      });

      // Build policies for the contract methods
      const policies: Array<{ target: string; method: string }> = [];

      if (LOAN_CONTRACT && LOAN_CONTRACT.length > 2) {
        policies.push(
          { target: LOAN_CONTRACT, method: 'create_loan' },
          { target: LOAN_CONTRACT, method: 'add_vouch' },
          { target: LOAN_CONTRACT, method: 'repay' },
          { target: LOAN_CONTRACT, method: 'liquidate' },
        );
      }

      // Always allow STRK token approvals
      policies.push(
        { target: STRK_TOKEN, method: 'approve' },
        { target: STRK_TOKEN, method: 'transfer' },
      );

      const result = await sdk.onboard({
        strategy: OnboardStrategy.Cartridge,
        cartridge: { policies },
      });

      // The SDK wallet implements WalletInterface with proper execute(), etc.
      const connectedWallet = result.wallet;
      const userAddress = connectedWallet.address?.toString() || '';

      if (!userAddress) {
        throw new Error('Failed to get wallet address');
      }

      // Extract Cartridge-specific features
      let discoveredUsername: string | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyWallet = connectedWallet as any;
      if (typeof anyWallet.username === 'function') {
        try {
          discoveredUsername = await anyWallet.username();
        } catch {
          // username() may fail, that's fine
        }
      }

      // Store Cartridge controller for openProfile
      if (typeof anyWallet.getController === 'function') {
        try {
          setController(anyWallet.getController());
        } catch {
          // getController() may fail, that's fine
        }
      }

      // Store the SDK wallet directly — it already handles feeMode, execute, wait
      setWallet(connectedWallet);
      setIsConnected(true);
      setAddress(userAddress);
      setUsername(discoveredUsername || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wallet) {
      wallet.disconnect().catch(() => {});
    }
    setWallet(null);
    setIsConnected(false);
    setAddress(null);
    setUsername(null);
    setController(null);
    setError(null);
  }, [wallet]);

  const openProfile = useCallback(() => {
    if (controller && typeof controller.openProfile === 'function') {
      controller.openProfile();
    }
  }, [controller]);

  return (
    <StarkzapContext.Provider value={{ wallet, isConnected, isConnecting, address, username, connect, disconnect, openProfile, error }}>
      {children}
    </StarkzapContext.Provider>
  );
}

export function useStarkzap() {
  const context = useContext(StarkzapContext);
  if (!context) {
    throw new Error('useStarkzap must be used within StarkzapProvider');
  }
  return context;
}
