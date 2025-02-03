#!/usr/bin/env bash
set -e

solana config set --url localhost

solana airdrop 10

TOKEN_MINT=$(spl-token create-token --decimals 9 \
                                    --symbol USDC \
                                    --name "Test USDC")

echo "Created token mint: $TOKEN_MINT"

spl-token mint $TOKEN_MINT 10000000 7aPQWrJu4Qg9zAQVbNFkaZAkQupmChirCmQqEwF4dAad

echo "Airdropped 10,000,000 tokens to 7aPQWrJu4Qg9zAQVbNFkaZAkQupmChirCmQqEwF4dAad"
echo "Done!"
