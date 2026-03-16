'use client';

import { useQuery } from '@tanstack/react-query';

export interface PublicStakingPosition {
  poolAddress: string;
  validatorName: string;
  totalStaked: string;
  commissionPercent: number;
  tokenSymbol: string;
}

/**
 * Fetches all staking positions across all validators from the SDK
 * WITHOUT requiring a wallet connection. This is used for public-facing
 * analytics / logs pages.
 */
export function useAllStakingPositionsPublic() {
  return useQuery<PublicStakingPosition[]>({
    queryKey: ['public-staking-positions'],
    queryFn: async () => {
      const results: PublicStakingPosition[] = [];

      try {
        const starkzapModule = await import('starkzap');
        const { StarkZap } = starkzapModule;
        const network = (process.env.NEXT_PUBLIC_STARKZAP_NETWORK as 'sepolia' | 'mainnet') || 'sepolia';
        const sdk = new StarkZap({ network });

        const presets = network === 'mainnet'
          ? starkzapModule.mainnetValidators
          : starkzapModule.sepoliaValidators;

        if (!presets) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validators: { name: string; stakerAddress: string }[] = Object.values(presets).map((v: any) => ({
          name: v.name || 'Unknown',
          stakerAddress: v.stakerAddress || v.address || '',
        }));

        const checkedPools = new Set<string>();

        for (const validator of validators) {
          try {
            const stakerPools = await sdk.getStakerPools(validator.stakerAddress as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const p of stakerPools as any[]) {
              const poolAddr = p.poolContract || p.poolAddress || p.address || '';
              if (!poolAddr || checkedPools.has(poolAddr)) continue;
              checkedPools.add(poolAddr);

              results.push({
                poolAddress: poolAddr,
                validatorName: validator.name,
                totalStaked: p.amount?.toFormatted?.() || p.stakedAmount || '0',
                commissionPercent: p.commissionPercent ?? p.commission ?? 0,
                tokenSymbol: p.token?.symbol || 'STRK',
              });
            }
          } catch {
            // Validator has no pools or error — skip
          }
        }
      } catch (err) {
        console.error('Failed to fetch public staking positions:', err);
      }

      return results;
    },
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 15_000,
  });
}
