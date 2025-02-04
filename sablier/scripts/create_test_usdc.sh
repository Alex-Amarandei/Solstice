#!/usr/bin/env bash

# solana-keygen grind --starts-with mnt:1
# This resulted in mntwikCmYs2USRwa9TtAqeJR1r9rc3mvaQbmbQmsFo7.json

spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --enable-metadata mntPMTbkKfo4ht5ccjsxqAXKapEqu84on5mxsJCwfdf.json

spl-token initialize-metadata mntPMTbkKfo4ht5ccjsxqAXKapEqu84on5mxsJCwfdf "Test USDC" "USDC" "https://raw.githubusercontent.com/Alex-Amarandei/Solstice/refs/heads/main/sablier/scripts/test_usdc.json"

spl-token create-account mntPMTbkKfo4ht5ccjsxqAXKapEqu84on5mxsJCwfdf

spl-token mint mntPMTbkKfo4ht5ccjsxqAXKapEqu84on5mxsJCwfdf 1000000