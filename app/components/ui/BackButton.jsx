"use client";
import { useRouter } from "next/navigation";
import { Button } from "./Button";

function BackButton({ routeTo, className }) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(routeTo || "/dashboard/students");
    }
  };

  return (
    <Button variant="outline" onClick={handleBack} className={className}>
      Cancel
    </Button>
  );
}

export { BackButton };
