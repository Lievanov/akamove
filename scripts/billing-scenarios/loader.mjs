// Resolves the app's "@/..." imports for plain Node, and swaps the
// Supabase admin client for fake-supabase.mjs so scenarios never touch
// the real database.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FAKE_SUPABASE = new URL("./fake-supabase.mjs", import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === "@/lib/supabase/admin") return { url: FAKE_SUPABASE, shortCircuit: true };
  let target = specifier.startsWith("@/") ? pathToFileURL(ROOT + specifier.slice(2)).href : specifier;
  if ((target.startsWith("file:") || target.startsWith(".")) && !/\.(m?js|json)$/.test(target)) {
    const base = target.startsWith(".") ? new URL(target, context.parentURL).href : target;
    if (existsSync(new URL(`${base}.js`))) target = `${base}.js`;
  }
  try {
    return await next(target, context);
  } catch (error) {
    // Packages without an exports map, imported the bundler way
    // ("next/server" → next/server.js).
    if (error.code === "ERR_MODULE_NOT_FOUND" && !/\.(m?js|json)$/.test(target)) {
      return next(`${target}.js`, context);
    }
    throw error;
  }
}

// App files are ESM without "type": "module" — tell Node up front.
export async function load(url, context, next) {
  if (url.startsWith(pathToFileURL(ROOT).href) && url.endsWith(".js") && !url.includes("node_modules")) {
    return next(url, { ...context, format: "module" });
  }
  return next(url, context);
}
