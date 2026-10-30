import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { ridersApi } from "../api/riders.api"
import { ordersApi } from "../api/orders.api"
import { notificationsApi } from "../api/account.api"
import { useAuth } from "./AuthContext"
import { useToast } from "./ToastContext"
import { STATUS_BUCKET, canAccept, getCurrentPosition } from "../utils/format"
import { playIncomingRequestChime, playSuccessChime } from "../utils/audio"
import type { Order, RiderStatus } from "../types/api.types"

interface RiderContextValue {
  status: RiderStatus
  isOnline: boolean
  togglingStatus: boolean
  setOnline: (online: boolean) => Promise<void>
  orders: Order[]
  ordersLoading: boolean
  reloadOrders: () => Promise<void>
  acceptOrder: (orderId: string) => Promise<void>
  pickupOrder: (orderId: string) => Promise<{ handoverCode?: string } | void>
  confirmDelivery: (orderId: string, code: string) => Promise<void>
  simulateDemoRequest: () => void
  incomingModalOrder: Order | null
  setIncomingModalOrder: (order: Order | null) => void
  unreadCount: number
  reloadUnread: () => Promise<void>
  lastLocation: { lat: number; lng: number; at: number } | null
  locationError: string | null
}

const RiderContext = createContext<RiderContextValue | undefined>(undefined)

const LOCATION_INTERVAL_MS = 20_000
const ORDERS_POLL_MS = 10_000
const UNREAD_POLL_MS = 30_000

