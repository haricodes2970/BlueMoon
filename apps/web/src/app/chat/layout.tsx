"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ConversationSidebar } from "@/components/messaging/conversation-sidebar";
import { useAuthStore } from "@/store/auth-store";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const router = useRouter();
  const pathname = usePathname();
  const activeConversationId = pathname.startsWith("/chat/")
    ? pathname.slice("/chat/".length)
    : undefined;

  useEffect(() => {
    // Persisted auth state loads from localStorage asynchronously
    // (zustand/middleware persist) -- redirecting on the pre-hydration
    // `null` would bounce an already-logged-in user back to /login on
    // every fresh page load.
    if (hasHydrated && !accessToken) router.replace("/login");
  }, [hasHydrated, accessToken, router]);

  if (!hasHydrated || !accessToken) return null;

  return (
    <div className="flex h-screen">
      <ConversationSidebar activeConversationId={activeConversationId} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
