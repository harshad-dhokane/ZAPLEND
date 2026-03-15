'use client';

import { useQuery } from '@tanstack/react-query';
import { callContract, LOAN_CONTRACT_ADDRESS, isContractConfigured } from '@/lib/starknet';

interface VouchData {
  friend: string;
  amount: string;
  timestamp: number;
}

export function useVouches(loanId: number) {
  return useQuery<VouchData[]>({
    queryKey: ['vouches', loanId],
    queryFn: async () => {
      if (!isContractConfigured() || !LOAN_CONTRACT_ADDRESS) return [];

      try {
        const result = await callContract(LOAN_CONTRACT_ADDRESS, 'get_vouches', [
          `0x${BigInt(loanId).toString(16)}`,
          '0x0',
        ]);

        const vouches: VouchData[] = [];
        // Parse the array result - first element is array length
        if (result.length > 0) {
          const count = Number(BigInt(result[0]));
          // Each vouch has: friend (felt), amount_low (felt), amount_high (felt), timestamp (felt)
          for (let i = 0; i < count && (1 + i * 4 + 3) < result.length; i++) {
            const offset = 1 + i * 4;
            const friend = result[offset];
            const amountLow = BigInt(result[offset + 1]);
            const amountHigh = BigInt(result[offset + 2]);
            const amount = amountLow + (amountHigh << 128n);
            const timestamp = Number(BigInt(result[offset + 3]));

            vouches.push({
              friend,
              amount: (Number(amount) / 1e18).toFixed(2),
              timestamp,
            });
          }
        }

        return vouches;
      } catch (err) {
        console.error('Failed to fetch vouches:', err);
        return [];
      }
    },
    enabled: isContractConfigured() && loanId > 0,
    refetchInterval: 10_000,
  });
}
