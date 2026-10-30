import { useState, useEffect } from "react"
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ToastProvider } from "./context/ToastContext"
import { RiderProvider } from "./context/RiderContext"
import { useHashRoute } from "./hooks/router"
import { AppShell } from "./components/AppShell"
import { AuthLayout } from "./components/AuthLayout"
import { PageLoader } from "./components/ui"

// App pages
import { AuthPage } from "./pages/AuthPage"
import { OnboardingPage } from "./pages/OnboardingPage"
import { HomePage } from "./pages/HomePage"
import { JobsPage } from "./pages/JobsPage"
import { JobDetailPage } from "./pages/JobDetailPage"
import { EarningsPage } from "./pages/EarningsPage"
import { MessagesPage } from "./pages/MessagesPage"
import { ProfilePage } from "./pages/ProfilePage"
import { NotificationsPage } from "./pages/NotificationsPage"
import { TransactionHistoryPage } from "./pages/TransactionHistoryPage"
import { PerformancePage } from "./pages/PerformancePage"

function AppContent() {
  const { isAuthenticated, isBootstrapping, needsOnboarding } = useAuth()
  const { path, segments, query } = useHashRoute()
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Reset chat open state when navigating away from messages
  useEffect(() => {
    if (segments[0] !== "messages" && path !== "/messages") {
      setIsChatOpen(false)
    }
  }, [segments, path])

  // 1. Initial launching / token check
  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950">
        <PageLoader />
      </div>
    )
  }

  // 2. Unauthenticated -> Show Rider Login / Signup
  if (!isAuthenticated) {
    return (
      <AuthLayout>
        <AuthPage />
      </AuthLayout>
    )
  }

  // 3. Authenticated but incomplete rider details -> Complete Onboarding
  if (needsOnboarding) {
    return (
      <AuthLayout hideCarousel maxWidthClass="max-w-xl">
        <OnboardingPage />
      </AuthLayout>
    )
  }

  // 4. Authenticated main router
  const renderRoute = () => {
    // Single job detail: /jobs/:id
    if (segments[0] === "jobs" && segments[1]) {
      return <JobDetailPage orderId={segments[1]} />
    }

    if (segments[0] === "messages" || path === "/messages") {
      const initialChatId =
        segments[1] ||
        query.get("chat") ||
        (query.get("orderId") ? `order-${query.get("orderId")}` : undefined)
      return (
        <MessagesPage
          initialChatId={initialChatId}
          onChatOpenChange={setIsChatOpen}
        />
      )
    }

    switch (path) {
      case "/":
        return <HomePage />
      case "/onboarding":
        return (
          <AuthLayout hideCarousel maxWidthClass="max-w-xl">
            <OnboardingPage />
          </AuthLayout>
        )
      case "/jobs":
        return <JobsPage />
      case "/earnings":
        return <EarningsPage />
      case "/profile":
        return <ProfilePage />
      case "/notifications":
        return <NotificationsPage />
      case "/transactions":
        return <TransactionHistoryPage />
      case "/performance":
        return <PerformancePage initialTab="performance" />
      case "/reviews":
        return <PerformancePage initialTab="reviews" />
      default:
        return <HomePage />
    }
  }

  const isDetailView =
    (segments[0] === "jobs" && Boolean(segments[1])) ||
    path === "/notifications" ||
    path === "/transactions"

  const hideBottomNav = isDetailView || isChatOpen

  return (
    <AppShell path={path} hideNav={false} hideBottomNav={hideBottomNav}>
      {renderRoute()}
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <RiderProvider>
            <AppContent />
          </RiderProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
