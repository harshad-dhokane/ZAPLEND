'use client';

import { useState, useCallback } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useToast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { LOAN_CONTRACT_ADDRESS, STRK_TOKEN_ADDRESS, parseStrk } from '@/lib/starknet';

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
      title: 'Creating Loan',
      message: 'Approving STRK token and creating loan...',
    });

    try {
      const collateralWei = parseStrk(collateral);
      const amountWei = parseStrk(amount);
      const socialWei = parseStrk(socialCollateral);
      const durationSeconds = durationDays * 86400;

      // Step 1: Approve STRK token for collateral
      // Step 2: Create loan
      // Both calls batched atomically
      const tx = await wallet.execute([
        // ERC20 approve
        {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: 'approve',
          calldata: [
            LOAN_CONTRACT_ADDRESS,
            collateralWei.toString(), '0', // u256 low, high
          ],
        },
        // Create loan
        {
          contractAddress: LOAN_CONTRACT_ADDRESS,
          entrypoint: 'create_loan',
          calldata: [
            amountWei.toString(), '0',       // amount u256
            collateralWei.toString(), '0',   // collateral u256
            socialWei.toString(), '0',       // social_collateral_target u256
            durationSeconds.toString(),       // duration u64
          ],
        },
      ]);

      // Wait for transaction confirmation
      await tx.wait();

      updateToast(toastId, {
        type: 'success',
        title: 'Loan Created!',
        message: 'Your loan request is now live on-chain.',
        txHash: tx.hash,
      });

      // Invalidate loan cache to refetch
      queryClient.invalidateQueries({ queryKey: ['loans'] });

      return { transaction_hash: tx.hash };
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
