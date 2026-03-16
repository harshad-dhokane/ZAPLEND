'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useCreateLoan } from '@/hooks/useCreateLoan';
import { useBalance } from '@/hooks/useBalance';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { isContractConfigured } from '@/lib/starknet';
import { Calculator, Wallet, Clock, Users, AlertCircle, CheckCircle2, AlertTriangle, Coins } from 'lucide-react';

export default function BorrowPage() {
  const { isConnected, address } = useStarkzap();
  const { createLoan, isLoading, error } = useCreateLoan();
  const { data: balanceData } = useBalance();
  const [amount, setAmount] = useState('');
  const [socialCollateral, setSocialCollateral] = useState('');
  const [duration, setDuration] = useState('30');
  const [success, setSuccess] = useState(false);

  const contractReady = isContractConfigured();

  // Calculate values
  const loanAmount = parseFloat(amount || '0');
  const requiredCollateral = loanAmount * 1.2;
  const socialAmount = parseFloat(socialCollateral || '0');
  const personalCollateral = Math.max(0, requiredCollateral - socialAmount);
  const savingsPercent = loanAmount > 0 ? ((socialAmount / requiredCollateral) * 100).toFixed(0) : '0';
  const interestRate = 5;
  const totalRepayment = loanAmount * (1 + interestRate / 100);
  const userBalance = parseFloat(balanceData?.balance || '0');
  const insufficientBalance = personalCollateral > 0 && userBalance < personalCollateral;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createLoan(amount, personalCollateral.toString(), socialCollateral, parseInt(duration));
    if (result) {
      setSuccess(true);
      setAmount('');
      setSocialCollateral('');
      setTimeout(() => setSuccess(false), 5000);
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-8">
        <div className="mb-4 animate-fade-in-up">
          <h1 className="text-3xl md:text-4xl font-black font-display uppercase mb-1 text-black">
            Create a <span className="gradient-text">Loan Request</span>
          </h1>
          <p className="text-base font-bold text-black">
            Set your terms and invite friends to reduce your collateral
          </p>
        </div>

        {!contractReady && (
          <div className="flex items-center gap-3 p-4 rounded-none mb-6 animate-fade-in-up bg-yellow-300 border-4 border-black" style={{
            boxShadow: 'var(--shadow-md)',
          }}>
            <AlertTriangle className="w-5 h-5 shrink-0 text-black" />
            <div>
              <p className="text-sm font-black text-black uppercase">Contract Not Deployed</p>
              <p className="text-xs font-bold mt-0.5 text-black">
                Set NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS in .env.local after deploying the contract.
              </p>
            </div>
          </div>
        )}

        {!isConnected ? (
          <div className="neo-card p-12 text-center animate-fade-in-up animate-delay-100">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-black" />
            <h2 className="text-xl font-black uppercase mb-2 text-black">
              Connect Your Wallet
            </h2>
            <p className="text-base font-bold text-black">
              Connect your wallet using the button above to create a loan request
            </p>
          </div>
        ) : (
          <>
            {/* Balance Banner */}
            <div className="neo-card p-3 md:p-4 flex items-center justify-between animate-fade-in-up mb-4 hover-glow">
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5" style={{ color: '#22C55E' }} />
                <div>
                  <p className="text-xs font-bold uppercase" style={{ color: '#000' }}>Your STRK Balance</p>
                  <p className="text-xl font-black" style={{ color: '#000' }}>
                    {balanceData?.balance || '0'} <span className="text-sm font-bold">STRK</span>
                  </p>
                </div>
              </div>
              <p className="text-xs font-bold font-mono bg-white px-2 py-1 border-2 border-black" style={{ color: '#000' }}>
                {address ? `${address.slice(0, 8)}...${address.slice(-4)}` : ''}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid lg:grid-cols-5 gap-8">
                {/* Form Inputs */}
                <div className="lg:col-span-3 animate-fade-in-up animate-delay-100">
                  <div className="space-y-6">
                {/* Loan Amount */}
                <div className="neo-card p-5 hover-lift" style={{ background: 'var(--accent-tertiary)' }}>
                  <label className="flex items-center gap-2 text-sm font-black text-black mb-3">
                    <Calculator className="w-4 h-4" />
                    Loan Amount (STRK)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="neo-input text-xl"
                    placeholder="1000"
                    required
                    min="0.01"
                    step="any"
                  />
                </div>

                {/* Social Collateral */}
                <div className="neo-card p-5 hover-lift" style={{ background: 'var(--accent-cyan)' }}>
                  <label className="flex items-center gap-2 text-sm font-black text-black mb-3">
                    <Users className="w-4 h-4" />
                    Social Collateral Target (STRK)
                  </label>
                  <input
                    type="number"
                    value={socialCollateral}
                    onChange={(e) => setSocialCollateral(e.target.value)}
                    className="neo-input text-xl"
                    placeholder="200"
                    required
                    min="0"
                    max={requiredCollateral.toString()}
                    step="any"
                  />
                  <p className="text-sm font-bold mt-2 text-black">
                    Total amount friends need to stake. Your personal collateral will be reduced by this amount.
                  </p>
                </div>

                {/* Duration */}
                <div className="neo-card p-5 hover-lift" style={{ background: 'var(--accent-primary)' }}>
                  <label className="flex items-center gap-2 text-sm font-black text-black mb-3">
                    <Clock className="w-4 h-4" />
                    Loan Duration
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {['7', '14', '30', '60'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className="py-3 font-black transition-all duration-150"
                        style={{
                          background: duration === d ? '#000' : '#fff',
                          border: '4px solid #000',
                          color: duration === d ? '#fff' : '#000',
                          boxShadow: duration === d ? '0px 0px 0px #000' : 'var(--shadow-md)',
                          transform: duration === d ? 'translate(4px, 4px)' : 'none',
                        }}
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>

                {insufficientBalance && (
                  <div className="flex items-center gap-2 p-4" style={{
                    background: '#ffffff',
                    border: '3px solid #000000',
                    boxShadow: 'var(--shadow-md)',
                  }}>
                    <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#000' }} />
                    <span className="text-sm font-bold" style={{ color: '#000' }}>
                      Insufficient balance. You need {personalCollateral.toFixed(2)} STRK but have {userBalance.toFixed(2)} STRK.
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-4" style={{
                    background: 'var(--accent-red)',
                    border: '3px solid #000000',
                    color: '#fff',
                    boxShadow: 'var(--shadow-md)',
                  }}>
                    <AlertCircle className="w-5 h-5 shrink-0" style={{ color: '#fff' }} />
                    <span className="text-sm font-bold">{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-4" style={{
                    background: 'var(--accent-green)',
                    border: '3px solid #000000',
                    color: '#000',
                    boxShadow: '4px 4px 0px #000',
                  }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#000' }} />
                    <span className="text-sm font-bold">Loan request created on-chain!</span>
                  </div>
                )}

                  </div>
                </div>

                {/* Summary Panel */}
                <div className="lg:col-span-2 animate-fade-in-up animate-delay-200">
              <div className="neo-card p-5 hover-glow">
                <h3 className="text-base font-black uppercase mb-5 text-black">
                  Loan Summary
                </h3>

                <div className="space-y-4">
                  {[
                    { label: 'Loan Amount', value: `${loanAmount.toLocaleString()} STRK` },
                    { label: 'Required Collateral (120%)', value: `${requiredCollateral.toLocaleString()} STRK` },
                    { label: 'Social Collateral', value: `−${socialAmount.toLocaleString()} STRK`, color: '#22C55E' },
                    { label: 'Your Deposit', value: `${personalCollateral.toLocaleString()} STRK`, bold: true },
                  ].map(({ label, value, color, bold }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b-2 border-black">
                      <span className="text-sm font-bold text-black">{label}</span>
                      <span className={`text-sm ${bold ? 'font-black' : 'font-bold'} text-black`} style={color ? { color } : {}}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4" style={{
                  background: 'var(--accent-tertiary)',
                  border: '4px solid #000000',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  <p className="text-sm font-bold mb-1" style={{ color: '#fff' }}>
                    You save {savingsPercent}% collateral
                  </p>
                  <p className="text-xs font-bold" style={{ color: '#fff' }}>
                    Interest: {interestRate}% · Total repayment: {totalRepayment.toLocaleString()} STRK
                  </p>
                </div>

                <div className="mt-6 p-4" style={{
                  background: '#ffffff',
                  border: '3px solid #000',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  <p className="text-xs font-bold mb-2 uppercase text-black">
                    Duration: {duration} days
                  </p>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
            </div>
            </div>

              <div className="mt-12 animate-fade-in-up animate-delay-300">
                <button
                  type="submit"
                  disabled={isLoading || !amount || !socialCollateral || !contractReady || insufficientBalance}
                  className="w-full btn-gradient py-5 text-xl font-black transition-transform hover:-translate-y-1"
                  style={{
                    opacity: (isLoading || !amount || !socialCollateral || !contractReady || insufficientBalance) ? 0.5 : 1,
                    background: 'var(--accent-primary)',
                    color: '#000',
                    border: '4px solid #000',
                    boxShadow: 'var(--shadow-md)'
                  }}
                >
                  {!isConnected ? 'Connect Wallet to Borrow' :
                   isLoading ? 'Processing...' : 'CREATE LOAN REQUEST'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
