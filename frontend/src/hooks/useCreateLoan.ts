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

export function useCreateLoan() {
  const { wallet } = useStarkzap();
  const { showToast, updateToast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLoan = useCallback(async (
    amount: string,
    collateral: string,
    socialCollateral: string,
    durationDays: number,
  ) => {
    if (!wallet) {
      setError('Wallet not connected');
      return null;
    }

    if (!LOAN_CONTRACT_ADDRESS || LOAN_CONTRACT_ADDRESS.length <= 2) {
      setError('Loan contract not configured. Set NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS in .env.local');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const toastId = showToast({
      type: 'loading',
      title: 'Preparing Loan',
      message: ENABLE_PREFLIGHT ? 'Running preflight checks...' : 'Preparing transaction...',
    });

    try {
      const collateralWei = parseStrk(collateral);
      const amountWei = parseStrk(amount);
      const socialWei = parseStrk(socialCollateral);
      const durationSeconds = durationDays * 86400;

      // Build the transaction using TxBuilder fluent API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walletAny = wallet as any;

      // Check if TxBuilder is available
      if (typeof walletAny.tx === 'function') {
        const builder = walletAny
          .tx()
          .add(
            // ERC20 approve
            {
              contractAddress: STRK_TOKEN_ADDRESS,
              entrypoint: 'approve',
              calldata: [
                LOAN_CONTRACT_ADDRESS,
                collateralWei.toString(), '0',
              ],
            },
            // Create loan
            {
              contractAddress: LOAN_CONTRACT_ADDRESS,
              entrypoint: 'create_loan',
              calldata: [
                amountWei.toString(), '0',
                collateralWei.toString(), '0',
                socialWei.toString(), '0',
                durationSeconds.toString(),
              ],
            },
          );

        if (ENABLE_PREFLIGHT) {
          // Preflight check — validate the tx will succeed before sending
          try {
            const preflight = await builder.preflight();
            if (!preflight.ok) {
              const reason = preflight.reason || 'Transaction simulation failed';
              setError(reason);
              updateToast(toastId, {
                type: 'error',
                title: 'Preflight Failed',
                message: `Transaction would fail: ${reason}`,
              });
              return null;
            }
          } catch (preflightErr) {
            // Preflight may not be supported; continue without it
            console.warn('Preflight check skipped:', preflightErr);
          }
        }

        // Estimate fee and show to user
        if (ENABLE_FEE_ESTIMATE) {
          try {
            const feeEstimate = await builder.estimateFee();
            const feeStr = feeEstimate?.overall_fee
              ? `~${(Number(feeEstimate.overall_fee) / 1e18).toFixed(6)} STRK`
              : 'minimal';
            updateToast(toastId, {
              type: 'loading',
              title: 'Creating Loan',
              message: `Sending transaction (est. fee: ${feeStr})...`,
            });
          } catch {
            updateToast(toastId, {
              type: 'loading',
              title: 'Creating Loan',
              message: 'Sending transaction...',
            });
          }
        } else {
          updateToast(toastId, {
            type: 'loading',
            title: 'Creating Loan',
            message: 'Sending transaction...',
          });
        }

        // Send via TxBuilder
        const tx = await builder.send();
        await tx.wait();

        updateToast(toastId, {
          type: 'success',
          title: 'Loan Created!',
          message: 'Your loan request is now live on-chain.',
          txHash: tx.hash,
        });

        queryClient.invalidateQueries({ queryKey: ['loans'] });
        return { transaction_hash: tx.hash };
      } else {
        // Fallback: use raw wallet.execute() if TxBuilder not available
        updateToast(toastId, {
          type: 'loading',
          title: 'Creating Loan',
          message: 'Approving STRK token and creating loan...',
        });

        const tx = await wallet.execute([
          {
            contractAddress: STRK_TOKEN_ADDRESS,
            entrypoint: 'approve',
            calldata: [
              LOAN_CONTRACT_ADDRESS,
              collateralWei.toString(), '0',
            ],
          },
          {
            contractAddress: LOAN_CONTRACT_ADDRESS,
            entrypoint: 'create_loan',
            calldata: [
              amountWei.toString(), '0',
              collateralWei.toString(), '0',
              socialWei.toString(), '0',
              durationSeconds.toString(),
            ],
          },
        ]);

        await tx.wait();

        updateToast(toastId, {
          type: 'success',
          title: 'Loan Created!',
          message: 'Your loan request is now live on-chain.',
          txHash: tx.hash,
        });

        queryClient.invalidateQueries({ queryKey: ['loans'] });
        return { transaction_hash: tx.hash };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create loan';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Loan Creation Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  return { createLoan, isLoading, error };
}
