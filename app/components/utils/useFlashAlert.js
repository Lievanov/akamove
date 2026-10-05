"use client";
import { useEffect, useState } from "react";

// Pages pass a one-off message to the next page as ?text=…&severity=…
// (e.g. "Student created"). Read it once, then drop it from the URL so a
// reload or Back doesn't show it again.
export function useFlashAlert() {
  const [alert, setAlert] = useState({ text: "", severity: "" });

  useEffect(() => {
    const url = new URL(window.location.href);
    const text = url.searchParams.get("text");
    const severity = url.searchParams.get("severity");
    if (!text || !severity) return;
    setAlert({ text, severity });
    url.searchParams.delete("text");
    url.searchParams.delete("severity");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, []);

  return [alert, setAlert];
}
