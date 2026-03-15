'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import {
  Wallet, Users, Send, Shield, Clock, Coins, TrendingUp,
  ChevronDown, ChevronUp, Zap, HelpCircle, BookOpen, Calculator,
  ArrowRight, ExternalLink, CheckCircle2, AlertTriangle, QrCode,
  Sparkles, Globe, Lock, MessageCircle, ArrowDownToLine, Gift, ArrowUpFromLine
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is ZapLend?',
    answer: 'ZapLend is a peer-to-peer lending platform on Starknet that lets you borrow STRK tokens with reduced collateral when friends vouch for you. It combines traditional DeFi lending with social trust — a concept we call "Social Collateral."',
  },
  {
    question: 'How does Social Collateral work?',
    answer: 'When you create a loan, the standard collateral requirement is 120% of the loan amount. With Social Collateral, your friends can stake their STRK tokens to vouch for you, reducing the collateral you need to put up personally. For example, if you borrow 1,000 STRK (1,200 STRK collateral needed), and friends vouch 400 STRK, you only need to deposit 800 STRK yourself — saving you 33%!',
  },
  {
    question: 'What happens if I default on a loan?',
    answer: 'If you fail to repay within the loan duration, anyone can liquidate the loan. Your collateral AND your friends\' vouched STRK will be seized. This incentivizes timely repayment and ensures that friends only vouch for people they truly trust.',
  },
  {
    question: 'Is vouching gasless?',
    answer: 'Yes! Thanks to the Starkzap SDK integration, vouching transactions are sponsored — meaning your friends can vouch for you without paying any gas fees. This makes it frictionless for friends to support your loan.',
  },
  {
    question: 'What is the Credit Score?',
    answer: 'Your on-chain Credit Score (ranging from 300 to 1000) is calculated based on your borrowing history: loans created, repaid on time, and defaults. A higher score builds trust and helps you get more vouches from the community.',
  },
  {
    question: 'How do I share my loan request?',
    answer: 'Every loan has a unique shareable link at /loan/[id]. You can copy the link, share via social media, or generate a QR code — all directly from the loan detail page. Friends who open the link can vouch with just one click!',
  },
  {
    question: 'What is Staking, and how does it relate to lending?',
    answer: 'While your STRK is waiting to be used for loans or vouches, you can stake it directly within ZapLend to earn yield. Powered by the Starkzap SDK, you can explore active validator pools, deposit your tokens to start earning rewards, claim those rewards at any time, and initiate unstaking (which involves a network cooldown) all from the dedicated Stake page.',
  },
  {
    question: 'What wallet do I need?',
    answer: 'ZapLend uses the Cartridge Controller via the Starkzap SDK. When you click "Connect Wallet," you\'ll be onboarded through Cartridge — no need to install a browser extension. It handles session keys and gas sponsorship automatically.',
  },
  {
    question: 'Is this on mainnet?',
    answer: 'Currently, ZapLend is deployed on Starknet Sepolia testnet. All STRK tokens are testnet tokens with no real value. This is a demo for the Starkzap Developer Challenge.',
  },
  {
    question: 'What interest rate is charged?',
    answer: 'The current fixed interest rate is 5%. On a 1,000 STRK loan, you\'d repay 1,050 STRK. Partial repayments are supported — pay what you can when you can, as long as the total is repaid before the deadline.',
  },
];

