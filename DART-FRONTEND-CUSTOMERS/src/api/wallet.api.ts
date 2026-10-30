import { apiClient } from "./client"
import { LedgerTransaction, WalletAccount } from "../types/api.types"

export interface DepositDto {
  amount: number
  paymentMethod?: string
  reference?: string
}

export interface WithdrawDto {
  amount: number
  bankCode: string
  bankName?: string
  accountNumber: string
  accountName: string
}

/**
 * Wallet & Ledger API Service
 * Interacts with the authoritative double-entry ledger.
 */
export const walletApi = {
  /**
   * Get user's wallet account and balances
   */
  getWallet: async (): Promise<WalletAccount> => {
    return apiClient.get<WalletAccount>("wallet")
  },

  /**
   * Deposit funds into wallet
   */
  deposit: async (payload: DepositDto): Promise<{
    success: boolean
    transaction: any
  }> => {
    return apiClient.post<{ success: boolean; transaction: any }>(
      "wallet/deposit",
      payload,
    )
  },

  /**
   * Withdraw funds from wallet
   */
  withdraw: async (payload: WithdrawDto): Promise<{
    success: boolean
    transaction: any
  }> => {
    return apiClient.post<{ success: boolean; transaction: any }>(
      "wallet/withdraw",
      payload,
    )
  },

  /**
   * Get ledger transaction history
   */
  getTransactions: async (): Promise<LedgerTransaction[]> => {
    return apiClient.get<LedgerTransaction[]>("wallet/transactions")
  },
}
