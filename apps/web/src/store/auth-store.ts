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
  clear: () => void;
  setHasHydrated: () => void;
}

/**
 * Access-token-only client state (localStorage-persisted) -- no
 * refresh-token handling here yet. The refresh token itself never
 * reaches JS: apps/server sets it as an httpOnly cookie (see
 * docs/security/Session-Management.md), out of reach of this store by
 * design. A dropped access token simply requires logging in again;
 * silent refresh is a follow-up, not required for this milestone's
 * vertical slice.
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
