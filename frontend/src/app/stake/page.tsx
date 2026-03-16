'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useStakingPosition, useStakingActions, useAllStakingPositions, addSavedPool, getSavedPools } from '@/hooks/useStaking';
import { useBalance } from '@/hooks/useBalance';
import {
  Coins, TrendingUp, Shield, Loader2, Zap, Gift, ArrowDownToLine,
  ArrowUpFromLine, CheckCircle2, Clock, AlertTriangle, X,
} from 'lucide-react';

interface ValidatorInfo {
  name: string;
  stakerAddress: string;
}

interface StakingToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

interface StakingPool {
  poolAddress: string;
  poolContract: string;
  token: { symbol: string; name: string; decimals: number };
  stakedAmount: string;
  validatorName?: string;
}

export default function StakePage() {
  const { isConnected, wallet } = useStarkzap();
  const { data: balanceData } = useBalance();
  const [stakingTokens, setStakingTokens] = useState<StakingToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sdkInstance, setSdkInstance] = useState<any>(null);

  // Validator modal state
  const [showValidatorModal, setShowValidatorModal] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState<ValidatorInfo | null>(null);
  const [validatorPools, setValidatorPools] = useState<StakingPool[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);

  // Active pool for staking actions (selected from My Position list)
  const [activePool, setActivePool] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try { return sessionStorage.getItem('zaplend_active_pool'); } catch { return null; }
    }
    return null;
  });
  const [activePoolDecimals, setActivePoolDecimals] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try { return parseInt(sessionStorage.getItem('zaplend_active_pool_decimals') || '18'); } catch { return 18; }
    }
    return 18;
  });
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pools' | 'position'>(() => {
    if (typeof window !== 'undefined') {
      try { return getSavedPools().length > 0 ? 'position' as const : 'pools' as const; } catch { return 'pools' as const; }
    }
    return 'pools' as const;
  });

  // Inline staking within the validator popup
  const [inlineStakePool, setInlineStakePool] = useState<StakingPool | null>(null);
  const [inlineStakeAmount, setInlineStakeAmount] = useState('');

  // Validators loaded from SDK presets
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);

  // Staking hooks
  const { data: stakingPosition, isLoading: isLoadingPosition } = useStakingPosition(activePool);
  const { data: allPositions, isLoading: isLoadingAllPositions } = useAllStakingPositions();
  const { stake, claimRewards, exitPoolIntent, exitPool, isLoading: isStakingLoading } = useStakingActions();

  // Persist active pool to sessionStorage whenever it changes
  useEffect(() => {
    try {
      if (activePool) {
        sessionStorage.setItem('zaplend_active_pool', activePool);
        sessionStorage.setItem('zaplend_active_pool_decimals', String(activePoolDecimals));
      }
    } catch {}
  }, [activePool, activePoolDecimals]);

  // Load SDK, validators, and staking tokens from SDK presets
  useEffect(() => {
    async function loadStakingData() {
      try {
        const starkzapModule = await import('starkzap');
        const { StarkZap } = starkzapModule;
        const network = (process.env.NEXT_PUBLIC_STARKZAP_NETWORK as 'sepolia' | 'mainnet') || 'sepolia';

        const sdk = new StarkZap({ network });
        setSdkInstance(sdk);

        // Load validators from SDK's built-in presets (correct for the network)
        try {
          const presets = network === 'mainnet'
            ? starkzapModule.mainnetValidators
            : starkzapModule.sepoliaValidators;

          if (presets) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const validatorList: ValidatorInfo[] = Object.values(presets).map((v: any) => ({
              name: v.name || 'Unknown',
              stakerAddress: v.stakerAddress || v.address || '',
            }));
            setValidators(validatorList);
          }
        } catch {
          console.warn('Validator presets not available');
        }

        // Load stakeable tokens
        try {
          const tokens = await sdk.stakingTokens();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setStakingTokens(tokens.map((t: any) => ({
            symbol: t.symbol || 'STRK',
            name: t.name || 'Starknet Token',
            address: t.address || '',
            decimals: t.decimals || 18,
          })));
        } catch {
          setStakingTokens([{
            symbol: 'STRK',
            name: 'Starknet Token',
            address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
            decimals: 18,
          }]);
        }
      } catch (err) {
        console.error('Failed to load staking data:', err);
      } finally {
        setIsLoadingTokens(false);
      }
    }
    loadStakingData();
  }, []);

  // Open the validator modal and load pools
  const openValidatorModal = useCallback(async (validator: ValidatorInfo) => {
    setSelectedValidator(validator);
    setShowValidatorModal(true);
    setValidatorPools([]);
    setPoolError(null);
    setInlineStakePool(null);
    setInlineStakeAmount('');

    if (!sdkInstance) return;
    setIsLoadingPools(true);

    try {
      const stakerPools = await sdkInstance.getStakerPools(validator.stakerAddress);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValidatorPools(stakerPools.map((p: any) => ({
        poolAddress: p.poolAddress || p.address || '',
        poolContract: p.poolContract || p.poolAddress || p.address || '',
        token: {
          symbol: p.token?.symbol || 'STRK',
          name: p.token?.name || 'Token',
          decimals: p.token?.decimals || 18,
        },
        stakedAmount: p.amount?.toFormatted?.() || p.stakedAmount || '0',
        validatorName: validator.name,
      })));
    } catch (err) {
      console.error('Failed to load validator pools:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Staker does not exist')) {
        setPoolError('This validator does not have active pools on the current network.');
      } else {
        setPoolError('Failed to load pools. Please try another validator.');
      }
      setValidatorPools([]);
    } finally {
      setIsLoadingPools(false);
    }
  }, [sdkInstance]);

  // Handle inline staking from within the validator popup
  const handleInlineStake = async () => {
    if (!inlineStakePool || !inlineStakeAmount || parseFloat(inlineStakeAmount) <= 0) return;
    const result = await stake(
      inlineStakePool.poolContract,
      inlineStakeAmount,
      inlineStakePool.token.decimals,
    );
    if (result) {
      setInlineStakeAmount('');
      setInlineStakePool(null);
      // Save to multi-pool list
      addSavedPool(inlineStakePool.poolContract, inlineStakePool.token.decimals, inlineStakePool.validatorName);
      setActivePool(inlineStakePool.poolContract);
      setActivePoolDecimals(inlineStakePool.token.decimals);
      setShowValidatorModal(false);
      setActiveTab('position'); // Auto-switch to My Position tab
    }
  };

  // Handle staking from My Position tab
  const handleStake = async () => {
    if (!activePool || !stakeAmount || parseFloat(stakeAmount) <= 0) return;
    const result = await stake(activePool, stakeAmount, activePoolDecimals);
    if (result) {
      setStakeAmount('');
      setShowStakeModal(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!activePool) return;
    await claimRewards(activePool);
  };

  const handleExitIntent = async () => {
    if (!activePool || !unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    const result = await exitPoolIntent(activePool, unstakeAmount, activePoolDecimals);
    if (result) {
      setUnstakeAmount('');
      setShowUnstakeModal(false);
    }
  };

  const handleExitPool = async () => {
    if (!activePool) return;
    await exitPool(activePool);
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 md:px-8 pt-8 pb-24">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl md:text-4xl font-black font-display uppercase mb-2 text-black">
            STRK <span className="gradient-text">Staking</span>
          </h1>
          <p className="text-base font-bold text-black">
            Stake STRK, earn rewards, and grow your holdings — all powered by the Starkzap SDK.
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1 text-xs font-bold bg-green-400 border-2 border-black text-black uppercase">
              ⚡ Powered by Starkzap SDK
            </span>
            <span className="px-3 py-1 text-xs font-bold bg-yellow-300 border-2 border-black text-black uppercase">
              GASLESS
            </span>
            {balanceData && (
              <span className="px-3 py-1 text-xs font-bold bg-blue-300 border-2 border-black text-black uppercase">
                Balance: {balanceData.balance}
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8 animate-fade-in-up animate-delay-50">
          <button
            onClick={() => setActiveTab('pools')}
            className={`px-5 py-2.5 text-sm font-black uppercase border-3 border-black transition-all ${
              activeTab === 'pools'
                ? 'bg-[#FFD500] shadow-[4px_4px_0px_#000] -translate-y-0.5'
                : 'bg-gray-100 hover:bg-gray-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#000]'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-1.5" /> Explore Pools
          </button>
          <button
            onClick={() => setActiveTab('position')}
            className={`px-5 py-2.5 text-sm font-black uppercase border-3 border-black transition-all ${
              activeTab === 'position'
                ? 'bg-[#00F5D4] shadow-[4px_4px_0px_#000] -translate-y-0.5'
                : 'bg-gray-100 hover:bg-gray-200 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#000]'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1.5" /> My Position
          </button>
        </div>

        {/* ─── POOLS TAB ─── */}
        {activeTab === 'pools' && (
          <>
            {/* Available Staking Tokens */}
            <div className="mb-10 animate-fade-in-up animate-delay-100">
              <h2 className="text-xl font-black text-black uppercase mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5" /> Stakeable Tokens
              </h2>

              {isLoadingTokens ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stakingTokens.map((token, i) => (
                    <div key={i} className="neo-card p-5 hover-lift" style={{ background: i % 3 === 0 ? '#FFD500' : i % 3 === 1 ? '#00F5D4' : '#5A4BFF' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-black border-2 border-black">
                          <Zap className="w-5 h-5 text-yellow-300" />
                        </div>
                        <div>
                          <p className="text-lg font-black" style={{ color: i % 3 === 2 ? '#fff' : '#000' }}>{token.symbol}</p>
                          <p className="text-xs font-bold" style={{ color: i % 3 === 2 ? '#fff' : '#000' }}>{token.name}</p>
                        </div>
                      </div>
                      <p className="text-xs font-mono truncate" style={{ color: i % 3 === 2 ? '#fff' : '#000' }} title={token.address}>
                        {token.address.slice(0, 12)}...{token.address.slice(-6)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validator Cards — Click to open popup */}
            <div className="mb-10 animate-fade-in-up animate-delay-200">
              <h2 className="text-xl font-black text-black uppercase mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Validator Pools
              </h2>
              <p className="text-sm font-bold text-black mb-4">
                Click any validator to view pools and stake directly.
              </p>

              {validators.length === 0 && !isLoadingTokens && (
                <div className="neo-card p-6 text-center mb-6" style={{ background: '#FFD500' }}>
                  <p className="text-sm font-black text-black">Loading validators from SDK presets...</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validators.map((validator, vidx) => {
                  const bgColors = ['#FFD500', '#F72585', '#5A4BFF', '#00F5D4', '#FF6B35', '#7B61FF'];
                  const bg = bgColors[vidx % bgColors.length];
                  const isDark = ['#F72585', '#5A4BFF', '#7B61FF'].includes(bg);
                  const textColor = isDark ? '#fff' : '#000';

                  return (
                    <button
                      key={validator.stakerAddress}
                      onClick={() => openValidatorModal(validator)}
                      className="neo-card p-5 text-left cursor-pointer transition-all hover:-translate-y-1 group"
                      style={{ background: bg }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex items-center justify-center bg-yellow-300 border-2 border-black font-black text-base
                          group-hover:scale-110 transition-transform" style={{ boxShadow: '3px 3px 0px #000' }}>
                          {validator.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-black truncate" style={{ color: textColor }}>{validator.name}</p>
                          <p className="text-xs font-mono truncate" style={{ color: textColor }}>
                            {validator.stakerAddress.slice(0, 12)}...{validator.stakerAddress.slice(-6)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-black/10 border-2 border-black/20 w-fit">
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: textColor }} />
                        <span className="text-xs font-bold uppercase" style={{ color: textColor }}>
                          View Pools →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ─── MY POSITION TAB ─── */}
        {activeTab === 'position' && (
          <div className="animate-fade-in-up">
            {!isConnected ? (
              <div className="neo-card p-10 text-center" style={{ background: '#FFD500' }}>
                <Zap className="w-12 h-12 mx-auto mb-4 text-black" />
                <p className="text-xl font-black text-black mb-2">Connect Wallet</p>
                <p className="text-sm font-bold text-black">Connect your wallet to view your staking positions.</p>
              </div>
            ) : isLoadingAllPositions ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-black" />
              </div>
            ) : allPositions && allPositions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {allPositions.map((pos, idx) => {
                  const isSelected = activePool === pos.poolAddress;
                  const bgColors = ['#FFD500', '#00F5D4', '#5A4BFF', '#F72585', '#7B61FF'];
                  const bg = bgColors[idx % bgColors.length];
                  const isDark = ['#5A4BFF', '#F72585', '#7B61FF'].includes(bg);
                  const tc = isDark ? '#fff' : '#000';
                  const badgeText = (pos.validatorName || 'VP').slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={pos.poolAddress}
                      className="neo-card p-5 hover-lift"
                      style={{ background: bg, border: isSelected ? '4px solid #000' : undefined }}
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
                          {isSelected ? 'Selected' : 'Active'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
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

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { setActivePool(pos.poolAddress); setActivePoolDecimals(pos.decimals); setShowStakeModal(true); }}
                          disabled={isStakingLoading}
                          className="px-3 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                        >
                          <ArrowDownToLine className="w-3 h-3 inline mr-1" />Stake
                        </button>
                        <button
                          onClick={() => { setActivePool(pos.poolAddress); setActivePoolDecimals(pos.decimals); claimRewards(pos.poolAddress); }}
                          disabled={isStakingLoading || pos.rewards === '0' || pos.rewards === '0 STRK'}
                          className="px-3 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                        >
                          <Gift className="w-3 h-3 inline mr-1" />Claim
                        </button>
                        <button
                          onClick={() => { setActivePool(pos.poolAddress); setActivePoolDecimals(pos.decimals); setShowUnstakeModal(true); }}
                          disabled={isStakingLoading}
                          className="px-3 py-1.5 text-[10px] font-black uppercase border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                        >
                          <ArrowUpFromLine className="w-3 h-3 inline mr-1" />Unstake
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="neo-card p-10 text-center" style={{ background: '#00F5D4' }}>
                <Shield className="w-12 h-12 mx-auto mb-4 text-black" />
                <p className="text-xl font-black text-black mb-2">No Positions Yet</p>
                <p className="text-sm font-bold text-black">
                  Go to &quot;Explore Pools&quot; tab, click a validator, and stake to get started.
                </p>
                <button
                  onClick={() => setActiveTab('pools')}
                  className="mt-4 px-5 py-2 bg-[#FFD500] border-3 border-black text-black font-black text-sm uppercase
                    shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  Explore Pools →
                </button>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="neo-card p-6 mt-10 animate-fade-in-up animate-delay-300" style={{ background: '#FFD500' }}>
          <h2 className="text-xl font-black text-black uppercase mb-4">How Staking Works with ZapLend</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border-2 border-black bg-yellow-50">
              <p className="text-3xl mb-2">1️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Pick a Validator</p>
              <p className="text-xs font-bold text-black">
                Click any validator card to see their available delegation pools.
              </p>
            </div>
            <div className="text-center p-4 border-2 border-black bg-blue-50">
              <p className="text-3xl mb-2">2️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Stake STRK</p>
              <p className="text-xs font-bold text-black">
                Enter your amount and stake directly from the popup — no extra steps needed.
              </p>
            </div>
            <div className="text-center p-4 border-2 border-black bg-green-50">
              <p className="text-3xl mb-2">3️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Earn & Claim</p>
              <p className="text-xs font-bold text-black">
                Track rewards in the &quot;My Position&quot; tab and claim anytime.
              </p>
            </div>
            <div className="text-center p-4 border-2 border-black bg-purple-50">
              <p className="text-3xl mb-2">4️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Unstake</p>
              <p className="text-xs font-bold text-black">
                Two-step exit: declare intent, wait for cooldown, then withdraw your STRK.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── VALIDATOR POOLS POPUP ─── */}
      {showValidatorModal && selectedValidator && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { if (!isStakingLoading) { setShowValidatorModal(false); setInlineStakePool(null); } }}
        >
          <div
            className="neo-card w-full max-w-lg max-h-[85vh] overflow-y-auto"
            style={{ background: '#fff' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 p-5 border-b-3 border-black flex items-center justify-between"
              style={{ background: '#FFD500' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex items-center justify-center bg-black text-yellow-300 font-black text-sm border-2 border-black shrink-0"
                  style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}>
                  {selectedValidator.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-black uppercase truncate">{selectedValidator.name}</h3>
                  <p className="text-xs font-mono text-black truncate">
                    {selectedValidator.stakerAddress.slice(0, 16)}...{selectedValidator.stakerAddress.slice(-6)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowValidatorModal(false); setInlineStakePool(null); }}
                className="w-8 h-8 flex items-center justify-center bg-black text-yellow-300 border-2 border-black
                  hover:bg-gray-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              {isLoadingPools ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                  <p className="text-sm font-bold text-black">Loading pools...</p>
                </div>
              ) : poolError ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-black" />
                  <p className="text-base font-black text-black mb-1">No Pools Found</p>
                  <p className="text-sm font-bold text-gray-600">{poolError}</p>
                </div>
              ) : validatorPools.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-black" />
                  <p className="text-base font-black text-black">No Active Pools</p>
                  <p className="text-sm font-bold text-gray-600 mt-1">
                    This validator doesn&apos;t have active delegation pools.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase text-gray-500 mb-2">
                    {validatorPools.length} pool{validatorPools.length > 1 ? 's' : ''} available
                  </p>

                  {validatorPools.map((pool, i) => {
                    const isExpanded = inlineStakePool?.poolContract === pool.poolContract;
                    const poolBg = i % 2 === 0 ? '#00F5D4' : '#5A4BFF';
                    const poolTextColor = i % 2 === 1 ? '#fff' : '#000';

                    return (
                      <div key={i} className="neo-card overflow-hidden" style={{ background: poolBg }}>
                        {/* Pool info row */}
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-black" style={{ color: poolTextColor }}>
                                {pool.token.symbol} Pool
                              </p>
                              <p className="text-xs font-mono truncate" style={{ color: poolTextColor }}>
                                {pool.poolContract.slice(0, 12)}...{pool.poolContract.slice(-6)}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Coins className="w-3.5 h-3.5" style={{ color: poolTextColor }} />
                                <span className="text-sm font-black" style={{ color: poolTextColor }}>
                                  {pool.stakedAmount}
                                </span>
                                <span className="text-xs font-bold uppercase" style={{ color: poolTextColor, opacity: 0.7 }}>
                                  total staked
                                </span>
                              </div>
                            </div>

                            {isConnected && (
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setInlineStakePool(null);
                                  } else {
                                    setInlineStakePool(pool);
                                    setInlineStakeAmount('');
                                  }
                                }}
                                disabled={isStakingLoading}
                                className="px-4 py-2 bg-[#FFD500] border-3 border-black text-black font-black text-sm uppercase
                                  shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
                                  transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                              >
                                <ArrowDownToLine className="w-4 h-4" />
                                {isExpanded ? 'Close' : 'Stake'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline stake form — expands when clicked */}
                        {isExpanded && (
                          <div className="border-t-3 border-black p-4" style={{ background: '#FFD500' }}>
                            <label className="block text-xs font-black uppercase text-black mb-1.5">
                              Amount ({pool.token.symbol})
                            </label>
                            <input
                              type="number"
                              value={inlineStakeAmount}
                              onChange={e => setInlineStakeAmount(e.target.value)}
                              placeholder="e.g. 100"
                              min="0"
                              step="0.01"
                              autoFocus
                              className="w-full p-3 border-3 border-black bg-white text-black font-bold text-lg
                                focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            {balanceData && (
                              <p className="text-xs font-bold text-black mt-1">
                                Available: {balanceData.balance}
                              </p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={handleInlineStake}
                                disabled={isStakingLoading || !inlineStakeAmount || parseFloat(inlineStakeAmount) <= 0}
                                className="flex-1 py-2.5 bg-black text-[#FFD500] font-black uppercase text-sm border-3 border-black
                                  shadow-[3px_3px_0px_#555] hover:shadow-[1px_1px_0px_#555] hover:translate-x-[2px] hover:translate-y-[2px]
                                  transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {isStakingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                {isStakingLoading ? 'Staking...' : 'Stake Now'}
                              </button>
                            </div>
                            <p className="text-xs font-bold text-black mt-2 flex items-center gap-1 opacity-70">
                              <Clock className="w-3 h-3" /> Gasless via Starkzap SDK
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!isConnected && !isLoadingPools && validatorPools.length > 0 && (
                <div className="neo-card p-4 mt-4 text-center" style={{ background: '#FFD500' }}>
                  <p className="text-sm font-black text-black">
                    Connect your wallet to stake in these pools.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── STAKE MORE MODAL (from My Position tab) ─── */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !isStakingLoading && setShowStakeModal(false)}>
          <div className="neo-card p-6 w-full max-w-md" style={{ background: '#FFD500' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-black uppercase mb-4 flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5" /> Stake More STRK
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-black uppercase text-black mb-1">Amount (STRK)</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                placeholder="e.g. 100"
                min="0"
                step="0.01"
                autoFocus
                className="w-full p-3 border-3 border-black bg-white text-black font-bold text-lg
                  focus:outline-none focus:ring-2 focus:ring-black"
              />
              {balanceData && (
                <p className="text-xs font-bold text-black mt-1">
                  Available: {balanceData.balance}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStake}
                disabled={isStakingLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                className="flex-1 py-3 bg-black text-[#FFD500] font-black uppercase text-sm border-3 border-black
                  shadow-[4px_4px_0px_#555] hover:shadow-[2px_2px_0px_#555] hover:translate-x-[2px] hover:translate-y-[2px]
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isStakingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isStakingLoading ? 'Staking...' : 'Stake Now'}
              </button>
              <button
                onClick={() => setShowStakeModal(false)}
                disabled={isStakingLoading}
                className="px-5 py-3 bg-white text-black font-black uppercase text-sm border-3 border-black
                  hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs font-bold text-black mt-3 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Uses SDK&apos;s smart <code className="bg-yellow-200 px-1">wallet.stake()</code> — auto-detects enter vs add.
            </p>
          </div>
        </div>
      )}

      {/* ─── UNSTAKE MODAL ─── */}
      {showUnstakeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !isStakingLoading && setShowUnstakeModal(false)}>
          <div className="neo-card p-6 w-full max-w-md" style={{ background: '#F72585' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white uppercase mb-4 flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-white" /> Unstake STRK
            </h3>

            <div className="neo-card p-3 mb-4 text-xs font-bold text-black flex items-start gap-2" style={{ background: '#FFD500' }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Unstaking has a cooldown period. You&apos;ll declare intent now and complete the withdrawal later.</span>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-black uppercase text-white mb-1">Amount (STRK)</label>
              <input
                type="number"
                value={unstakeAmount}
                onChange={e => setUnstakeAmount(e.target.value)}
                placeholder="e.g. 50"
                min="0"
                step="0.01"
                autoFocus
                className="w-full p-3 border-3 border-black bg-white text-black font-bold text-lg
                  focus:outline-none focus:ring-2 focus:ring-white"
              />
              {stakingPosition && (
                <p className="text-xs font-bold text-white mt-1">
                  Currently staked: {stakingPosition.staked}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExitIntent}
                disabled={isStakingLoading || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                className="flex-1 py-3 bg-black text-white font-black uppercase text-sm border-3 border-black
                  shadow-[4px_4px_0px_#555] hover:shadow-[2px_2px_0px_#555] hover:translate-x-[2px] hover:translate-y-[2px]
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isStakingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpFromLine className="w-4 h-4" />}
                {isStakingLoading ? 'Processing...' : 'Start Unstake'}
              </button>
              <button
                onClick={() => setShowUnstakeModal(false)}
                disabled={isStakingLoading}
                className="px-5 py-3 bg-white text-black font-black uppercase text-sm border-3 border-black
                  hover:bg-gray-100 transition-all disabled:opacity-50"
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
