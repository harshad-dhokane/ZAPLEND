import type { Abi } from 'starknet';

// Loan contract ABI — matches contracts/src/loan.cairo
export const LOAN_ABI: Abi = [
  {
    name: 'constructor',
    type: 'constructor',
    inputs: [
      { name: 'strk_token', type: 'core::starknet::contract_address::ContractAddress' },
    ],
  },
  {
    name: 'create_loan',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'core::integer::u256' },
      { name: 'collateral', type: 'core::integer::u256' },
      { name: 'social_collateral_target', type: 'core::integer::u256' },
      { name: 'duration', type: 'core::integer::u64' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'external',
  },
  {
    name: 'add_vouch',
    type: 'function',
    inputs: [
      { name: 'loan_id', type: 'core::integer::u256' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'repay',
    type: 'function',
    inputs: [
      { name: 'loan_id', type: 'core::integer::u256' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'liquidate',
    type: 'function',
    inputs: [
      { name: 'loan_id', type: 'core::integer::u256' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    name: 'get_loan',
    type: 'function',
    inputs: [
      { name: 'loan_id', type: 'core::integer::u256' },
    ],
    outputs: [
      {
        type: '(core::starknet::contract_address::ContractAddress, core::integer::u256, core::integer::u256, core::integer::u256, core::integer::u256, core::integer::u256, core::integer::u64, core::integer::u64, core::integer::u8, core::integer::u256)',
      },
    ],
    state_mutability: 'view',
  },
  {
    name: 'get_vouches',
    type: 'function',
    inputs: [
      { name: 'loan_id', type: 'core::integer::u256' },
    ],
    outputs: [
      { type: 'core::array::Array::<(core::starknet::contract_address::ContractAddress, core::integer::u256, core::integer::u64)>' },
    ],
    state_mutability: 'view',
  },
  {
    name: 'get_loan_count',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
];

// ERC20 ABI (STRK token) — for approve calls
export const ERC20_ABI: Abi = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'amount', type: 'core::integer::u256' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'external',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    state_mutability: 'view',
  },
];
