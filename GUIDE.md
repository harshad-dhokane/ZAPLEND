# ZapLend Technical Guide & Architecture

Welcome to the technical deep-dive of ZapLend! This guide explains the core concepts, the underlying architecture, and a detailed step-by-step example of how a loan flows through the system from the frontend Cartridge controller down to the Starknet smart contracts.

## 🧠 The Core Concept: Social Collateral

Traditional DeFi lending requires **over-collateralization** (e.g., depositing $150 of ETH to borrow $100 of USDC). This is incredibly capital inefficient. 

ZapLend introduces **Social Collateral**. If a borrower wants a loan but doesn't have enough personal capital to meet the 120% collateral requirement, they can ask their trusted social network to vouch for them.
* Friends stake their own capital to make up the difference.
* If the borrower repays successfully, friends get their stake back.
* If the borrower defaults, the friends' stake is slashed to repay the lender.

This shifts the risk from purely mathematical to **social and reputational**.

---

## 🏗️ Architecture Overview

ZapLend is built on a modern Web3 stack designed for extreme user-friendliness, completely bypassing complex wallet setups.

### 1. The Frontend (Next.js 16 + Tailwind v4)
- Built on the App Router for fast, server-rendered React.
- **Neo-Brutalism UI**: Uses high-contrast, bold colors (`#FFD500`, `#00F5D4`) to make DeFi accessible and fun, moving away from intimidating "dark-mode only" dashboards.

### 2. The Wallet Layer (Starkzap SDK + Cartridge)
ZapLend integrates the **Starkzap SDK** specifically to utilize the **Cartridge Controller**.
- Users do NOT need to install a browser extension (like ArgentX or Braavos). 
- Cartridge provides a seamless, web-based passkey login.
- **Gasless Transactions**: ZapLend leverages Cartridge's Paymaster integration to sponsor transactions. When a friend vouches for a borrower, they execute a multi-call transaction (Approve STRK + Stake STRK) with **zero gas fees**.

### 3. The Smart Contracts (Cairo 2)
The backend logic lives entirely on-chain on Starknet Sepolia.
- `loan.cairo`: Manages the state machine of every loan (`Pending`, `Active`, `Repaid`, `Defaulted`).
- Handles the math for social thresholds, interest rates (5%), and durations.

---

## 🔄 Detailed Walkthrough: The Loan Flow

Let's trace exactly what happens behind the scenes when Alice wants to borrow STRK and her friend Bob vouches for her.

### Step 1: Alice Creates a Loan Request
1. Alice connects to ZapLend via her Cartridge Controller.
2. She navigates to `/borrow` and requests **100 STRK**.
3. Normally, she would need **120 STRK** as personal collateral. She decides to use Social Collateral, setting a target of **50 STRK**.
4. The frontend calculates she now only needs to deposit **70 STRK** personally (120 - 50 = 70).
5. Alice clicks "Create". 
6. **Under the hood**: The Starkzap SDK executes a multicall:
   - `STRK_TOKEN.approve(ZapLend_Contract, 70 STRK)`
   - `ZapLend_Contract.create_loan(amount: 100, social_target: 50, duration: 30 days)`
7. The contract creates Loan `#1` with status `Pending`. No funds are disbursed yet.

### Step 2: Sharing the Link
Alice shares her unique link `zaplend.app/loan/1` in a group chat.

### Step 3: Bob Vouches for Alice
1. Bob clicks the link. He sees Alice needs 50 STRK to activate her loan.
2. Bob clicks "Vouch" and inputs **50 STRK**.
3. **Under the hood**: The frontend generates another multicall via Starkzap:
   - `STRK_TOKEN.approve(ZapLend_Contract, 50 STRK)`
   - `ZapLend_Contract.add_vouch(loan_id: 1, amount: 50)`
4. Because ZapLend uses Cartridge, Bob completes this massive transaction with a simple face-id/passkey prompt, and pays **0 gas**.

### Step 4: Loan Activation
When the `add_vouch` function executes on Starknet:
1. The contract verifies that the total vouches (50 STRK) >= the social target (50 STRK).
2. The threshold is met. Validating the loan, the contract automatically:
   - Changes Loan `#1` status to `Active`.
   - Records the current `block_timestamp` as the `startTime`.
   - Transfers **100 STRK** from the protocol's liquidity pool directly into Alice's wallet.

### Step 5: Repayment or Default
Fast forward 25 days. Alice goes to her Dashboard to repay.
1. She clicks "Make Payment".
2. **Under the hood**: `wallet.execute` calls `repay_loan(loan_id: 1)` along with an ERC20 approval for 105 STRK (Principal + 5% interest).
3. The contract marks the loan as `Repaid`.
4. The contract refunds Alice her 70 STRK personal collateral.
5. **Crucially**, the contract refunds Bob his 50 STRK stake.

*If Alice had failed to repay by day 30*, anyone could call `execute_default(1)`. The contract would seize Alice's 70 STRK and Bob's 50 STRK to cover the loss.

---

## 🛠 Reactivity & Real-time Feeds

The frontend uses `@tanstack/react-query` to constantly poll the Starknet RPC. 

Instead of waiting for page reloads, the **Dashboard Activity Feed** builds a real-time deterministic timeline. 
- It reads the array of loans.
- It finds the `startTime`.
- It mathematically derives the exact moment friends vouched, when the loan was activated, and when it was repaid.
- This creates a beautiful, ticking timeline of un-falsifiable blockchain activity!
