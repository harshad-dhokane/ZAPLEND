'use client';

import { useState, useMemo, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { CreditScore } from '@/components/CreditScore';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useLoans } from '@/hooks/useLoans';
import { useVouch } from '@/hooks/useVouch';
import { useRepay } from '@/hooks/useRepay';
import { useAllVouches } from '@/hooks/useAllVouches';
import { isContractConfigured } from '@/lib/starknet';
import {
  Wallet, Clock, Users, ArrowUpRight, TrendingUp, Shield,
  AlertTriangle, Inbox, LayoutDashboard, List, Activity
} from 'lucide-react';

export default function DashboardPage() {
  const { isConnected, address, username } = useStarkzap();
  const { data: allLoans, isLoading } = useLoans();
  const { vouch, isLoading: isVouching } = useVouch();
  const { repay, isLoading: isRepaying } = useRepay();

  const [activeTab, setActiveTab] = useState<'overview' | 'my-loans' | 'pending-vouches' | 'activity'>('overview');

  // Get total max loan id to fetch all vouches
  const maxLoanId = useMemo(() => {
    if (!allLoans || allLoans.length === 0) return 0;
    return Math.max(...allLoans.map(l => parseInt(l.id)));
  }, [allLoans]);

  const { data: allVouches } = useAllVouches(maxLoanId);

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
  ] as const;

  if (!isConnected) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-20 flex justify-center">
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

      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 pt-6 md:pt-12 pb-24 flex flex-col lg:flex-row gap-6 md:gap-8 items-start w-full">

        {/* SIDEBAR */}
        <aside className="w-full lg:w-72 shrink-0 animate-fade-in-up">
          <div className="neo-card p-4 md:p-6 w-full">
            <h2 className="text-lg md:text-xl font-black uppercase mb-4 md:mb-6 text-black border-b-3 md:border-b-4 border-black pb-3 md:pb-4 text-center lg:text-left">
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
                    ].map(({ icon: Icon, label, value, bg, text }) => (
                      <div key={label} className={`flex items-center justify-between p-4 border-4 border-black ${bg} ${text || 'text-black'} box-shadow-[4px_4px_0px_#000] hover-lift`}>
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-bold uppercase">{label}</span>
                        </div>
                        <span className="text-xl font-black">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MY LOANS */}
          {activeTab === 'my-loans' && (
            <div className="space-y-8 animate-fade-in-up">
              <h2 className="text-3xl font-black text-black uppercase border-b-4 border-black pb-4 mb-8">
                Active & Pending Loans
              </h2>

              {/* Pending Loans (Awaiting Vouches) */}
              {pendingLoans.length > 0 && (
                <div className="mb-10 animate-fade-in-up">
                  <h3 className="text-xl font-black text-black uppercase mb-4 py-1 px-3 bg-yellow-300 border-2 border-black inline-block">
                    Awaiting Social Collateral
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    {pendingLoans.map((loan) => {
                      const target = parseFloat(loan.socialCollateralTarget.replace(/,/g, ''));
                      const current = parseFloat(loan.socialCollateralCurrent.replace(/,/g, ''));
                      const progress = target > 0 ? (current / target) * 100 : 0;

                      return (
                        <div key={loan.id} className="neo-card p-4 md:p-5 border-dashed border-[#FF007F]">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-black text-black uppercase">
                                Loan #{loan.id}
                              </h3>
                              <p className="text-xs font-bold text-black bg-gray-100 inline-block px-2 py-1 border-2 border-black mt-1">
                                Amount: {loan.amount} STRK
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-yellow-300 font-black border-4 border-black text-black uppercase text-sm">
                              {loan.status}
                            </span>
                          </div>

                          <div className="mb-2 p-3 border-4 border-black bg-white">
                            <div className="flex justify-between text-xs mb-1 font-black uppercase text-black">
                              <span>Vouch Progress</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-4 bg-gray-200 border-2 border-black w-full relative">
                              <div className="absolute top-0 left-0 h-full bg-[#FF007F] border-r-2 border-black" style={{ width: `${Math.min(100, progress)}%` }} />
                            </div>
                            <p className="text-xs font-bold text-gray-500 mt-2 text-right">
                              {current.toFixed(1)} / {target.toFixed(1)} STRK Vouched
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Loans */}
              {activeLoans.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {activeLoans.map((loan) => {
                    const totalDue = parseFloat(loan.amount.replace(/,/g, '')) * 1.05;
                    const repaid = parseFloat(loan.repaidAmount?.replace(/,/g, '') || '0');
                    const remaining = Math.max(0, totalDue - repaid);
                    const progress = totalDue > 0 ? (repaid / totalDue) * 100 : 0;

                    return (
                      <div key={loan.id} className="neo-card p-4 md:p-5 hover-lift">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-black text-black uppercase">
                              Loan #{loan.id}
                            </h3>
                            <p className="text-xs font-bold text-black bg-yellow-300 inline-block px-2 py-1 border-2 border-black mt-1">
                              Duration: {loan.duration} days
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-[#00F5D4] font-black border-4 border-black text-black uppercase text-sm">
                            {loan.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-5">
                          <div className="bg-gray-100 p-2 md:p-3 border-2 border-black">
                            <p className="text-[10px] md:text-xs font-bold text-black uppercase">Borrowed</p>
                            <p className="text-lg font-black text-black">{loan.amount}</p>
                          </div>
                          <div className="bg-yellow-100 p-2 md:p-3 border-2 border-black">
                            <p className="text-[10px] md:text-xs font-bold text-black uppercase">Remaining</p>
                            <p className="text-lg font-black text-black">{remaining.toFixed(2)}</p>
                          </div>
                          <div className="bg-[#FF007F]/10 p-2 md:p-3 border-2 border-black">
                            <p className="text-[10px] md:text-xs font-bold text-black uppercase">Total Due</p>
                            <p className="text-lg font-black text-black">{totalDue.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="mb-4 p-3 md:p-4 border-4 border-black">
                          <div className="flex justify-between text-xs mb-1 font-black uppercase text-black">
                            <span>Repayment Progress</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-3 bg-gray-200 border-2 border-black w-full relative">
                            <div className="absolute top-0 left-0 h-full bg-[#FF007F] border-r-2 border-black" style={{ width: `${progress}%` }} />
                          </div>
                        </div>

                        <button
                          onClick={() => handleRepayClick(loan.id)}
                          disabled={isRepaying}
                          className="w-full py-4 text-xl font-black uppercase transition-transform hover:-translate-y-1"
                          style={{
                            background: '#00F5D4', color: '#000', border: '4px solid #000',
                            boxShadow: '4px 4px 0px #000', opacity: isRepaying ? 0.6 : 1
                          }}
                        >
                          {isRepaying && repayLoanId === loan.id ? 'Repaying...' : 'Make Payment'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center bg-gray-50 border-4 border-black neo-card">
                  <Inbox className="w-12 h-12 mx-auto mb-4 text-black" />
                  <p className="text-xl font-black text-black uppercase">No Active Loans</p>
                </div>
              )}

              {/* Historical Loans Table */}
              {myLoans.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-black text-black uppercase mb-6">Complete Loan History</h3>
                  <div className="border-4 border-black bg-white flex flex-col neo-card">
                    {myLoans.map((loan, idx) => (
                      <div key={loan.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-2 sm:gap-4 ${idx !== myLoans.length - 1 ? 'border-b-3 md:border-b-4 border-black' : ''} ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-black text-sm md:text-lg border-3 md:border-4 border-black bg-yellow-300 shrink-0">
                            #{loan.id}
                          </div>
                          <div>
                            <p className="text-base md:text-lg font-black text-black">
                              {loan.amount} STRK
                            </p>
                            <p className="text-[10px] md:text-xs font-bold text-black uppercase">
                              {loan.duration} Days • {loan.interestRate}% Interest
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 font-black uppercase text-xs border-2 border-black ${loan.status === 'Repaid' ? 'bg-[#00F5D4] text-black' :
                            loan.status === 'Active' ? 'bg-yellow-300 text-black' :
                              loan.status === 'Defaulted' ? 'bg-[#FF007F] text-white' : 'bg-white text-black'
                          }`}>
                          {loan.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: PENDING VOUCHES */}
          {activeTab === 'pending-vouches' && (
            <div className="space-y-8 animate-fade-in-up">
              <h2 className="text-3xl font-black text-black uppercase border-b-4 border-black pb-4 mb-8 flex items-center gap-3">
                <Users className="w-8 h-8 text-[#FF007F]" /> Action required
              </h2>

              {vouchableLoans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {vouchableLoans.map((loan) => {
                    const remaining = parseFloat(loan.socialCollateralTarget.replace(/,/g, '')) - parseFloat(loan.socialCollateralCurrent.replace(/,/g, ''));
                    return (
                      <div key={loan.id} className="neo-card p-6 bg-yellow-300 border-4 border-black box-shadow-[6px_6px_0px_#000] hover-scale">
                        <div className="mb-4">
                          <h3 className="font-black text-black text-2xl uppercase">
                            Loan #{loan.id}
                          </h3>
                          <p className="text-xs font-bold font-mono mt-2 text-white bg-black px-2 py-1 inline-block">
                            Borrower: {loan.borrower.slice(0, 8)}...
                          </p>
                        </div>

                        <div className="p-4 bg-white border-4 border-black mb-6">
                          <p className="text-3xl font-black text-black">{remaining.toFixed(2)} <span className="text-sm">STRK needed</span></p>
                          <p className="text-xs font-bold text-black uppercase mt-1">
                            Loan Total: {loan.amount} STRK
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleVouchClick(loan.id)}
                            disabled={isVouching}
                            className="flex-1 py-3 text-sm font-black uppercase transition-transform hover:-translate-y-1 flex items-center justify-center gap-2"
                            style={{ background: '#FF007F', color: '#FFF', border: '4px solid #000', boxShadow: '4px 4px 0px #000', opacity: isVouching ? 0.6 : 1 }}
                          >
                            <Shield className="w-4 h-4" />
                            {isVouching && vouchLoanId === loan.id ? 'Staking...' : 'Vouch'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="neo-card p-12 text-center bg-gray-50 border-4 border-black">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-black" />
                  <p className="text-xl font-black text-black uppercase">No vouch requests at this time.</p>
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
