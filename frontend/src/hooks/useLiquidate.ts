'use client';

import { useState, useCallback } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useToast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { LOAN_CONTRACT_ADDRESS } from '@/lib/starknet';

export function useLiquidate() {
  const { wallet } = useStarkzap();
  const { showToast, updateToast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liquidate = useCallback(async (loanId: string) => {
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
      title: 'Liquidating Loan',
      message: `Marking Loan #${loanId} as defaulted...`,
    });

    try {
      const tx = await wallet.execute([
        {
          contractAddress: LOAN_CONTRACT_ADDRESS,
          entrypoint: 'liquidate',
          calldata: [
            loanId, '0', // loan_id u256
          ],
        },
      ]);

      await tx.wait();

      updateToast(toastId, {
        type: 'success',
        title: 'Loan Liquidated!',
        message: `Loan #${loanId} has been marked as defaulted.`,
        txHash: tx.hash,
      });

      queryClient.invalidateQueries({ queryKey: ['loans'] });

      return { transaction_hash: tx.hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to liquidate';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Liquidation Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  return { liquidate, isLoading, error };
}
