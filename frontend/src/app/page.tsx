'use client';

import { Navbar } from '@/components/Navbar';
import { Zap, Users, ArrowRight, TrendingUp, Shield, Sparkles, Lock, Coins, CalendarDays, Globe, CheckCircle2, Clock, Calculator, Send, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useLoans } from '@/hooks/useLoans';

export default function Home() {
  const { data: loans } = useLoans();
  
  // Live protocol stats
  const totalLoans = loans?.length || 0;
  const activeLoans = loans?.filter(l => l.status === 'Active').length || 0;
  const totalVolumeStrk = loans?.reduce((sum, l) => sum + parseFloat(l.amount.replace(/,/g, '') || '0'), 0) || 0;
  const totalVouched = loans?.reduce((sum, l) => sum + parseFloat(l.socialCollateralCurrent.replace(/,/g, '') || '0'), 0) || 0;

  return (
    <main className="min-h-screen pb-20">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-16">
        
        {/* ──── HERO SECTION ──── */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-20">
          
          {/* Left: Typography & CTAs */}
          <div className="w-full lg:w-1/2">
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 text-xs font-bold bg-[var(--accent-primary)] border-2 border-black text-black uppercase"
                style={{ boxShadow: '2px 2px 0px #000' }}>
                ⚡ Powered by Starkzap SDK
              </span>
              <span className="px-3 py-1 text-xs font-bold bg-black border-2 border-black text-white uppercase">
                Starknet Sepolia
              </span>
            </div>
            
            <h1 className="font-display leading-[1.05] tracking-tighter mb-8" style={{ fontSize: 'clamp(3.5rem, 7vw, 6.5rem)', color: '#000' }}>
              Borrow With<br />
              <span style={{ color: '#5A4BFF' }}>Social Trust</span>
            </h1>
            
            <p className="text-xl md:text-2xl font-medium text-gray-800 mb-10 max-w-lg leading-relaxed">
              Friends vouch for you on-chain, reducing your collateral by up to <strong>40%</strong>. P2P lending powered by trust.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5">
              <Link
                href="/borrow"
                className="neo-card hover-scale inline-flex items-center justify-center gap-2 text-xl font-bold transition-all"
                style={{
                  padding: '20px 48px',
                  background: 'var(--accent-primary)',
                  color: '#000',
                  borderWidth: '4px',
                  boxShadow: '6px 6px 0px #000'
                }}
              >
                <Calculator className="w-5 h-5" />
                Start Borrowing
              </Link>
              <Link
                href="/lend"
                className="neo-card hover-scale inline-flex items-center justify-center gap-2 text-xl font-bold transition-all"
                style={{
                  padding: '20px 48px',
                  background: 'var(--accent-secondary)',
                  color: '#ffffff',
                  borderWidth: '4px',
                  boxShadow: '6px 6px 0px #000'
                }}
              >
                <TrendingUp className="w-5 h-5" />
                Explore Marketplace
              </Link>
            </div>
          </div>

          {/* Right: Dense Animated Illustration */}
          <div className="w-full lg:w-1/2 relative min-h-[500px] flex items-center justify-center overflow-hidden">
            <style jsx>{`
              @keyframes floatUp { 0%,100% { transform: translateY(0) rotate(6deg); } 50% { transform: translateY(-16px) rotate(2deg); } }
              @keyframes floatSide { 0%,100% { transform: translateX(0) rotate(-8deg); } 50% { transform: translateX(12px) rotate(-4deg); } }
              @keyframes pulse { 0%,100% { transform: scale(1); opacity:1; } 50% { transform: scale(1.12); opacity:0.9; } }
              @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
              @keyframes wiggle { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
              @keyframes slideIn { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
              .f-up { animation: floatUp 4s ease-in-out infinite; }
              .f-side { animation: floatSide 5s ease-in-out infinite; }
              .f-pulse { animation: pulse 3s ease-in-out infinite; }
              .f-bounce { animation: bounce 2.5s ease-in-out infinite; }
              .f-wiggle { animation: wiggle 4s ease-in-out infinite; }
              .f-slide { animation: slideIn 0.6s ease-out both; }
            `}</style>

            {/* ── LAYER 0: Background grid pattern ── */}
            <div className="absolute inset-0 z-0" style={{
              backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              opacity: 0.06,
            }} />

            {/* ── LAYER 1: Vault / Main Block ── */}
            <div className="absolute bottom-8 right-6 w-[280px] h-[180px] z-10" style={{
              background: 'var(--accent-primary)',
              border: '6px solid #000',
              transform: 'skewY(-12deg)',
              boxShadow: '-8px 8px 0px rgba(0,0,0,0.12)'
            }}>
              <div className="absolute -top-[6px] -left-[6px] w-[calc(100%+12px)] h-14 bg-white border-6 border-black" />
              {/* Vault icon */}
              <div className="absolute top-6 left-4 flex items-center gap-2" style={{ transform: 'skewY(12deg)' }}>
                <Lock className="w-5 h-5 text-black" />
                <span className="text-xs font-black text-black uppercase">Vault</span>
              </div>
            </div>

            {/* ── LAYER 2: Shield Card (floats up/down) ── */}
            <div className="absolute top-4 right-16 z-20 f-up">
              <div className="w-28 h-36 bg-white border-[5px] border-black flex flex-col items-center justify-center gap-2 shadow-[10px_10px_0px_#000]">
                <Shield className="w-12 h-12 text-black" />
                <span className="text-[10px] font-black uppercase text-black">Secured</span>
              </div>
            </div>

            {/* ── LAYER 2: Zap badge (bouncing) ── */}
            <div className="absolute top-28 left-[50%] z-30 f-bounce" style={{ animationDelay: '0.5s' }}>
              <div className="w-16 h-16 bg-[var(--accent-primary)] border-[4px] border-black flex items-center justify-center rotate-12" style={{ boxShadow: '4px 4px 0px #000' }}>
                <Zap className="w-8 h-8 text-black" />
              </div>
            </div>

            {/* ── LAYER 3: Coins Circle (floats side) ── */}
            <div className="absolute top-44 left-4 z-10 f-side">
              <div className="w-20 h-20 rounded-full bg-white border-[5px] border-black flex items-center justify-center shadow-[6px_6px_0px_var(--accent-secondary)]">
                <Coins className="w-8 h-8 text-black" />
              </div>
            </div>

            {/* ── LAYER 3: Users Circle (pulses) ── */}
            <div className="absolute top-8 left-12 z-10 f-pulse" style={{ animationDelay: '1s' }}>
              <div className="w-16 h-16 rounded-full bg-[#00F5D4] border-[4px] border-black flex items-center justify-center shadow-[4px_4px_0px_#000]">
                <Users className="w-7 h-7 text-black" />
              </div>
            </div>

            {/* ── LAYER 4: Floating stat cards ── */}
            <div className="absolute bottom-40 left-0 z-20 f-wiggle f-slide" style={{ animationDelay: '0.3s' }}>
              <div className="px-4 py-2.5 bg-[#00F5D4] border-[3px] border-black" style={{ boxShadow: '3px 3px 0px #000' }}>
                <p className="text-[10px] font-black text-black uppercase">Collateral Saved</p>
                <p className="text-lg font-black text-black">40%</p>
              </div>
            </div>

            <div className="absolute top-[55%] right-0 z-20 f-bounce" style={{ animationDelay: '1.5s' }}>
              <div className="px-4 py-2.5 bg-[#F72585] border-[3px] border-black" style={{ boxShadow: '3px 3px 0px #000' }}>
                <p className="text-[10px] font-black text-white uppercase">Friends Vouched</p>
                <p className="text-lg font-black text-white">+5 ⚡</p>
              </div>
            </div>

            <div className="absolute top-[70%] left-[25%] z-20 f-pulse" style={{ animationDelay: '2s' }}>
              <div className="px-3 py-2 bg-[var(--accent-secondary)] border-[3px] border-black" style={{ boxShadow: '3px 3px 0px #000' }}>
                <p className="text-[10px] font-black text-white uppercase">Credit Score</p>
                <p className="text-lg font-black text-white">850</p>
              </div>
            </div>

            {/* ── LAYER 5: Accent shapes (fill gaps) ── */}
            {/* Purple blob top-right */}
            <div className="absolute top-0 right-0 w-14 h-14 bg-[var(--accent-secondary)] rounded-full border-[4px] border-black f-pulse z-0" />
            {/* Small yellow square */}
            <div className="absolute top-24 left-[30%] w-6 h-6 bg-[var(--accent-primary)] border-[2px] border-black rotate-45 f-bounce z-0" style={{ animationDelay: '0.8s' }} />
            {/* Pink dot */}
            <div className="absolute bottom-24 left-[45%] w-5 h-5 bg-[#F72585] rounded-full border-[2px] border-black f-pulse z-0" style={{ animationDelay: '1.3s' }} />
            {/* Green dot */}
            <div className="absolute top-[60%] left-[10%] w-4 h-4 bg-[#22C55E] rounded-full border-[2px] border-black f-bounce z-0" style={{ animationDelay: '2.2s' }} />
            {/* Black dot */}
            <div className="absolute bottom-[35%] left-[65%] w-3 h-3 bg-black rounded-full f-pulse z-0" style={{ animationDelay: '0.5s' }} />
            {/* Cross shape */}
            <div className="absolute top-[15%] left-[55%] z-0 f-wiggle" style={{ animationDelay: '1.8s' }}>
              <div className="relative w-5 h-5">
                <div className="absolute top-[8px] left-0 w-5 h-[3px] bg-black" />
                <div className="absolute top-0 left-[8px] w-[3px] h-5 bg-black" />
              </div>
            </div>
            {/* Another cross */}
            <div className="absolute bottom-[50%] left-[78%] z-0 f-wiggle" style={{ animationDelay: '0.4s' }}>
              <div className="relative w-4 h-4">
                <div className="absolute top-[7px] left-0 w-4 h-[2px] bg-black" />
                <div className="absolute top-0 left-[7px] w-[2px] h-4 bg-black" />
              </div>
            </div>

            {/* ── Diagonal lines ── */}
            <div className="absolute -bottom-10 -left-10 w-[120%] h-[4px] bg-black -rotate-12 z-0" />
            <div className="absolute bottom-0 -left-10 w-[120%] h-[4px] bg-black -rotate-12 z-0" />
            <div className="absolute bottom-5 -left-10 w-[120%] h-[2px] bg-black/20 -rotate-12 z-0" />
          </div>
        </div>

        {/* ──── LIVE PROTOCOL STATS ──── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 animate-fade-in-up">
          {[
            { label: 'Total Loans', value: totalLoans.toString(), icon: TrendingUp, bg: '#FFD500' },
            { label: 'Active Now', value: activeLoans.toString(), icon: Zap, bg: '#00F5D4' },
            { label: 'Volume (STRK)', value: totalVolumeStrk.toLocaleString(), icon: Coins, bg: '#F72585' },
            { label: 'Vouched (STRK)', value: totalVouched.toLocaleString(), icon: Users, bg: '#5A4BFF' },
          ].map(({ label, value, icon: Icon, bg }) => (
            <div key={label} className="neo-card p-5 hover-lift text-center"
              style={{ background: bg }}>
              <Icon className="w-6 h-6 mx-auto mb-2 text-black" />
              <p className="text-3xl font-black text-black">{value}</p>
              <p className="text-xs font-bold text-black uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ──── HOW IT WORKS — 3 Steps ──── */}
        <div className="mb-20 animate-fade-in-up animate-delay-100">
          <h2 className="text-3xl md:text-4xl font-black font-display uppercase text-black mb-2 text-center">
            How It Works
          </h2>
          <p className="text-lg font-bold text-gray-700 text-center mb-10">Borrow in 3 simple steps</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                title: 'Create a Loan',
                desc: 'Set your amount, social collateral target, and duration. One click to submit on-chain.',
                icon: Calculator,
                bg: '#FFD500',
              },
              {
                step: 2,
                title: 'Friends Vouch',
                desc: 'Share your unique link. Friends stake STRK as social collateral — gasless, zero fees.',
                icon: Users,
                bg: '#5A4BFF',
                textColor: '#fff',
              },
              {
                step: 3,
                title: 'Get Funded',
                desc: 'Once vouches meet the threshold, your loan activates and funds are released.',
                icon: CheckCircle2,
                bg: '#00F5D4',
              },
            ].map(({ step, title, desc, icon: Icon, bg, textColor }) => (
              <div key={step} className="neo-card p-8 hover-scale relative overflow-hidden"
                style={{ background: bg, borderWidth: '4px' }}>
                <div className="absolute top-3 right-3 w-12 h-12 flex items-center justify-center bg-black text-white font-black text-xl border-2 border-black"
                  style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
                  {step}
                </div>
                <div className="w-14 h-14 flex items-center justify-center bg-white border-4 border-black mb-5"
                  style={{ boxShadow: '4px 4px 0px #000' }}>
                  <Icon className="w-7 h-7 text-black" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-3" style={{ color: textColor || '#000' }}>{title}</h3>
                <p className="text-base font-bold leading-relaxed" style={{ color: textColor || '#000' }}>{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/help" className="inline-flex items-center gap-2 text-lg font-black text-black underline decoration-4 underline-offset-8 hover:text-[var(--accent-secondary)] transition-colors uppercase">
              <HelpCircle className="w-5 h-5" />
              Read the Full Guide
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>


        {/* ──── FEATURE GRID (Matches LEAP split layout) ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 mb-32 items-center">
          
          {/* Left: Giant Yellow Square Card */}
          <div className="col-span-1 lg:col-span-5">
            <div className="w-full aspect-square neo-card relative overflow-hidden group" style={{
              background: 'var(--accent-primary)',
              borderWidth: '6px',
              padding: '0',
              boxShadow: '16px 16px 0px #000'
            }}>
              {/* Illustration inside the yellow box */}
              <div className="absolute inset-x-0 bottom-0 h-4/5 flex items-end justify-center p-8">
                 <div className="relative w-full h-full border-[6px] border-black bg-white rounded-t-[40px] shadow-[inset_0_-20px_0_var(--accent-secondary)] transition-transform duration-300 group-hover:scale-[1.02]">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-20 h-20 bg-black rounded-full flex items-center justify-center">
                       <Zap className="w-10 h-10 text-[var(--accent-primary)]" />
                    </div>
                 </div>
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.1)_2px,transparent_2px)] bg-[length:24px_24px] opacity-20 pointer-events-none" />
            </div>
          </div>

          {/* Right: Stacked Info Blocks */}
          <div className="col-span-1 lg:col-span-7 flex flex-col justify-center gap-16 pl-0 lg:pl-10">
            
            <div className="animate-fade-in-up">
              <h2 className="text-4xl md:text-[2.75rem] font-black font-display mb-4 tracking-tight leading-tight">Gasless Vouching</h2>
              <p className="text-xl text-gray-800 font-medium leading-relaxed mb-6 max-w-xl">
                Built on Starkzap SDK, friends vouch for you without paying a single wei in gas. We sponsor every vouch transaction automatically.
              </p>
              <Link href="/borrow" className="text-lg font-bold underline decoration-[3px] underline-offset-8 hover:text-[var(--accent-secondary)] transition-colors">
                Start borrowing now
              </Link>
            </div>
            
            <div className="animate-fade-in-up animate-delay-100">
              <h2 className="text-4xl md:text-[2.75rem] font-black font-display mb-4 tracking-tight leading-tight">On-Chain Credit Score</h2>
              <p className="text-xl text-gray-800 font-medium leading-relaxed mb-6 max-w-xl">
                Your repayment history builds an on-chain reputation score (300-1000). Better score = easier loans and more vouches.
              </p>
              <Link href="/dashboard" className="text-lg font-bold underline decoration-[3px] underline-offset-8 hover:text-[var(--accent-secondary)] transition-colors">
                Check your score
              </Link>
            </div>
            
            {/* Starkzap SDK Badge */}
            <div className="pt-12 border-t-[5px] border-black animate-fade-in-up animate-delay-200 flex flex-col sm:flex-row gap-8 justify-between items-start sm:items-center">
              <div>
                <h2 className="text-3xl font-black font-display tracking-tight mb-2">Built on Starkzap</h2>
                <p className="text-lg text-gray-800 font-medium">Wallet onboarding, gasless txs, and staking — all from one SDK</p>
              </div>
              
              <Link href="/stake" className="neo-card flex items-stretch p-0 overflow-hidden shrink-0 hover-lift active:scale-95" style={{ borderWidth: '4px' }}>
                <div className="px-6 py-4 font-bold text-white text-lg tracking-wide" style={{ background: 'var(--accent-secondary)' }}>
                  Explore Staking
                </div>
                <div className="px-6 py-4 bg-[var(--accent-primary)] flex items-center justify-center border-l-[4px] border-black">
                  <Zap className="w-5 h-5 text-black" />
                </div>
              </Link>
            </div>

          </div>
        </div>

      </div>

      {/* ──── Footer ──── */}
      <footer className="w-full border-t-[4px] border-black mt-16 px-6 py-8">
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3 font-display font-black text-2xl tracking-tighter">
                  <div className="w-8 h-8 bg-[var(--accent-primary)] border-[3px] border-black flex items-center justify-center">
                    <div className="w-3 h-3 bg-black" />
                  </div>
                  ZAPLEND
               </div>
               <div className="hidden md:flex items-center gap-6 text-sm font-bold ml-8">
                  <Link href="/help" className="hover:underline">Help Center</Link>
                  <Link href="/lend" className="hover:underline">Marketplace</Link>
                  <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                  <a href="https://github.com/keep-starknet-strange/starkzap" target="_blank" rel="noopener noreferrer" className="hover:underline">Starkzap SDK</a>
               </div>
            </div>
            <div className="text-sm font-bold text-gray-600">
               © ZapLend Protocol. All rights reserved.
            </div>
         </div>
      </footer>
    </main>
  );
}
