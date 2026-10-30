import { apiClient } from "./client"
import {
  Address,
  CompleteProfilePayload,
  CreateAddressPayload,
  OnboardingPayload,
  OnboardingResponse,
  SubmitNinPayload,
  SubmitNinResponse,
  UpdateUserPayload,
  User,
  VerificationStatusResponse,
} from "../types/api.types"

const MAX_SAVED_ADDRESSES = 5


/**
 * User & Addresses API Service
 * Handles user profile details, onboarding profile completion, and saved delivery addresses.
 */
export const userApi = {
  /**
   * Get authenticated user profile
   */
  getProfile: async (): Promise<User> => {
    return apiClient.get<User>("users/me")
  },

  /**
   * Dedicated Onboarding Profile Endpoint
   * Saves profile picture, names, and gender, with optional immediate verification.
   */
  saveOnboarding: async (payload: OnboardingPayload): Promise<OnboardingResponse> => {
    return apiClient.post<OnboardingResponse>("users/me/onboarding", payload)
  },

  /**
   * Update profile details (first name, last name, phone, avatar)
   */
  updateProfile: async (payload: UpdateUserPayload): Promise<User> => {
    return apiClient.patch<User>("users/me", payload)
  },

  /**
   * Complete user profile (first name, last name, phone) to unlock booking and sending packages
   */
  completeProfile: async (payload: CompleteProfilePayload): Promise<User> => {
    return apiClient.patch<User>("users/me/complete-profile", payload)
  },

  /**
   * List user's saved addresses
   */
  getAddresses: async (): Promise<Address[]> => {
    return apiClient.get<Address[]>("users/addresses")
  },

  /**
   * Save a new address, enforcing the customer address-book limit.
   */
  createAddress: async (payload: CreateAddressPayload): Promise<Address> => {
    const savedAddresses = await userApi.getAddresses()
    if (savedAddresses.length >= MAX_SAVED_ADDRESSES) {
      throw new Error(`You can save up to ${MAX_SAVED_ADDRESSES} addresses.`)
    }
    return apiClient.post<Address>("users/addresses", payload)
  },

  /**
   * Delete a saved address by ID
   */
  deleteAddress: async (addressId: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(
      `users/addresses/${addressId}`,
    )
  },

  /**
   * Get customer account verification summary (progress %, phone, email, NIN KYC status)
   */
  getVerificationStatus: async (): Promise<VerificationStatusResponse> => {
    return apiClient.get<VerificationStatusResponse>("users/me/verification")
  },

  /**
   * Submit 11-digit NIN and front ID photo for account verification
   */
  submitNin: async (payload: SubmitNinPayload): Promise<SubmitNinResponse> => {
    return apiClient.post<SubmitNinResponse>("users/kyc/nin", payload)
  },

  /**
   * Verify authenticated user's email address
   */
  verifyEmail: async (payload: { email: string; code?: string }): Promise<VerificationStatusResponse> => {
    return apiClient.post<VerificationStatusResponse>("users/verification/email", payload)
  },

  /**
   * Verify authenticated user's phone number
   */
  verifyPhone: async (payload: { phoneNumber: string; code?: string }): Promise<VerificationStatusResponse> => {
    return apiClient.post<VerificationStatusResponse>("users/verification/phone", payload)
  },
}
