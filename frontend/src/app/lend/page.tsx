'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { LoanCard } from '@/components/LoanCard';
import { useLoans } from '@/hooks/useLoans';
import { useVouch } from '@/hooks/useVouch';
import { useLiquidate } from '@/hooks/useLiquidate';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { Search, Loader2, Inbox, ChevronDown, ChevronUp, TrendingUp, Clock, Users, AlertTriangle, Share2, Copy, Check, Coins, Shield, Zap, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Pagination } from '@/components/Pagination';

export default function LendPage() {
  const { data: loans, isLoading } = useLoans();
  const { vouch, isLoading: isVouching } = useVouch();
  const { liquidate, isLoading: isLiquidating } = useLiquidate();
  const { isConnected, address, username } = useStarkzap();
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vouchingLoanId, setVouchingLoanId] = useState<string | null>(null);
  const [vouchAmount, setVouchAmount] = useState('');
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const toggleExpand = (id: string) => {
    setExpandedLoanId(expandedLoanId === id ? null : id);
  };

  const filteredLoans = loans?.filter((loan) => {
    if (filter !== 'all' && loan.status.toLowerCase() !== filter) return false;
    if (searchQuery && !loan.borrower.toLowerCase().includes(searchQuery.toLowerCase()) && !loan.id.includes(searchQuery)) return false;
    return true;
  });

  const totalPages = Math.ceil((filteredLoans?.length || 0) / ITEMS_PER_PAGE);
  const paginatedLoans = filteredLoans?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const filterOptions = [
    { value: 'all', label: 'All Loans' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'repaid', label: 'Repaid' },
  ];

  const handleVouchClick = (loanId: string) => {
    if (!isConnected) return;
    setVouchingLoanId(loanId);
    setVouchAmount('');
    setShowVouchModal(true);
  };

  const handleVouchSubmit = async () => {
    if (!vouchingLoanId || !vouchAmount) return;
    await vouch(vouchingLoanId, vouchAmount);
    setShowVouchModal(false);
    setVouchingLoanId(null);
    setVouchAmount('');
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 md:px-8 pt-8 md:pt-12 pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6 mb-6 md:mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl md:text-4xl font-black font-display uppercase mb-1 md:mb-2 text-black">
              Loan <span className="gradient-text">Marketplace</span>
            </h1>
            <p className="text-sm md:text-base font-bold text-black">
              Browse loans and vouch for borrowers you trust
            </p>
          </div>

          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-black uppercase bg-white border-2 border-black text-black" style={{ boxShadow: '2px 2px 0px #000' }}>
              Active: {loans?.filter(l => l.status === 'Active').length || 0}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-black uppercase bg-yellow-300 border-2 border-black text-black" style={{ boxShadow: '2px 2px 0px #000' }}>
              Pending: {loans?.filter(l => l.status === 'Pending').length || 0}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 md:mb-8 animate-fade-in-up animate-delay-100 w-full relative z-40">
          <div className="flex flex-row items-center w-full md:w-auto gap-2 sm:gap-4 md:flex-1 relative z-50">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#000' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="neo-input !pl-10 sm:!pl-12 text-xs sm:text-sm py-0 w-full h-[42px] sm:h-[48px] leading-[42px] sm:leading-[48px]"
                placeholder="Search..."
              />
            </div>

            {/* Mobile Dropdown (Hidden on md+) */}
            <div className="md:hidden relative shrink-0 z-50">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between border-2 border-black text-xs sm:text-sm py-0 pl-3 sm:pl-4 pr-2 sm:pr-3 font-black uppercase cursor-pointer outline-none h-[42px] sm:h-[48px] m-0 transition-transform hover:-translate-y-0.5"
                style={{
                  background: 'var(--accent-primary)',
                  minWidth: '120px',
                  boxShadow: '2px 2px 0px #000'
                }}
              >
                <span>{filterOptions.find(o => o.value === filter)?.label}</span>
                <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute top-[calc(100%+8px)] right-0 w-full bg-white border-[3px] border-black z-50 animate-fade-in-up" style={{ boxShadow: '6px 6px 0px #000' }}>
                    {filterOptions.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setFilter(value);
                          setCurrentPage(1);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 md:px-4 py-3 text-xs sm:text-sm font-black uppercase transition-colors border-b-[3px] border-black last:border-b-0 ${filter === value ? '' : 'hover:bg-yellow-300'}`}
                        style={{
                          background: filter === value ? 'var(--accent-primary)' : '#fff',
                        }}
                      >
                        <span className="truncate pr-1">{label}</span>
                        {filter === value && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Desktop Filter Buttons (Hidden on mobile) */}
          <div className="hidden md:flex gap-2 shrink-0">
            {filterOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setFilter(value); setCurrentPage(1); }}
                className="px-4 py-0 h-[48px] text-xs font-black font-display transition-all duration-150 whitespace-nowrap shrink-0"
                style={{
                  background: filter === value ? 'var(--accent-primary)' : '#fff',
                  border: '2px solid #000',
                  color: '#000',
                  textTransform: 'uppercase',
                  boxShadow: filter === value ? '0px 0px 0px #000' : '2px 2px 0px #000',
                  transform: filter === value ? 'translate(2px, 2px)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="flex flex-col gap-3 animate-fade-in-up">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="neo-card p-4 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="skeleton h-6 w-10" />
                    <div className="skeleton h-5 w-24" />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="skeleton h-6 w-20 hidden sm:block" />
                    <div className="skeleton h-6 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredLoans && filteredLoans.length > 0 ? (
          <div className="flex flex-col gap-3 animate-fade-in-up animate-delay-200">
            {paginatedLoans?.map((loan, idx) => {
              const isMine = address && loan.borrower.toLowerCase() === address.toLowerCase();
              const derivedUsername = isMine && username 
                ? username 
                : (loan.borrower ? `ZapUser_${loan.borrower.slice(2, 6)}` : 'Unknown');
              const cardBg = idx % 3 === 0 ? '#FFD500' : idx % 3 === 1 ? '#00F5D4' : '#B8B0FF';
              return (
              <div 
                  key={loan.id} 
                  className="neo-card p-2.5 sm:p-4 sm:px-6 cursor-pointer"
                  style={{ background: cardBg }}
                  onClick={() => setExpandedLoanId(loan.id)}
                >
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
                      <h3 className="text-sm sm:text-lg font-black text-black whitespace-nowrap">#{loan.id}</h3>
                      <p className="text-[9px] sm:text-xs font-bold font-mono text-black bg-yellow-300 px-1.5 py-0.5 border border-black sm:border-2 truncate max-w-[80px] sm:max-w-none">
                        {derivedUsername}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-lg font-black text-black">{loan.amount} STRK</p>
                      </div>
                      <span className="px-1.5 py-0.5 sm:px-3 sm:py-1 border border-black sm:border-2 font-bold uppercase text-black text-[9px] sm:text-xs whitespace-nowrap" style={{
                        background: loan.status === 'Active' ? '#00F5D4' : loan.status === 'Repaid' ? '#22C55E' : loan.status === 'Defaulted' ? '#FF3366' : '#FFD500',
                        color: loan.status === 'Defaulted' ? '#fff' : '#000',
                      }}>
                        {loan.status}
                      </span>
                      <Link
                        href={`/loan/${loan.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center p-1 sm:px-2 sm:py-1 text-xs font-bold border border-black sm:border-2 bg-white hover:bg-yellow-200 transition-colors"
                        title="Share / View Details"
                      >
                        <Share2 className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : (
          <div className="neo-card p-12 text-center animate-fade-in-up animate-delay-200">
            <Inbox className="w-12 h-12 mx-auto mb-4 text-black" />
            <h3 className="text-lg font-black mb-2 text-black uppercase">
              {loans?.length === 0 ? 'NO LOANS ON-CHAIN YET' : 'NO MATCHING LOANS'}
            </h3>
            <p className="text-sm font-bold text-black">
              {loans?.length === 0
                ? 'Be the first to create a loan request on the Borrow page.'
                : 'Try adjusting your filters or search query.'}
            </p>
          </div>
        )}
      </div>

      {/* ═══ Premium Loan Detail Modal ═══ */}
      {expandedLoanId && loans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-up" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={() => setExpandedLoanId(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-auto bg-white" style={{ border: '4px solid #000', boxShadow: '8px 8px 0px #000' }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const activeLoan = loans.find(l => l.id === expandedLoanId);
              if (!activeLoan) return null;
              
              const targetNum = parseFloat(activeLoan.socialCollateralTarget.replace(/,/g, '')) || 1;
              const currentNum = parseFloat(activeLoan.socialCollateralCurrent.replace(/,/g, '')) || 0;
              const socialProgress = (currentNum / targetNum) * 100;
              const remainingAmount = Math.max(targetNum - currentNum, 0);
              const isPending = activeLoan.status === 'Pending';
              const canVouch = isPending && isConnected;
              
              const isMineModal = address && activeLoan.borrower.toLowerCase() === address.toLowerCase();
              const derivedUsernameModal = isMineModal && username 
                ? username 
                : (activeLoan.borrower ? `ZapUser_${activeLoan.borrower.slice(2, 6)}` : 'Unknown');

              const statusBg: Record<string, string> = {
                Pending: '#FFD500', Active: '#00F5D4', Repaid: '#22C55E', Defaulted: '#FF3366',
              };
              const statusTextColor: Record<string, string> = {
                Pending: '#000', Active: '#000', Repaid: '#fff', Defaulted: '#fff',
              };
              const bg = statusBg[activeLoan.status] || '#FFD500';
              const tc = statusTextColor[activeLoan.status] || '#000';

              return (
                <>
                  {/* ── Header Strip ── */}
                  <div className="p-6 pb-5 relative" style={{ background: bg, borderBottom: '4px solid #000' }}>
                    <button
                      onClick={() => setExpandedLoanId(null)}
                      className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center font-black text-lg border-3 border-black bg-white hover:bg-gray-100 transition-colors"
                      style={{ boxShadow: '2px 2px 0px #000' }}
                    >
                      ✕
                    </button>
                    <h2 className="text-3xl font-black font-display uppercase" style={{ color: tc }}>
                      Loan #{activeLoan.id}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-sm font-bold font-mono px-2 py-0.5 border-2 border-black bg-white text-black">
                        {derivedUsernameModal}
                      </span>
                      <span className="text-xs font-mono" style={{ color: tc, opacity: 0.7 }}>
                        {activeLoan.borrower.slice(0, 10)}...{activeLoan.borrower.slice(-6)}
                      </span>
                    </div>
                  </div>

                  {/* ── Stats Grid ── */}
                  <div className="grid grid-cols-2 md:grid-cols-4" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)' }}>
                    {[
                      { icon: Coins, label: 'Amount', value: `${activeLoan.amount} STRK`, bg: '#FFD500' },
                      { icon: Shield, label: 'Collateral', value: `${activeLoan.collateral} STRK`, bg: '#00F5D4' },
                      { icon: Clock, label: 'Duration', value: `${activeLoan.duration} Days`, bg: '#a78bfa' },
                      { icon: TrendingUp, label: 'Interest', value: `${activeLoan.interestRate}%`, bg: '#f472b6' },
                    ].map(({ icon: Icon, label, value, bg: iconBg }, i) => (
                      <div key={label} className="p-4 flex items-center gap-3" style={{ borderRight: i < 3 ? '3px solid #000' : 'none', borderBottom: '3px solid #000' }}>
                        <div className="w-9 h-9 flex items-center justify-center border-2 border-black flex-shrink-0" style={{ background: iconBg, boxShadow: '2px 2px 0px #000' }}>
                          <Icon className="w-4 h-4 text-black" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-black" style={{ letterSpacing: '0.1em' }}>{label}</p>
                          <p className="text-base font-black text-black leading-tight">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Social Collateral Progress ── */}
                  <div className="p-6" style={{ background: 'rgba(255,255,255,0.92)', borderBottom: '3px solid #000' }}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
                        <Users className="w-4 h-4" /> Social Collateral
                      </h3>
                      <span className="text-xs font-black font-mono bg-black text-white px-2 py-1">
                        {activeLoan.socialCollateralCurrent} / {activeLoan.socialCollateralTarget} STRK
                      </span>
                    </div>
                    <div className="w-full h-8 border-3 border-black mb-2" style={{ background: '#f0f0f0', boxShadow: '3px 3px 0px #000' }}>
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${Math.min(socialProgress, 100)}%`,
                          background: socialProgress >= 100
                            ? 'linear-gradient(90deg, #00F5D4, #22C55E)'
                            : 'linear-gradient(90deg, #FFD500, #F72585)',
                        }}
                      />
                    </div>
                    <p className="text-xs font-bold text-black">
                      {socialProgress >= 100
                        ? '✅ Social collateral target reached!'
                        : `${remainingAmount.toFixed(2)} STRK still needed from friends`}
                    </p>
                  </div>

                  {/* ── Actions ── */}
                  <div className="p-6" style={{ background: 'rgba(255,255,255,0.92)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vouch Button */}
                      {canVouch && (
                        <button
                          onClick={() => handleVouchClick(activeLoan.id)}
                          disabled={isVouching && vouchingLoanId === activeLoan.id}
                          className="w-full py-4 text-base font-black uppercase border-3 border-black transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                          style={{
                            background: (isVouching && vouchingLoanId === activeLoan.id) ? '#ccc' : '#FFD500',
                            boxShadow: '4px 4px 0px #000',
                            opacity: (isVouching && vouchingLoanId === activeLoan.id) ? 0.6 : 1,
                          }}
                        >
                          <Zap className="w-5 h-5" />
                          {(isVouching && vouchingLoanId === activeLoan.id) ? 'Processing...' : 'VOUCH FOR THIS LOAN'}
                          <span className="ml-1 text-[10px] font-bold px-2 py-0.5 bg-green-400 border border-black">GASLESS ⚡</span>
                        </button>
                      )}

                      {/* Share Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/loan/${activeLoan.id}`);
                          }}
                          className="flex-1 py-4 text-sm font-black uppercase border-3 border-black bg-white hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                          style={{ boxShadow: '3px 3px 0px #000' }}
                        >
                          <Copy className="w-4 h-4" /> COPY LINK
                        </button>
                        <Link
                          href={`/loan/${activeLoan.id}`}
                          className="flex-1 py-4 text-sm font-black uppercase border-3 border-black bg-black text-white hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                          style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}
                        >
                          <ExternalLink className="w-4 h-4" /> FULL PAGE
                        </Link>
                      </div>
                    </div>

                    {/* Liquidation / Countdown */}
                    {activeLoan.status === 'Active' && activeLoan.startTime > 0 && (() => {
                      const deadlineMs = (activeLoan.startTime + activeLoan.duration * 86400) * 1000;
                      const now = Date.now();
                      const isExpired = now > deadlineMs;
                      const timeLeft = deadlineMs - now;
                      const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
                      const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

                      return (
                        <div className="mt-4">
                          {isExpired ? (
                            <button
                              onClick={() => liquidate(activeLoan.id)}
                              disabled={isLiquidating}
                              className="w-full py-4 text-base font-black uppercase flex items-center justify-center gap-2 border-3 border-black transition-all hover:-translate-y-1"
                              style={{ background: '#FF3366', color: '#fff', boxShadow: '4px 4px 0px #000', opacity: isLiquidating ? 0.6 : 1 }}
                            >
                              <AlertTriangle className="w-5 h-5" />
                              {isLiquidating ? 'Liquidating...' : '⚠️ LIQUIDATE EXPIRED LOAN'}
                            </button>
                          ) : (
                            <div className="p-3 text-center border-3 border-black" style={{ background: 'rgba(255,213,0,0.2)' }}>
                              <p className="text-xs font-bold uppercase text-black">⏱ Time Remaining</p>
                              <p className="text-xl font-black text-black">{daysLeft}d {hoursLeft}h</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Vouch Modal */}
      {showVouchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-card p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black mb-4 uppercase">
              Vouch for Loan #{vouchingLoanId}
            </h3>
            <p className="font-bold mb-6 text-black">
              Enter the STRK amount you want to stake as social collateral. Your funds will be locked until the loan is repaid or defaults.
            </p>

            <div className="mb-6">
              <label className="text-sm font-black mb-2 block uppercase text-black">
                Vouch Amount (STRK)
              </label>
              <input
                type="number"
                value={vouchAmount}
                onChange={(e) => setVouchAmount(e.target.value)}
                className="input-glass text-lg font-bold"
                placeholder="100"
                min="0"
                step="any"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleVouchSubmit}
                disabled={!vouchAmount || isVouching}
                className="flex-1 btn-gradient text-sm"
                style={{ padding: '12px 0', opacity: (!vouchAmount || isVouching) ? 0.5 : 1 }}
              >
                {isVouching ? 'Staking...' : 'Confirm Vouch'}
              </button>
              <button
                onClick={() => { setShowVouchModal(false); setVouchingLoanId(null); }}
                className="flex-1 btn-secondary text-sm"
                style={{ padding: '12px 0' }}
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
