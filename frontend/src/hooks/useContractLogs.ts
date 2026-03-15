'use client';

import { useQuery } from '@tanstack/react-query';
import { getProvider, LOAN_CONTRACT_ADDRESS, formatStrk, u256ToBigInt } from '@/lib/starknet';
import { hash } from 'starknet';

const EVENT_KEYS = {
  LoanCreated: hash.starknetKeccak('LoanCreated').toString(16),
  VouchAdded: hash.starknetKeccak('VouchAdded').toString(16),
  LoanActivated: hash.starknetKeccak('LoanActivated').toString(16),
  LoanRepaid: hash.starknetKeccak('LoanRepaid').toString(16),
  LoanDefaulted: hash.starknetKeccak('LoanDefaulted').toString(16),
};

export type ContractLog = {
  id: string;
  type: string;
  txHash: string;
  blockNumber: number;
  timestamp: number | null;
  data: any;
};

// Global cache to avoid blasting RPC with block requests
const blockTimesCache = new Map<number, number>();

async function fetchContractLogs(): Promise<ContractLog[]> {
  const provider = getProvider();
  if (!LOAN_CONTRACT_ADDRESS) return [];

  // Fetch latest block to get a window of recent events
  const latestBlock = await provider.getBlock('latest');
  // Start from around contract deployment to avoid empty early pages
  const fromBlock = 7600000; 

  const allEvents: any[] = [];
  let continuationToken: string | undefined = undefined;

  // Fetch all events from the contract with pagination
  do {
    const res: any = await provider.getEvents({
      address: LOAN_CONTRACT_ADDRESS,
      chunk_size: 1000,
      from_block: { block_number: fromBlock },
      to_block: { block_number: latestBlock.block_number },
      continuation_token: continuationToken
    });
    
    allEvents.push(...res.events);
    continuationToken = res.continuation_token;
  } while (continuationToken);

  const logs: ContractLog[] = [];
  const uniqueBlocks = [...new Set(allEvents.map(e => e.block_number || 0))];

  // Fetch exact block timestamps for the events that we haven't seen yet.
  // We only fetch the top 20 blocks to keep UI snappy, the rest will use block number exclusively.
  const missingBlocks = uniqueBlocks.filter(b => b > 0 && !blockTimesCache.has(b)).sort((a,b) => b-a).slice(0, 20);
  
  await Promise.all(
    missingBlocks.map(async (bn) => {
      try {
        const block = await provider.getBlock(bn);
        blockTimesCache.set(bn, block.timestamp);
      } catch (e) {
        // Ignored
      }
    })
  );

  allEvents.forEach((event, idx) => {
    let type = 'Unknown';
    let data: any = {};
    const key0 = BigInt(event.keys[0]);

    const isMatch = (hashHex: string) => key0 === BigInt('0x' + hashHex);

    try {
      const loanId = u256ToBigInt(event.keys[1] || '0', event.keys[2] || '0').toString();

      if (isMatch(EVENT_KEYS.LoanCreated)) {
        type = 'LoanCreated';
        const borrower = event.data[0];
        const amount = formatStrk(u256ToBigInt(event.data[1], event.data[2]));
        data = { loanId, borrower, amount };
      } else if (isMatch(EVENT_KEYS.VouchAdded)) {
        type = 'VouchAdded';
        const friend = event.data[0];
        const amount = formatStrk(u256ToBigInt(event.data[1], event.data[2]));
        data = { loanId, friend, amount };
      } else if (isMatch(EVENT_KEYS.LoanActivated)) {
        type = 'LoanActivated';
        data = { loanId };
      } else if (isMatch(EVENT_KEYS.LoanRepaid)) {
        type = 'LoanRepaid';
        data = { loanId };
      } else if (isMatch(EVENT_KEYS.LoanDefaulted)) {
        type = 'LoanDefaulted';
        data = { loanId };
      } else {
        return; // Skip non-loan events
      }

      const blockNumber = event.block_number || 0;

      logs.push({
        id: `${event.transaction_hash}-${idx}`,
        type,
        txHash: event.transaction_hash || '',
        blockNumber,
        timestamp: blockTimesCache.get(blockNumber) || null,
        data,
      });
    } catch (err) {
      console.error("Error parsing event", err);
    }
  });

  // Sort strictly by block number descending natively
  return logs.sort((a, b) => b.blockNumber - a.blockNumber);
}

export function useContractLogs() {
  return useQuery({
    queryKey: ['contract-logs', LOAN_CONTRACT_ADDRESS],
    queryFn: fetchContractLogs,
    refetchInterval: 10000, 
  });
}
