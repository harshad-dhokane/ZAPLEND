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

export function useStakingActions() {
  const { wallet } = useStarkzap();
  const { showToast, updateToast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stake = useCallback(async (poolAddress: string, amount: string) => {
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
      const { Amount, sepoliaTokens } = await import('starkzap');
      const STRK = sepoliaTokens.STRK;
      const parsedAmount = Amount.parse(amount, STRK);

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

  const exitPoolIntent = useCallback(async (poolAddress: string, amount: string) => {
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
      const { Amount, sepoliaTokens } = await import('starkzap');
      const STRK = sepoliaTokens.STRK;
      const parsedAmount = Amount.parse(amount, STRK);

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
