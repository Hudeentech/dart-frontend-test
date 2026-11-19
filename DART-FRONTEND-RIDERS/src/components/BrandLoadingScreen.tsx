import DartLogo from "./DartLogo"

export function BrandLoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-ink-950 px-6 text-white"
    >
      <div className="relative flex size-28 items-center justify-center">
        <div className="absolute inset-2 rounded-full border border-brand/15 animate-ping motion-reduce:animate-none" />
        <div className="absolute inset-0 rounded-full border-2 border-brand/15 border-t-brand animate-spin motion-reduce:animate-none" />
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand/10 shadow-[0_0_48px_rgba(255,204,0,0.18)]">
          <DartLogo
            variant="light"
            iconOnly
            className="size-10"
            aria-hidden="true"
          />
        </div>
      </div>
      <p className="mt-7 text-sm font-semibold tracking-wide text-white">
        Preparing your rider workspace
      </p>
      <p className="mt-2 text-xs text-white/45">
        Getting your next delivery journey ready
      </p>
      <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-brand animate-pulse" />
        <span className="size-1.5 rounded-full bg-brand/70 animate-pulse [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-brand/40 animate-pulse [animation-delay:300ms]" />
      </div>
      <span className="sr-only">Securing Dart Session...</span>
    </div>
  )
}
