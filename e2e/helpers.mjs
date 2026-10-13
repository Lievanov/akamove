import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PASSWORD } from "./fixtures.mjs";

const SUPABASE_URL = "http://127.0.0.1:54321";
const MAILPIT_URL = "http://127.0.0.1:54324";

// Signs in through the real /login form and waits for the dashboard.
export async function login(page, email, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard|\/onboarding/);
}

// A supabase-js client signed in as a seeded user — for RLS checks that
// don't need a browser.
export async function clientAs(email, password = PASSWORD) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(SUPABASE_URL, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return client;
}

// A unique fake address per test run, so sign-up tests don't collide.
export const uniqueEmail = (prefix) =>
  `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@akamove.test`;

// Waits for the newest email to `to` in Mailpit and returns the first
// link in it (confirmation / password reset).
export async function latestEmailLink(to, { timeout = 15_000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages = [] } = await res.json();
    if (messages.length) {
      const msg = await (await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)).json();
      const link = msg.HTML?.match(/href="([^"]+)"/)?.[1] ?? msg.Text?.match(/https?:\/\/\S+/)?.[0];
      if (link) return link.replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to} within ${timeout}ms`);
}
