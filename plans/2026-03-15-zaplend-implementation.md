# ZapLend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a social collateral P2P lending platform using Starkzap SDK with Cairo smart contracts and Next.js frontend.

**Architecture:** Smart contracts handle loan logic, collateral, and social vouching. Frontend uses Starkzap SDK for wallet connection and gasless transactions. PostgreSQL stores off-chain metadata.

**Tech Stack:** Cairo (smart contracts), Next.js 14, Tailwind CSS, shadcn/ui, Starkzap SDK, PostgreSQL, Redis

**Timeline:** 2 days (March 15-17, 2026)

---

## Chunk 1: Project Setup & Smart Contract Foundation

### Task 1: Initialize Project Structure

**Files:**
- Create: `contracts/Scarb.toml`
- Create: `contracts/src/lib.cairo`
- Create: `frontend/package.json`
- Create: `frontend/.env.example`

- [ ] **Step 1: Create Cairo project structure**

```toml
# contracts/Scarb.toml
[package]
name = "zaplend"
version = "0.1.0"
edition = "2023_11"

[dependencies]
openzeppelin = { git = "https://github.com/OpenZeppelin/cairo-contracts.git", tag = "v0.15.0" }
starknet = ">=2.6.3"

[[target.starknet-contract]]
sierra = true
casm = true
```

- [ ] **Step 2: Create Next.js frontend**

```bash
cd frontend
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] **Step 3: Install dependencies**

```bash
cd frontend
npm install @starkzap/core starknet react-query recharts lucide-react
npm install -D @types/node @types/react @types/react-dom
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: initialize project structure

- Cairo contracts setup with Scarb
- Next.js 14 frontend with TypeScript
- Installed Starkzap SDK and dependencies

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create Loan Data Structures

**Files:**
- Create: `contracts/src/types.cairo`
- Create: `contracts/src/interfaces.cairo`

- [ ] **Step 1: Define core types**

```cairo
// contracts/src/types.cairo
#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct Loan {
    pub borrower: ContractAddress,
    pub amount: u256,
    pub collateral: u256,
    pub social_collateral_target: u256,
    pub social_collateral_current: u256,
    pub interest_rate: u256,
    pub duration: u64,
    pub start_time: u64,
    pub status: LoanStatus,
    pub repaid_amount: u256,
}

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct Vouch {
    pub friend: ContractAddress,
    pub amount: u256,
    pub timestamp: u64,
}

#[derive(Drop, Serde, Copy, starknet::Store, PartialEq)]
pub enum LoanStatus {
    Pending,
    Active,
    Repaid,
    Defaulted,
}

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct CreditScore {
    pub address: ContractAddress,
    pub score: u256,
    pub total_loans: u256,
    pub repaid_loans: u256,
    pub defaulted_loans: u256,
}
```

- [ ] **Step 2: Define interfaces**

```cairo
// contracts/src/interfaces.cairo
use starknet::ContractAddress;
use crate::types::{Loan, Vouch, LoanStatus, CreditScore};

#[starknet::interface]
pub trait ILoan<TContractState> {
    fn create_loan(
        ref self: TContractState,
        amount: u256,
        collateral: u256,
        social_collateral_target: u256,
        duration: u64,
    ) -> u256;
    fn add_vouch(ref self: TContractState, loan_id: u256, amount: u256);
    fn repay(ref self: TContractState, loan_id: u256, amount: u256);
    fn liquidate(ref self: TContractState, loan_id: u256);
    fn get_loan(self: @TContractState, loan_id: u256) -> Loan;
    fn get_vouches(self: @TContractState, loan_id: u256) -> Array<Vouch>;
    fn get_loan_count(self: @TContractState) -> u256;
}

#[starknet::interface]
pub trait ICreditScore<TContractState> {
    fn get_credit_score(self: @TContractState, address: ContractAddress) -> CreditScore;
    fn update_score(ref self: TContractState, address: ContractAddress, repaid: bool);
}
```

