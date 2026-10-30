import React, { useState, useEffect } from "react"
import { useTheme } from "../context/ThemeContext"
import { Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react"
import carousel1 from "../assets/dart_carousel_1.jpg"
import carousel2 from "../assets/dart_carousel_2.jpg"
import carousel3 from "../assets/dart_carousel_3.jpg"
import carousel4 from "../assets/dart_carousel_4.png"
import DartLogo from "./DartLogo"

interface AuthLayoutProps {
  children: React.ReactNode
  hideTopBar?: boolean
  hideCarousel?: boolean
  maxWidthClass?: string
}

const SLIDES = [
  {
    image: carousel1,
    objectPosition: "70% center",
    title: "Delivering everything anywhere",
    description:
      "We connect you to trusted rider for fast, safe reliable deliveries.",
  },
  {
    image: carousel2,
    objectPosition: "28% center",
    title: "Track every step",
    description: "Real-time update keeps you informed from pick-up to delivery",
  },
  {
    image: carousel3,
    objectPosition: "center center",
    title: "Choose trusted riders",
    description: "Pick from top rated riders near you and book in seconds.",
  },
  {
    image: carousel4,
    objectPosition: "52% center",
    title: "Delivered with care",
    description: "Your package, your priority. safe, secure and on time",
  },
]

export default function AuthLayout({
  children,
  hideTopBar = false,
  hideCarousel = false,
  maxWidthClass = "max-w-md",
}: AuthLayoutProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const [currentSlide, setCurrentSlide] = useState(0)

  // Auto advance carousel every 5 seconds (only when carousel is visible)
  useEffect(() => {
    if (hideCarousel) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [hideCarousel])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)

  const activeSlide = SLIDES[currentSlide]

  if (hideCarousel) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] text-gray-900 dark:text-white transition-colors overflow-hidden relative">
        {/* Fixed Top Header Bar with Logo and Theme Switcher (Desktop and Mobile) */}
        {!hideTopBar && (
          <header className="fixed top-0 left-0 right-0 z-50 h-16 w-full flex items-center justify-between px-5 sm:px-8 border-b border-gray-100 dark:border-white/5 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2.5">
              <DartLogo variant="auto" className="h-10 sm:h-11 w-auto" />
              <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider text-yellow-600 dark:text-yellow-400 font-bold bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
                Logistics
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors border border-transparent dark:border-white/5 cursor-pointer touch-manipulation ml-auto"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </header>
        )}

        {/* Centralized Onboarding Content Area on Desktop - Only this scrolls */}
        <main
          className={`flex-1 w-full overflow-y-auto overflow-x-hidden flex items-center justify-center px-4 sm:px-6 md:px-8 ${
            !hideTopBar ? "pt-20 pb-8 sm:py-12" : "py-6 sm:py-10"
          }`}
        >
          <div className={`w-full ${maxWidthClass} mx-auto flex flex-col my-auto animate-in fade-in duration-200`}>
            {children}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col xl:flex-row bg-[#fcfcfc] dark:bg-[#0c0c0e] text-gray-900 dark:text-white transition-colors overflow-hidden">
      {/* Left Column: Visual Carousel Panel (Desktop only - hidden on mobile and tablet) */}
      <div className="hidden xl:flex xl:w-1/2 2xl:w-[52%] relative overflow-hidden bg-gray-950 flex-col justify-between p-8 lg:p-12 shrink-0 select-none">
        {/* Background Carousel Images with Smooth Cross-fade */}
        {SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${
              currentSlide === index
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover scale-105 filter brightness-90 contrast-105"
              style={{ objectPosition: slide.objectPosition }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          </div>
        ))}

        {/* Top Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DartLogo variant="light" className="h-12 lg:h-14 w-auto" />
            <span className="text-[10px] uppercase tracking-wider text-yellow-400 font-semibold bg-yellow-400/10 px-2.5 py-0.5 rounded-full border border-yellow-400/20">
              Logistics
            </span>
          </div>
        </div>

        {/* Bottom Carousel Content & Indicators matching reference */}
        <div className="relative z-10 pt-6 border-t border-white/10">
          {/* Segmented Pill Indicator matching Screenshot */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? "w-8 bg-yellow-400 shadow-sm"
                      : "w-3 bg-white/30 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>

            {/* Subtle Carousel Arrow Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevSlide}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                title="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                title="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dynamic Slide Title & Subtitle */}
          <div className="min-h-[90px]">
            <h2 className="text-2xl lg:text-3xl font-bold text-white leading-snug mb-2 transition-all duration-500">
              {activeSlide.title}
            </h2>
            <p className="text-white/75 text-sm leading-relaxed max-w-md transition-all duration-500">
              {activeSlide.description}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Form Area (Full screen on mobile and tablet) */}
      <div className="flex-1 flex flex-col min-h-[100dvh] xl:min-h-screen overflow-y-auto relative">
        {/* Top Bar with Logo (Mobile & Tablet) & Theme Switcher */}
        {!hideTopBar && (
          <div className="w-full flex items-center justify-between px-5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 shrink-0">
            {/* Logo for Mobile and Tablet */}
            <div className="flex xl:hidden items-center">
              <DartLogo variant="auto" className="h-11 sm:h-12 w-auto" />
            </div>

            <div className="hidden xl:block"></div>

            {/* Quick Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${
                resolvedTheme === "dark" ? "light" : "dark"
              } mode`}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors border border-transparent dark:border-white/5 cursor-pointer touch-manipulation"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>
          </div>
        )}

        {/* Centered Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-4 sm:py-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
