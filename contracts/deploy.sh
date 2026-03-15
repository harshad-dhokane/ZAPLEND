#!/bin/bash
# ZapLend Contract Deployment Script
# Deploys the LoanContract to Starknet Sepolia testnet

set -e

export PATH="$HOME/.local/bin:$HOME/.starkli/bin:$PATH"

# Configuration
NETWORK="sepolia"
RPC_URL="https://starknet-sepolia.public.blastapi.io/rpc/v0_7"

# STRK token address on Sepolia (constructor arg)
STRK_TOKEN="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"

# Contract artifacts
SIERRA_FILE="./target/dev/zaplend_LoanContract.contract_class.json"
CASM_FILE="./target/dev/zaplend_LoanContract.compiled_contract_class.json"

echo "================================"
echo " ZapLend Contract Deployment"
echo "================================"
echo ""

# Check prerequisites
if ! command -v starkli &> /dev/null; then
    echo "❌ starkli not found. Run: starkliup"
    exit 1
fi

if [ ! -f "$SIERRA_FILE" ]; then
    echo "❌ Sierra file not found. Run: scarb build"
    exit 1
fi

# Check for keystore and account
KEYSTORE_FILE="${STARKLI_KEYSTORE:-./keystore.json}"
ACCOUNT_FILE="${STARKLI_ACCOUNT:-./account.json}"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  No keystore found at $KEYSTORE_FILE"
    echo ""
    echo "Create one with your private key:"
    echo "  starkli signer keystore from-key $KEYSTORE_FILE"
    echo ""
    echo "Then fetch your account descriptor:"
    echo "  starkli account fetch <YOUR_ADDRESS> --rpc $RPC_URL --output $ACCOUNT_FILE"
    echo ""
    exit 1
fi

if [ ! -f "$ACCOUNT_FILE" ]; then
    echo "⚠️  No account file found at $ACCOUNT_FILE"
    echo ""
    echo "Fetch your account descriptor:"
    echo "  starkli account fetch <YOUR_ADDRESS> --rpc $RPC_URL --output $ACCOUNT_FILE"
    echo ""
    exit 1
fi

echo "📋 Using keystore: $KEYSTORE_FILE"
echo "📋 Using account: $ACCOUNT_FILE"
echo ""

# Step 1: Declare the contract class
echo "📦 Step 1: Declaring contract class..."
CLASS_HASH=$(starkli declare "$SIERRA_FILE" \
    --casm-file "$CASM_FILE" \
    --keystore "$KEYSTORE_FILE" \
    --account "$ACCOUNT_FILE" \
    --rpc "$RPC_URL" \
    2>&1 | grep -oP '0x[0-9a-f]+' | tail -1)

echo "✅ Class hash: $CLASS_HASH"
echo ""

# Step 2: Deploy the contract
echo "🚀 Step 2: Deploying contract instance..."
DEPLOYED_ADDRESS=$(starkli deploy "$CLASS_HASH" \
    "$STRK_TOKEN" \
    --keystore "$KEYSTORE_FILE" \
    --account "$ACCOUNT_FILE" \
    --rpc "$RPC_URL" \
    2>&1 | grep -oP '0x[0-9a-f]+' | tail -1)

echo "✅ Contract deployed at: $DEPLOYED_ADDRESS"
echo ""
echo "================================"
echo " Deployment Complete! "
echo "================================"
echo ""
echo "Contract Address: $DEPLOYED_ADDRESS"
echo ""
echo "Now update your frontend/.env.local:"
echo "  NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS=$DEPLOYED_ADDRESS"
echo ""
echo "View on Voyager:"
echo "  https://sepolia.voyager.online/contract/$DEPLOYED_ADDRESS"
