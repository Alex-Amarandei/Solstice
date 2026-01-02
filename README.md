# Solstice

Designed and implemented a proof-of-concept streaming payments protocol on Solana, inspired by Sablier’s continuous money streams. The project explores how real-time, programmable payment streams can be modeled as on-chain accounts, enabling continuous accrual, partial withdrawals, cancelation logic, and stream ownership transfer.

Built Solana programs in Rust, modeling stream state, time-based accrual logic, and permissioned actions (withdraw, cancel, transfer), with a strong focus on account design, data layout, and execution constraints. Developed a TypeScript client layer for interacting with the program, handling instruction construction, serialization, and transaction orchestration.

Implemented automated tests to validate stream lifecycle behavior (creation, accrual over time, withdrawals, and edge cases), ensuring correctness under different timestamps and state transitions. The project emphasizes clean program architecture, explicit state modeling, and reproducible local testing using Solana tooling.

This POC demonstrates hands-on experience with Solana’s runtime model, Rust smart contract development, TypeScript client tooling, and end-to-end testing of on-chain financial logic, while exploring the design trade-offs involved in adapting Ethereum-native DeFi primitives to Solana’s account-based architecture.

- [Sablier on Solana POC Demo](https://www.loom.com/share/fe13ded79bb54eebbe69b5ded14b8687?sid=938cccea-378f-4105-adc2-2e993dd93ad4)

- [Design Docs](https://mousy-patient-896.notion.site/Sablier-on-Solana-80887bfc359542a0ada908fae6edc537)
