/**
 * Three small bouncing dots used in the "X is typing…" indicator.
 */
export default function TypingDots() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" />
    </span>
  )
}
