'use client';

import { useState, useCallback } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useToast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { LOAN_CONTRACT_ADDRESS, STRK_TOKEN_ADDRESS, parseStrk } from '@/lib/starknet';

export function useRepay() {
  const { wallet } = useStarkzap();
  const { showToast, updateToast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repay = useCallback(async (loanId: string, amount: string) => {
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
      title: 'Repaying Loan',
      message: `Repaying ${amount} STRK on Loan #${loanId}...`,
    });

    try {
      const amountWei = parseStrk(amount);

      // Batch: approve + repay
      const tx = await wallet.execute([
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
          entrypoint: 'repay',
          calldata: [
            loanId, '0',                    // loan_id u256
            amountWei.toString(), '0',       // amount u256
          ],
        },
      ]);

      await tx.wait();

      updateToast(toastId, {
        type: 'success',
        title: 'Repayment Successful!',
        message: `You repaid ${amount} STRK on Loan #${loanId}.`,
        txHash: tx.hash,
      });

      queryClient.invalidateQueries({ queryKey: ['loans'] });

      return { transaction_hash: tx.hash };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to repay';
      setError(message);
      updateToast(toastId, {
        type: 'error',
        title: 'Repayment Failed',
        message,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, showToast, updateToast, queryClient]);

  return { repay, isLoading, error };
}
