import { cn } from "@/lib/utils";

export function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        online ? "bg-green-500" : "bg-muted-foreground/40",
      )}
      aria-label={online ? "online" : "offline"}
      title={online ? "Online" : "Offline"}
    />
  );
}
