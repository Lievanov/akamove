import { test as setup } from "@playwright/test";
import { USERS, LOGIN_ROLES, authFile } from "./fixtures.mjs";
import { login } from "./helpers.mjs";

// Signs in once per role and saves the session (Supabase keeps it in
// localStorage), so specs start already logged in:
//   test.use({ storageState: authFile("proAdmin") });
for (const key of LOGIN_ROLES) {
  setup(`log in as ${key}`, async ({ page }) => {
    await login(page, USERS[key].email);
    await page.waitForLoadState("networkidle");
    await page.context().storageState({ path: authFile(key) });
  });
}
