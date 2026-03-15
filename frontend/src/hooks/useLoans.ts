'use client';

import { useQuery } from '@tanstack/react-query';
import { LOAN_CONTRACT_ADDRESS, isContractConfigured, formatStrk, u256ToBigInt, callContract } from '@/lib/starknet';
import type { LoanData } from '@/lib/types';
import { LOAN_STATUS_MAP } from '@/lib/types';

async function fetchLoansFromContract(): Promise<LoanData[]> {
  if (!isContractConfigured()) {
    return [];
  }

  // Get total loan count
  const countResult = await callContract(LOAN_CONTRACT_ADDRESS, 'get_loan_count');
  const totalLoans = Number(u256ToBigInt(countResult[0], countResult[1]));

  if (totalLoans === 0) return [];

  const loans: LoanData[] = [];

  // Fetch loans in parallel batches of 5 to avoid overwhelming the RPC
  const BATCH_SIZE = 5;
  for (let batchStart = 1; batchStart <= totalLoans; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalLoans);
    const batchPromises = [];

    for (let i = batchStart; i <= batchEnd; i++) {
      batchPromises.push(
        (async (loanId: number) => {
          try {
            const result = await callContract(LOAN_CONTRACT_ADDRESS, 'get_loan', [loanId.toString(), '0']);

            let idx = 0;
            const borrower = result[idx++];
            const amount = u256ToBigInt(result[idx++], result[idx++]);
            const collateral = u256ToBigInt(result[idx++], result[idx++]);
            const socialTarget = u256ToBigInt(result[idx++], result[idx++]);
            const socialCurrent = u256ToBigInt(result[idx++], result[idx++]);
            const interestRate = Number(u256ToBigInt(result[idx++], result[idx++]));
            const duration = Number(BigInt(result[idx++]));
            const startTime = Number(BigInt(result[idx++]));
            const statusIndex = Number(BigInt(result[idx++]));
            const repaidAmount = u256ToBigInt(result[idx++], result[idx++]);

            const borrowerHex = '0x' + BigInt(borrower).toString(16).padStart(64, '0');

            return {
              id: loanId.toString(),
              borrower: borrowerHex,
              amount: formatStrk(amount),
              collateral: formatStrk(collateral),
              socialCollateralTarget: formatStrk(socialTarget),
              socialCollateralCurrent: formatStrk(socialCurrent),
              interestRate: interestRate / 100,
              duration: Math.floor(duration / 86400),
              startTime,
              status: LOAN_STATUS_MAP[statusIndex] || 'Pending',
              repaidAmount: formatStrk(repaidAmount),
            } as LoanData;
          } catch (err) {
            console.error(`Failed to fetch loan ${loanId}:`, err);
            return null;
          }
        })(i)
      );
    }

    const batchResults = await Promise.all(batchPromises);
    for (const loan of batchResults) {
      if (loan) loans.push(loan);
    }
  }

  return loans;
}

export function useLoans() {
  return useQuery<LoanData[]>({
    queryKey: ['loans', LOAN_CONTRACT_ADDRESS],
    queryFn: fetchLoansFromContract,
    refetchInterval: 15_000, // Refetch every 15s
    retry: 2,
  });
}

// Normalize a hex address: strip 0x, remove leading zeros, lowercase
function normalizeAddress(addr: string): string {
  return addr.replace(/^0x0*/i, '').toLowerCase();
}

// Fetch loans for a specific borrower
export function useMyLoans(address: string | null) {
  const { data: allLoans, ...rest } = useLoans();

  const myLoans = allLoans?.filter(
    (loan) => address && normalizeAddress(loan.borrower) === normalizeAddress(address)
  ) || [];

  return { data: myLoans, ...rest };
}
