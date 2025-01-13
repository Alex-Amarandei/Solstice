import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {Sablier} from '../target/types/Sablier'

describe('Sablier', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Sablier as Program<Sablier>

  const SablierKeypair = Keypair.generate()

  it('Initialize Sablier', async () => {
    await program.methods
      .initialize()
      .accounts({
        Sablier: SablierKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([SablierKeypair])
      .rpc()

    const currentCount = await program.account.Sablier.fetch(SablierKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Sablier', async () => {
    await program.methods.increment().accounts({ Sablier: SablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.Sablier.fetch(SablierKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Sablier Again', async () => {
    await program.methods.increment().accounts({ Sablier: SablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.Sablier.fetch(SablierKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Sablier', async () => {
    await program.methods.decrement().accounts({ Sablier: SablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.Sablier.fetch(SablierKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set Sablier value', async () => {
    await program.methods.set(42).accounts({ Sablier: SablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.Sablier.fetch(SablierKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the Sablier account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        Sablier: SablierKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.Sablier.fetchNullable(SablierKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
