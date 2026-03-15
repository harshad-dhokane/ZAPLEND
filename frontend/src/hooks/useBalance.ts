'use client';

import { useQuery } from '@tanstack/react-query';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { sepoliaTokens } from 'starkzap';

export function useBalance() {
  const { wallet, address, isConnected } = useStarkzap();

  return useQuery<{ balance: string; balanceRaw: bigint }>({
    queryKey: ['balance', address],
    queryFn: async () => {
      if (!wallet || !address || !isConnected) {
        return { balance: '0', balanceRaw: 0n };
      }

      try {
        // Use Starkzap SDK's built-in ERC20 helper
        const amount = await wallet.balanceOf(sepoliaTokens.STRK) as any;
        
        return {
          balance: amount.toFormatted ? amount.toFormatted() : String(amount.amount || amount),
          balanceRaw: amount.val || amount.value || amount.amount || 0n,
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