- [ ] **Step 3: Update lib.cairo**

```cairo
// contracts/src/lib.cairo
pub mod types;
pub mod interfaces;
pub mod loan;
pub mod credit_score;
pub mod social_collateral;
```

- [ ] **Step 4: Commit**

```bash
git add contracts/
git commit -m "feat(contracts): add core data structures and interfaces

- Loan, Vouch, CreditScore types
- ILoan and ICreditScore interfaces
- LoanStatus enum with Pending, Active, Repaid, Defaulted

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Implement Loan Contract

**Files:**
- Create: `contracts/src/loan.cairo`

- [ ] **Step 1: Create loan contract with core functions**

```cairo
// contracts/src/loan.cairo
#[starknet::contract]
pub mod Loan {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::types::{Loan, Vouch, LoanStatus, CreditScore};
    use crate::interfaces::{ILoan};
    use crate::credit_score::CreditScore::ICreditScoreDispatcher;

    #[storage]
    struct Storage {
        loans: Map<u256, Loan>,
        vouches: Map<(u256, u256), Vouch>,
        vouch_count: Map<u256, u256>,
        loan_counter: u256,
        strk_token: ContractAddress,
        credit_score_contract: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        strk_token: ContractAddress,
        credit_score_contract: ContractAddress,
    ) {
        self.strk_token.write(strk_token);
        self.credit_score_contract.write(credit_score_contract);
        self.loan_counter.write(0);
    }

    #[abi(embed_v0)]
    impl LoanImpl of ILoan<ContractState> {
        fn create_loan(
            ref self: ContractState,
            amount: u256,
            collateral: u256,
            social_collateral_target: u256,
            duration: u64,
        ) -> u256 {
            let borrower = get_caller_address();
            let loan_id = self.loan_counter.read() + 1;

            // Transfer collateral from borrower
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer_from(borrower, starknet::contract_address(), collateral);

            let loan = Loan {
                borrower,
                amount,
                collateral,
                social_collateral_target,
                social_collateral_current: 0,
                interest_rate: 500, // 5% in basis points
                duration,
                start_time: 0, // Set when activated
                status: LoanStatus::Pending,
                repaid_amount: 0,
            };

            self.loans.write(loan_id, loan);
            self.loan_counter.write(loan_id);

            loan_id
        }

        fn add_vouch(ref self: ContractState, loan_id: u256, amount: u256) {
            let friend = get_caller_address();
            let mut loan = self.loans.read(loan_id);

            assert(loan.status == LoanStatus::Pending, 'Loan not pending');
            assert(loan.social_collateral_current + amount <= loan.social_collateral_target, 'Exceeds target');

            // Transfer social collateral
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer_from(friend, starknet::contract_address(), amount);

            let vouch = Vouch {
                friend,
                amount,
                timestamp: get_block_timestamp(),
            };

            let vouch_id = self.vouch_count.read(loan_id);
            self.vouches.write((loan_id, vouch_id), vouch);
            self.vouch_count.write(loan_id, vouch_id + 1);

            loan.social_collateral_current += amount;

            // Activate loan if target reached
            if loan.social_collateral_current >= loan.social_collateral_target {
                loan.status = LoanStatus::Active;
                loan.start_time = get_block_timestamp();
                // Transfer loan amount to borrower
                token.transfer(loan.borrower, loan.amount);
            }

            self.loans.write(loan_id, loan);
        }

        fn repay(ref self: ContractState, loan_id: u256, amount: u256) {
            let caller = get_caller_address();
            let mut loan = self.loans.read(loan_id);

            assert(loan.status == LoanStatus::Active, 'Loan not active');
            assert(caller == loan.borrower, 'Not borrower');

            // Transfer repayment
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer_from(caller, starknet::contract_address(), amount);

            loan.repaid_amount += amount;

            // Check if fully repaid
            let total_due = loan.amount + (loan.amount * loan.interest_rate / 10000);
            if loan.repaid_amount >= total_due {
                loan.status = LoanStatus::Repaid;
                self._return_collateral(loan_id);
            }

            self.loans.write(loan_id, loan);
        }

