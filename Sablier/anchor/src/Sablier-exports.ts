// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import SablierIDL from '../target/idl/Sablier.json'
import type { Sablier } from '../target/types/Sablier'

// Re-export the generated IDL and type
export { Sablier, SablierIDL }

// The programId is imported from the program IDL.
export const SABLIER_PROGRAM_ID = new PublicKey(SablierIDL.address)

// This is a helper function to get the Sablier Anchor program.
export function getSablierProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...SablierIDL, address: address ? address.toBase58() : SablierIDL.address } as Sablier, provider)
}

// This is a helper function to get the program ID for the Sablier program depending on the cluster.
export function getSablierProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Sablier program on devnet and testnet.
      return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case 'mainnet-beta':
    default:
      return SABLIER_PROGRAM_ID
  }
}
