'use client';

import { useQuery } from '@tanstack/react-query';
import { callContract, LOAN_CONTRACT_ADDRESS, isContractConfigured, formatStrk, u256ToBigInt } from '@/lib/starknet';

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
              // Use u256ToBigInt + formatStrk to avoid precision loss
              const amountBigInt = u256ToBigInt(result[offset + 1], result[offset + 2]);
              const timestamp = Number(BigInt(result[offset + 3]));

              allVouches.push({
                loanId,
                friend,
                amount: formatStrk(amountBigInt),
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
    refetchInterval: 15_000, // Slightly slower to reduce RPC pressure
  });
}
