use starknet::ContractAddress;
use crate::types::{Loan, Vouch};

#[starknet::interface]
pub trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

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
