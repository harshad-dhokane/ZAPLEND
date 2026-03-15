use starknet::ContractAddress;

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
#[allow(starknet::store_no_default_variant)]
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