const glossaryTerms = [
  { term: 'Collateral', definition: 'Assets locked as security for a loan. If the borrower defaults, collateral is seized.' },
  { term: 'Social Collateral', definition: 'STRK tokens staked by friends to vouch for a borrower, reducing the personal collateral requirement.' },
  { term: 'Vouching', definition: 'The act of staking STRK tokens on behalf of a borrower, signaling trust in their ability to repay.' },
  { term: 'Liquidation', definition: 'The process of seizing collateral when a loan expires without full repayment.' },
  { term: 'Credit Score', definition: 'An on-chain reputation metric (300-1000) based on borrowing and repayment history.' },
  { term: 'Gasless Transaction', definition: 'A blockchain transaction where gas fees are sponsored by the protocol, not the user.' },
  { term: 'TVL', definition: 'Total Value Locked — the total amount of assets deposited in the protocol.' },
  { term: 'Staking', definition: 'Locking tokens with a validator to help secure the network and earn rewards.' },
  { term: 'STRK', definition: 'The native token of the Starknet network, used for gas fees, staking, and as the lending currency in ZapLend.' },
];

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-12 pb-24">

        {/* ═══ HERO ═══ */}
        <div className="mb-16 animate-fade-in-up">
          <div className="neo-card p-8 md:p-12" style={{ background: 'var(--accent-primary)', borderWidth: '6px' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 flex items-center justify-center bg-black border-4 border-black">
                <BookOpen className="w-7 h-7 text-[var(--accent-primary)]" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight text-black">
                Help Center
              </h1>
            </div>
            <p className="text-xl font-bold text-black max-w-2xl leading-relaxed">
              Everything you need to know about borrowing, lending, vouching, and earning on ZapLend.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="px-3 py-1.5 text-xs font-bold bg-white border-2 border-black text-black uppercase shadow-[2px_2px_0px_#000]">
                ⚡ Powered by Starkzap SDK
              </span>
              <span className="px-3 py-1.5 text-xs font-bold bg-black border-2 border-black text-white uppercase shadow-[2px_2px_0px_#000]">
                Starknet Sepolia
              </span>
              <a
                href="https://faucet.starknet.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#F72585] text-white border-2 border-black uppercase shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                <Coins className="w-3.5 h-3.5" />
                Get Testnet Funds
              </a>
            </div>
          </div>
        </div>


        {/* ═══ HOW IT WORKS — STEP BY STEP ═══ */}
        <section className="mb-20 animate-fade-in-up animate-delay-100">
          <h2 className="text-3xl font-black font-display uppercase text-black mb-2 flex items-center gap-3">
            <Sparkles className="w-7 h-7" /> How It Works
          </h2>
          <p className="text-base font-bold text-black mb-8">Follow these 6 steps to borrow with social collateral.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: 1,
                title: 'Connect Wallet',
                desc: 'Click "Connect Wallet" in the navbar. You\'ll onboard via Cartridge Controller — no browser extension needed.',
                icon: Wallet,
                bg: '#FFD500',
                link: null,
              },
              {
                step: 2,
                title: 'Create a Loan',
                desc: 'Go to the Borrow page. Set your loan amount, social collateral target, and duration. Submit to create an on-chain loan request.',
                icon: Calculator,
                bg: '#00F5D4',
                link: '/borrow',
              },
              {
                step: 3,
                title: 'Share the Link',
                desc: 'Each loan gets a unique /loan/[id] URL. Copy the link, use the QR code, or share directly to Twitter, Telegram, or WhatsApp.',
                icon: Send,
                bg: '#F72585',
                link: null,
              },
              {
                step: 4,
                title: 'Friends Vouch',
                desc: 'Friends open your link and stake STRK as social collateral. Vouching is gasless — they pay zero fees thanks to Starkzap SDK.',
                icon: Users,
                bg: '#5A4BFF',
                link: null,
              },
              {
                step: 5,
                title: 'Get Funded',
                desc: 'Once the social collateral threshold is met, the loan activates and funds are released to your wallet.',
                icon: CheckCircle2,
                bg: '#22C55E',
                link: null,
              },
              {
                step: 6,
                title: 'Repay on Time',
                desc: 'Go to your Dashboard and make payments. Partial repayments are accepted. Repay the full amount + 5% interest before the deadline.',
                icon: Clock,
                bg: '#FF6B00',
                link: '/dashboard',
              },
            ].map(({ step, title, desc, icon: Icon, bg, link }) => (
              <div
                key={step}
                className="neo-card p-6 hover-lift relative overflow-hidden"
                style={{ background: bg }}
              >
                {/* Step number */}
                <div className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center bg-black text-white font-black text-lg border-2 border-black"
                  style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
                  {step}
                </div>

                <div className="w-12 h-12 flex items-center justify-center bg-white border-3 border-black mb-4"
                  style={{ boxShadow: '3px 3px 0px #000' }}>
                  <Icon className="w-6 h-6 text-black" />
                </div>

                <h3 className="text-xl font-black uppercase text-black mb-2">{title}</h3>
                <p className="text-sm font-bold text-black leading-relaxed">{desc}</p>

                {link && (
                  <Link
                    href={link}
                    className="inline-flex items-center gap-1 mt-3 text-sm font-black text-black underline decoration-3 underline-offset-4 hover:no-underline"
                  >
                    Go to page <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>


        {/* ═══ HOW TO STAKE ═══ */}
        <section className="mb-20 animate-fade-in-up animate-delay-150">
          <h2 className="text-3xl font-black font-display uppercase text-black mb-2 flex items-center gap-3">
            <Coins className="w-7 h-7" /> Staking & Rewards
          </h2>
          <p className="text-base font-bold text-black mb-8">Make your idle STRK work for you with active staking.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: 1,
                title: 'Explore Pools',
                desc: 'On the Stake page, view live validator pools loaded dynamically via the Starkzap SDK. Choose a pool to see its total staked value.',
                icon: Shield,
                bg: '#FFD500',
              },
              {
                step: 2,
                title: 'Stake STRK',
                desc: 'Click "Stake" on any pool, enter your amount, and confirm the gasless transaction. You\'ll start earning rewards immediately.',
                icon: ArrowDownToLine,
                bg: '#00F5D4',
              },
              {
                step: 3,
                title: 'Claim Rewards',
                desc: 'Check your "My Position" tab to track your staked amount, commission rate, and earned rewards. Click "Claim" to withdraw rewards.',
                icon: Gift,
                bg: '#F72585',
              },
              {
                step: 4,
                title: 'Unstake Tokens',
                desc: 'To withdraw, first declare your intent. After a network cooldown period expires, return to complete the withdrawal to your wallet.',
                icon: ArrowUpFromLine,
                bg: '#5A4BFF',
                color: '#fff',
              },
            ].map(({ step, title, desc, icon: Icon, bg, color }) => (
              <div
                key={step}
                className="neo-card p-6 relative overflow-hidden group"
                style={{ background: bg, color: color || '#000' }}
              >
                <div className="absolute -right-6 -bottom-6 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                  <Icon className="w-40 h-40" color={color || '#000'} />
                </div>
                
                <h3 className="text-xl font-black uppercase mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-black text-white text-sm border-2 border-black" style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>{step}</span>
                  {title}
                </h3>
                <p className="text-sm font-bold leading-relaxed relative z-10 opacity-90">{desc}</p>
              </div>
            ))}
          </div>
        </section>


        {/* ═══ FEATURES EXPLAINED ═══ */}
        <section className="mb-20 animate-fade-in-up animate-delay-200">
          <h2 className="text-3xl font-black font-display uppercase text-black mb-2 flex items-center gap-3">
            <Zap className="w-7 h-7" /> Key Features
          </h2>
          <p className="text-base font-bold text-black mb-8">What makes ZapLend different from other DeFi lending protocols.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Social Collateral',
                desc: 'Friends stake STRK to vouch for you, reducing your personal collateral by up to 40%. Unlike traditional DeFi where you\'re alone, ZapLend leverages your social network for better loan terms.',
                icon: Users,
                bg: 'rgba(90, 75, 255, 0.12)',
                accent: '#5A4BFF',
              },
              {
                title: 'Gasless Vouching',
                desc: 'Powered by Starkzap SDK\'s fee sponsorship mode, your friends can vouch for you without paying any gas fees. This removes the biggest friction point for social lending.',
                icon: Zap,
                bg: 'rgba(255, 199, 0, 0.12)',
                accent: '#FFD500',
              },
              {
                title: 'On-Chain Credit Score',
                desc: 'Your borrowing history is tracked on-chain. Every repaid loan boosts your score (300-1000), making you more trustworthy for future loans and more likely to receive vouches.',
                icon: TrendingUp,
                bg: 'rgba(0, 245, 212, 0.12)',
                accent: '#00F5D4',
              },
              {
                title: 'Shareable Vouch Links',
                desc: 'Every loan gets a unique URL (/loan/[id]) with a QR code. Share it on social media, messaging apps, or in person. Friends can vouch with just one click.',
                icon: QrCode,
                bg: 'rgba(247, 37, 133, 0.12)',
                accent: '#F72585',
              },
              {
                title: 'STRK Staking',
                desc: 'Don\'t let your idle STRK sit around. Use the Starkzap SDK staking APIs to delegate tokens to validators and earn yield while waiting for loan approvals.',
                icon: Coins,
                bg: 'rgba(34, 197, 94, 0.12)',
                accent: '#22C55E',
              },
              {
                title: 'Cartridge Controller',
                desc: 'No wallet extension needed. ZapLend uses Starkzap\'s Cartridge onboarding strategy with session keys and policy-based permissions for a seamless experience.',
                icon: Lock,
                bg: 'rgba(255, 107, 0, 0.12)',
                accent: '#FF6B00',
              },
            ].map(({ title, desc, icon: Icon, bg, accent }) => (
              <div
                key={title}
                className="neo-card p-6 hover-glow"
                style={{ background: bg }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center border-3 border-black"
                    style={{ background: accent, boxShadow: '3px 3px 0px #000' }}
                  >
                    <Icon className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-black">{title}</h3>
                </div>
                <p className="text-sm font-bold text-black leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>


        {/* ═══ HOW THE MATH WORKS ═══ */}
        <section className="mb-20 animate-fade-in-up animate-delay-300">
          <h2 className="text-3xl font-black font-display uppercase text-black mb-2 flex items-center gap-3">
            <Calculator className="w-7 h-7" /> How the Math Works
          </h2>
          <p className="text-base font-bold text-black mb-8">Understanding collateral calculations and savings.</p>

          <div className="neo-card p-6 md:p-8" style={{ background: 'rgba(124, 58, 237, 0.08)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Without Social Collateral */}
              <div className="p-5 bg-white border-4 border-black" style={{ boxShadow: '4px 4px 0px #000' }}>
                <h3 className="text-lg font-black uppercase text-black mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Without Social Collateral
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Loan Amount', value: '1,000 STRK' },
                    { label: 'Required Collateral (120%)', value: '1,200 STRK' },
                    { label: 'Your Deposit', value: '1,200 STRK', highlight: true },
                    { label: 'Interest (5%)', value: '50 STRK' },
                    { label: 'Total Repayment', value: '1,050 STRK' },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b-2 border-black">
                      <span className="text-sm font-bold text-black">{label}</span>
                      <span className={`text-sm font-black ${highlight ? 'bg-[#FF3366] text-white px-2 py-1 border-2 border-black' : 'text-black'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* With Social Collateral */}
              <div className="p-5 border-4 border-black" style={{ background: '#00F5D4', boxShadow: '4px 4px 0px #000' }}>
                <h3 className="text-lg font-black uppercase text-black mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> With Social Collateral
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Loan Amount', value: '1,000 STRK' },
                    { label: 'Required Collateral (120%)', value: '1,200 STRK' },
                    { label: 'Friends Vouch', value: '−480 STRK', color: '#22C55E' },
                    { label: 'Your Deposit', value: '720 STRK', highlight: true },
                    { label: 'You Save', value: '40%!', save: true },
                  ].map(({ label, value, highlight, save, color }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b-2 border-black">
                      <span className="text-sm font-bold text-black">{label}</span>
                      <span className={`text-sm font-black ${highlight ? 'bg-[#FFD500] text-black px-2 py-1 border-2 border-black' : save ? 'bg-black text-white px-2 py-1 border-2 border-black text-lg' : 'text-black'}`}
                        style={color ? { color } : {}}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ═══ FAQ ACCORDION ═══ */}
        <section className="mb-20 animate-fade-in-up animate-delay-400">
          <h2 className="text-3xl font-black font-display uppercase text-black mb-2 flex items-center gap-3">
            <HelpCircle className="w-7 h-7" /> Frequently Asked Questions
          </h2>
          <p className="text-base font-bold text-black mb-8">{faqs.length} questions answered about ZapLend.</p>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="neo-card overflow-hidden"
                style={{ background: openFAQ === index ? 'rgba(255, 199, 0, 0.08)' : '#fff' }}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-5 text-left transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="w-8 h-8 flex items-center justify-center bg-black text-white font-black text-sm border-2 border-black shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-base font-black text-black uppercase">
                      {faq.question}
                    </span>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center bg-[var(--accent-primary)] border-2 border-black shrink-0 ml-3"
                    style={{ boxShadow: openFAQ === index ? '0px 0px 0px #000' : '2px 2px 0px #000', transform: openFAQ === index ? 'translate(2px, 2px)' : 'none' }}>
                    {openFAQ === index ? <ChevronUp className="w-4 h-4 text-black" /> : <ChevronDown className="w-4 h-4 text-black" />}
                  </div>
                </button>
                {openFAQ === index && (
                  <div className="px-5 pb-5 pt-0 animate-fade-in-up" style={{ animationDuration: '0.15s' }}>
                    <div className="p-4 bg-white border-3 border-black" style={{ boxShadow: '3px 3px 0px #000' }}>
                      <p className="text-sm font-bold text-black leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>


        {/* ═══ GLOSSARY ═══ */}
        <section className="mb-20 animate-fade-in-up animate-delay-500">
          <h2 className="text-3xl font-black font-display uppercase text-black mb-2 flex items-center gap-3">
            <Globe className="w-7 h-7" /> DeFi Glossary
          </h2>
          <p className="text-base font-bold text-black mb-8">Key terms you&apos;ll encounter while using ZapLend.</p>

          <div className="neo-card p-0 overflow-hidden">
            {glossaryTerms.map((item, index) => (
              <div
                key={item.term}
                className="flex items-start gap-4 p-4"
                style={{
                  borderBottom: index < glossaryTerms.length - 1 ? '3px solid #000' : 'none',
                  background: index % 2 === 0 ? '#fff' : 'rgba(255, 199, 0, 0.06)',
                }}
              >
                <span className="px-3 py-1 text-sm font-black bg-black text-white border-2 border-black uppercase shrink-0"
                  style={{ boxShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}>
                  {item.term}
                </span>
                <p className="text-sm font-bold text-black leading-relaxed pt-0.5">
                  {item.definition}
                </p>
              </div>
            ))}
          </div>
        </section>


        {/* ═══ STARKZAP SDK INTEGRATION ═══ */}
        <section className="mb-20 animate-fade-in-up">
          <h2 className="text-3xl font-black font-display uppercase text-black mb-2 flex items-center gap-3">
            <Zap className="w-7 h-7" /> Starkzap SDK Integration
          </h2>
          <p className="text-base font-bold text-black mb-8">How ZapLend leverages Starkzap under the hood.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Wallet Onboarding',
                code: 'sdk.onboard({\n  strategy: OnboardStrategy.Cartridge,\n  cartridge: { policies },\n  feeMode: \'sponsored\'\n})',
                desc: 'Seamless wallet connection with Cartridge Controller, session keys, and policy-based permissions.',
              },
              {
                title: 'Gasless Transactions',
                code: 'wallet.execute([{\n  contractAddress: LOAN_CONTRACT,\n  entrypoint: \'add_vouch\',\n  calldata: [loanId, amount]\n}])',
                desc: 'Fee-sponsored transaction execution for vouching — friends pay zero gas.',
              },
              {
                title: 'Staking APIs',
                code: 'const tokens = await sdk.stakingTokens();\nconst pools = await sdk\n  .getStakerPools(validatorAddr);',
                desc: 'Query staking tokens and validator pools to earn yield on idle STRK.',
              },
            ].map(({ title, code, desc }) => (
              <div key={title} className="neo-card p-5 hover-lift" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
                <h3 className="text-base font-black uppercase text-black mb-3">{title}</h3>
                <pre className="p-3 bg-black text-[#00F5D4] text-xs font-mono overflow-x-auto border-3 border-black mb-3"
                  style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}>
                  {code}
                </pre>
                <p className="text-xs font-bold text-black leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>


        {/* ═══ QUICK LINKS + SUPPORT ═══ */}
        <section className="animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Links */}
            <div className="neo-card p-6" style={{ background: 'var(--accent-primary)' }}>
              <h3 className="text-xl font-black uppercase text-black mb-4">Quick Links</h3>
              <div className="space-y-3">
                {[
                  { label: 'Start Borrowing', href: '/borrow', icon: Calculator },
                  { label: 'Loan Marketplace', href: '/lend', icon: TrendingUp },
                  { label: 'Your Dashboard', href: '/dashboard', icon: Shield },
                  { label: 'STRK Staking', href: '/stake', icon: Coins },
                ].map(({ label, href, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center justify-between p-3 bg-white border-3 border-black font-black text-sm text-black uppercase transition-all hover:-translate-y-1"
                    style={{ boxShadow: '3px 3px 0px #000' }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" /> {label}
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Support */}
            <div className="neo-card p-6" style={{ background: 'rgba(90, 75, 255, 0.1)' }}>
              <h3 className="text-xl font-black uppercase text-black mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> Need Help?
              </h3>
              <p className="text-sm font-bold text-black mb-6 leading-relaxed">
                ZapLend is an open-source project built for the Starkzap Developer Challenge. Have questions, feedback, or found a bug? We&apos;d love to hear from you.
              </p>
              <div className="space-y-3">
                <a
                  href="https://github.com/keep-starknet-strange/starkzap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-black text-white border-3 border-black font-black text-sm uppercase transition-all hover:-translate-y-1"
                  style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}
                >
                  <ExternalLink className="w-4 h-4" /> Starkzap SDK GitHub
                </a>
                <a
                  href="https://github.com/keep-starknet-strange/awesome-starkzap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-white text-black border-3 border-black font-black text-sm uppercase transition-all hover:-translate-y-1"
                  style={{ boxShadow: '3px 3px 0px #000' }}
                >
                  <ExternalLink className="w-4 h-4" /> Awesome Starkzap
                </a>
                <a
                  href="https://sepolia.voyager.online/contract/0x04d9043def8f91491a91337fe81695c5692cc98403818b6d0029ad7105cb66f5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-[#00F5D4] text-black border-3 border-black font-black text-sm uppercase transition-all hover:-translate-y-1"
                  style={{ boxShadow: '3px 3px 0px #000' }}
                >
                  <ExternalLink className="w-4 h-4" /> View Contract on Voyager
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="w-full mt-8 md:mt-16 px-4 sm:px-6 md:px-12 pb-8">
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 border-t-[3px] md:border-t-[4px] border-black pt-6 md:pt-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
               <div className="flex items-center gap-2 lg:gap-3 font-display tracking-tighter">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center transition-all border-[2px] lg:border-[3px] border-black shadow-[2px_2px_0px_#000] lg:shadow-[3px_3px_0px_#000]" style={{
                    background: 'var(--accent-primary)',
                  }}>
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-black" />
                  </div>
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black" style={{ color: '#000', textShadow: '2px 2px 0px var(--accent-primary)', letterSpacing: '-0.02em' }}>ZAPLEND</span>
               </div>
            </div>
          <div className="text-xs sm:text-sm font-bold text-gray-600">
            © ZapLend Protocol. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
