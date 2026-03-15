'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useStakingPosition, useStakingActions } from '@/hooks/useStaking';
import { useBalance } from '@/hooks/useBalance';
import {
  Coins, TrendingUp, Shield, Loader2, Zap, Gift, ArrowDownToLine,
  ArrowUpFromLine, CheckCircle2, Clock, AlertTriangle,
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
  token: { symbol: string; name: string };
  stakedAmount: string;
  validatorName?: string;
}

export default function StakePage() {
  const { isConnected, wallet } = useStarkzap();
  const { data: balanceData } = useBalance();
  const [stakingTokens, setStakingTokens] = useState<StakingToken[]>([]);
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState('');
  const [poolError, setPoolError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sdkInstance, setSdkInstance] = useState<any>(null);

  // Active pool for staking actions
  const [activePool, setActivePool] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pools' | 'position'>('pools');

  // Validators loaded from SDK presets
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);

  // Staking hooks
  const { data: stakingPosition, isLoading: isLoadingPosition } = useStakingPosition(activePool);
  const { stake, claimRewards, exitPoolIntent, exitPool, isLoading: isStakingLoading } = useStakingActions();

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

  // Load pools for selected validator
  const loadPools = async (validatorAddress: string) => {
    if (!sdkInstance) return;
    setIsLoadingPools(true);
    setSelectedValidator(validatorAddress);
    setPoolError(null);

    try {
      const stakerPools = await sdkInstance.getStakerPools(validatorAddress);
      const validatorName = validators.find(v => v.stakerAddress === validatorAddress)?.name;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPools(stakerPools.map((p: any) => ({
        poolAddress: p.poolAddress || p.address || '',
        poolContract: p.poolContract || p.poolAddress || p.address || '',
        token: { symbol: p.token?.symbol || 'STRK', name: p.token?.name || 'Token' },
        stakedAmount: p.amount?.toFormatted?.() || p.stakedAmount || '0',
        validatorName,
      })));
    } catch (err) {
      console.error('Failed to load validator pools:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Staker does not exist')) {
        setPoolError('This validator does not have active pools on the current network.');
      } else {
        setPoolError('Failed to load pools. Please try another validator.');
      }
      setPools([]);
    } finally {
      setIsLoadingPools(false);
    }
  };

  const handleStake = async () => {
    if (!activePool || !stakeAmount || parseFloat(stakeAmount) <= 0) return;
    const result = await stake(activePool, stakeAmount);
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
    const result = await exitPoolIntent(activePool, unstakeAmount);
    if (result) {
      setUnstakeAmount('');
      setShowUnstakeModal(false);
    }
  };

  const handleExitPool = async () => {
    if (!activePool) return;
    await exitPool(activePool);
  };

  const openStakeForPool = (poolContract: string) => {
    setActivePool(poolContract);
    setShowStakeModal(true);
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 md:px-8 pt-8 md:pt-12 pb-24">
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
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-1.5" /> Explore Pools
          </button>
          <button
            onClick={() => setActiveTab('position')}
            className={`px-5 py-2.5 text-sm font-black uppercase border-3 border-black transition-all ${
              activeTab === 'position'
                ? 'bg-[#00F5D4] shadow-[4px_4px_0px_#000] -translate-y-0.5'
                : 'bg-gray-100 hover:bg-gray-200'
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

            {/* Validator Pools */}
            <div className="mb-10 animate-fade-in-up animate-delay-200">
              <h2 className="text-xl font-black text-black uppercase mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" /> Validator Pools
              </h2>
              <p className="text-sm font-bold text-black mb-4">
                Select a validator to explore their active delegation pools. Then stake directly!
              </p>

              {validators.length === 0 && !isLoadingTokens && (
                <div className="neo-card p-6 text-center mb-6" style={{ background: '#FFD500' }}>
                  <p className="text-sm font-black text-black">Loading validators from SDK presets...</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {validators.map((validator, vidx) => {
                  const bgColors = ['#FFD500', '#F72585', '#5A4BFF', '#00F5D4', '#FF6B35', '#7B61FF'];
                  const bg = selectedValidator === validator.stakerAddress ? '#00F5D4' : bgColors[vidx % bgColors.length];
                  const isDark = ['#F72585', '#5A4BFF', '#7B61FF'].includes(bg);
                  const textColor = isDark ? '#fff' : '#000';

                  return (
                    <button
                      key={validator.stakerAddress}
                      onClick={() => loadPools(validator.stakerAddress)}
                      className="neo-card p-5 text-left cursor-pointer transition-all hover:-translate-y-1"
                      style={{ background: bg }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-yellow-300 border-2 border-black font-black text-sm">
                          {validator.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-lg font-black" style={{ color: textColor }}>{validator.name}</p>
                          <p className="text-xs font-mono" style={{ color: textColor }}>
                            {validator.stakerAddress.slice(0, 12)}...{validator.stakerAddress.slice(-6)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" style={{ color: textColor }} />
                        <span className="text-xs font-bold uppercase" style={{ color: textColor }}>Click to load pools</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pool Results */}
              {isLoadingPools && (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                </div>
              )}

              {!isLoadingPools && selectedValidator && pools.length > 0 && (
                <div className="space-y-4">
                  {pools.map((pool, i) => (
                    <div key={i} className="neo-card p-5" style={{ background: i % 2 === 0 ? '#00F5D4' : '#5A4BFF' }}>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <p className="text-lg font-black" style={{ color: i % 2 === 1 ? '#fff' : '#000' }}>{pool.token.symbol} Pool</p>
                          <p className="text-xs font-mono" style={{ color: i % 2 === 1 ? '#fff' : '#000' }}>
                            {pool.poolContract.slice(0, 12)}...{pool.poolContract.slice(-6)}
                          </p>
                          {pool.validatorName && (
                            <p className="text-xs font-bold mt-1" style={{ color: i % 2 === 1 ? '#fff' : '#000' }}>Validator: {pool.validatorName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-4">
                            <p className="text-2xl font-black text-black">{pool.stakedAmount}</p>
                            <p className="text-xs font-bold text-black uppercase">Total Staked</p>
                          </div>
                          {isConnected && (
                            <button
                              onClick={() => openStakeForPool(pool.poolContract)}
                              disabled={isStakingLoading}
                              className="px-4 py-2.5 bg-[#FFD500] border-3 border-black text-black font-black text-sm uppercase
                                shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
                                transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <ArrowDownToLine className="w-4 h-4" /> Stake
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoadingPools && selectedValidator && pools.length === 0 && (
                <div className="neo-card p-8 text-center">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-black" />
                  <p className="text-lg font-black text-black">No Active Pools Found</p>
                  <p className="text-sm font-bold text-black mt-2">
                    {poolError || 'This validator doesn\'t have active delegation pools on the current network.'}
                  </p>
                </div>
              )}
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
            ) : !activePool ? (
              <div className="neo-card p-10 text-center" style={{ background: '#00F5D4' }}>
                <Shield className="w-12 h-12 mx-auto mb-4 text-black" />
                <p className="text-xl font-black text-black mb-2">No Pool Selected</p>
                <p className="text-sm font-bold text-black">
                  Go to &quot;Explore Pools&quot; tab, select a validator, and click &quot;Stake&quot; to get started.
                </p>
                <button
                  onClick={() => setActiveTab('pools')}
                  className="mt-4 px-5 py-2 bg-[#FFD500] border-3 border-black text-black font-black text-sm uppercase
                    shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  Explore Pools →
                </button>
              </div>
            ) : isLoadingPosition ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-black" />
              </div>
            ) : stakingPosition ? (
              <div className="space-y-6">
                {/* Position Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="neo-card p-5" style={{ background: '#FFD500' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="w-5 h-5" />
                      <p className="text-xs font-black uppercase text-black">Staked</p>
                    </div>
                    <p className="text-2xl font-black text-black">{stakingPosition.staked}</p>
                  </div>
                  <div className="neo-card p-5" style={{ background: '#00F5D4' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-5 h-5" />
                      <p className="text-xs font-black uppercase text-black">Rewards Earned</p>
                    </div>
                    <p className="text-2xl font-black text-black">{stakingPosition.rewards}</p>
                  </div>
                  <div className="neo-card p-5" style={{ background: '#5A4BFF' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-white" />
                      <p className="text-xs font-black uppercase text-white">Total Value</p>
                    </div>
                    <p className="text-2xl font-black text-white">{stakingPosition.total}</p>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="neo-card p-5" style={{ background: '#F0F0F0' }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-black uppercase text-gray-600">Commission</p>
                      <p className="text-lg font-black text-black">{stakingPosition.commissionPercent}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-600">Unpooling</p>
                      <p className="text-lg font-black text-black">{stakingPosition.unpooling}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-600">Unpool Time</p>
                      <p className="text-lg font-black text-black">
                        {stakingPosition.unpoolTime
                          ? new Date(stakingPosition.unpoolTime * 1000).toLocaleDateString()
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-600">Pool</p>
                      <p className="text-sm font-mono font-bold text-black truncate" title={activePool || ''}>
                        {activePool?.slice(0, 10)}...{activePool?.slice(-6)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setShowStakeModal(true)}
                    disabled={isStakingLoading}
                    className="neo-card p-4 text-center hover-lift cursor-pointer disabled:opacity-50"
                    style={{ background: '#FFD500' }}
                  >
                    <ArrowDownToLine className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-black uppercase">Stake More</p>
                  </button>

                  <button
                    onClick={handleClaimRewards}
                    disabled={isStakingLoading || stakingPosition.rewards === '0' || stakingPosition.rewards === '0 STRK'}
                    className="neo-card p-4 text-center hover-lift cursor-pointer disabled:opacity-50"
                    style={{ background: '#00F5D4' }}
                  >
                    {isStakingLoading ? (
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    ) : (
                      <Gift className="w-6 h-6 mx-auto mb-2" />
                    )}
                    <p className="text-sm font-black uppercase">Claim Rewards</p>
                  </button>

                  <button
                    onClick={() => setShowUnstakeModal(true)}
                    disabled={isStakingLoading}
                    className="neo-card p-4 text-center hover-lift cursor-pointer disabled:opacity-50"
                    style={{ background: '#F72585', color: '#fff' }}
                  >
                    <ArrowUpFromLine className="w-6 h-6 mx-auto mb-2 text-white" />
                    <p className="text-sm font-black uppercase text-white">Unstake</p>
                  </button>

                  {stakingPosition.unpooling !== '0' && stakingPosition.unpooling !== '0 STRK' && (
                    <button
                      onClick={handleExitPool}
                      disabled={isStakingLoading || (stakingPosition.unpoolTime !== null && Date.now() / 1000 < stakingPosition.unpoolTime)}
                      className="neo-card p-4 text-center hover-lift cursor-pointer disabled:opacity-50"
                      style={{ background: '#7B61FF' }}
                    >
                      {isStakingLoading ? (
                        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-white" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-white" />
                      )}
                      <p className="text-sm font-black uppercase text-white">Complete Withdrawal</p>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="neo-card p-10 text-center" style={{ background: '#FFD500' }}>
                <Coins className="w-12 h-12 mx-auto mb-4 text-black" />
                <p className="text-xl font-black text-black mb-2">No Position Yet</p>
                <p className="text-sm font-bold text-black">
                  You haven&apos;t staked in this pool yet. Go to &quot;Explore Pools&quot; and click &quot;Stake&quot; to begin earning rewards.
                </p>
                <button
                  onClick={() => setActiveTab('pools')}
                  className="mt-4 px-5 py-2 bg-black text-[#FFD500] border-3 border-black font-black text-sm uppercase
                    shadow-[3px_3px_0px_#555] hover:shadow-[1px_1px_0px_#555] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
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
              <p className="text-sm font-black text-black uppercase mb-1">Browse Validators</p>
              <p className="text-xs font-bold text-black">
                Explore available validators and their delegation pools powered by the SDK.
              </p>
            </div>
            <div className="text-center p-4 border-2 border-black bg-blue-50">
              <p className="text-3xl mb-2">2️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Stake STRK</p>
              <p className="text-xs font-bold text-black">
                Use <code className="bg-gray-200 px-1">wallet.stake()</code> to delegate tokens and start earning immediately.
              </p>
            </div>
            <div className="text-center p-4 border-2 border-black bg-green-50">
              <p className="text-3xl mb-2">3️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Earn & Claim</p>
              <p className="text-xs font-bold text-black">
                Track rewards via <code className="bg-gray-200 px-1">getPoolPosition()</code> and claim anytime.
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

      {/* ─── STAKE MODAL ─── */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !isStakingLoading && setShowStakeModal(false)}>
          <div className="neo-card p-6 w-full max-w-md" style={{ background: '#FFD500' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-black uppercase mb-4 flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5" /> Stake STRK
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !isStakingLoading && setShowUnstakeModal(false)}>
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
