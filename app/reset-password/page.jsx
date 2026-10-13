"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import supabase from "@/lib/supabase/client";
import TextInput from "@/app/components/ui/TextInput";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Alert";
import LoadingScreen from "@/app/components/LoadingScreen";
import { AuthLayout } from "@/app/components/auth/AuthLayout";

const MIN_PASSWORD_LENGTH = 8;

// Landing page for the "reset your password" email. The link carries a
// recovery session in the URL (#access_token…&type=recovery), which the
// Supabase client picks up on load; with it, updateUser can set the new
// password.
function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState("checking"); // checking | ready | invalid
  const [error, setError] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { password: "", confirm: "" } });

  useEffect(() => {
    let isActive = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) return;
      if (event === "PASSWORD_RECOVERY" || session) setStatus("ready");
    });

    // The URL session may already have been consumed before the listener
    // attached, and an expired/used link leaves an error in the hash.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isActive) return;
      if (session) setStatus("ready");
      else if (window.location.hash.includes("error")) setStatus("invalid");
      else setTimeout(() => isActive && setStatus((s) => (s === "checking" ? "invalid" : s)), 1500);
    });

    return () => {
      isActive = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const onSubmit = async ({ password }) => {
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(
        error.code === "same_password"
          ? "Choose a password different from your current one."
          : error.message
      );
      return;
    }
    router.replace("/dashboard");
  };

  if (status === "checking") return <LoadingScreen />;

  if (status === "invalid") {
    return (
      <AuthLayout
        title="This link has expired"
        subtitle="Reset links work once and expire after an hour. Request a new one from the sign-in page."
      >
        <Button className="w-full" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <TextInput
          property="password"
          label="New password"
          type="password"
          control={control}
          errors={errors}
          required="Enter a new password"
          rules={{
            minLength: {
              value: MIN_PASSWORD_LENGTH,
              message: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
            },
          }}
        />
        <TextInput
          property="confirm"
          label="Confirm new password"
          type="password"
          control={control}
          errors={errors}
          required="Re-enter the new password"
          rules={{
            validate: (value) => value === watch("password") || "Passwords don't match",
          }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save password"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
