'use client';

import { useQuery } from '@tanstack/react-query';
import { useStarkzap } from '@/providers/StarkzapProvider';

export function useBalance() {
  const { wallet, address, isConnected } = useStarkzap();

  return useQuery<{ balance: string; balanceRaw: bigint }>({
    queryKey: ['balance', address],
    queryFn: async () => {
      if (!wallet || !address || !isConnected) {
        return { balance: '0', balanceRaw: 0n };
      }

      try {
        // Dynamically resolve tokens based on configured network
        const network = process.env.NEXT_PUBLIC_STARKZAP_NETWORK || 'sepolia';
        const starkzapModule = await import('starkzap');
        const tokens = network === 'mainnet'
          ? starkzapModule.mainnetTokens
          : starkzapModule.sepoliaTokens;

        // Use Starkzap SDK's built-in ERC20 helper — returns an Amount object
        const amount = await wallet.balanceOf(tokens.STRK);

        // The SDK Amount class has .toFormatted() and .toBase() methods
        const formatted = typeof amount.toFormatted === 'function'
          ? amount.toFormatted()
          : String(amount);

        const raw = typeof amount.toBase === 'function'
          ? amount.toBase()
          : 0n;

        return {
          balance: formatted,
          balanceRaw: raw,
        };
      } catch (err) {
        console.error('Failed to fetch balance via Starkzap SDK:', err);
        return { balance: '0', balanceRaw: 0n };
      }
    },
    enabled: isConnected && !!address && !!wallet,
    refetchInterval: 10_000,
    retry: 1,
  });
}
