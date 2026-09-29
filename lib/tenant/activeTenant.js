// Plain-JS accessor for the currently active tenant, read by api/*.js
// modules that can't call the useActiveTenant() React hook directly.
// Written by TenantContext.setActiveTenant (app/context/TenantContext.jsx),
// which keeps this localStorage key in sync with its own state — same
// dual-write pattern LocationContext already uses for "selectedLocation".
export function getActiveTenantId() {
  try {
    const stored = localStorage.getItem("activeTenant");
    return stored ? JSON.parse(stored).id : null;
  } catch {
    return null;
  }
}
