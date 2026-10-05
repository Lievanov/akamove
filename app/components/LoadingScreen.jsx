import Image from "next/image";

// Full-page branded loader for route handoffs (OAuth return → dashboard
// → onboarding), so the user sees one steady screen instead of each
// page flashing by. For in-page loading, use Loading.jsx.
function LoadingScreen({ label = "Getting things ready…" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-brand-pink/15 border-t-brand-pink motion-reduce:animate-none" />
        <Image src="/images/am_logo.png" width={40} height={40} alt="" priority />
      </div>
      <p className="text-sm text-brand-dark/60">{label}</p>
    </div>
  );
}

export default LoadingScreen;