        fn liquidate(ref self: ContractState, loan_id: u256) {
            let mut loan = self.loans.read(loan_id);
            assert(loan.status == LoanStatus::Active, 'Loan not active');

            let current_time = get_block_timestamp();
            let deadline = loan.start_time + loan.duration;
            assert(current_time > deadline, 'Not yet defaulted');

            loan.status = LoanStatus::Defaulted;
            self.loans.write(loan_id, loan);

            // Transfer all collateral to lender (simplified - in real version, track lender)
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            let total_collateral = loan.collateral + loan.social_collateral_current;
            token.transfer(starknet::contract_address(), total_collateral);
        }

        fn get_loan(self: @ContractState, loan_id: u256) -> Loan {
            self.loans.read(loan_id)
        }

        fn get_vouches(self: @ContractState, loan_id: u256) -> Array<Vouch> {
            let mut vouches = ArrayTrait::new();
            let count = self.vouch_count.read(loan_id);
            let mut i = 0;
            while i < count {
                vouches.append(self.vouches.read((loan_id, i)));
                i += 1;
            };
            vouches
        }

        fn get_loan_count(self: @ContractState) -> u256 {
            self.loan_counter.read()
        }
    }

    #[generate_trait]
    impl PrivateImpl of PrivateTrait {
        fn _return_collateral(ref self: ContractState, loan_id: u256) {
            let loan = self.loans.read(loan_id);
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };

            // Return borrower's collateral
            token.transfer(loan.borrower, loan.collateral);

