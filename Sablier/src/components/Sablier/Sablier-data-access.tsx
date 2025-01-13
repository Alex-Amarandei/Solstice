'use client'

import { getSablierProgram, getSablierProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

export function useSablierProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getSablierProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getSablierProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['Sablier', 'all', { cluster }],
    queryFn: () => program.account.Sablier.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['Sablier', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ Sablier: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useSablierProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useSablierProgram()

  const accountQuery = useQuery({
    queryKey: ['Sablier', 'fetch', { cluster, account }],
    queryFn: () => program.account.Sablier.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['Sablier', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ Sablier: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['Sablier', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ Sablier: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['Sablier', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ Sablier: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['Sablier', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ Sablier: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
