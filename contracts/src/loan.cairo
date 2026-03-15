#[starknet::contract]
pub mod LoanContract {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use crate::types::{Loan, Vouch, LoanStatus};
    use crate::interfaces::{ILoan, IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    struct Storage {
        loans: Map<u256, Loan>,
        vouches: Map<(u256, u256), Vouch>,
        vouch_count: Map<u256, u256>,
        loan_counter: u256,
        strk_token: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        LoanCreated: LoanCreated,
        VouchAdded: VouchAdded,
        LoanActivated: LoanActivated,
        LoanRepaid: LoanRepaid,
        LoanDefaulted: LoanDefaulted,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanCreated {
        #[key]
        loan_id: u256,
        borrower: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct VouchAdded {
        #[key]
        loan_id: u256,
        friend: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanActivated {
        #[key]
        loan_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanRepaid {
        #[key]
        loan_id: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanDefaulted {
        #[key]
        loan_id: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, strk_token: ContractAddress) {
        self.strk_token.write(strk_token);
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
            token.transfer_from(borrower, get_contract_address(), collateral);

            let loan = Loan {
                borrower,
                amount,
                collateral,
                social_collateral_target,
                social_collateral_current: 0,
                interest_rate: 500, // 5% in basis points
                duration,
                start_time: 0,
                status: LoanStatus::Pending,
                repaid_amount: 0,
            };

            self.loans.write(loan_id, loan);
            self.loan_counter.write(loan_id);

            self.emit(LoanCreated { loan_id, borrower, amount });

            loan_id
        }

        fn add_vouch(ref self: ContractState, loan_id: u256, amount: u256) {
            let friend = get_caller_address();
            let mut loan = self.loans.read(loan_id);

            assert(loan.status == LoanStatus::Pending, 'Loan not pending');
            assert(
                loan.social_collateral_current + amount <= loan.social_collateral_target,
                'Exceeds target',
            );

            // Transfer social collateral
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer_from(friend, get_contract_address(), amount);

            let vouch = Vouch { friend, amount, timestamp: get_block_timestamp() };

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
                self.emit(LoanActivated { loan_id });
            }

            self.loans.write(loan_id, loan);
            self.emit(VouchAdded { loan_id, friend, amount });
        }

        fn repay(ref self: ContractState, loan_id: u256, amount: u256) {
            let caller = get_caller_address();
            let mut loan = self.loans.read(loan_id);

            assert(loan.status == LoanStatus::Active, 'Loan not active');
            assert(caller == loan.borrower, 'Not borrower');

            // Transfer repayment
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer_from(caller, get_contract_address(), amount);

            loan.repaid_amount += amount;

            // Check if fully repaid (amount + 5% interest)
            let total_due = loan.amount + (loan.amount * loan.interest_rate / 10000);
            if loan.repaid_amount >= total_due {
                loan.status = LoanStatus::Repaid;
                self._return_collateral(loan_id);
                self.emit(LoanRepaid { loan_id });
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
            self.emit(LoanDefaulted { loan_id });
        }

        fn get_loan(self: @ContractState, loan_id: u256) -> Loan {
            self.loans.read(loan_id)
        }

        fn get_vouches(self: @ContractState, loan_id: u256) -> Array<Vouch> {
            let mut vouches = ArrayTrait::new();
            let count = self.vouch_count.read(loan_id);
            let mut i: u256 = 0;
            loop {
                if i >= count {
                    break;
                }
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
            let mut i: u256 = 0;
            loop {
                if i >= count {
                    break;
                }
                let vouch = self.vouches.read((loan_id, i));
                token.transfer(vouch.friend, vouch.amount);
                i += 1;
            };
        }
    }
}
