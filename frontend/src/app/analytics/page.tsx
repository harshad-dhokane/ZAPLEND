'use client';

import { useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { useLoans } from '@/hooks/useLoans';
import { useAllStakingPositions, getSavedPools } from '@/hooks/useStaking';
import { useStarkzap } from '@/providers/StarkzapProvider';
import {
  TrendingUp, Users, Coins, Shield, Zap, Activity,
  CheckCircle2, AlertTriangle, Clock, BarChart3, Award
} from 'lucide-react';

export default function AnalyticsPage() {
  const { data: loans, isLoading } = useLoans();
  const { isConnected } = useStarkzap();
  const { data: allPositions, isLoading: isLoadingPositions } = useAllStakingPositions();

  // Derive staking positions from Starkzap pools (wallet-scoped)
  const stakingData = useMemo(() => {
    const positions = allPositions || [];
    const savedPools = getSavedPools();
    const savedSet = new Set(savedPools.map(p => p.pool));
    const filtered = savedSet.size > 0
      ? positions.filter(p => savedSet.has(p.poolAddress))
      : positions;

    const totalStaked = filtered.reduce(
      (s, p) => s + parseFloat(p.staked.replace(/[^0-9.]/g, '') || '0'),
      0
    );
    const totalRewards = filtered.reduce(
      (s, p) => s + parseFloat(p.rewards.replace(/[^0-9.]/g, '') || '0'),
      0
    );

    return {
      positions: filtered,
      totalStaked,
      totalRewards,
      totalPositions: filtered.length,
      usingSavedPools: savedSet.size > 0,
    };
  }, [allPositions]);

  const stats = useMemo(() => {
    if (!loans || loans.length === 0) {
      return {
        totalLoans: 0, activeLoans: 0, pendingLoans: 0,
        repaidLoans: 0, defaultedLoans: 0,
        totalVolume: 0, totalCollateral: 0,
        totalVouched: 0,
        repaymentRate: 0, avgLoanSize: 0,
        topVouched: [] as { id: string; amount: number; vouched: number, added: number, repaid: number }[],
      };
    }

    const totalLoans = loans.length;
    const activeLoans = loans.filter(l => l.status === 'Active').length;
    const pendingLoans = loans.filter(l => l.status === 'Pending').length;
    const repaidLoans = loans.filter(l => l.status === 'Repaid').length;
    const defaultedLoans = loans.filter(l => l.status === 'Defaulted').length;

    const totalVolume = loans.reduce((s, l) => s + parseFloat(l.amount.replace(/,/g, '') || '0'), 0);
    const totalCollateral = loans.reduce((s, l) => s + parseFloat(l.collateral.replace(/,/g, '') || '0'), 0);
    const totalVouched = loans.reduce((s, l) => s + parseFloat(l.socialCollateralCurrent.replace(/,/g, '') || '0'), 0);

    const completedLoans = repaidLoans + defaultedLoans;
    const repaymentRate = completedLoans > 0 ? (repaidLoans / completedLoans) * 100 : 0;
    const avgLoanSize = totalLoans > 0 ? totalVolume / totalLoans : 0;

    // Top vouched loans
    const topVouched = [...loans]
      .map(l => ({
        id: l.id,
        amount: parseFloat(l.amount.replace(/,/g, '') || '0'),
        vouched: parseFloat(l.socialCollateralCurrent.replace(/,/g, '') || '0'),
        added: parseFloat(l.collateral.replace(/,/g, '') || '0'),
        repaid: parseFloat(l.repaidAmount?.replace(/,/g, '') || '0'),
      }))
      .sort((a, b) => b.vouched - a.vouched)
      .slice(0, 5);

    return {
      totalLoans, activeLoans, pendingLoans,
      repaidLoans, defaultedLoans,
      totalVolume, totalCollateral,
      totalVouched, repaymentRate,
      avgLoanSize, topVouched,
    };
  }, [loans]);

  // SVG ring chart helper
  const RingChart = ({ percentage, color, label, size = 140 }: { percentage: number; color: string; label: string; size?: number }) => {
    const r = (size - 20) / 2;
    const circumference = 2 * Math.PI * r;
    const dashOffset = circumference - (percentage / 100) * circumference;
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-black">{Math.round(percentage)}%</span>
          <span className="text-[10px] font-bold text-black uppercase" style={{ letterSpacing: '0.1em' }}>{label}</span>
        </div>
      </div>
    );
  };

  // Simple bar chart helper
  const StatusBar = ({ label, value, total, color }: { label: string; value: number; total: number; color: string }) => {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-black text-black uppercase">{label}</span>
          <span className="text-sm font-black text-black">{value}</span>
        </div>
        <div className="w-full h-6 border-3 border-black bg-gray-100" style={{ boxShadow: '2px 2px 0px #000' }}>
          <div className="h-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 md:px-8 pt-8 pb-12">
        {/* Header */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-black" />
            <h1 className="text-3xl md:text-4xl font-black font-display uppercase text-black">
              Protocol <span className="gradient-text">Analytics</span>
            </h1>
          </div>
          <p className="text-base font-bold text-black">
            Real-time on-chain metrics for the ZapLend protocol on Starknet Sepolia.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 text-xs font-bold bg-green-400 border-2 border-black text-black uppercase">
              ⚡ LIVE
            </span>
            <span className="px-3 py-1 text-xs font-bold bg-yellow-300 border-2 border-black text-black uppercase">
              Auto-refreshes every 15s
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
        ) : (
          <>
            {/* ═══ KEY METRICS ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 animate-fade-in-up">
              {[
                { icon: TrendingUp, label: 'Total Loans', value: stats.totalLoans.toString(), bg: '#FFD500' },
                { icon: Coins, label: 'Total Volume', value: `${stats.totalVolume.toLocaleString()} STRK`, bg: '#00F5D4' },
                { icon: Users, label: 'Total Vouched', value: `${stats.totalVouched.toLocaleString()} STRK`, bg: '#5A4BFF', text: '#fff' },
                { icon: Shield, label: 'Collateral Locked', value: `${stats.totalCollateral.toLocaleString()} STRK`, bg: '#F72585', text: '#fff' },
                { icon: Zap, label: 'ZapLend Staked', value: stakingData.totalStaked > 0 ? `${stakingData.totalStaked.toLocaleString()} STRK` : '0', bg: '#FFD500' },
              ].map(({ icon: Icon, label, value, bg, text }) => (
                <div key={label} className="neo-card p-5 hover-lift"
                  style={{ background: bg }}>
                  <Icon className="w-5 h-5 mb-2" style={{ color: text || '#000' }} />
                  <p className="text-2xl font-black truncate" style={{ color: text || '#000' }}>{value}</p>
                  <p className="text-xs font-bold uppercase mt-1" style={{ color: text || '#000' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* ═══ CHARTS ROW ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-fade-in-up animate-delay-100">
              
              {/* Repayment Rate Ring */}
              <div className="neo-card p-6 text-center hover-glow" style={{ background: 'rgba(34, 197, 94, 0.08)' }}>
                <h3 className="text-sm font-black uppercase text-black mb-4 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Repayment Rate
                </h3>
                <RingChart
                  percentage={stats.repaymentRate}
                  color={stats.repaymentRate >= 80 ? '#22C55E' : stats.repaymentRate >= 50 ? '#FFD500' : '#FF3366'}
                  label="repaid"
                />
                <p className="text-xs font-bold text-black mt-3">
                  {stats.repaidLoans} repaid / {stats.repaidLoans + stats.defaultedLoans} completed
                </p>
              </div>

              {/* Loan Status Breakdown */}
              <div className="neo-card p-6 hover-glow" style={{ background: 'rgba(90, 75, 255, 0.06)' }}>
                <h3 className="text-sm font-black uppercase text-black mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Loan Status Breakdown
                </h3>
                <StatusBar label="Pending" value={stats.pendingLoans} total={stats.totalLoans} color="#FFD500" />
                <StatusBar label="Active" value={stats.activeLoans} total={stats.totalLoans} color="#00F5D4" />
                <StatusBar label="Repaid" value={stats.repaidLoans} total={stats.totalLoans} color="#22C55E" />
                <StatusBar label="Defaulted" value={stats.defaultedLoans} total={stats.totalLoans} color="#FF3366" />
              </div>

              {/* Key Stats */}
              <div className="neo-card p-6 hover-glow" style={{ background: 'rgba(255, 199, 0, 0.08)' }}>
                <h3 className="text-sm font-black uppercase text-black mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Stats
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Avg Loan Size', value: `${stats.avgLoanSize.toFixed(0)} STRK`, bg: '#FFD500' },
                    { label: 'Active Loans', value: stats.activeLoans.toString(), bg: '#00F5D4' },
                    { label: 'Pending Loans', value: stats.pendingLoans.toString(), bg: '#fff' },
                    { label: 'Default Count', value: stats.defaultedLoans.toString(), bg: '#FF3366', text: '#fff' },
                  ].map(({ label, value, bg, text }) => (
                    <div key={label} className="flex items-center justify-between p-3 border-3 border-black hover-lift"
                      style={{ background: bg, boxShadow: '2px 2px 0px #000' }}>
                      <span className="text-xs font-bold uppercase" style={{ color: text || '#000' }}>{label}</span>
                      <span className="text-lg font-black" style={{ color: text || '#000' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ TOP VOUCHED LOANS LEADERBOARD ═══ */}
            <div className="animate-fade-in-up animate-delay-200">
              <h2 className="text-xl font-black uppercase text-black mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" /> Top Vouched Loans
              </h2>

              {stats.topVouched.length > 0 ? (
                <div className="neo-card p-0 overflow-hidden w-full max-w-full">
                  <div className="overflow-x-auto w-full">
                    <div className="min-w-[600px] lg:min-w-full">
                      {/* Header Row */}
                      <div className="grid grid-cols-6 p-3 lg:p-4 bg-black text-white text-xs lg:text-sm font-black uppercase border-b-3 border-black gap-2">
                    <span>Rank</span>
                    <span className="truncate">Loan ID</span>
                    <span className="truncate">Borrow</span>
                    <span className="truncate">Vouch</span>
                    <span className="truncate">Added</span>
                    <span className="truncate">Repaid</span>
                  </div>
                  {stats.topVouched.map((loan, i) => (
                    <div key={loan.id}
                      className={`grid grid-cols-6 p-2 lg:p-3 items-center border-b-3 border-black hover:-translate-y-0.5 transition-transform gap-2 ${i % 2 === 0 ? 'bg-yellow-50' : 'bg-blue-50'}`}
                    >
                      <span className="flex items-center gap-2 lg:gap-3">
                        <span className="w-8 h-8 flex items-center justify-center font-black text-sm border-2 border-black shrink-0 shadow-[2px_2px_0px_#000]"
                          style={{
                            background: i === 0 ? '#FFD500' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#fff',
                          }}>
                          {i + 1}
                        </span>
                      </span>
                      <span className="text-xs lg:text-sm font-black text-black truncate">#{loan.id}</span>
                      <span className="text-xs lg:text-sm font-bold text-black truncate">{loan.amount.toLocaleString()} STRK</span>
                      <span className="text-xs lg:text-sm font-black text-black truncate">
                        <span className="bg-[var(--accent-primary)] px-2 lg:px-3 py-1 border-2 border-black inline-block whitespace-nowrap"
                          style={{ boxShadow: '2px 2px 0px #000' }}>
                          {loan.vouched.toLocaleString()} STRK
                        </span>
                      </span>
                      <span className="text-xs lg:text-sm font-bold text-black truncate">{loan.added.toLocaleString()} STRK</span>
                      <span className="text-xs lg:text-sm font-bold text-black truncate">{loan.repaid.toLocaleString()} STRK</span>
                    </div>
                  ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="neo-card p-8 text-center">
                  <TrendingUp className="w-10 h-10 mx-auto mb-3 text-black" />
                  <p className="text-lg font-black text-black">No loans yet</p>
                  <p className="text-sm font-bold text-black mt-1">Create a loan to see analytics data.</p>
                </div>
              )}
            </div>

            {/* ═══ STAKING POSITIONS (from ZapLend wallet sessions) ═══ */}
            <div className="animate-fade-in-up animate-delay-300 mt-10">
              <h2 className="text-xl font-black uppercase text-black mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" /> ZapLend Staking Positions
              </h2>
              {!isConnected ? (
                <div className="neo-card p-8 text-center">
                  <Zap className="w-10 h-10 mx-auto mb-3 text-black" />
                  <p className="text-lg font-black text-black">Connect Wallet</p>
                  <p className="text-sm font-bold text-black mt-1">
                    Connect your wallet to see staking positions created via ZapLend.
                  </p>
                </div>
              ) : isLoadingPositions ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div key={i} className="skeleton h-28" />
                  ))}
                </div>
              ) : stakingData.positions.length > 0 ? (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="neo-card p-4 hover-lift" style={{ background: '#FFD500' }}>
                      <p className="text-[10px] font-black uppercase text-black/60 mb-1">Total Staked</p>
                      <p className="text-xl font-black text-black">{stakingData.totalStaked.toLocaleString()} STRK</p>
                    </div>
                    <div className="neo-card p-4 hover-lift" style={{ background: '#00F5D4' }}>
                      <p className="text-[10px] font-black uppercase text-black/60 mb-1">Total Rewards</p>
                      <p className="text-xl font-black text-black">{stakingData.totalRewards.toLocaleString()} STRK</p>
                    </div>
                    <div className="neo-card p-4 hover-lift" style={{ background: '#5A4BFF' }}>
                      <p className="text-[10px] font-black uppercase text-white/60 mb-1">Positions</p>
                      <p className="text-xl font-black text-white">{stakingData.totalPositions}</p>
                    </div>
                  </div>
                  {/* Per-staker positions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stakingData.positions.map((pos, idx) => {
                      const bgColors = ['#FFD500', '#00F5D4', '#5A4BFF', '#F72585', '#7B61FF'];
                      const bg = bgColors[idx % bgColors.length];
                      const isDark = ['#5A4BFF', '#F72585', '#7B61FF'].includes(bg);
                      const tc = isDark ? '#fff' : '#000';
                      const badgeText = (pos.validatorName || 'VP').slice(0, 2).toUpperCase();
                      return (
                        <div key={pos.poolAddress} className="neo-card p-5 hover-lift overflow-hidden" style={{ background: bg }}>
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-9 h-9 flex items-center justify-center bg-yellow-300 border-2 border-black font-black text-xs shrink-0"
                              style={{ boxShadow: '3px 3px 0px #000' }}
                            >
                              {badgeText}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black truncate" style={{ color: tc }}>
                                {pos.validatorName || 'Unknown Validator'}
                              </p>
                              <p className="text-[10px] font-mono truncate" style={{ color: tc, opacity: 0.7 }}>
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
                          <div className="grid grid-cols-2 gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase" style={{ color: tc, opacity: 0.6 }}>Staked</p>
                              <p className="text-sm font-black truncate" style={{ color: tc }}>{pos.staked}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase" style={{ color: tc, opacity: 0.6 }}>Rewards</p>
                              <p className="text-sm font-black truncate" style={{ color: tc }}>{pos.rewards}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {stakingData.usingSavedPools && (
                    <p className="text-xs font-bold text-black mt-3">
                      Showing pools you interacted with via ZapLend on this device.
                    </p>
                  )}
                </>
              ) : (
                <div className="neo-card p-8 text-center">
                  <Zap className="w-10 h-10 mx-auto mb-3 text-black" />
                  <p className="text-lg font-black text-black">No staking positions yet</p>
                  <p className="text-sm font-bold text-black mt-1">Stake STRK from ZapLend to see your positions here.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
