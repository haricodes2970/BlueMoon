"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessageComposer({
  onSend,
  sending,
  disabled,
}: {
  onSend: (content: string) => void;
  sending: boolean;
  disabled: boolean;
}) {
  const [content, setContent] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setContent("");
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 border-t border-border p-4"
    >
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={disabled ? "Connecting..." : "Message..."}
        disabled={disabled}
        autoComplete="off"
      />
      <Button type="submit" disabled={disabled || content.trim().length === 0}>
        {sending ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
