export interface LoanData {
  id: string;
  borrower: string;
  amount: string;
  collateral: string;
  socialCollateralTarget: string;
  socialCollateralCurrent: string;
  interestRate: number;
  duration: number;
  startTime: number;
  status: 'Pending' | 'Active' | 'Repaid' | 'Defaulted';
  repaidAmount: string;
}

export interface VouchData {
  friend: string;
  amount: string;
  timestamp: number;
}

export interface CreditScoreData {
  address: string;
  score: number;
  totalLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
}

// Loan status enum mapping from contract
export const LOAN_STATUS_MAP: Record<number, LoanData['status']> = {
  0: 'Pending',
  1: 'Active',
  2: 'Repaid',
  3: 'Defaulted',
};
