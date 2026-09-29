"use client";
import supabase from "@/lib/supabase/client";

export function useGoogleSignIn() {
  return async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
  };
}
