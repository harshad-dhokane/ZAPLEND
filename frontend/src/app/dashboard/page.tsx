'use client';

import { useState, useMemo, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { CreditScore } from '@/components/CreditScore';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useLoans } from '@/hooks/useLoans';
import { useVouch } from '@/hooks/useVouch';
import { useRepay } from '@/hooks/useRepay';
import { useAllVouches } from '@/hooks/useAllVouches';
import { useContractLogs } from '@/hooks/useContractLogs';
import { isContractConfigured } from '@/lib/starknet';
import {
  Wallet, Clock, Users, ArrowUpRight, TrendingUp, Shield,
  AlertTriangle, Inbox, LayoutDashboard, List, Activity, Coins, Zap,
  Share2, Copy, ExternalLink
} from 'lucide-react';
import { useAllStakingPositions, useStakingActions } from '@/hooks/useStaking';
import Link from 'next/link';
import { formatDateShort, formatDateCompact, formatTimestamp } from '@/lib/time';

export default function DashboardPage() {
  const { isConnected, address, username } = useStarkzap();
  const { data: allLoans, isLoading } = useLoans();
  const { vouch, isLoading: isVouching } = useVouch();
  const { repay, isLoading: isRepaying } = useRepay();
  const { data: contractLogs } = useContractLogs();

  const [activeTab, setActiveTab] = useState<'overview' | 'my-loans' | 'pending-vouches' | 'activity' | 'staking'>('overview');

  // All staking positions
  const { data: allPositions, isLoading: isLoadingPositions } = useAllStakingPositions();
  const { claimRewards, isLoading: isStakingLoading } = useStakingActions();

  // Compute total staked
  const totalStaked = useMemo(() => {
    if (!allPositions || allPositions.length === 0) return '0';
    // Try to sum numeric values
    let sum = 0;
    for (const p of allPositions) {
      const num = parseFloat(p.staked.replace(/[^0-9.]/g, '') || '0');
      if (!isNaN(num)) sum += num;
    }
    return sum > 0 ? `${sum.toLocaleString(undefined, { maximumFractionDigits: 2 })} STRK` : '0';
  }, [allPositions]);

  const totalRewards = useMemo(() => {
    if (!allPositions || allPositions.length === 0) return '0';
    let sum = 0;
    for (const p of allPositions) {
      const num = parseFloat(p.rewards.replace(/[^0-9.]/g, '') || '0');
      if (!isNaN(num)) sum += num;
    }
    return sum > 0 ? `${sum.toLocaleString(undefined, { maximumFractionDigits: 6 })} STRK` : '0';
  }, [allPositions]);

  // Get total max loan id to fetch all vouches
  const maxLoanId = useMemo(() => {
    if (!allLoans || allLoans.length === 0) return 0;
    return Math.max(...allLoans.map(l => parseInt(l.id)));
  }, [allLoans]);

  const { data: allVouches } = useAllVouches(maxLoanId);
  const loanCreatedAt = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!contractLogs) return map;
    for (const log of contractLogs) {
      if (log.type === 'LoanCreated' && log.data?.loanId) {
        const loanId = String(log.data.loanId);
        if (!map.has(loanId)) {
          map.set(loanId, log.timestamp ?? null);
        }
      }
    }
    return map;
  }, [contractLogs]);
  const getLoanDate = (loanId: string) => formatDateShort(loanCreatedAt.get(loanId) ?? null);
  const getLoanDateCompact = (loanId: string) => formatDateCompact(loanCreatedAt.get(loanId) ?? null);
  const getLoanDateFull = (loanId: string) => formatTimestamp(loanCreatedAt.get(loanId) ?? null);

  const [repayLoanId, setRepayLoanId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [showRepayModal, setShowRepayModal] = useState(false);

  const [vouchLoanId, setVouchLoanId] = useState<string | null>(null);
  const [vouchAmount, setVouchAmount] = useState('');
  const [showVouchModal, setShowVouchModal] = useState(false);

  const contractReady = isContractConfigured();

  // Normalize hex addresses for reliable comparison
  const normalizeAddr = useCallback((addr: string) => addr.replace(/^0x0*/i, '').toLowerCase(), []);

  // Filter loans for the connected user
  const myLoans = useMemo(() => {
    return allLoans?.filter(
      (loan) => address && normalizeAddr(loan.borrower) === normalizeAddr(address)
    ) || [];
  }, [allLoans, address, normalizeAddr]);

  const activeLoans = myLoans.filter((l) => l.status === 'Active');
  const pendingLoans = myLoans.filter((l) => l.status === 'Pending');

  // Pending loans from others that user can vouch for AND hasn't already vouched for
  const vouchableLoans = useMemo(() => {
    return allLoans?.filter((loan) => {
      // Must be pending
      if (loan.status !== 'Pending') return false;
      // Must not be the user's own loan
      if (address && normalizeAddr(loan.borrower) === normalizeAddr(address)) return false;
      // Must not have already been vouched for by this user
      if (address && allVouches) {
        const hasVouched = allVouches.some(
          v => v.loanId === loan.id && normalizeAddr(v.friend) === normalizeAddr(address)
        );
        if (hasVouched) return false;
      }
      return true;
    }) || [];
  }, [allLoans, address, normalizeAddr, allVouches]);

  // Calculate stats
  const totalBorrowed = myLoans.reduce((sum, l) => sum + parseFloat(l.amount.replace(/,/g, '') || '0'), 0);
  const repaidCount = myLoans.filter((l) => l.status === 'Repaid').length;
  const defaultedCount = myLoans.filter((l) => l.status === 'Defaulted').length;

  // Truly Dynamic Credit Score based on wallet address seed AND performance
  const dynamicScore = useMemo(() => {
    if (!address) return 0;
    // Generate a pseudo-random base score from the address string (e.g. between 450 and 650)
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    const baseScore = 450 + (Math.abs(hash) % 200);

    // Add performance modifiers
    const activeBonus = activeLoans.length * 10;
    const repaidBonus = repaidCount * 75;
    const defaultPenalty = defaultedCount * 150;

    return Math.min(1000, Math.max(300, baseScore + activeBonus + repaidBonus - defaultPenalty));
  }, [address, activeLoans.length, repaidCount, defaultedCount]);

  const handleRepayClick = (loanId: string) => {
    setRepayLoanId(loanId);
    setRepayAmount('');
    setShowRepayModal(true);
  };

  const handleRepaySubmit = async () => {
    if (!repayLoanId || !repayAmount) return;
    await repay(repayLoanId, repayAmount);
    setShowRepayModal(false);
    setRepayLoanId(null);
    setRepayAmount('');
  };

  const handleVouchClick = (loanId: string) => {
    setVouchLoanId(loanId);
    setVouchAmount('');
    setShowVouchModal(true);
  };

  const handleVouchSubmit = async () => {
    if (!vouchLoanId || !vouchAmount) return;
    await vouch(vouchLoanId, vouchAmount);
    setShowVouchModal(false);
    setVouchLoanId(null);
    setVouchAmount('');
  };

  const sidebarLinks = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'my-loans', icon: Clock, label: 'My Loans & History' },
    { id: 'pending-vouches', icon: Users, label: 'Pending Vouches' },
    { id: 'staking', icon: Zap, label: 'Staking Position' },
  ] as const;

  if (!isConnected) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-8 flex justify-center">
          <div className="neo-card p-12 text-center max-w-lg w-full bg-white border-4 border-black box-shadow-[8px_8px_0px_#000]">
            <Wallet className="w-16 h-16 mx-auto mb-6 text-black" />
            <h2 className="text-3xl font-black mb-4 uppercase text-black">
              Connect Wallet
            </h2>
            <p className="text-lg font-bold text-black border-2 border-black p-3 bg-yellow-300">
              You must securely connect your wallet to access the decentralized dashboard.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const derivedUsername = username || (address ? `ZapUser_${address.slice(2, 6)}` : 'Guest');

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 md:px-8 pt-6 pb-4 flex flex-col lg:flex-row gap-4 md:gap-6 items-start w-full">

        {/* SIDEBAR */}
        <aside className="w-full lg:w-72 shrink-0 animate-fade-in-up">
          <div className="neo-card p-4 md:p-6 w-full">
            <h2 className="text-lg md:text-xl font-black uppercase mb-3 text-black border-b-3 md:border-b-4 border-black pb-2 md:pb-3 text-center lg:text-left">
              DASHBOARD
            </h2>

            <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 md:gap-3 pb-2 lg:pb-0">
              {sidebarLinks.map((link) => {
                const isActive = activeTab === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => setActiveTab(link.id)}
                    className={`flex items-center justify-start gap-2 md:gap-3 w-full p-2 md:p-3 font-bold border-2 transition-all shrink-0 ${isActive
                        ? 'bg-black text-white border-black lg:translate-x-2'
                        : 'bg-white text-black border-black hover:bg-gray-100 lg:hover:translate-x-1'
                      }`}
                  >
                    <link.icon className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isActive ? 'text-[#00F5D4]' : 'text-black'}`} />
                    <span className="uppercase text-[10px] sm:text-xs md:text-sm tracking-wider lg:tracking-widest whitespace-nowrap text-left">{link.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="hidden lg:block mt-12 pt-6 border-t-4 border-black">
              <p className="text-xs font-bold text-black uppercase mb-2">Logged in as</p>
              <p className="text-lg font-black text-black bg-[#00F5D4] p-2 border-2 border-black inline-block mb-4">
                {derivedUsername}
              </p>

              <p className="text-xs font-bold text-black uppercase mb-2">Connected Address</p>
              <p className="text-xs font-bold font-mono text-black bg-yellow-300 p-2 border-2 border-black break-all">
                {address}
              </p>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <section className="flex-1 w-full animate-fade-in-up animate-delay-100 min-h-[600px]">

          {!contractReady && (
            <div className="flex items-center gap-3 p-4 mb-8 bg-white border-4 border-black box-shadow-xl">
              <AlertTriangle className="w-6 h-6 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-black text-red-600 uppercase">Contract Not Configured</p>
                <p className="text-xs font-bold text-black mt-1">
                  Ensure NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS is set in your environment.
                </p>
              </div>
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                {/* Credit Score */}
                <CreditScore
                  score={dynamicScore}
                  totalLoans={myLoans.length}
                  repaidLoans={repaidCount}
                  defaultedLoans={defaultedCount}
                />

                {/* Quick Stats Grid */}
                <div className="neo-card p-6 bg-[#FFD500] border-4 border-black hover-glow">
                  <h3 className="text-xl font-black mb-6 text-black uppercase">
                    Portfolio Quick Look
                  </h3>
                  <div className="space-y-4">
                    {[
                      { icon: TrendingUp, label: 'Total Borrowed', value: `${totalBorrowed.toLocaleString()} STRK`, bg: 'bg-white' },
                      { icon: Shield, label: 'Active Loans', value: activeLoans.length.toString(), bg: 'bg-[#00F5D4]' },
                      { icon: Users, label: 'Actionable Vouches', value: vouchableLoans.length.toString(), bg: 'bg-[#F72585]', text: 'text-white' },
                      { icon: Zap, label: 'Total Staked', value: totalStaked, bg: 'bg-[#FFD500]' },
                    ].map(({ icon: Icon, label, value, bg, text }) => (
                      <div key={label} className={`flex items-center justify-between p-3 border-4 border-black ${bg} ${text || 'text-black'} box-shadow-[4px_4px_0px_#000] hover-lift`}>
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-bold uppercase">{label}</span>
                        </div>
                        <span className="text-lg font-black truncate ml-2 max-w-[50%] text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MY LOANS */}
          {activeTab === 'my-loans' && (
            <div className="space-y-4 animate-fade-in-up">
              <h2 className="text-2xl font-black text-black uppercase border-b-4 border-black pb-2 mb-4">
                Active & Pending Loans
              </h2>

              {/* Pending Loans (Awaiting Vouches) */}
              {pendingLoans.length > 0 && (
                <div className="mb-4 animate-fade-in-up">
                  <h3 className="text-sm font-black text-black uppercase mb-2 py-1 px-2 bg-yellow-300 border-2 border-black inline-block">
                    Awaiting Social Collateral
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:gap-3">
                    {pendingLoans.map((loan, idx) => {
                      const target = parseFloat(loan.socialCollateralTarget.replace(/,/g, ''));
                      const current = parseFloat(loan.socialCollateralCurrent.replace(/,/g, ''));
                      const progress = target > 0 ? (current / target) * 100 : 0;
                      const cardBg = idx % 3 === 0 ? '#FFD500' : idx % 3 === 1 ? '#00F5D4' : '#B8B0FF';

                      return (
                        <div 
                          key={loan.id} 
                          className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[48px_110px_140px_96px_auto] items-center gap-1 sm:gap-3 min-h-[44px] sm:min-h-[52px] p-1.5 sm:p-3 sm:px-4 border-[3px] border-black hover-yellow-border hover-lift shadow-[4px_4px_0px_#000] overflow-hidden"
                          style={{ background: cardBg }}
                        >
                          <span className="h-6 w-8 sm:h-7 sm:w-10 flex items-center justify-center font-black text-[9px] sm:text-xs border-2 border-black bg-white text-black whitespace-nowrap">#{loan.id}</span>
                          <p className="h-6 sm:h-7 text-[8px] sm:text-xs font-bold font-mono text-black bg-white px-1 sm:px-2 border-2 border-black whitespace-nowrap flex items-center justify-center">
                            {loan.amount}<span className="sm:hidden">&nbsp;STRK</span><span className="hidden sm:inline">&nbsp;STRK</span>
                          </p>
                          <div className="flex items-center gap-1 sm:gap-2 h-6 sm:h-7">
                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-black whitespace-nowrap">
                              <span className="sm:hidden">{progress.toFixed(0)}%</span>
                              <span className="hidden sm:inline">PG {progress.toFixed(0)}%</span>
                            </span>
                            <div className="h-3 bg-white border-2 border-black w-12 sm:w-20 relative">
                              <div className="absolute top-0 left-0 h-full border-r-2 border-black" style={{ width: `${Math.min(100, progress)}%`, background: '#FF007F' }} />
                            </div>
                          </div>
                          <p className="h-6 sm:h-7 min-w-[64px] sm:min-w-[92px] text-[8px] sm:text-[10px] font-bold text-black uppercase bg-white/60 px-1 sm:px-1.5 border border-black whitespace-nowrap flex items-center justify-center" title={getLoanDateFull(loan.id)}>
                            <span className="sm:hidden">{getLoanDateCompact(loan.id)}</span>
                            <span className="hidden sm:inline">{getLoanDate(loan.id)}</span>
                          </p>
                          <span className="h-6 sm:h-7 px-2 bg-white border-2 border-black font-black text-black uppercase text-[8px] sm:text-[10px] flex items-center justify-center justify-self-end">
                            {loan.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Loans */}
              {activeLoans.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {activeLoans.map((loan, idx) => {
                    const totalDue = parseFloat(loan.amount.replace(/,/g, '')) * 1.05;
                    const repaid = parseFloat(loan.repaidAmount?.replace(/,/g, '') || '0');
                    const remaining = Math.max(0, totalDue - repaid);
                    const progress = totalDue > 0 ? (repaid / totalDue) * 100 : 0;
                    const cardBg = idx % 3 === 0 ? '#00F5D4' : idx % 3 === 1 ? '#B8B0FF' : '#FFD500';

                    return (
                      <div 
                        key={loan.id} 
                        className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] sm:grid-cols-[48px_110px_110px_120px_96px_auto] items-center gap-1 sm:gap-3 min-h-[44px] sm:min-h-[52px] p-1.5 sm:p-3 sm:px-4 border-[3px] border-black hover-yellow-border hover-lift shadow-[4px_4px_0px_#000] overflow-hidden"
                        style={{ background: cardBg }}
                      >
                        <span className="h-6 w-8 sm:h-7 sm:w-10 flex items-center justify-center font-black text-[9px] sm:text-xs border-2 border-black bg-white text-black whitespace-nowrap">#{loan.id}</span>
                        <p className="h-6 sm:h-7 text-[8px] sm:text-[10px] font-bold font-mono text-black bg-white px-1 sm:px-1.5 border-2 border-black whitespace-nowrap flex items-center justify-center">
                          {loan.amount}<span className="sm:hidden">&nbsp;STRK</span><span className="hidden sm:inline">&nbsp;STRK</span>
                        </p>
                        <p className="h-6 sm:h-7 text-[8px] sm:text-[10px] font-bold font-mono text-black bg-white px-1 sm:px-1.5 border-2 border-black whitespace-nowrap flex items-center justify-center">
                          <span className="sm:hidden">Due {remaining.toFixed(2)}</span>
                          <span className="hidden sm:inline">Due {remaining.toFixed(2)}</span>
                        </p>
                        <div className="flex items-center gap-1 sm:gap-2 h-6 sm:h-7">
                          <div className="h-3 bg-white border-2 border-black w-12 sm:w-20 relative">
                            <div className="absolute top-0 left-0 h-full border-r-2 border-black" style={{ width: `${Math.min(100, progress)}%`, background: '#FF007F' }} />
                          </div>
                        </div>
                        <p className="h-6 sm:h-7 min-w-[64px] sm:min-w-[92px] text-[8px] sm:text-[10px] font-bold text-black uppercase bg-white/60 px-1 sm:px-1.5 border border-black whitespace-nowrap flex items-center justify-center" title={getLoanDateFull(loan.id)}>
                          <span className="sm:hidden">{getLoanDateCompact(loan.id)}</span>
                          <span className="hidden sm:inline">{getLoanDate(loan.id)}</span>
                        </p>
                        <div className="flex items-center gap-1 sm:gap-2 justify-end">
                          <span className="h-6 sm:h-7 px-2 bg-white font-black border-2 border-black text-black uppercase text-[8px] sm:text-[10px] flex items-center justify-center">
                            {loan.status}
                          </span>
                          <button
                            onClick={() => handleRepayClick(loan.id)}
                            disabled={isRepaying}
                            className="h-6 sm:h-7 px-2 sm:px-3 md:px-4 text-[8px] sm:text-xs font-black uppercase transition-transform hover:-translate-y-0.5 border-2 border-black shadow-[2px_2px_0px_#000] bg-black text-white hover:bg-gray-800 flex items-center justify-center"
                            style={{ opacity: isRepaying ? 0.6 : 1 }}
                          >
                            {isRepaying && repayLoanId === loan.id ? '...' : 'Pay'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
          {/* Historical Loans Table - now outside the tab content but visible on my-loans */}
          {activeTab === 'my-loans' && myLoans.length > 0 && (
            <div className="mt-6 md:mt-8 mb-4 animate-fade-in-up">
              <h3 className="text-lg md:text-xl font-black text-black uppercase mb-3 border-b-4 border-black pb-2">Complete Loan History</h3>
              <div className="flex flex-col gap-2 sm:gap-3">
                    {myLoans.map((loan, idx) => {
                      const cardBg = idx % 3 === 0 ? '#FFD500' : idx % 3 === 1 ? '#00F5D4' : '#B8B0FF';
                      return (
                      <div 
                        key={loan.id} 
                        className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[48px_120px_140px_96px_auto] items-center gap-1 sm:gap-3 min-h-[44px] sm:min-h-[52px] p-1.5 sm:p-3 sm:px-4 border-[3px] border-black hover-yellow-border hover-lift shadow-[4px_4px_0px_#000] overflow-hidden"
                        style={{ background: cardBg }}
                      >
                        <span className="h-6 w-8 sm:h-7 sm:w-10 flex items-center justify-center font-black text-[9px] sm:text-xs border-2 border-black bg-white text-black whitespace-nowrap">#{loan.id}</span>
                        <p className="h-6 sm:h-7 text-[8px] md:text-[11px] font-black text-black bg-white px-1 sm:px-2 border-2 border-black whitespace-nowrap flex items-center justify-center">
                          {loan.amount}<span className="sm:hidden">&nbsp;STRK</span><span className="hidden sm:inline">&nbsp;STRK</span>
                        </p>
                        <p className="h-6 sm:h-7 text-[8px] md:text-[10px] font-bold text-black uppercase bg-white/50 px-1 sm:px-1.5 border border-black whitespace-nowrap flex items-center justify-center">
                          {loan.duration}D<span className="hidden sm:inline">&nbsp;•&nbsp;{loan.interestRate}% APR</span>
                        </p>
                        <p className="h-6 sm:h-7 min-w-[64px] sm:min-w-[92px] text-[8px] md:text-[10px] font-bold text-black uppercase bg-white/60 px-1 sm:px-1.5 border border-black whitespace-nowrap flex items-center justify-center" title={getLoanDateFull(loan.id)}>
                          <span className="sm:hidden">{getLoanDateCompact(loan.id)}</span>
                          <span className="hidden sm:inline">{getLoanDate(loan.id)}</span>
                        </p>
                        <span className={`h-6 sm:h-7 px-2 md:px-3 font-black uppercase text-[8px] md:text-[10px] border-2 border-black min-w-[60px] sm:min-w-[100px] text-center flex items-center justify-center justify-self-end ${loan.status === 'Repaid' ? 'bg-white text-black' :
                            loan.status === 'Active' ? 'bg-white text-black' :
                              loan.status === 'Defaulted' ? 'bg-black text-white' : 'bg-white text-black'
                          }`}>
                          {loan.status}
                        </span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

          {/* TAB: PENDING VOUCHES */}
          {activeTab === 'pending-vouches' && (
            <div className="space-y-8 animate-fade-in-up">
              <h2 className="text-3xl font-black text-black uppercase border-b-4 border-black pb-4 mb-8 flex items-center gap-3">
                <Users className="w-8 h-8 text-[#FF007F]" /> Action required
              </h2>

              {pendingLoans.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-black uppercase mb-1 py-1 px-2 bg-[#00F5D4] border-2 border-black inline-block">
                    Your Pending Requests
                  </h3>
                  <div className="flex flex-col gap-3">
                    {pendingLoans.map((loan, idx) => {
                      const target = parseFloat(loan.socialCollateralTarget.replace(/,/g, ''));
                      const current = parseFloat(loan.socialCollateralCurrent.replace(/,/g, ''));
                      const remaining = Math.max(0, target - current);
                      const progress = target > 0 ? (current / target) * 100 : 0;
                      const cardBg = idx % 3 === 0 ? '#FFD500' : idx % 3 === 1 ? '#B8B0FF' : '#00F5D4';
                      return (
                        <div
                          key={loan.id}
                          className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:grid-cols-[48px_160px_130px_120px_96px_auto] items-center min-h-[44px] sm:min-h-[52px] p-1.5 sm:p-3 sm:px-4 gap-1 sm:gap-3 border-[3px] border-black hover-yellow-border hover-lift shadow-[4px_4px_0px_#000] overflow-hidden"
                          style={{ background: cardBg }}
                        >
                          <span className="h-6 w-8 sm:h-7 sm:w-10 flex items-center justify-center font-black text-[9px] sm:text-xs border-2 border-black bg-white text-black whitespace-nowrap">#{loan.id}</span>
                          <p className="h-6 sm:h-7 text-[8px] sm:text-[10px] font-bold font-mono text-black bg-white px-1 sm:px-2 border-2 border-black whitespace-nowrap flex items-center justify-center">
                            <span className="sm:hidden">T {loan.socialCollateralTarget} STRK</span>
                            <span className="hidden sm:inline">Target {loan.socialCollateralTarget} STRK</span>
                          </p>
                          <p className="h-6 sm:h-7 text-[8px] sm:text-[11px] font-black text-black whitespace-nowrap bg-white/60 px-1 sm:px-2 border-2 border-black flex items-center justify-center">
                            <span className="sm:hidden">N {remaining.toFixed(1)} STRK</span>
                            <span className="hidden sm:inline">Need {remaining.toFixed(1)} STRK</span>
                          </p>
                          <div className="flex items-center gap-1 sm:gap-2 h-6 sm:h-7">
                            <span className="text-[8px] sm:text-[10px] font-black uppercase text-black whitespace-nowrap">{progress.toFixed(0)}%</span>
                            <div className="h-3 bg-white border-2 border-black w-12 sm:w-20 relative">
                              <div className="absolute top-0 left-0 h-full border-r-2 border-black" style={{ width: `${Math.min(100, progress)}%`, background: '#FF007F' }} />
                            </div>
                          </div>
                          <p className="h-6 sm:h-7 min-w-[64px] sm:min-w-[92px] text-[8px] sm:text-[11px] font-black text-black whitespace-nowrap bg-white/60 px-1 sm:px-2 border-2 border-black flex items-center justify-center" title={getLoanDateFull(loan.id)}>
                            <span className="sm:hidden">{getLoanDateCompact(loan.id)}</span>
                            <span className="hidden sm:inline">{getLoanDate(loan.id)}</span>
                          </p>
                          <div className="flex items-center gap-1 sm:gap-2 justify-end">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/loan/${loan.id}`);
                              }}
                              className="h-6 sm:h-7 px-2 sm:px-3 text-[8px] md:text-[10px] font-black uppercase flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000] bg-white text-black hover:-translate-y-0.5 transition-all"
                              title="Copy share link"
                            >
                              <Copy className="w-3 h-3" />
                              <span className="hidden sm:inline">Share</span>
                            </button>
                            <Link
                              href={`/loan/${loan.id}`}
                              className="h-6 sm:h-7 px-2 sm:px-3 text-[8px] md:text-[10px] font-black uppercase flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000] bg-white text-black hover:-translate-y-0.5 transition-all"
                              title="View loan details"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {vouchableLoans.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-black uppercase mb-1 py-1 px-2 bg-yellow-300 border-2 border-black inline-block">
                    Loans You Can Vouch For
                  </h3>
                  <div className="flex flex-col gap-3">
                    {vouchableLoans.map((loan, idx) => {
                      const remaining = parseFloat(loan.socialCollateralTarget.replace(/,/g, '')) - parseFloat(loan.socialCollateralCurrent.replace(/,/g, ''));
                      const cardBg = idx % 3 === 0 ? '#B8B0FF' : idx % 3 === 1 ? '#FFD500' : '#00F5D4';
                      return (
                        <div 
                          key={loan.id} 
                        className="grid grid-cols-[32px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] sm:grid-cols-[48px_160px_130px_96px_auto] items-center min-h-[44px] sm:min-h-[52px] p-1.5 sm:p-3 sm:px-4 gap-1 sm:gap-3 border-[3px] border-black hover-yellow-border hover-lift shadow-[4px_4px_0px_#000] overflow-hidden"
                          style={{ background: cardBg }}
                        >
                          <span className="h-6 w-8 sm:h-7 sm:w-10 flex items-center justify-center font-black text-[9px] sm:text-xs border-2 border-black bg-white text-black whitespace-nowrap">#{loan.id}</span>
                          <p className="h-6 sm:h-7 text-[8px] sm:text-[10px] font-bold font-mono text-black bg-white px-1 sm:px-2 border-2 border-black whitespace-nowrap max-w-[96px] sm:max-w-[160px] truncate flex items-center justify-center">
                            <span className="sm:hidden">{loan.borrower.slice(0, 4)}...{loan.borrower.slice(-3)}</span>
                            <span className="hidden sm:inline">User {loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}</span>
                          </p>
                          <p className="h-6 sm:h-7 text-[8px] sm:text-[11px] font-black text-black whitespace-nowrap bg-white/60 px-1 sm:px-2 border-2 border-black flex items-center justify-center">
                            <span className="sm:hidden">N {remaining.toFixed(1)} STRK</span>
                            <span className="hidden sm:inline">Need {remaining.toFixed(1)} STRK</span>
                          </p>
                          <p className="h-6 sm:h-7 min-w-[64px] sm:min-w-[92px] text-[8px] sm:text-[11px] font-black text-black whitespace-nowrap bg-white/60 px-1 sm:px-2 border-2 border-black flex items-center justify-center" title={getLoanDateFull(loan.id)}>
                            <span className="sm:hidden">{getLoanDateCompact(loan.id)}</span>
                            <span className="hidden sm:inline">{getLoanDate(loan.id)}</span>
                          </p>
                          <div className="flex items-center gap-1 sm:gap-2 justify-end">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/loan/${loan.id}`);
                              }}
                              className="h-6 sm:h-7 px-2 sm:px-3 text-[8px] md:text-[10px] font-black uppercase flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000] bg-white text-black hover:-translate-y-0.5 transition-all"
                              title="Copy share link"
                            >
                              <Copy className="w-3 h-3" />
                              <span className="hidden sm:inline">Share</span>
                            </button>
                            <Link
                              href={`/loan/${loan.id}`}
                              className="h-6 sm:h-7 px-2 sm:px-3 text-[8px] md:text-[10px] font-black uppercase flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000] bg-white text-black hover:-translate-y-0.5 transition-all"
                              title="View loan details"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                            <button
                              onClick={() => handleVouchClick(loan.id)}
                              disabled={isVouching}
                              className="h-6 sm:h-7 px-2 sm:px-4 text-[8px] md:text-[10px] font-black uppercase hover:-translate-y-0.5 flex items-center justify-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000] bg-black text-white hover:bg-gray-800"
                              style={{ opacity: isVouching ? 0.6 : 1 }}
                            >
                              <Shield className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                              <span className="hidden sm:inline">{isVouching && vouchLoanId === loan.id ? '...' : 'Vouch'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                pendingLoans.length === 0 && (
                  <div className="neo-card p-12 text-center bg-gray-50 border-4 border-black">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-black" />
                    <p className="text-xl font-black text-black uppercase">No vouch requests at this time.</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB: STAKING POSITION */}
          {activeTab === 'staking' && (
            <div className="space-y-6 animate-fade-in-up">
              <h2 className="text-2xl font-black text-black uppercase border-b-4 border-black pb-3 flex items-center gap-3">
                <Zap className="w-7 h-7 text-[#FFD500]" /> Staking Positions
              </h2>

              {isLoadingPositions ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin" />
                </div>
              ) : allPositions && allPositions.length > 0 ? (
                <>
                  {/* Summary totals */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="neo-card p-4 hover-lift" style={{ background: '#FFD500' }}>
                      <p className="text-[10px] font-black uppercase text-black/60 mb-1">Total Staked</p>
                      <p className="text-xl font-black text-black truncate" title={totalStaked}>{totalStaked}</p>
                    </div>
                    <div className="neo-card p-4 hover-lift" style={{ background: '#00F5D4' }}>
                      <p className="text-[10px] font-black uppercase text-black/60 mb-1">Total Rewards</p>
                      <p className="text-xl font-black text-black truncate" title={totalRewards}>{totalRewards}</p>
                    </div>
                    <div className="neo-card p-4 hover-lift" style={{ background: '#5A4BFF' }}>
                      <p className="text-[10px] font-black uppercase text-white/60 mb-1">Active Positions</p>
                      <p className="text-xl font-black text-white">{allPositions.length}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {allPositions.map((pos, idx) => {
                      const bgColors = ['#FFD500', '#00F5D4', '#5A4BFF', '#F72585', '#7B61FF'];
                      const bg = bgColors[idx % bgColors.length];
                      const isDark = ['#5A4BFF', '#F72585', '#7B61FF'].includes(bg);
                      const tc = isDark ? '#fff' : '#000';
                      const badgeText = (pos.validatorName || 'VP').slice(0, 2).toUpperCase();

                      return (
                        <div
                          key={pos.poolAddress}
                          className="neo-card p-5 hover-lift"
                          style={{ background: bg }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-10 h-10 flex items-center justify-center bg-yellow-300 border-2 border-black font-black text-sm shrink-0"
                              style={{ boxShadow: '3px 3px 0px #000' }}
                            >
                              {badgeText}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-lg font-black truncate" style={{ color: tc }}>
                                {pos.validatorName || 'Unknown Validator'}
                              </p>
                              <p className="text-xs font-mono truncate" style={{ color: tc, opacity: 0.7 }}>
                                {pos.poolAddress.slice(0, 10)}...{pos.poolAddress.slice(-6)}
                              </p>
                            </div>
                            <span
                              className="px-2 py-1 border-2 border-black font-black uppercase text-[10px] bg-white text-black whitespace-nowrap shrink-0"
                              style={{ boxShadow: '2px 2px 0px #000' }}
                            >
                              Active
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase" style={{ color: tc, opacity: 0.6 }}>Staked</p>
                              <p className="text-sm font-black truncate" style={{ color: tc }} title={pos.staked}>{pos.staked}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase" style={{ color: tc, opacity: 0.6 }}>Rewards</p>
                              <p className="text-sm font-black truncate" style={{ color: tc }} title={pos.rewards}>{pos.rewards}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase" style={{ color: tc, opacity: 0.6 }}>Total</p>
                              <p className="text-sm font-black truncate" style={{ color: tc }} title={pos.total}>{pos.total}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase" style={{ color: tc, opacity: 0.6 }}>Commission</p>
                              <p className="text-sm font-black" style={{ color: tc }}>{pos.commissionPercent}%</p>
                            </div>
                          </div>
                          <p className="text-[10px] font-black uppercase" style={{ color: tc, opacity: 0.6 }} title={formatTimestamp(pos.unpoolTime ?? null)}>
                            Unpool Time: <span className="font-black" style={{ color: tc }}>{formatDateShort(pos.unpoolTime ?? null)}</span>
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href="/stake"
                              className="px-3 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all"
                            >
                              <Coins className="w-3 h-3 inline mr-1" />Stake More
                            </Link>
                            <button
                              onClick={() => claimRewards(pos.poolAddress)}
                              disabled={isStakingLoading || pos.rewards === '0' || pos.rewards === '0 STRK'}
                              className="px-3 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                              <Zap className="w-3 h-3 inline mr-1" />Claim
                            </button>
                            <Link
                              href="/stake"
                              className="px-3 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all"
                            >
                              <TrendingUp className="w-3 h-3 inline mr-1" />Unstake
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Link
                    href="/stake"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFD500] border-3 border-black text-black font-black text-sm uppercase
                      shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    <Zap className="w-4 h-4" /> Manage Staking →
                  </Link>
                </>
              ) : (
                <div className="neo-card p-10 text-center" style={{ background: '#00F5D4' }}>
                  <Zap className="w-12 h-12 mx-auto mb-4 text-black" />
                  <p className="text-xl font-black text-black mb-2">No Active Stakes</p>
                  <p className="text-sm font-bold text-black mb-4">
                    You haven&apos;t staked in any pool yet. Go to the Stake page to get started.
                  </p>
                  <Link
                    href="/stake"
                    className="inline-block px-5 py-2 bg-[#FFD500] border-3 border-black text-black font-black text-sm uppercase
                      shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  >
                    Go to Staking →
                  </Link>
                </div>
              )}
            </div>
          )}

        </section>
      </div>

      {/* Repay Modal */}
      {showRepayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="neo-card p-8 max-w-md w-full mx-4 bg-[#00F5D4] border-4 border-black box-shadow-[10px_10px_0px_#000]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-3xl font-black mb-4 uppercase text-black">
              Repay #{repayLoanId}
            </h3>
            <p className="font-bold mb-6 text-black">
              Enter amount to repay. Partial payments are accepted.
            </p>

            <div className="mb-6">
              <label className="text-sm font-black mb-2 block uppercase text-black">
                Amount (STRK)
              </label>
              <input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                className="w-full text-2xl font-black p-4 border-4 border-black bg-white"
                placeholder="500"
                min="0"
                step="any"
              />
            </div>

            <div className="flex gap-4 flex-col sm:flex-row">
              <button
                onClick={handleRepaySubmit}
                disabled={!repayAmount || isRepaying}
                className="flex-1 py-4 text-lg font-black uppercase"
                style={{ background: '#FF007F', color: '#FFF', border: '4px solid #000', boxShadow: '4px 4px 0px #000', opacity: (!repayAmount || isRepaying) ? 0.6 : 1 }}
              >
                {isRepaying ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => { setShowRepayModal(false); setRepayLoanId(null); }}
                className="flex-1 py-4 text-lg font-black uppercase bg-white border-4 border-black hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vouch Modal */}
      {showVouchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="neo-card p-8 max-w-md w-full mx-4 bg-yellow-300 border-4 border-black box-shadow-[10px_10px_0px_#000]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-3xl font-black mb-4 uppercase text-black">
              Vouch #{vouchLoanId}
            </h3>
            <p className="font-bold mb-6 text-black">
              Stake STRK as social collateral. Locked until repaid or defaulted.
            </p>

            <div className="mb-6">
              <label className="text-sm font-black mb-2 block uppercase text-black">
                Amount (STRK)
              </label>
              <input
                type="number"
                value={vouchAmount}
                onChange={(e) => setVouchAmount(e.target.value)}
                className="w-full text-2xl font-black p-4 border-4 border-black bg-white"
                placeholder="100"
                min="0"
                step="any"
              />
            </div>

            <div className="flex gap-4 flex-col sm:flex-row">
              <button
                onClick={handleVouchSubmit}
                disabled={!vouchAmount || isVouching}
                className="flex-1 py-4 text-lg font-black uppercase"
                style={{ background: '#FF007F', color: '#FFF', border: '4px solid #000', boxShadow: '4px 4px 0px #000', opacity: (!vouchAmount || isVouching) ? 0.6 : 1 }}
              >
                {isVouching ? 'Staking...' : 'Confirm'}
              </button>
              <button
                onClick={() => { setShowVouchModal(false); setVouchLoanId(null); }}
                className="flex-1 py-4 text-lg font-black uppercase bg-white border-4 border-black hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
