'use client';

import { useState, useCallback } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useToast } from '@/components/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface StakingPosition {
  staked: string;
  rewards: string;
  total: string;
  commissionPercent: number;
  unpooling: string;
  unpoolTime: number | null;
}

export interface SavedPoolInfo {
  pool: string;
  decimals: number;
  validatorName?: string;
}

// SessionStorage helpers for multi-pool tracking
const POOLS_KEY = 'zaplend_staked_pools';

export function getSavedPools(): SavedPoolInfo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(POOLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addSavedPool(pool: string, decimals: number, validatorName?: string) {
  const pools = getSavedPools();
  if (!pools.find(p => p.pool === pool)) {
    pools.push({ pool, decimals, validatorName });
    try { sessionStorage.setItem(POOLS_KEY, JSON.stringify(pools)); } catch {}
  }
  // Also keep legacy single-pool key for backward compat
  try {
    sessionStorage.setItem('zaplend_active_pool', pool);
    sessionStorage.setItem('zaplend_active_pool_decimals', String(decimals));
  } catch {}
}

export function useStakingPosition(poolAddress: string | null) {
  const { wallet, isConnected } = useStarkzap();

  return useQuery<StakingPosition | null>({
    queryKey: ['staking-position', poolAddress],
    queryFn: async () => {
      if (!wallet || !poolAddress) return null;

      try {
        const position = await (wallet as any).getPoolPosition(poolAddress);
        if (!position) return null;

        return {
          staked: position.staked?.toFormatted?.() || '0',
          rewards: position.rewards?.toFormatted?.() || '0',
          total: position.total?.toFormatted?.() || '0',
          commissionPercent: position.commissionPercent ?? 0,
          unpooling: position.unpooling?.toFormatted?.() || '0',
          unpoolTime: position.unpoolTime ?? null,
        };
      } catch (err) {
        console.error('Failed to fetch staking position:', err);
        return null;
      }
    },
    enabled: isConnected && !!wallet && !!poolAddress,
    refetchInterval: 15_000,
    retry: 1,
  });
}

export interface PoolPositionData extends StakingPosition {
  poolAddress: string;
  decimals: number;
  validatorName?: string;
}

export function useAllStakingPositions() {
  const { wallet, isConnected } = useStarkzap();

  return useQuery<PoolPositionData[]>({
    queryKey: ['all-staking-positions-discovery'],
    queryFn: async () => {
      if (!wallet) return [];

      const results: PoolPositionData[] = [];
      const checkedPools = new Set<string>();

      try {
        // 1. Load SDK and validator presets
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

        // 2. For each validator, get their pools and check user's position
        for (const validator of validators) {
          try {
            const stakerPools = await sdk.getStakerPools(validator.stakerAddress as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const p of stakerPools as any[]) {
              const poolAddr = p.poolContract || p.poolAddress || p.address || '';
              if (!poolAddr || checkedPools.has(poolAddr)) continue;
              checkedPools.add(poolAddr);

              try {
                const position = await (wallet as any).getPoolPosition(poolAddr);
                if (!position) continue;

                const staked = position.staked?.toFormatted?.() || '0';
                // Skip pools with zero stake
                if (staked === '0' || staked === '0 STRK') continue;

                results.push({
                  poolAddress: poolAddr,
                  decimals: p.token?.decimals || 18,
                  validatorName: validator.name,
                  staked,
                  rewards: position.rewards?.toFormatted?.() || '0',
                  total: position.total?.toFormatted?.() || '0',
                  commissionPercent: position.commissionPercent ?? 0,
                  unpooling: position.unpooling?.toFormatted?.() || '0',
                  unpoolTime: position.unpoolTime ?? null,
                });
              } catch {
                // Position doesn't exist for this pool — skip
              }
            }
          } catch {
            // Validator has no pools or error — skip
          }
        }

        // 3. Also check any previously saved pools from sessionStorage (fallback)
        const savedPools = getSavedPools();
        for (const { pool, decimals, validatorName } of savedPools) {
          if (checkedPools.has(pool)) continue;
          checkedPools.add(pool);
          try {
            const position = await (wallet as any).getPoolPosition(pool);
            if (!position) continue;
            const staked = position.staked?.toFormatted?.() || '0';
            if (staked === '0' || staked === '0 STRK') continue;
            results.push({
              poolAddress: pool,
              decimals,
              validatorName,
              staked,
              rewards: position.rewards?.toFormatted?.() || '0',
              total: position.total?.toFormatted?.() || '0',
              commissionPercent: position.commissionPercent ?? 0,
              unpooling: position.unpooling?.toFormatted?.() || '0',
              unpoolTime: position.unpoolTime ?? null,
            });
          } catch {
            // Skip
          }
        }
      } catch (err) {
        console.error('Failed to discover staking positions:', err);
      }

      return results;
    },
    enabled: isConnected && !!wallet,
    refetchInterval: 30_000, // Slightly longer — full scan is heavier
    retry: 1,
    staleTime: 15_000,
  });
}

export function useStakingActions() {
  const { wallet } = useStarkzap();
  const { showToast, updateToast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake = useCallback(async (poolAddress: string, amount: string, tokenDecimals: number = 18) => {
    if (!wallet) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'Staking STRK',
      message: `Delegating ${amount} STRK to the staking pool...`,
    });

    try {
      const { Amount } = await import('starkzap');
      // Use decimals-only parsing to avoid token symbol/decimal mismatch
      // when the pool's token differs from the hardcoded STRK preset
      const parsedAmount = Amount.parse(amount, tokenDecimals);

      // Use wallet.stake() — smart method that auto-detects enter vs add
      const tx = await (wallet as any).stake(poolAddress, parsedAmount);
      await tx.wait();

      updateToast(toastId, {
        type: 'success',
        title: 'Staking Successful!',
        message: `You staked ${amount} STRK. Start earning rewards now!`,
        txHash: tx.hash,
      });

      // Invalidate position cache
      queryClient.invalidateQueries({ queryKey: ['staking-position', poolAddress] });
      queryClient.invalidateQueries({ queryKey: ['all-staking-positions-discovery'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });

      return { transaction_hash: tx.hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stake';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Staking Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  const claimRewards = useCallback(async (poolAddress: string) => {
    if (!wallet) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'Claiming Rewards',
      message: 'Claiming your staking rewards...',
    });

    try {
      const tx = await (wallet as any).claimPoolRewards(poolAddress);
      await tx.wait();

      updateToast(toastId, {
        type: 'success',
        title: 'Rewards Claimed!',
        message: 'Your staking rewards have been sent to your wallet.',
        txHash: tx.hash,
      });

      queryClient.invalidateQueries({ queryKey: ['staking-position', poolAddress] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });

      return { transaction_hash: tx.hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim rewards';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Claim Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  const exitPoolIntent = useCallback(async (poolAddress: string, amount: string, tokenDecimals: number = 18) => {
    if (!wallet) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'Initiating Unstake',
      message: `Starting withdrawal of ${amount} STRK from pool...`,
    });

    try {
      const { Amount } = await import('starkzap');
      // Use decimals-only parsing to avoid token mismatch
      const parsedAmount = Amount.parse(amount, tokenDecimals);

      const tx = await (wallet as any).exitPoolIntent(poolAddress, parsedAmount);
      await tx.wait();

      updateToast(toastId, {
        type: 'success',
        title: 'Unstake Initiated!',
        message: `${amount} STRK withdrawal started. Complete it after the cooldown period.`,
        txHash: tx.hash,
      });

      queryClient.invalidateQueries({ queryKey: ['staking-position', poolAddress] });

      return { transaction_hash: tx.hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate unstake';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Unstake Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  const exitPool = useCallback(async (poolAddress: string) => {
    if (!wallet) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'Completing Withdrawal',
      message: 'Finalizing your STRK withdrawal...',
    });

    try {
      const tx = await (wallet as any).exitPool(poolAddress);
      await tx.wait();

      updateToast(toastId, {
        type: 'success',
        title: 'Withdrawal Complete!',
        message: 'Your STRK has been returned to your wallet.',
        txHash: tx.hash,
      });

      queryClient.invalidateQueries({ queryKey: ['staking-position', poolAddress] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });

      return { transaction_hash: tx.hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete withdrawal';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Withdrawal Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  return { stake, claimRewards, exitPoolIntent, exitPool, isLoading, error };
}
