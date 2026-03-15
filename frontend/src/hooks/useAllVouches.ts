'use client';

import { useQuery } from '@tanstack/react-query';
import { callContract, LOAN_CONTRACT_ADDRESS, isContractConfigured } from '@/lib/starknet';

interface VouchData {
  loanId: string;
  friend: string;
  amount: string;
  timestamp: number;
}

export function useAllVouches(loanCount: number) {
  return useQuery<VouchData[]>({
    queryKey: ['all-vouches', loanCount],
    queryFn: async () => {
      if (!isContractConfigured() || !LOAN_CONTRACT_ADDRESS || loanCount <= 0) return [];

      try {
        // Since there is no on-chain 'get_all_vouches' method, we simulate it by fetching globally
        // This is only practical for small N, but necessary here to see if users already vouched.
        const promises = [];
        for (let i = 1; i <= loanCount; i++) {
          promises.push(
            callContract(LOAN_CONTRACT_ADDRESS, 'get_vouches', [
              `0x${BigInt(i).toString(16)}`,
              '0x0',
            ]).then((result) => ({ loanId: String(i), result }))
          );
        }

        const results = await Promise.all(promises);
        const allVouches: VouchData[] = [];

        for (const { loanId, result } of results) {
          if (result.length > 0) {
            const count = Number(BigInt(result[0]));
            for (let i = 0; i < count && (1 + i * 4 + 3) < result.length; i++) {
              const offset = 1 + i * 4;
              const friend = result[offset];
              const amountLow = BigInt(result[offset + 1]);
              const amountHigh = BigInt(result[offset + 2]);
              const amount = amountLow + (amountHigh << 128n);
              const timestamp = Number(BigInt(result[offset + 3]));

              allVouches.push({
                loanId,
                friend,
                amount: (Number(amount) / 1e18).toFixed(2),
                timestamp,
              });
            }
          }
        }

        return allVouches;
      } catch (err) {
        console.error('Failed to fetch all vouches:', err);
        return [];
      }
    },
    enabled: isContractConfigured() && loanCount > 0,
    refetchInterval: 10_000,
  });
}
