'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
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
const SESSION_KEY = 'zaplend_session';

export function StarkzapProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [controller, setController] = useState<any>(null);
  const hasAttemptedReconnect = useRef(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { StarkZap, OnboardStrategy } = await import('starkzap');

      const sdk = new StarkZap({
        network: (process.env.NEXT_PUBLIC_STARKZAP_NETWORK as 'sepolia' | 'mainnet') || 'sepolia',
      });

      // Build policies for the contract methods
      // Build policies in the dictionary format (SessionPolicies interface)
      // This prevents the SDK's array parser from dropping 'spender' and 'amount'
      const STAKING_CONTRACT = '0x03745ab04a431fc02871a139be6e4a1e3583b3526dd0abcbce492735a30bce5e';
      
      const policiesData: Record<string, any> = {
        contracts: {
          [STRK_TOKEN]: {
            methods: [
              { entrypoint: 'transfer' },
              { entrypoint: 'approve', spender: STAKING_CONTRACT, amount: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' },
            ]
          },
          [STAKING_CONTRACT]: {
            methods: [
              { entrypoint: 'enter_delegation_pool' },
              { entrypoint: 'add_to_delegation_pool' },
              { entrypoint: 'exit_delegation_pool_intent' },
              { entrypoint: 'exit_delegation_pool_action' },
              { entrypoint: 'claim_rewards' },
            ]
          }
        }
      };

      if (LOAN_CONTRACT && LOAN_CONTRACT.length > 2) {
        policiesData.contracts[LOAN_CONTRACT] = {
          methods: [
            { entrypoint: 'create_loan' },
            { entrypoint: 'add_vouch' },
            { entrypoint: 'repay' },
            { entrypoint: 'liquidate' },
          ]
        };
        // Add approve for loan contract to STRK token methods
        policiesData.contracts[STRK_TOKEN].methods.push({
          entrypoint: 'approve', spender: LOAN_CONTRACT, amount: '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
        });
      }

      // Use a robust type bypass to ensure the session policies can be accepted by Cartridge
      // The issue here is how different wallet controllers expect the policy object.
      // passing the policies array directly or the dictionary mapping is needed
      const result = await sdk.onboard({
        strategy: OnboardStrategy.Cartridge,
        cartridge: {
          policies: undefined, // Let the controller initialize without policies first if needed, or pass correctly formatted ones
          rpc: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.cartridge.gg/x/starknet/sepolia',
        } as any,
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

      // Persist session to sessionStorage
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          address: userAddress,
          username: discoveredUsername || null,
        }));
      } catch {
        // sessionStorage may be unavailable in some contexts
      }
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

    // Clear persisted session
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // sessionStorage may be unavailable
    }
  }, [wallet]);

  // Auto-reconnect on mount if session exists
  useEffect(() => {
    if (hasAttemptedReconnect.current || isConnected || isConnecting) return;
    hasAttemptedReconnect.current = true;

    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        // Set connecting immediately to prevent race with manual connect
        setIsConnecting(true);
        // Cartridge Controller persists its own session keys,
        // so re-calling connect() will silently reconnect without showing a modal
        connect().catch(() => {
          // If auto-reconnect fails, user can still connect manually
          setIsConnecting(false);
        });
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
