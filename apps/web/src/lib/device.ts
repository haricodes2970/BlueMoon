const STORAGE_KEY = "bluemoon-device-fingerprint";

/**
 * A stable per-browser identifier, persisted in localStorage --
 * satisfies Identity's required `deviceFingerprint` field (see
 * docs/security/Authentication.md). Not a security boundary by
 * itself; Identity treats it as an opaque label.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}
