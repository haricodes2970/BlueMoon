import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthState {
  accessToken: string | null;
  userId: string | null;
  username: string | null;
  /** False until the persisted state has been read back from
   * localStorage -- persist's rehydration is asynchronous, so a
   * fresh page load briefly has `accessToken: null` even for an
   * already-logged-in user. Consumers must wait for this before
   * treating a null accessToken as "logged out". */
  hasHydrated: boolean;
  setAuth: (auth: {
    accessToken: string;
    userId: string;
    username: string;
  }) => void;
  /** Updates only the access token -- used by api-client's silent
   * refresh-on-401 flow, which never has (and never needs) userId/
   * username again. */
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
  setHasHydrated: () => void;
}

/**
 * Access-token-only client state (localStorage-persisted). The
 * refresh token itself never reaches JS: apps/server sets it as an
 * httpOnly cookie (see docs/security/Session-Management.md), out of
 * reach of this store by design. api-client.ts silently exchanges
 * that cookie for a new access token on a 401 and calls
 * setAccessToken here -- a dropped access token only requires logging
 * in again if the refresh cookie itself is gone/expired/revoked.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      userId: null,
      username: null,
      hasHydrated: false,
      setAuth: ({ accessToken, userId, username }) =>
        set({ accessToken, userId, username }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, userId: null, username: null }),
      setHasHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "bluemoon-auth",
      onRehydrateStorage: () => (state) => state?.setHasHydrated(),
      partialize: (state) => ({
        accessToken: state.accessToken,
        userId: state.userId,
        username: state.username,
      }),
    },
  ),
);
