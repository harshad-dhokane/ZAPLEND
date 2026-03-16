'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useLoans } from '@/hooks/useLoans';
import { useVouches } from '@/hooks/useVouches';
import { useVouch } from '@/hooks/useVouch';
import { useRepay } from '@/hooks/useRepay';
import { useLiquidate } from '@/hooks/useLiquidate';
import { useContractLogs } from '@/hooks/useContractLogs';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { ArrowLeft, Copy, Check, Users, Clock, Coins, Shield, ExternalLink, Wallet, Zap, Share2, AlertTriangle, TrendingUp, QrCode } from 'lucide-react';
import { formatDateShort, formatTimestamp } from '@/lib/time';

export default function LoanDetailPage() {
  const params = useParams();
  const loanId = Number(params.id);
  const { isConnected, address } = useStarkzap();
  const { data: loans, isLoading: loansLoading } = useLoans();
  const { data: vouches } = useVouches(loanId);
  const { vouch, isLoading: vouchLoading } = useVouch();
  const { repay, isLoading: repayLoading } = useRepay();
  const { liquidate, isLoading: liquidateLoading } = useLiquidate();
  const { data: contractLogs } = useContractLogs();

  const [vouchAmount, setVouchAmount] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const loan = loans?.find((l) => String(l.id) === String(loanId));
  const loanCreatedAt = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!contractLogs) return map;
    for (const log of contractLogs) {
      if (log.type === 'LoanCreated' && log.data?.loanId) {
        const id = String(log.data.loanId);
        if (!map.has(id)) map.set(id, log.timestamp ?? null);
      }
    }
    return map;
  }, [contractLogs]);
  const createdDate = formatDateShort(loanCreatedAt.get(String(loanId)) ?? null);
  const createdDateFull = formatTimestamp(loanCreatedAt.get(String(loanId)) ?? null);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/loan/${loanId}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Vouch for Loan #${loanId} on ZapLend`,
        text: 'Help me get a loan! Stake STRK as social collateral to vouch for me on ZapLend.',
        url: shareUrl,
      });
    } else {
      handleCopy();
    }
  };

  const handleVouch = async () => {
    if (!vouchAmount) return;
    await vouch(String(loanId), vouchAmount);
    setVouchAmount('');
  };

  const handleRepay = async () => {
    if (!repayAmount) return;
    await repay(String(loanId), repayAmount);
    setRepayAmount('');
  };

  const statusColors: Record<string, { bg: string; text: string; glow: string }> = {
    Pending: { bg: '#FFD500', text: '#000', glow: 'rgba(255, 213, 0, 0.3)' },
    Active: { bg: '#00F5D4', text: '#000', glow: 'rgba(0, 245, 212, 0.3)' },
    Repaid: { bg: '#22C55E', text: '#fff', glow: 'rgba(34, 197, 94, 0.2)' },
    Defaulted: { bg: '#FF3366', text: '#fff', glow: 'rgba(255, 51, 102, 0.3)' },
  };

  // Calculate progress
  const socialTarget = loan ? parseFloat(loan.socialCollateralTarget) : 0;
  const socialCurrent = loan ? parseFloat(loan.socialCollateralCurrent) : 0;
  const progressPercent = socialTarget > 0 ? Math.min((socialCurrent / socialTarget) * 100, 100) : 0;
  const remaining = Math.max(socialTarget - socialCurrent, 0);
  const isBorrower = address && loan && address.toLowerCase() === loan.borrower.toLowerCase();
  const statusStyle = loan ? statusColors[loan.status] || statusColors.Pending : statusColors.Pending;

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Back nav */}
        <Link href="/lend" className="inline-flex items-center gap-2 text-sm font-bold mb-6 transition-all hover:-translate-x-1" style={{ color: '#000' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        {loansLoading ? (
          <div className="space-y-6 animate-fade-in-up">
            <div className="skeleton h-32 w-full" />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 skeleton h-80" />
              <div className="skeleton h-80" />
            </div>
          </div>
        ) : !loan ? (
          <div className="neo-card p-16 text-center animate-scale-in">
            <Zap className="w-16 h-16 mx-auto mb-4 text-black" />
            <h2 className="text-2xl font-black font-display text-black uppercase mb-2">Loan Not Found</h2>
            <p className="text-sm font-bold text-black mb-6">This loan doesn&apos;t exist or hasn&apos;t been created yet.</p>
            <Link href="/lend" className="btn-gradient inline-flex items-center gap-2">
              Browse Loans <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
          </div>
        ) : (
          <>
            {/* ═══ Hero Banner ═══ */}
            <div
              className="neo-card p-0 mb-8 animate-fade-in-up overflow-hidden"
              style={{ background: 'transparent' }}
            >
              {/* Top colored strip */}
              <div className="p-6 pb-5" style={{ background: statusStyle.bg, borderBottom: '4px solid #000' }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl md:text-4xl font-black font-display" style={{ color: statusStyle.text }}>
                        LOAN #{loanId}
                      </h1>
                      <span
                        className="px-4 py-1.5 text-sm font-black uppercase border-3 border-black"
                        style={{ background: '#fff', color: '#000', boxShadow: '3px 3px 0px #000' }}
                      >
                        {loan.status}
                      </span>
                    </div>
                    <p className="text-sm font-mono font-bold" style={{ color: statusStyle.text, opacity: 0.8 }}>
                      Borrower: {loan.borrower.slice(0, 12)}...{loan.borrower.slice(-6)}
                    </p>
                    <p className="text-xs font-bold" style={{ color: statusStyle.text, opacity: 0.85 }} title={createdDateFull}>
                      Created: {createdDate}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-sm border-3 border-black transition-all hover:-translate-y-1"
                      style={{ background: '#fff', boxShadow: '3px 3px 0px #000' }}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'COPIED!' : 'COPY LINK'}
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-sm border-3 border-black transition-all hover:-translate-y-1"
                      style={{ background: '#000', color: '#fff', boxShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}
                    >
                      <Share2 className="w-4 h-4" />
                      SHARE
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-2 md:grid-cols-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
                {[
                  { icon: Coins, label: 'Loan Amount', value: `${loan.amount} STRK`, bg: '#FFD500' },
                  { icon: Shield, label: 'Collateral', value: `${loan.collateral} STRK`, bg: '#00F5D4' },
                  { icon: Clock, label: 'Duration', value: `${Math.floor(loan.duration / 86400)} days`, bg: '#FF6B00' },
                  { icon: TrendingUp, label: 'Interest', value: `${loan.interestRate}%`, bg: '#f472b6' },
                ].map(({ icon: Icon, label, value, bg }, i) => (
                  <div
                    key={label}
                    className="p-4 flex items-center gap-3"
                    style={{ borderRight: i < 3 ? '3px solid #000' : 'none', borderTop: '0' }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center border-2 border-black flex-shrink-0"
                      style={{ background: bg, boxShadow: '2px 2px 0px #000' }}
                    >
                      <Icon className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-black" style={{ letterSpacing: '0.1em' }}>{label}</p>
                      <p className="text-lg font-black text-black leading-tight">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left Column — Progress + Vouchers */}
              <div className="lg:col-span-3 space-y-6">

                {/* Social Collateral Progress */}
                <div className="neo-card p-6 animate-fade-in-up animate-delay-100 hover-glow" style={{ background: 'rgba(0, 245, 212, 0.12)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-black uppercase text-black flex items-center gap-2">
                      <Users className="w-5 h-5" /> Social Collateral
                    </h3>
                    <span className="px-3 py-1 text-xs font-black font-mono bg-black text-white">
                      {socialCurrent.toFixed(1)} / {socialTarget.toFixed(1)} STRK
                    </span>
                  </div>

                  {/* Big progress bar */}
                  <div className="relative mb-4">
                    <div className="w-full h-10 border-4 border-black" style={{ background: '#f0f0f0', boxShadow: '4px 4px 0px #000' }}>
                      <div
                        className="h-full transition-all duration-1000 ease-out relative"
                        style={{
                          width: `${progressPercent}%`,
                          background: progressPercent >= 100
                            ? 'linear-gradient(90deg, #00F5D4, #22C55E)'
                            : 'linear-gradient(90deg, #FFD500, #F72585)',
                        }}
                      >
                        {progressPercent > 15 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-black text-black">
                            {Math.round(progressPercent)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {progressPercent <= 15 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-black text-black">
                        {Math.round(progressPercent)}%
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-bold text-black">
                    {progressPercent >= 100
                      ? '✅ Social collateral target reached!'
                      : `${remaining.toFixed(2)} STRK still needed from friends`}
                  </p>
                </div>

                {/* Vouchers */}
                <div className="neo-card p-6 animate-fade-in-up animate-delay-200 hover-lift" style={{ background: 'rgba(247, 37, 133, 0.08)' }}>
                  <h3 className="text-lg font-black uppercase text-black mb-5 flex items-center gap-2">
                    <Zap className="w-5 h-5" /> Vouchers
                    <span className="ml-auto px-3 py-1 text-xs font-black bg-yellow-300 border-2 border-black">
                      {vouches?.length || 0}
                    </span>
                  </h3>

                  {!vouches || vouches.length === 0 ? (
                    <div className="text-center py-10 border-3 border-dashed border-black" style={{ background: 'rgba(255,213,0,0.1)' }}>
                      <Users className="w-12 h-12 mx-auto mb-3 text-black" />
                      <p className="text-lg font-black text-black mb-1">No Vouchers Yet</p>
                      <p className="text-sm font-bold text-black">Share this link with friends to get vouched!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vouches.map((v, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 border-3 border-black transition-all hover:-translate-y-0.5"
                          style={{
                            background: i % 2 === 0 ? 'rgba(255,213,0,0.15)' : 'rgba(0,245,212,0.15)',
                            boxShadow: '3px 3px 0px #000',
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 flex items-center justify-center font-black text-sm border-2 border-black"
                              style={{ background: i % 2 === 0 ? '#FFD500' : '#00F5D4' }}
                            >
                              #{i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-mono font-bold text-black">
                                {v.friend.slice(0, 10)}...{v.friend.slice(-6)}
                              </p>
                              <p className="text-[10px] font-bold text-black uppercase" style={{ letterSpacing: '0.1em' }}>
                                Voucher
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-black">{v.amount}</p>
                            <p className="text-[10px] font-bold text-black uppercase">STRK</p>
                            <p
                              className="text-[10px] font-bold text-black uppercase mt-1 bg-white/70 border border-black px-1.5 py-0.5 inline-block"
                              title={formatTimestamp(v.timestamp ?? null)}
                            >
                              {formatDateShort(v.timestamp ?? null)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">

                {/* Progress Ring */}
                <div className="neo-card p-6 text-center animate-fade-in-up animate-delay-200 hover-glow" style={{ background: 'rgba(167, 139, 250, 0.15)' }}>
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <svg width="180" height="180" viewBox="0 0 180 180">
                      <circle cx="90" cy="90" r="74" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="14" />
                      <circle
                        cx="90" cy="90" r="74"
                        fill="none"
                        stroke="url(#ringGrad)"
                        strokeWidth="14"
                        strokeLinecap="square"
                        strokeDasharray={`${2 * Math.PI * 74}`}
                        strokeDashoffset={`${2 * Math.PI * 74 * (1 - progressPercent / 100)}`}
                        transform="rotate(-90 90 90)"
                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }}
                      />
                      <defs>
                        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFD500" />
                          <stop offset="50%" stopColor="#F72585" />
                          <stop offset="100%" stopColor="#7C3AED" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black font-display text-black" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.15)' }}>
                        {Math.round(progressPercent)}%
                      </span>
                      <span className="text-xs font-bold text-black uppercase" style={{ letterSpacing: '0.15em' }}>funded</span>
                    </div>
                  </div>
                  <p className="text-sm font-black text-black">
                    {socialCurrent.toFixed(1)} / {socialTarget.toFixed(1)} STRK
                  </p>
                </div>

                {/* Vouch Action */}
                {loan.status === 'Pending' && (
                  <div className="neo-card p-6 animate-fade-in-up animate-delay-300 hover-lift" style={{ background: 'rgba(255, 213, 0, 0.12)' }}>
                    <h3 className="text-base font-black uppercase text-black mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5" /> Vouch Now
                      <span className="ml-auto text-[10px] font-bold px-2 py-1 bg-green-400 border border-black text-black">GASLESS ⚡</span>
                    </h3>
                    {!isConnected ? (
                      <div className="text-center py-6 border-3 border-dashed border-black" style={{ background: 'rgba(255,255,255,0.5)' }}>
                        <Wallet className="w-10 h-10 mx-auto mb-2 text-black" />
                        <p className="text-sm font-black text-black mb-1">Connect Wallet</p>
                        <p className="text-xs font-bold text-black">to vouch for this borrower</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-black mb-3">
                          Stake STRK as social collateral. Returned when loan is repaid.
                        </p>
                        <input
                          type="number"
                          value={vouchAmount}
                          onChange={(e) => setVouchAmount(e.target.value)}
                          className="neo-input text-lg font-bold mb-3"
                          placeholder={`Max: ${remaining.toFixed(2)} STRK`}
                          min="0.01"
                          step="any"
                        />
                        <button
                          onClick={handleVouch}
                          disabled={vouchLoading || !vouchAmount}
                          className="w-full py-4 text-base font-black uppercase border-3 border-black transition-all hover:-translate-y-1"
                          style={{
                            background: (vouchLoading || !vouchAmount) ? '#ccc' : '#00F5D4',
                            color: '#000',
                            boxShadow: '4px 4px 0px #000',
                            opacity: (vouchLoading || !vouchAmount) ? 0.6 : 1,
                          }}
                        >
                          {vouchLoading ? 'Processing...' : '🤝 VOUCH FOR THIS LOAN'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Repay Action */}
                {loan.status === 'Active' && isBorrower && (
                  <div className="neo-card p-6 animate-fade-in-up animate-delay-300 hover-lift" style={{ background: 'rgba(0, 245, 212, 0.12)' }}>
                    <h3 className="text-base font-black uppercase text-black mb-4 flex items-center gap-2">
                      <Coins className="w-5 h-5" /> Repay Loan
                    </h3>
                    <input
                      type="number"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      className="neo-input text-lg font-bold mb-3"
                      placeholder="Amount in STRK"
                      min="0.01"
                      step="any"
                    />
                    <button
                      onClick={handleRepay}
                      disabled={repayLoading || !repayAmount}
                      className="w-full py-4 text-base font-black uppercase border-3 border-black transition-all hover:-translate-y-1"
                      style={{
                        background: (repayLoading || !repayAmount) ? '#ccc' : '#7C3AED',
                        color: '#fff',
                        boxShadow: '4px 4px 0px #000',
                        opacity: (repayLoading || !repayAmount) ? 0.6 : 1,
                      }}
                    >
                      {repayLoading ? 'Repaying...' : '💰 REPAY NOW'}
                    </button>
                  </div>
                )}

                {/* Liquidate — for expired active loans */}
                {loan.status === 'Active' && loan.startTime > 0 && (() => {
                  const deadlineMs = (loan.startTime + loan.duration * 86400) * 1000;
                  const isExpired = Date.now() > deadlineMs;
                  if (!isExpired) return null;
                  return (
                    <div className="neo-card p-6 animate-fade-in-up animate-delay-300 hover-lift" style={{ background: 'rgba(255, 51, 102, 0.1)' }}>
                      <h3 className="text-base font-black uppercase text-black mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" /> Loan Expired
                      </h3>
                      <p className="text-xs font-bold text-black mb-4">
                        This loan has passed its repayment deadline and can be liquidated.
                      </p>
                      <button
                        onClick={() => liquidate(String(loanId))}
                        disabled={liquidateLoading}
                        className="w-full py-4 text-base font-black uppercase border-3 border-black transition-all hover:-translate-y-1"
                        style={{
                          background: '#FF3366',
                          color: '#fff',
                          boxShadow: '4px 4px 0px #000',
                          opacity: liquidateLoading ? 0.6 : 1,
                        }}
                      >
                        {liquidateLoading ? 'Liquidating...' : '⚠️ LIQUIDATE LOAN'}
                      </button>
                    </div>
                  );
                })()}

                {/* Share Card */}
                <div className="neo-card p-6 animate-fade-in-up animate-delay-400 hover-glow" style={{ background: 'rgba(244, 114, 182, 0.1)' }}>
                  <h3 className="text-base font-black uppercase text-black mb-4 flex items-center gap-2">
                    <Share2 className="w-5 h-5" /> Share This Loan
                  </h3>

                  {/* QR Code */}
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="w-full py-3 text-sm font-black uppercase border-3 border-black transition-all hover:-translate-y-1 flex items-center justify-center gap-2 mb-3"
                    style={{ background: showQR ? '#FFD500' : '#fff', boxShadow: '3px 3px 0px #000' }}
                  >
                    <QrCode className="w-4 h-4" />
                    {showQR ? 'Hide QR Code' : 'Show QR Code'}
                  </button>

                  {showQR && (
                    <div className="mb-4 p-4 border-3 border-black bg-white text-center animate-scale-in" style={{ boxShadow: '3px 3px 0px #000' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=000000&margin=8`}
                        alt="QR Code to share this loan"
                        width={200}
                        height={200}
                        className="mx-auto border-2 border-black"
                      />
                      <p className="text-[10px] font-bold text-black mt-2 uppercase" style={{ letterSpacing: '0.1em' }}>
                        Scan to vouch for this loan
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCopy}
                    className="w-full py-3 text-sm font-black uppercase border-3 border-black transition-all hover:-translate-y-1 flex items-center justify-center gap-2 mb-3"
                    style={{
                      background: copied ? '#FFD500' : '#fff',
                      boxShadow: copied ? '0px 0px 0px #000' : '3px 3px 0px #000',
                      transform: copied ? 'translate(3px, 3px)' : 'none',
                    }}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Link Copied!' : 'Copy Vouch Link'}
                  </button>

                  {/* Social Sharing Buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Help me get a loan on ZapLend! Vouch for me by staking STRK as social collateral. 🤝⚡`)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 text-xs font-black uppercase border-3 border-black transition-all hover:-translate-y-1 flex items-center justify-center gap-1"
                      style={{ background: '#000', color: '#fff', boxShadow: '2px 2px 0px #000' }}
                    >
                      𝕏 Tweet
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Vouch for my loan on ZapLend! Stake STRK to help me borrow. ⚡`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 text-xs font-black uppercase border-3 border-black transition-all hover:-translate-y-1 flex items-center justify-center gap-1"
                      style={{ background: '#0088cc', color: '#fff', boxShadow: '2px 2px 0px #000' }}
                    >
                      Telegram
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Vouch for my loan on ZapLend! ${shareUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 text-xs font-black uppercase border-3 border-black transition-all hover:-translate-y-1 flex items-center justify-center gap-1"
                      style={{ background: '#25D366', color: '#fff', boxShadow: '2px 2px 0px #000' }}
                    >
                      WhatsApp
                    </a>
                  </div>

                  <a
                    href="https://sepolia.voyager.online/contract/0x04d9043def8f91491a91337fe81695c5692cc98403818b6d0029ad7105cb66f5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 text-xs font-bold uppercase border-2 border-black bg-gray-100 flex items-center justify-center gap-2 transition-all hover:bg-gray-200"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Voyager
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
