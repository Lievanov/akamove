"use client";

import { useState } from "react";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Alert } from "@/app/components/ui/Alert";

function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit request");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold text-brand-dark">Delete Your Account</h1>
      <p className="mt-2 text-sm text-brand-dark/60">
        Use this form to request deletion of your aka Move account. You
        can also delete your account directly in the aka Move mobile app under
        Profile → Delete Account.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-brand-dark">What gets deleted</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-dark">
        <li>Your login account and credentials</li>
        <li>Your profile information</li>
        <li>Your push notification token</li>
      </ul>
      <p className="mt-4 text-sm text-brand-dark/60">
        Payment and enrollment records are retained where required for
        bookkeeping and legal purposes. Deletion requests are processed within
        30 days.
      </p>

      {submitted ? (
        <div className="mt-6">
          <Alert severity="success">
            Your deletion request has been received. Your account will be deleted
            within 30 days.
          </Alert>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-brand-dark/10 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">
              Account email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark">
              Reason (optional)
            </label>
            <Input
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && <Alert severity="error">{error}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Request Account Deletion"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default DeleteAccountPage;
