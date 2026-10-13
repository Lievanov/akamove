"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import supabase, { getUser } from "@/lib/supabase/client";
import TextInput from "@/app/components/ui/TextInput";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Alert";
import LoadingScreen from "@/app/components/LoadingScreen";
import { AuthLayout, GoogleIcon, OrDivider } from "@/app/components/auth/AuthLayout";
import { useGoogleSignIn } from "@/app/components/landing/useGoogleSignIn";

const MIN_PASSWORD_LENGTH = 8;

const COPY = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to your studio.",
    submit: "Sign in",
    submitting: "Signing in…",
  },
  signup: {
    title: "Create your account",
    subtitle: "Start running your studio from one place.",
    submit: "Create account",
    submitting: "Creating account…",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "We'll email you a link to choose a new one.",
    submit: "Send reset link",
    submitting: "Sending…",
  },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signInWithGoogle = useGoogleSignIn();

  const [mode, setMode] = useState(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState(null);
  // After sign-up / reset request: "check your email" for this address.
  const [sentTo, setSentTo] = useState(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);
  const [resendState, setResendState] = useState("idle");

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { full_name: "", email: "", password: "" },
  });

  // Already signed in — nothing to do here.
  useEffect(() => {
    let isActive = true;
    getUser().then((user) => {
      if (!isActive) return;
      if (user?.id) router.replace("/dashboard");
      else setCheckingSession(false);
    });
    return () => {
      isActive = false;
    };
  }, [router]);

  const switchMode = (next) => {
    reset({ ...getValues(), password: "" });
    setError(null);
    setSentTo(null);
    setUnconfirmedEmail(null);
    setResendState("idle");
    setMode(next);
  };

  const onSubmit = async ({ full_name, email, password }) => {
    setError(null);
    setUnconfirmedEmail(null);
    const origin = window.location.origin;
    email = email.trim();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.code === "email_not_confirmed") {
          setUnconfirmedEmail(email);
          setError("Confirm your email before signing in — check your inbox for the link.");
        } else if (error.code === "invalid_credentials") {
          setError("That email and password don't match. If you signed up with Google, use “Continue with Google”.");
        } else {
          setError(error.message);
        }
        return;
      }
      // dashboard/layout.jsx routes onward (onboarding, student bounce).
      router.replace("/dashboard");
      return;
    }

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // The confirmation link lands on the home page, which picks up
          // the session and sends them to /dashboard (→ onboarding).
          emailRedirectTo: `${origin}/`,
          data: { full_name: full_name.trim() },
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      // With email confirmation on, Supabase answers a sign-up for an
      // existing address with a user that has no identities.
      if (data.user && data.user.identities?.length === 0) {
        setError("An account with this email already exists. Sign in instead, or use “Continue with Google” if that's how you joined.");
        return;
      }
      // Email confirmation turned off in Supabase: signed in already.
      if (data.session) {
        router.replace("/dashboard");
        return;
      }
      setSentTo(email);
      return;
    }

    // forgot
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSentTo(email);
  };

  const resendConfirmation = async () => {
    setResendState("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: unconfirmedEmail ?? sentTo,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResendState(error ? "error" : "sent");
  };

  if (checkingSession) return <LoadingScreen />;

  const copy = COPY[mode];

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={
          mode === "signup"
            ? `We sent a confirmation link to ${sentTo}. Open it to finish creating your account.`
            : `If an account exists for ${sentTo}, a password reset link is on its way.`
        }
        footer={
          <button type="button" className="font-medium text-brand-pink-deep hover:underline" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        }
      >
        {mode === "signup" && (
          <ResendLink state={resendState} onResend={resendConfirmation} />
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button type="button" className="font-medium text-brand-pink-deep hover:underline" onClick={() => switchMode("signin")}>
              Sign in
            </button>
          </>
        ) : mode === "signin" ? (
          <>
            New to aka Move?{" "}
            <button type="button" className="font-medium text-brand-pink-deep hover:underline" onClick={() => switchMode("signup")}>
              Create an account
            </button>
          </>
        ) : (
          <button type="button" className="font-medium text-brand-pink-deep hover:underline" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        )
      }
    >
      {mode !== "forgot" && (
        <>
          <Button variant="outline" className="w-full" onClick={() => signInWithGoogle()}>
            <GoogleIcon />
            Continue with Google
          </Button>
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {mode === "signup" && (
          <TextInput
            property="full_name"
            label="Your name"
            control={control}
            errors={errors}
            required="Enter your name"
          />
        )}
        <TextInput
          property="email"
          label="Email"
          type="email"
          control={control}
          errors={errors}
          required="Enter your email"
        />
        {mode !== "forgot" && (
          <div>
            <TextInput
              property="password"
              label="Password"
              type="password"
              control={control}
              errors={errors}
              required="Enter your password"
              rules={
                mode === "signup"
                  ? {
                      minLength: {
                        value: MIN_PASSWORD_LENGTH,
                        message: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
                      },
                    }
                  : undefined
              }
            />
            {mode === "signin" && (
              <div className="mt-1 text-right">
                <button
                  type="button"
                  className="text-sm text-brand-dark/60 hover:text-brand-dark hover:underline"
                  onClick={() => switchMode("forgot")}
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {unconfirmedEmail && (
          <ResendLink state={resendState} onResend={resendConfirmation} />
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>
      </form>

    </AuthLayout>
  );
}

function ResendLink({ state, onResend }) {
  if (state === "sent") {
    return <p className="text-sm text-success">Sent — check your inbox (and spam folder).</p>;
  }
  return (
    <p className="text-sm text-brand-dark/70">
      Didn&apos;t get it?{" "}
      <button
        type="button"
        className="font-medium text-brand-pink-deep hover:underline disabled:opacity-50"
        disabled={state === "sending"}
        onClick={onResend}
      >
        {state === "sending" ? "Sending…" : "Resend confirmation email"}
      </button>
      {state === "error" && <span className="text-danger"> Couldn&apos;t send — try again in a minute.</span>}
    </p>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for the static build.
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginForm />
    </Suspense>
  );
}
