#!/usr/bin/env bash

solana config set --url devnet

solana airdrop 5

# anchor build --provider.cluster devnet
# anchor deploy --provider.cluster devnet