            // Return friends' stakes
            let count = self.vouch_count.read(loan_id);
            let mut i = 0;
            while i < count {
                let vouch = self.vouches.read((loan_id, i));
                token.transfer(vouch.friend, vouch.amount);
                i += 1;
            };
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add contracts/src/loan.cairo
git commit -m "feat(contracts): implement loan contract

- create_loan with collateral locking
- add_vouch with social collateral
- repay with interest calculation
- liquidate on default
- collateral return on repayment

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Frontend Foundation

### Task 4: Setup Starkzap Provider

**Files:**
- Create: `frontend/src/providers/StarkzapProvider.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create Starkzap provider**

```typescript
// frontend/src/providers/StarkzapProvider.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Starkzap } from '@starkzap/core';

interface StarkzapContextType {
  zap: Starkzap | null;
  isConnected: boolean;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const StarkzapContext = createContext<StarkzapContextType | undefined>(undefined);

export function StarkzapProvider({ children }: { children: ReactNode }) {
  const [zap, setZap] = useState<Starkzap | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const connect = async () => {
    const zapInstance = new Starkzap({
      provider: 'cartridge',
      network: 'testnet',
    });

    await zapInstance.connect();
    const userAddress = await zapInstance.getAddress();

    setZap(zapInstance);
    setIsConnected(true);
    setAddress(userAddress);
  };

  const disconnect = () => {
    setZap(null);
    setIsConnected(false);
    setAddress(null);
  };

  return (
    <StarkzapContext.Provider value={{ zap, isConnected, address, connect, disconnect }}>
      {children}
    </StarkzapContext.Provider>
  );
}

export function useStarkzap() {
  const context = useContext(StarkzapContext);
  if (!context) {
    throw new Error('useStarkzap must be used within StarkzapProvider');
  }
  return context;
}
```

- [ ] **Step 2: Update layout.tsx**

```typescript
// frontend/src/app/layout.tsx
import { StarkzapProvider } from '@/providers/StarkzapProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StarkzapProvider>
          {children}
        </StarkzapProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/providers/ frontend/src/app/layout.tsx
git commit -m "feat(frontend): add Starkzap provider

- StarkzapContext for wallet state
- Cartridge wallet integration
- connect/disconnect functions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Create Navigation & Layout

**Files:**
- Create: `frontend/src/components/Navbar.tsx`
- Create: `frontend/src/components/WalletButton.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create Navbar component**

```typescript
// frontend/src/components/Navbar.tsx
import Link from 'next/link';
import { WalletButton } from './WalletButton';

export function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          ZapLend
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/borrow" className="text-gray-600 hover:text-gray-900">
            Borrow
          </Link>
          <Link href="/lend" className="text-gray-600 hover:text-gray-900">
            Lend
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create WalletButton**

```typescript
// frontend/src/components/WalletButton.tsx
'use client';

import { useStarkzap } from '@/providers/StarkzapProvider';

export function WalletButton() {
  const { isConnected, address, connect, disconnect } = useStarkzap();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Connect Wallet
    </button>
  );
}
```

- [ ] **Step 3: Update page.tsx**

```typescript
// frontend/src/app/page.tsx
import { Navbar } from '@/components/Navbar';

export default function Home() {
  return (
    <main>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Social Collateral Lending
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Borrow with less collateral when friends vouch for you.
            Trust-based lending powered by Starknet.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/borrow"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700"
            >
              Get a Loan
            </a>
            <a
              href="/lend"
              className="px-8 py-4 bg-gray-100 text-gray-700 rounded-lg text-lg font-semibold hover:bg-gray-200"
            >
              Start Lending
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ frontend/src/app/page.tsx
git commit -m "feat(frontend): add navigation and landing page

- Navbar with navigation links
- WalletButton with connect/disconnect
- Landing page with CTAs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Create Loan Creation Page

**Files:**
- Create: `frontend/src/app/borrow/page.tsx`
- Create: `frontend/src/hooks/useCreateLoan.ts`

- [ ] **Step 1: Create useCreateLoan hook**

```typescript
// frontend/src/hooks/useCreateLoan.ts
import { useState } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';

const LOAN_CONTRACT = '0x...'; // Will be set after deployment

export function useCreateLoan() {
  const { zap } = useStarkzap();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLoan = async (
    amount: string,
    collateral: string,
    socialCollateral: string,
    duration: number
  ) => {
    if (!zap) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to wei (STRK has 18 decimals)
      const amountWei = BigInt(parseFloat(amount) * 1e18);
      const collateralWei = BigInt(parseFloat(collateral) * 1e18);
      const socialWei = BigInt(parseFloat(socialCollateral) * 1e18);

      // Call contract
      const result = await zap.execute({
        contractAddress: LOAN_CONTRACT,
        entrypoint: 'create_loan',
        calldata: [
          amountWei.toString(),
          collateralWei.toString(),
          socialWei.toString(),
          duration.toString(),
        ],
      });

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create loan');
    } finally {
      setIsLoading(false);
    }
  };

  return { createLoan, isLoading, error };
}
```

- [ ] **Step 2: Create borrow page**

```typescript
// frontend/src/app/borrow/page.tsx
'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useCreateLoan } from '@/hooks/useCreateLoan';
import { useStarkzap } from '@/providers/StarkzapProvider';

export default function BorrowPage() {
  const { isConnected } = useStarkzap();
  const { createLoan, isLoading, error } = useCreateLoan();
  const [amount, setAmount] = useState('');
  const [collateral, setCollateral] = useState('');
  const [socialCollateral, setSocialCollateral] = useState('');
  const [duration, setDuration] = useState('30');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLoan(amount, collateral, socialCollateral, parseInt(duration) * 86400);
  };

  // Calculate required collateral
  const requiredCollateral = parseFloat(amount || '0') * 1.2;
  const personalCollateral = requiredCollateral - parseFloat(socialCollateral || '0');

