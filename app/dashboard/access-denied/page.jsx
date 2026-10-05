"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { buttonVariants } from "@/app/components/ui/Button";

function AccessDenied() {
  return (
    <>
      <PageHeader title="Access restricted" />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <EmptyState
          icon={Lock}
          title="This page is for studio admins"
          description="Your role doesn't include access to this section. If you need it, ask a studio admin to change your role in Settings → Team."
          action={
            <Link href="/dashboard" className={buttonVariants()}>
              Back to dashboard
            </Link>
          }
        />
      </div>
    </>
  );
}

export default AccessDenied;
