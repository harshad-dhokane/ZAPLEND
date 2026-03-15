import { RpcProvider, CallData, cairo, shortString } from 'starknet';

// Network configuration from environment
const NETWORK = process.env.NEXT_PUBLIC_STARKZAP_NETWORK || 'sepolia';

const RPC_URLS: Record<string, string> = {
  sepolia: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo',
  mainnet: 'https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_7/demo',
};

// Contract addresses from environment
export const LOAN_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS || '';
export const CREDIT_SCORE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CREDIT_SCORE_CONTRACT_ADDRESS || '';
export const STRK_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS || '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'; // STRK on Sepolia

// Singleton RPC provider
let _provider: RpcProvider | null = null;

export function getProvider(): RpcProvider {
  if (!_provider) {
    _provider = new RpcProvider({
      nodeUrl: process.env.NEXT_PUBLIC_RPC_URL || RPC_URLS[NETWORK] || RPC_URLS.sepolia,
    });
  }
  return _provider;
}

// Call a view function on a contract
export async function callContract(
  contractAddress: string,
  entrypoint: string,
  calldata: string[] = [],
): Promise<string[]> {
  const provider = getProvider();
  const result = await provider.callContract({
    contractAddress,
    entrypoint,
    calldata,
  });
  return result;
}

// Format u256 from two felts (low, high) to bigint
export function u256ToBigInt(low: string, high: string): bigint {
  return BigInt(low) + (BigInt(high) << 128n);
}

// Format bigint to human-readable STRK amount (18 decimals)
export function formatStrk(amount: bigint): string {
  const whole = amount / 10n ** 18n;
  const fraction = amount % 10n ** 18n;
  const fractionStr = fraction.toString().padStart(18, '0').slice(0, 2);
  if (fractionStr === '00') return whole.toString();
  return `${whole}.${fractionStr}`;
}

// Parse human-readable STRK amount to bigint wei
export function parseStrk(amount: string): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0');
  let fraction = 0n;
  if (parts[1]) {
    const padded = parts[1].padEnd(18, '0').slice(0, 18);
    fraction = BigInt(padded);
  }
  return whole * 10n ** 18n + fraction;
}

// Check if contracts are configured
export function isContractConfigured(): boolean {
  return LOAN_CONTRACT_ADDRESS.length > 2 && LOAN_CONTRACT_ADDRESS !== '0x';
}
