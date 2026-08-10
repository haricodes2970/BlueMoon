import type { MessageDto } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** `messages` newest-first (matches the API); rendered oldest-first. */
export function MessageList({
  messages,
  currentUserId,
}: {
  messages: MessageDto[];
  currentUserId: string;
}) {
  const oldestFirst = [...messages].reverse();

  return (
    <div className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
      <div className="flex flex-col gap-2">
        {oldestFirst.map((message) => {
          const mine = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
