"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, login, register, type AuthedUser } from "@/lib/api-client";
import { getDeviceFingerprint } from "@/lib/device";
import { useAuthStore } from "@/store/auth-store";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [credential, setCredential] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const action = mode === "login" ? login : register;
      const result: AuthedUser = await action({
        username,
        credential,
        deviceFingerprint: getDeviceFingerprint(),
      });
      setAuth({
        accessToken: result.accessToken,
        userId: result.user.id,
        username: result.user.username,
      });
      router.push("/chat");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="credential" className="text-sm font-medium">
          PIN (4-8 digits)
        </label>
        <Input
          id="credential"
          type="password"
          inputMode="numeric"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting
          ? "Please wait..."
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </Button>
    </form>
  );
}
