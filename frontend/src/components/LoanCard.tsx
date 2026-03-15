'use client';

import Link from 'next/link';
import { Users, Clock, TrendingUp, ExternalLink } from 'lucide-react';

export interface LoanCardData {
  id: string;
  borrower: string;
  amount: string;
  collateral: string;
  socialCollateralTarget: string;
  socialCollateralCurrent: string;
  interestRate: number;
  duration: number;
  status: 'Pending' | 'Active' | 'Repaid' | 'Defaulted';
}

interface LoanCardProps {
  loan: LoanCardData;
  actionLabel?: string;
  onAction?: () => void;
  isActionLoading?: boolean;
  secondaryAction?: { label: string; onClick: () => void };
}

export function LoanCard({ loan, actionLabel, onAction, isActionLoading, secondaryAction }: LoanCardProps) {
  const targetNum = parseFloat(loan.socialCollateralTarget.replace(/,/g, '')) || 1;
  const currentNum = parseFloat(loan.socialCollateralCurrent.replace(/,/g, '')) || 0;
  const socialProgress = (currentNum / targetNum) * 100;

  const statusClass = {
    Pending: 'badge-pending',
    Active: 'badge-active',
    Repaid: 'badge-repaid',
    Defaulted: 'badge-defaulted',
  }[loan.status];

  return (
    <div className="neo-card p-5 group">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <Link href={`/loan/${loan.id}`} className="inline-flex items-center gap-2 group/link">
            <h3 className="text-base font-black font-display transition-colors group-hover/link:text-blue-600 text-black">
              Loan #{loan.id}
            </h3>
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity" style={{ color: '#000' }} />
          </Link>
          <p className="text-xs font-mono font-bold mt-1 text-black">
            {loan.borrower.slice(0, 10)}...{loan.borrower.slice(-4)}
          </p>
        </div>
        <span className={`badge ${statusClass}`}>{loan.status}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3" style={{ color: '#000' }} />
            <span className="text-xs font-bold" style={{ color: '#000' }}>Amount</span>
          </div>
          <p className="text-sm font-bold font-display bg-white px-2 py-1 border-2 border-black inline-block" style={{ color: '#000', boxShadow: '2px 2px 0px #000' }}>
            {loan.amount} <span className="text-xs font-bold" style={{ color: '#000' }}>STRK</span>
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3" style={{ color: '#000' }} />
            <span className="text-xs font-bold" style={{ color: '#000' }}>Interest</span>
          </div>
          <p className="text-sm font-bold font-display bg-yellow-300 px-2 py-1 border-2 border-black inline-block" style={{ color: '#000', boxShadow: '2px 2px 0px #000' }}>
            {loan.interestRate}%
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3" style={{ color: '#000' }} />
            <span className="text-xs font-bold" style={{ color: '#000' }}>Duration</span>
          </div>
          <p className="text-sm font-bold font-display bg-[#00F5D4] px-2 py-1 border-2 border-black inline-block" style={{ color: '#000', boxShadow: '2px 2px 0px #000' }}>
            {loan.duration}d
          </p>
        </div>
      </div>

      {/* Social Collateral Progress */}
      <div className="mb-4 bg-white p-3 border-[3px] border-black" style={{ boxShadow: '4px 4px 0px #000' }}>
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" style={{ color: '#000' }} />
            <span className="text-xs font-bold uppercase" style={{ color: '#000' }}>
              Social Collateral
            </span>
          </div>
          <span className="text-xs font-bold font-mono bg-black text-white px-1.5 py-0.5">
            {loan.socialCollateralCurrent} / {loan.socialCollateralTarget} STRK
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(socialProgress, 100)}%` }} />
        </div>
      </div>

      {/* Actions */}
      {(actionLabel || secondaryAction) && (
        <div className="flex gap-3">
          {actionLabel && (
            <button
              onClick={onAction}
              disabled={isActionLoading}
              className={`${secondaryAction ? 'flex-1' : 'w-full'} btn-gradient font-bold`}
              style={{ padding: '10px 0', opacity: isActionLoading ? 0.6 : 1 }}
            >
              {isActionLoading ? 'Processing...' : actionLabel}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex-1 btn-secondary text-sm"
              style={{ padding: '10px 0' }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
