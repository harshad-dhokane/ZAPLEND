import { RpcProvider, hash } from 'starknet';

async function main() {
  const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo' });
  const contractAddress = '0x04d9043def8f91491a91337fe81695c5692cc98403818b6d0029ad7105cb66f5'; 

  try {
    const latest = await provider.getBlock('latest');
    console.log("Latest block:", latest.block_number);
    
    // Attempt from block 0
    let res = await provider.getEvents({
      address: contractAddress,
      chunk_size: 1000,
      from_block: { block_number: 0 },
      to_block: { block_number: latest.block_number }
    });
    console.log("From 0 to latest events:", res.events.length);
    
    // Attempt from 7600000
    res = await provider.getEvents({
      address: contractAddress,
      chunk_size: 1000,
      from_block: { block_number: 7600000 },
      to_block: { block_number: latest.block_number }
    });
    console.log("From 7600000 to latest events:", res.events.length);

  } catch (error) {
    console.error("Error:", error);
  }
}

main();
