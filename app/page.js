"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/supabase/client";
import { getProfileRole } from "@/api/profiles/profiles";
import NavBar from "./components/NavBar";
import LoadingScreen from "./components/LoadingScreen";
import { HeroLobe } from "./components/landing/HeroLobe";
import { FeatureLobe } from "./components/landing/FeatureLobe";
import { PricingLobe } from "./components/landing/PricingLobe";
import { ClosingLobe } from "./components/landing/ClosingLobe";
import { useGoogleSignIn } from "./components/landing/useGoogleSignIn";
import { frontDesk, floor, office, greenRoom } from "./components/landing/sectionsData";

// useLayoutEffect warns during SSR; this runs it only in the browser.
const useBrowserLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function Home() {
  const router = useRouter();
  const signInWithGoogle = useGoogleSignIn();
  // Coming back from Google, the URL carries the session (#access_token
  // or ?code=). Show the loading screen instead of flashing the whole
  // marketing page before the redirect to /dashboard. Layout effect so
  // it swaps in before the first paint.
  const [returningFromOAuth, setReturningFromOAuth] = useState(false);

  useBrowserLayoutEffect(() => {
    const { hash, search } = window.location;
    if (hash.includes("access_token") || new URLSearchParams(search).has("code")) {
      setReturningFromOAuth(true);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    // Google OAuth redirects back here (see useGoogleSignIn's
    // redirectTo). Someone already signed in — whether just now or from
    // an earlier visit — belongs in the app, not back on the marketing
    // page. /dashboard's own layout handles routing them onward from
    // there (into onboarding if they have no tenant yet).
    getUser().then(async (user) => {
      if (!isActive) return;
      if (!user?.id) {
        // Sign-in failed or was cancelled — fall back to the landing page.
        setReturningFromOAuth(false);
        return;
      }
      // Students are mobile-app-only and dashboard/layout.jsx bounces
      // them straight back here — don't loop them back into it.
      const role = await getProfileRole(user.id);
      if (!isActive) return;
      if (role !== "student") router.replace("/dashboard");
      else setReturningFromOAuth(false);
    });
    return () => {
      isActive = false;
    };
  }, [router]);

  if (returningFromOAuth) return <LoadingScreen />;

  return (
    <>
      <NavBar />
      <main>
        <HeroLobe />
        <FeatureLobe area={frontDesk} divider={{ shape: "b", nextColor: "cream", parallaxSpeed: "med" }} />
        <FeatureLobe area={floor} divider={{ shape: "c", nextColor: "white", parallaxSpeed: "slow" }} />
        <FeatureLobe area={office} divider={{ shape: "d", nextColor: "pink", parallaxSpeed: "med" }} />
        <FeatureLobe area={greenRoom} divider={{ shape: "e", nextColor: "cream", parallaxSpeed: "slow" }} />
        <PricingLobe onStartFree={signInWithGoogle} divider={{ shape: "f", nextColor: "pink", parallaxSpeed: "med" }} />
        <ClosingLobe onStartFree={signInWithGoogle} />
      </main>
    </>
  );
}

export default Home;
