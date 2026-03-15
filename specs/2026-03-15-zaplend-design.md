# ZapLend Design Document

**Date:** 2026-03-15
**Project:** ZapLend - Social Collateral P2P Lending
**Challenge:** Starkzap Developer Challenge

---

## 1. Executive Summary

ZapLend is a P2P lending platform where borrowers can reduce their collateral requirement if friends "vouch" for them by staking funds as "social collateral." This solves DeFi's biggest problem: over-collateralization, by introducing trust-based lending through social connections.

**Target Prize:** Best Overall ($1,500) or Most Creative Integration ($500)

---

## 2. Core Concept

### Problem
Traditional DeFi lending requires 120-150% collateral, making it inaccessible for most users who need loans.

### Solution
Social collateral allows friends to stake funds as guarantors, reducing the borrower's required deposit while creating social pressure to repay.

### How It Works
1. Borrower wants 1000 STRK, normally needs 1200 STRK collateral
2. Borrower sets 2 social collateral slots at 200 STRK each
3. Borrower deposits 800 STRK personal collateral
4. Friends vouch by staking 200 STRK each
5. Once threshold met, loan activates
6. If borrower defaults, friends lose their stake

---

## 3. Architecture

### Smart Contracts (Cairo)

| Contract | Purpose |
|----------|---------|
| `LoanFactory` | Creates loan contracts, tracks active loans |
| `Loan` | Individual loan: collateral, repayment, liquidation |
| `SocialCollateral` | Manages friend stakes, vouch tracking |
| `CreditScore` | On-chain reputation based on repayment history |

### Frontend Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| State | React Query |
| Wallet | Starkzap SDK (@starkzap/core) |
| Charts | Recharts |

### Off-Chain

| Service | Purpose |
|---------|---------|
| PostgreSQL | User profiles, loan metadata, notifications |
| Redis | Real-time updates via WebSocket |

---

## 4. User Flows

### Flow 1: Borrower Creates Loan
1. Connect wallet via Starkzap
2. Enter loan amount (e.g., 1000 STRK)
3. System calculates collateral requirements
4. Set social collateral slots (e.g., 2 friends × 200 STRK)
5. Deposit personal collateral (800 STRK)
6. Loan request created → pending vouches

### Flow 2: Friend Vouches
1. Friend receives vouch request (link/notification)
2. Reviews borrower's credit score + terms
3. Approves vouch → stakes STRK via gasless tx
4. Once all slots filled → loan activates

### Flow 3: Repayment
1. Borrower makes payment via dashboard
2. Payment split between lender + vouch reward
3. On full repayment → social collateral returned
4. Credit score increases

### Flow 4: Default/Liquidation
1. Missed payment triggers grace period
2. If unpaid → liquidation
3. Lender receives all collateral (borrower + friends)
4. Credit score drops

### Flow 5: Direct Lending
1. Lender browses marketplace
2. Filters by collateral ratio, credit score
3. Funds loan directly → earns interest

---

## 5. Technical Implementation

### Core Data Structures

```cairo
struct Loan {
    borrower: ContractAddress,
    amount: u256,
    collateral: u256,
    social_collateral_target: u256,
    social_collateral_current: u256,
    interest_rate: u256,
    duration: u64,
    start_time: u64,
    status: LoanStatus,
    vouches: Vec<Vouch>
}

struct Vouch {
    friend: ContractAddress,
    amount: u256,
    timestamp: u64
}

enum LoanStatus {
    Pending,
    Active,
    Repaid,
    Defaulted
}
```

### Key Contract Functions

- `create_loan(amount, collateral, social_slots, duration)` - Deploys loan
- `add_vouch(loan_id)` - Friend stakes to vouch
- `repay(loan_id, amount)` - Partial or full repayment
- `liquidate(loan_id)` - Triggered on default
- `get_credit_score(address)` - Returns reputation

### Starkzap Integration

```typescript
import { Starkzap } from '@starkzap/core';

const zap = new Starkzap({
  provider: 'cartridge',
  network: 'mainnet'
});

// Create loan
await zap.transfer({
  token: 'STRK',
  amount: collateralAmount,
  to: loanContract
});

// Vouch for friend (gasless)
await zap.executeGasless({
  contract: socialCollateralContract,
  method: 'add_vouch',
  params: [loanId]
});
```

---

## 6. Success Criteria

### Winning Factors
1. **Unique Value Prop** - First social collateral on Starknet
2. **Technical Depth** - Uses Starkzap gasless, staking, wallet features
3. **Demo Quality** - Clean UI showing all flows
4. **Real Utility** - Solves undercollateralized lending
5. **Viral Element** - Social hook: "Would your friends vouch for you?"

### MVP Features (Must Have)
- [ ] Create loan with social collateral slots
- [ ] Friend vouching interface
- [ ] Loan activation when threshold met
- [ ] Repayment flow
- [ ] Credit score display
- [ ] Starkzap wallet integration

### Nice-to-Have
- [ ] Lender marketplace
- [ ] Liquidation mechanism
- [ ] Credit score history graph
- [ ] Mobile responsiveness

---

## 7. Testing Strategy

- Unit tests for Cairo contracts
- Integration tests for Starkzap SDK
- Manual end-to-end flow testing
- Deploy to Starknet testnet

---

## 8. Submission Checklist

- [ ] Public GitHub repo with README
- [ ] Live demo URL (Vercel)
- [ ] PR to awesome-starkzap repo
- [ ] Video walkthrough (2-3 min)

---

## 9. Timeline

**Deadline:** March 17, 2026 (2 days)

**Day 1:**
- Smart contract development
- Frontend scaffolding
- Starkzap integration

**Day 2:**
- UI polish
- Testing & deployment
- Documentation & submission

---

**Design Approved By:** harshad
**Date:** 2026-03-15
