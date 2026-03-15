'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { Coins, TrendingUp, Shield, Loader2, ExternalLink, Zap } from 'lucide-react';

interface StakingToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

interface StakingPool {
  poolAddress: string;
  token: { symbol: string; name: string };
  stakedAmount: string;
  validatorName?: string;
}

export default function StakePage() {
  const { isConnected } = useStarkzap();
  const [stakingTokens, setStakingTokens] = useState<StakingToken[]>([]);
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [isLoadingPools, setIsLoadingPools] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState('');
  const [sdkInstance, setSdkInstance] = useState<any>(null);

  // Known validators on Sepolia for demo
  const knownValidators = [
    { name: 'StarkWare', address: '0x0386a0c130e2ee93b8826eae59498eea0f4dbaa64e8e31a83ef8c2469c020ce3' },
    { name: 'Argent', address: '0x0250a29c51f8d7c89ab542e3e2a5c4c22ffbc08d09a68b103e0269da3e434665' },
  ];

  // Load SDK and staking tokens
  useEffect(() => {
    async function loadStakingData() {
      try {
        const { StarkZap } = await import('starkzap');
        const sdk = new StarkZap({
          network: (process.env.NEXT_PUBLIC_STARKZAP_NETWORK as 'sepolia' | 'mainnet') || 'sepolia',
        });
        setSdkInstance(sdk);

        try {
          const tokens = await sdk.stakingTokens();
          setStakingTokens(tokens.map((t: any) => ({
            symbol: t.symbol || 'STRK',
            name: t.name || 'Starknet Token',
            address: t.address || '',
            decimals: t.decimals || 18,
          })));
        } catch {
          // Staking might not be configured; show placeholder
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

    try {
      const stakerPools = await sdkInstance.getStakerPools(validatorAddress);
      setPools(stakerPools.map((p: any) => ({
        poolAddress: p.poolAddress || p.address || '',
        token: { symbol: p.token?.symbol || 'STRK', name: p.token?.name || 'Token' },
        stakedAmount: p.amount?.toFormatted?.() || p.stakedAmount || '0',
        validatorName: knownValidators.find(v => v.address === validatorAddress)?.name,
      })));
    } catch (err) {
      console.error('Failed to load validator pools:', err);
      setPools([]);
    } finally {
      setIsLoadingPools(false);
    }
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
            Explore staking opportunities powered by the Starkzap SDK. Earn yield on idle STRK while waiting for loans.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 text-xs font-bold bg-green-400 border-2 border-black text-black uppercase">
              ⚡ Powered by Starkzap SDK
            </span>
            <span className="px-3 py-1 text-xs font-bold bg-yellow-300 border-2 border-black text-black uppercase">
              GASLESS
            </span>
          </div>
        </div>

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
            Select a validator to explore their active delegation pools and staking opportunities.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {knownValidators.map((validator) => (
              <button
                key={validator.address}
                onClick={() => loadPools(validator.address)}
                className="neo-card p-5 text-left cursor-pointer transition-all hover:-translate-y-1"
                style={{
                  background: selectedValidator === validator.address ? '#00F5D4' : knownValidators.indexOf(validator) % 2 === 0 ? '#FFD500' : '#F72585',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-yellow-300 border-2 border-black font-black text-sm">
                    {validator.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: knownValidators.indexOf(validator) % 2 === 1 && selectedValidator !== validator.address ? '#fff' : '#000' }}>{validator.name}</p>
                    <p className="text-xs font-mono" style={{ color: knownValidators.indexOf(validator) % 2 === 1 && selectedValidator !== validator.address ? '#fff' : '#000' }}>
                      {validator.address.slice(0, 12)}...{validator.address.slice(-6)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-black" />
                  <span className="text-xs font-bold text-black uppercase">Click to load pools</span>
                </div>
              </button>
            ))}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black" style={{ color: i % 2 === 1 ? '#fff' : '#000' }}>{pool.token.symbol} Pool</p>
                      <p className="text-xs font-mono" style={{ color: i % 2 === 1 ? '#fff' : '#000' }}>
                        {pool.poolAddress.slice(0, 12)}...{pool.poolAddress.slice(-6)}
                      </p>
                      {pool.validatorName && (
                        <p className="text-xs font-bold text-black mt-1">Validator: {pool.validatorName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-black">{pool.stakedAmount}</p>
                      <p className="text-xs font-bold text-black uppercase">Staked {pool.token.symbol}</p>
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
                This validator doesn&apos;t have active delegation pools on the current network.
              </p>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="neo-card p-6 animate-fade-in-up animate-delay-300" style={{ background: '#FFD500' }}>
          <h2 className="text-xl font-black text-black uppercase mb-4">How Staking Works with ZapLend</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border-2 border-black bg-yellow-50">
              <p className="text-3xl mb-2">1️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Idle STRK</p>
              <p className="text-xs font-bold text-black">
                While waiting for loan approvals, your collateral sits idle in the contract.
              </p>
            </div>
            <div className="text-center p-4 border-2 border-black bg-blue-50">
              <p className="text-3xl mb-2">2️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Stake via SDK</p>
              <p className="text-xs font-bold text-black">
                Use the Starkzap SDK&apos;s staking APIs to delegate tokens to validators and earn rewards.
              </p>
            </div>
            <div className="text-center p-4 border-2 border-black bg-green-50">
              <p className="text-3xl mb-2">3️⃣</p>
              <p className="text-sm font-black text-black uppercase mb-1">Earn Yield</p>
              <p className="text-xs font-bold text-black">
                Earn staking rewards while your STRK is working for you. Unstake when you need it back.
              </p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
