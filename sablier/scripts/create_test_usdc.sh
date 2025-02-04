#!/usr/bin/env bash

# solana-keygen grind --starts-with mnt:1
# This resulted in mntwikCmYs2USRwa9TtAqeJR1r9rc3mvaQbmbQmsFo7.json

spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --enable-metadata mntwikCmYs2USRwa9TtAqeJR1r9rc3mvaQbmbQmsFo7.json

spl-token initialize-metadata mntwikCmYs2USRwa9TtAqeJR1r9rc3mvaQbmbQmsFo7 "Test USDC" "USDC" ""