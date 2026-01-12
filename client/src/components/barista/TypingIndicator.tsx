import { BaristaAvatar } from "./BaristaAvatar";

interface TypingIndicatorProps {
  toolInUse?: "web_search" | "x_search" | "thinking" | null;
}

export function TypingIndicator({ toolInUse }: TypingIndicatorProps) {
  const getToolText = () => {
    switch (toolInUse) {
      case "web_search":
        return "Searching the web...";
      case "x_search":
        return "Checking X for updates...";
      default:
        return "Brewing your answer...";
    }
  };

  const getToolIcon = () => {
    switch (toolInUse) {
      case "web_search":
        return "🔍";
      case "x_search":
        return "🐦";
      default:
        return "☕";
    }
  };

  return (
    <div className="flex items-start gap-2 animate-message-in" data-testid="typing-indicator">
      <BaristaAvatar size="sm" animate={true} />
      <div className="flex flex-col gap-1">
        {toolInUse && (
          <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary w-fit flex items-center gap-1" data-testid="tool-indicator">
            <span data-testid="tool-icon">{getToolIcon()}</span>
            <span data-testid="tool-text">{getToolText()}</span>
          </span>
        )}
        <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5" data-testid="typing-bubble">
          <span className="text-muted-foreground text-sm" data-testid="typing-text">{getToolText()}</span>
          <div className="flex gap-1 ml-1" data-testid="typing-dots">
            <span 
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce-dot"
              style={{ animationDelay: "0s" }}
              data-testid="typing-dot-1"
            />
            <span 
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce-dot"
              style={{ animationDelay: "0.2s" }}
              data-testid="typing-dot-2"
            />
            <span 
              className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce-dot"
              style={{ animationDelay: "0.4s" }}
              data-testid="typing-dot-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
