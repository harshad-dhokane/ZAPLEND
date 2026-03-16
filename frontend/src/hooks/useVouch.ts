'use client';

import { useState, useCallback } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useToast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { LOAN_CONTRACT_ADDRESS, STRK_TOKEN_ADDRESS, parseStrk } from '@/lib/starknet';

const ENABLE_PREFLIGHT = process.env.NEXT_PUBLIC_ENABLE_PREFLIGHT
  ? process.env.NEXT_PUBLIC_ENABLE_PREFLIGHT === 'true'
  : process.env.NODE_ENV === 'production';
const ENABLE_FEE_ESTIMATE = process.env.NEXT_PUBLIC_ENABLE_FEE_ESTIMATE
  ? process.env.NEXT_PUBLIC_ENABLE_FEE_ESTIMATE === 'true'
  : process.env.NODE_ENV === 'production';

export function useVouch() {
  const { wallet } = useStarkzap();
  const { showToast, updateToast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vouch = useCallback(async (loanId: string, amount: string) => {
    if (!wallet) {
      setError('Wallet not connected');
      return null;
    }

    if (!LOAN_CONTRACT_ADDRESS || LOAN_CONTRACT_ADDRESS.length <= 2) {
      setError('Loan contract not configured');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'Preparing Vouch',
      message: ENABLE_PREFLIGHT ? 'Running preflight checks...' : 'Preparing transaction...',
    });

    try {
      const amountWei = parseStrk(amount);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walletAny = wallet as any;

      const calls = [
        {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: 'approve',
          calldata: [
            LOAN_CONTRACT_ADDRESS,
            amountWei.toString(), '0',
          ],
        },
        {
          contractAddress: LOAN_CONTRACT_ADDRESS,
          entrypoint: 'add_vouch',
          calldata: [
            loanId, '0',
            amountWei.toString(), '0',
          ],
        },
      ];

      if (typeof walletAny.tx === 'function') {
        const builder = walletAny.tx().add(...calls);

        if (ENABLE_PREFLIGHT) {
          // Preflight check
          try {
            const preflight = await builder.preflight();
            if (!preflight.ok) {
              const reason = preflight.reason || 'Transaction simulation failed';
              setError(reason);
              updateToast(toastId, {
                type: 'error',
                title: 'Preflight Failed',
                message: `Vouch would fail: ${reason}`,
              });
              return null;
            }
          } catch {
            console.warn('Preflight check skipped');
          }
        }

        // Fee estimation
        if (ENABLE_FEE_ESTIMATE) {
          try {
            const feeEstimate = await builder.estimateFee();
            const feeStr = feeEstimate?.overall_fee
              ? `~${(Number(feeEstimate.overall_fee) / 1e18).toFixed(6)} STRK`
              : 'minimal';
            updateToast(toastId, {
              type: 'loading',
              title: 'Vouching',
              message: `Staking ${amount} STRK for Loan #${loanId} (est. fee: ${feeStr})...`,
            });
          } catch {
            updateToast(toastId, {
              type: 'loading',
              title: 'Vouching',
              message: `Staking ${amount} STRK as social collateral for Loan #${loanId}...`,
            });
          }
        } else {
          updateToast(toastId, {
            type: 'loading',
            title: 'Vouching',
            message: `Staking ${amount} STRK as social collateral for Loan #${loanId}...`,
          });
        }

        const tx = await builder.send();
        await tx.wait();

        updateToast(toastId, {
          type: 'success',
          title: 'Vouch Successful!',
          message: `You staked ${amount} STRK for Loan #${loanId}.`,
          txHash: tx.hash,
        });

        // Invalidate both loans AND vouches caches
        queryClient.invalidateQueries({ queryKey: ['loans'] });
        queryClient.invalidateQueries({ queryKey: ['vouches'] });
        queryClient.invalidateQueries({ queryKey: ['all-vouches'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });

        return { transaction_hash: tx.hash };
      } else {
        // Fallback to raw execute
        updateToast(toastId, {
          type: 'loading',
          title: 'Vouching',
          message: `Staking ${amount} STRK as social collateral for Loan #${loanId}...`,
        });

        const tx = await wallet.execute(calls);
        await tx.wait();

        updateToast(toastId, {
          type: 'success',
          title: 'Vouch Successful!',
          message: `You staked ${amount} STRK for Loan #${loanId}.`,
          txHash: tx.hash,
        });

        queryClient.invalidateQueries({ queryKey: ['loans'] });
        queryClient.invalidateQueries({ queryKey: ['vouches'] });
        queryClient.invalidateQueries({ queryKey: ['all-vouches'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });

        return { transaction_hash: tx.hash };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to vouch';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Vouch Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  return { vouch, isLoading, error };
}