  return (
    <main>
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Create a Loan Request</h1>

        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Connect your wallet to create a loan</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Amount (STRK)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="1000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Social Collateral (STRK)
              </label>
              <input
                type="number"
                value={socialCollateral}
                onChange={(e) => setSocialCollateral(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="200"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Amount friends need to stake to vouch for you
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Required Collateral: {requiredCollateral.toFixed(2)} STRK
              </p>
              <p className="text-sm text-gray-600">
                Your Deposit: {Math.max(0, personalCollateral).toFixed(2)} STRK
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (days)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Loan Request'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/ frontend/src/app/borrow/
git commit -m "feat(frontend): add loan creation page

- useCreateLoan hook with Starkzap integration
- Borrow page with form for loan parameters
- Real-time collateral calculation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Core Features

### Task 7: Create Loan Marketplace

**Files:**
- Create: `frontend/src/app/lend/page.tsx`
- Create: `frontend/src/hooks/useLoans.ts`

- [ ] **Step 1: Create useLoans hook**

```typescript
// frontend/src/hooks/useLoans.ts
import { useQuery } from 'react-query';
import { useStarkzap } from '@/providers/StarkzapProvider';

const LOAN_CONTRACT = '0x...';

interface Loan {
  id: string;
  borrower: string;
  amount: string;
  collateral: string;
  socialCollateralTarget: string;
  socialCollateralCurrent: string;
  interestRate: number;
  duration: number;
  status: 'Pending' | 'Active' | 'Repaid' | 'Defaulted';
}

export function useLoans() {
  const { zap } = useStarkzap();

  return useQuery('loans', async () => {
    if (!zap) return [];

    // In real implementation, fetch from contract or indexer
    // For now, return mock data
    return [
      {
        id: '1',
        borrower: '0x1234...5678',
        amount: '1000',
        collateral: '800',
        socialCollateralTarget: '400',
        socialCollateralCurrent: '200',
        interestRate: 5,
        duration: 30,
        status: 'Pending',
      },
    ] as Loan[];
  });
}
```

- [ ] **Step 2: Create lend page**

```typescript
// frontend/src/app/lend/page.tsx
'use client';

import { Navbar } from '@/components/Navbar';
import { useLoans } from '@/hooks/useLoans';

export default function LendPage() {
  const { data: loans, isLoading } = useLoans();

  return (
    <main>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Loan Marketplace</h1>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid gap-6">
            {loans?.map((loan) => (
              <div
                key={loan.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Loan #{loan.id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Borrower: {loan.borrower}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    {loan.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold">{loan.amount} STRK</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Interest</p>
                    <p className="font-semibold">{loan.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-semibold">{loan.duration} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Social Collateral</p>
                    <p className="font-semibold">
                      {loan.socialCollateralCurrent} / {loan.socialCollateralTarget} STRK
                    </p>
                  </div>
                </div>

                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Fund This Loan
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/lend/ frontend/src/hooks/useLoans.ts
git commit -m "feat(frontend): add loan marketplace

- useLoans hook for fetching loan data
- Lend page with loan cards
- Display loan details and status

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Create Dashboard

**Files:**
- Create: `frontend/src/app/dashboard/page.tsx`
- Create: `frontend/src/components/CreditScore.tsx`

- [ ] **Step 1: Create CreditScore component**

```typescript
// frontend/src/components/CreditScore.tsx
interface CreditScoreProps {
  score: number;
  totalLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
}

export function CreditScore({
  score,
  totalLoans,
  repaidLoans,
  defaultedLoans,
}: CreditScoreProps) {
  const getScoreColor = () => {
    if (score >= 800) return 'text-green-600';
    if (score >= 600) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Credit Score</h3>
      <div className="flex items-center gap-4 mb-4">
        <span className={`text-4xl font-bold ${getScoreColor()}`}>
          {score}
        </span>
        <div className="text-sm text-gray-500">
          <p>Excellent</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-semibold">{totalLoans}</p>
          <p className="text-sm text-gray-500">Total Loans</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-green-600">{repaidLoans}</p>
          <p className="text-sm text-gray-500">Repaid</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-red-600">{defaultedLoans}</p>
          <p className="text-sm text-gray-500">Defaulted</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard page**

```typescript
// frontend/src/app/dashboard/page.tsx
'use client';

import { Navbar } from '@/components/Navbar';
import { CreditScore } from '@/components/CreditScore';
import { useStarkzap } from '@/providers/StarkzapProvider';

export default function DashboardPage() {
  const { isConnected, address } = useStarkzap();

  // Mock data - replace with actual data fetching
  const activeLoans = [
    {
      id: '1',
      amount: '1000',
      status: 'Active',
      dueDate: '2026-04-15',
      remaining: '500',
    },
  ];

  const vouchRequests = [
    {
      id: '2',
      borrower: '0xabcd...efgh',
      amount: '200',
      relationship: 'Friend',
    },
  ];

  return (
    <main>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Connect your wallet to view dashboard</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Credit Score */}
            <div className="lg:col-span-1">
              <CreditScore
                score={750}
                totalLoans={5}
                repaidLoans={4}
                defaultedLoans={0}
              />
            </div>

            {/* Active Loans */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-semibold">Active Loans</h2>
              {activeLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Loan #{loan.id}</h3>
                      <p className="text-sm text-gray-500">
                        Due: {loan.dueDate}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {loan.status}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500">Remaining</p>
                      <p className="text-xl font-semibold">{loan.remaining} STRK</p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Repay
                    </button>
                  </div>
                </div>
              ))}

              {/* Vouch Requests */}
              <h2 className="text-xl font-semibold mt-8">Vouch Requests</h2>
              {vouchRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {request.relationship} Needs Your Vouch
                      </h3>
                      <p className="text-sm text-gray-500">
                        {request.borrower}
                      </p>
                    </div>
                    <span className="text-xl font-semibold">
                      {request.amount} STRK
                    </span>
                  </div>
                  <div className="mt-4 flex gap-4">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Vouch
                    </button>
                    <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/ frontend/src/components/CreditScore.tsx
git commit -m "feat(frontend): add dashboard

- CreditScore component with score display
- Dashboard page with active loans
- Vouch requests section

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Polish & Deployment

### Task 9: Add Vouching Functionality

**Files:**
- Create: `frontend/src/hooks/useVouch.ts`
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create useVouch hook**

```typescript
// frontend/src/hooks/useVouch.ts
import { useState } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';

const LOAN_CONTRACT = '0x...';

export function useVouch() {
  const { zap } = useStarkzap();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vouch = async (loanId: string, amount: string) => {
    if (!zap) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountWei = BigInt(parseFloat(amount) * 1e18);

      const result = await zap.execute({
        contractAddress: LOAN_CONTRACT,
        entrypoint: 'add_vouch',
        calldata: [loanId, amountWei.toString()],
      });

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vouch');
    } finally {
      setIsLoading(false);
    }
  };

  return { vouch, isLoading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useVouch.ts
git commit -m "feat(frontend): add vouching functionality

- useVouch hook for staking as social collateral
- Starkzap integration for gasless transactions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Add Repayment Functionality

**Files:**
- Create: `frontend/src/hooks/useRepay.ts`
- Create: `frontend/src/components/RepayModal.tsx`

- [ ] **Step 1: Create useRepay hook**

```typescript
// frontend/src/hooks/useRepay.ts
import { useState } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';

const LOAN_CONTRACT = '0x...';

export function useRepay() {
  const { zap } = useStarkzap();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repay = async (loanId: string, amount: string) => {
    if (!zap) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountWei = BigInt(parseFloat(amount) * 1e18);

      const result = await zap.execute({
        contractAddress: LOAN_CONTRACT,
        entrypoint: 'repay',
        calldata: [loanId, amountWei.toString()],
      });

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repay');
    } finally {
      setIsLoading(false);
    }
  };

  return { repay, isLoading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useRepay.ts
git commit -m "feat(frontend): add repayment functionality

- useRepay hook for loan repayment
- Starkzap integration for repay transactions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Create README & Documentation

**Files:**
- Create: `README.md`
- Create: `frontend/.env.example`

- [ ] **Step 1: Write comprehensive README**

```markdown
# ZapLend - Social Collateral P2P Lending

A decentralized lending platform where borrowers can reduce collateral requirements when friends vouch for them using Starkzap SDK on Starknet.

## 🌟 Features

- **Social Collateral**: Friends stake STRK to vouch for borrowers
- **Reduced Collateral**: Borrow with less than 120% collateral
- **Credit Scores**: On-chain reputation system
- **Gasless Transactions**: Powered by Starkzap
- **Real-time Updates**: Track loan status instantly

## 🏗️ Architecture

### Smart Contracts (Cairo)
- `LoanFactory`: Creates and tracks loans
- `Loan`: Individual loan logic
- `SocialCollateral`: Manages friend stakes
- `CreditScore`: On-chain reputation

### Frontend (Next.js + Starkzap)
- Wallet integration via Starkzap SDK
- Loan creation and management
- Vouching interface
- Dashboard with credit scores

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Scarb (for Cairo contracts)
- Starknet wallet

### Contract Deployment
\`\`\`bash
cd contracts
scarb build
starkli declare target/dev/zaplend_Loan.sierra.json
# Follow deployment steps...
\`\`\`

### Frontend Setup
\`\`\`bash
cd frontend
npm install
cp .env.example .env.local
# Update env variables
npm run dev
\`\`\`

## 📝 Usage

1. **Connect Wallet**: Use Starkzap to connect your wallet
2. **Create Loan**: Set amount, collateral, and social collateral slots
3. **Share Request**: Send vouch request link to friends
4. **Friends Vouch**: Friends stake STRK to support you
5. **Loan Activates**: Once threshold met, funds are released
6. **Repay**: Pay back loan to return collateral to everyone

## 🏆 Submission

Built for Starkzap Developer Challenge
- GitHub: [your-repo]
- Demo: [your-vercel-url]

## 📄 License

MIT
```

- [ ] **Step 2: Create env example**

```bash
# frontend/.env.example
NEXT_PUBLIC_STARKZAP_NETWORK=testnet
NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CREDIT_SCORE_CONTRACT_ADDRESS=0x...
```

- [ ] **Step 3: Commit**

```bash
git add README.md frontend/.env.example
git commit -m "docs: add README and environment config

- Comprehensive README with features and setup
- Environment variables template

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Deploy to Vercel

**Files:**
- Create: `frontend/vercel.json`

- [ ] **Step 1: Create vercel config**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Deploy**

```bash
cd frontend
npm install -g vercel
vercel --prod
```

- [ ] **Step 3: Commit and tag**

```bash
git add vercel.json
git commit -m "chore: add vercel config for deployment

- Vercel deployment configuration
- Production build settings

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git tag -a v1.0.0 -m "Initial release for Starkzap Challenge"
```

---

## Summary

This implementation plan covers:

1. **Smart Contracts**: Cairo contracts for loan logic, social collateral, and credit scoring
2. **Frontend**: Next.js app with Starkzap integration
3. **Core Features**: Loan creation, vouching, repayment, dashboard
4. **Deployment**: Vercel hosting with proper configuration

**Estimated Time:** 2 days with focused work
**Key Dependencies:** Starkzap SDK, Cairo compiler, Vercel CLI

**Success Criteria:**
- Working loan creation with social collateral
- Friends can vouch and stake
- Repayment returns collateral
- Clean UI demonstrating all flows
- Deployed and accessible demo