export function RiderProvider({ children }: { children: ReactNode }) {
  const { riderProfile, setRiderProfile, isAuthenticated, user } = useAuth()
  const toast = useToast()

  const [status, setStatus] = useState<RiderStatus>(riderProfile?.availability?.status ?? "OFFLINE")
  const [togglingStatus, setToggling] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [unreadCount, setUnread] = useState(0)
  const [lastLocation, setLastLocation] = useState<RiderContextValue["lastLocation"]>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [incomingModalOrder, setIncomingModalOrder] = useState<Order | null>(null)

  const knownRequestIds = useRef<Set<string> | null>(null)
  const lastSentAt = useRef(0)

  // Keep local status in sync with server profile
  useEffect(() => {
    if (riderProfile?.availability?.status) setStatus(riderProfile.availability.status)
  }, [riderProfile?.availability?.status])

  const isOnline = status !== "OFFLINE"

  const setOnline = async (online: boolean) => {
    setToggling(true)
    try {
      const next: RiderStatus = online ? "ONLINE" : "OFFLINE"
      const availability = await ridersApi.setAvailability(next)
      setStatus(availability.status)
      if (riderProfile) setRiderProfile({ ...riderProfile, availability })
      toast(online ? "You're online. Receiving requests!" : "You're offline.", online ? "success" : "info")
    } catch (e: any) {
      toast(e.message, "error")
    } finally {
      setToggling(false)
    }
  }

  // ---- Orders polling + new request modal trigger ----
  const reloadOrders = useCallback(async () => {
    try {
      const list = await ordersApi.list()
      const mine = Array.isArray(list) ? list : []
      setOrders(mine)

      const requestOrders = mine.filter((o) => canAccept(o.status))
      const currentRequestIds = new Set(requestOrders.map((o) => o.id))

      if (knownRequestIds.current) {
        const fresh = requestOrders.filter((o) => !knownRequestIds.current!.has(o.id))
        if (fresh.length > 0) {
          playIncomingRequestChime()
          setIncomingModalOrder(fresh[0])
          toast(`New delivery request from ${fresh[0].customer?.firstName || "Customer"}!`, "success")
        }
      } else if (requestOrders.length > 0 && !incomingModalOrder) {
        // Initial load with pending request
        setIncomingModalOrder(requestOrders[0])
      }
      knownRequestIds.current = currentRequestIds
    } catch {
      /* surfaced on pages */
    } finally {
      setOrdersLoading(false)
    }
  }, [toast, incomingModalOrder])

  const acceptOrder = async (orderId: string) => {
    try {
      // If it's a simulated order
      if (orderId.startsWith("sim-")) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "PICKUP_PENDING",
                }
              : o
          )
        )
        setIncomingModalOrder(null)
        toast("Delivery accepted! Head to the pickup address.", "success")
        return
      }

      await ordersApi.accept(orderId)
      setIncomingModalOrder(null)
      toast("Delivery task accepted! Head to pickup location.", "success")
      await reloadOrders()
    } catch (err: any) {
      toast(err.message || "Failed to accept order", "error")
      throw err
    }
  }

  const pickupOrder = async (orderId: string) => {
    try {
      if (orderId.startsWith("sim-")) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "PICKED_UP",
                  handoverCode: { id: "code-1", isUsed: false, attempts: 0, expiresAt: new Date(Date.now() + 86400000).toISOString() },
                }
              : o
          )
        )
        toast("Package picked up! In transit to destination (Code: 12345)", "success")
        return { handoverCode: "12345" }
      }

      const res = await ordersApi.pickup(orderId)
      toast("Package picked up! In transit to destination.", "success")
      await reloadOrders()
      return res
    } catch (err: any) {
      toast(err.message || "Failed to mark package picked up", "error")
      throw err
    }
  }

  const confirmDelivery = async (orderId: string, code: string) => {
    try {
      if (orderId.startsWith("sim-")) {
        if (code !== "12345" && code !== "83920") {
          throw new Error("Invalid code. Use demo code 12345")
        }
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "SETTLED",
                  settlement: { netAmount: o.riderSettlementFee || 4500, isSettled: true, settledAt: new Date().toISOString() },
                }
              : o
          )
        )
        playSuccessChime()
        toast("Delivery completed! ₦4,500 settled to your wallet.", "success")
        return
      }

      const coords = await getCurrentPosition()
      await ordersApi.confirmDelivery(orderId, {
        code,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      })
      playSuccessChime()
      toast("Delivery verified! Payout credited to your wallet.", "success")
      await reloadOrders()
    } catch (err: any) {
      toast(err.message || "Invalid handover code", "error")
      throw err
    }
  }

  // Quick Demo Simulator: Generates a realistic incoming request to test the full lifecycle
  const simulateDemoRequest = () => {
    const demoId = `sim-${Date.now().toString().slice(-4)}`
    const demoOrder: Order = {
      id: demoId,
      orderNumber: `DART-${Date.now().toString().slice(-5)}`,
      trackingId: `TRK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      customerId: "cust-demo",
      riderId: user?.id || "r1",
      status: "RIDER_ASSIGNED",
      totalPrice: 5000,
      riderSettlementFee: 4500,
      distanceKm: 3.4,
      estimatedMinutes: 14,
      createdAt: new Date().toISOString(),
      package: {
        name: "MacBook Air M2 & Charger",
        category: "ELECTRONICS",
        weightKg: 2.1,
        isFragile: true,
      },
      pickupAddress: {
        street: "18 Admiralty Way, Lekki Phase 1",
        city: "Lagos",
        state: "Lagos State",
        contactName: "Chidi Okonkwo",
        contactPhone: "+2348012345678",
      },
      destinationAddress: {
        street: "25 Isaac John St, GRA",
        city: "Ikeja",
        state: "Lagos State",
        contactName: "Bisi Adeyemi",
        contactPhone: "+2348098765432",
      },
      customer: {
        id: "cust-demo",
        firstName: "Chidi",
        lastName: "Okonkwo",
        phoneNumber: "+2348012345678",
      },
    }

    setOrders((prev) => [demoOrder, ...prev.filter((o) => o.id !== demoId)])
    playIncomingRequestChime()
    setIncomingModalOrder(demoOrder)
    toast("Incoming test delivery dispatched!", "info")
  }

  const reloadUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.list({ unreadOnly: true, limit: 1 })
      setUnread(res?.unreadCount ?? 0)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    reloadOrders()
    reloadUnread()
    const o = setInterval(reloadOrders, ORDERS_POLL_MS)
    const n = setInterval(reloadUnread, UNREAD_POLL_MS)
    return () => {
      clearInterval(o)
      clearInterval(n)
    }
  }, [isAuthenticated, reloadOrders, reloadUnread])

  // ---- GPS beacon while online ----
  const hasActiveJob = orders.some((o) => STATUS_BUCKET[o.status] === "active")
  const shouldBeacon = isAuthenticated && (isOnline || hasActiveJob)

  useEffect(() => {
    if (!shouldBeacon) return
    if (!("geolocation" in navigator)) {
      setLocationError("Location is not supported on this device.")
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        setLocationError(null)
        const { latitude, longitude } = pos.coords
        const now = Date.now()
        setLastLocation({ lat: latitude, lng: longitude, at: now })
        if (now - lastSentAt.current < LOCATION_INTERVAL_MS) return
        lastSentAt.current = now
        try {
          await ridersApi.updateLocation(latitude, longitude)
        } catch {
          /* retry on next tick */
        }
      },
      (err) => setLocationError(err.code === err.PERMISSION_DENIED ? "Location permission denied." : err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [shouldBeacon])

  return (
    <RiderContext.Provider
      value={{
        status,
        isOnline,
        togglingStatus,
        setOnline,
        orders,
        ordersLoading,
        reloadOrders,
        acceptOrder,
        pickupOrder,
        confirmDelivery,
        simulateDemoRequest,
        incomingModalOrder,
        setIncomingModalOrder,
        unreadCount,
        reloadUnread,
        lastLocation,
        locationError,
      }}
    >
      {children}
    </RiderContext.Provider>
  )
}

export function useRider() {
  const ctx = useContext(RiderContext)
  if (!ctx) throw new Error("useRider must be used within RiderProvider")
  return ctx
}
