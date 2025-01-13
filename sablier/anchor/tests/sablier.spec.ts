import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {Sablier} from '../target/types/sablier'

describe('sablier', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Sablier as Program<Sablier>

  const sablierKeypair = Keypair.generate()

  it('Initialize Sablier', async () => {
    await program.methods
      .initialize()
      .accounts({
        sablier: sablierKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([sablierKeypair])
      .rpc()

    const currentCount = await program.account.sablier.fetch(sablierKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Sablier', async () => {
    await program.methods.increment().accounts({ sablier: sablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.sablier.fetch(sablierKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Sablier Again', async () => {
    await program.methods.increment().accounts({ sablier: sablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.sablier.fetch(sablierKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Sablier', async () => {
    await program.methods.decrement().accounts({ sablier: sablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.sablier.fetch(sablierKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set sablier value', async () => {
    await program.methods.set(42).accounts({ sablier: sablierKeypair.publicKey }).rpc()

    const currentCount = await program.account.sablier.fetch(sablierKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the sablier account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        sablier: sablierKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.sablier.fetchNullable(sablierKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
