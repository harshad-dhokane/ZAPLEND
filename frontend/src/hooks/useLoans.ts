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

  // Fetch each loan
  for (let i = 1; i <= totalLoans; i++) {
    try {
      // Call get_loan with loan_id as u256 (low, high)
      const result = await callContract(LOAN_CONTRACT_ADDRESS, 'get_loan', [i.toString(), '0']);

      // Parse the returned struct fields
      // Struct order: borrower, amount(u256), collateral(u256), social_target(u256),
      //              social_current(u256), interest_rate(u256), duration(u64), start_time(u64),
      //              status(u8), repaid_amount(u256)
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

      loans.push({
        id: i.toString(),
        borrower: borrowerHex,
        amount: formatStrk(amount),
        collateral: formatStrk(collateral),
        socialCollateralTarget: formatStrk(socialTarget),
        socialCollateralCurrent: formatStrk(socialCurrent),
        interestRate: interestRate / 100, // basis points to percentage
        duration: Math.floor(duration / 86400), // seconds to days
        startTime,
        status: LOAN_STATUS_MAP[statusIndex] || 'Pending',
        repaidAmount: formatStrk(repaidAmount),
      });
    } catch (err) {
      console.error(`Failed to fetch loan ${i}:`, err);
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
